/**
 * ============================================================
 * 项目管理服务 (Project Service)
 * ============================================================
 * 
 * 负责 EmbedBlocks 项目的创建、保存、打开和备份。
 * 项目以文件夹形式存储，包含:
 * - <projectName>.ebproj (项目元数据和 Blockly 状态)
 * - src/main.cpp (生成的源代码)
 * - platformio.ini (PlatformIO 配置)
 * - variants/ (本地板卡补丁，如需要)
 * 
 * 主要功能:
 * - createProject: 创建新项目文件夹
 * - saveProject: 保存项目状态
 * - openProject: 打开现有项目
 * - copyProject: 复制项目 (另存为)
 * - backupProject: 自动备份 (.swp 文件)
 * - applyLocalPatch: 应用本地板卡补丁
 * 
 * @file electron/services/ProjectService.ts
 * @module EmbedBlocks/Electron/Services/ProjectService
 */

import { PlatformIOTemplate, ProjectBuildConfig } from '../shared/types';
import * as fs from 'fs';
import * as path from 'path';
import { app, dialog } from 'electron';
import { configService } from './ConfigService';
import { generateIniConfig } from '../config/templates';
import { variantGenerator, VariantData } from './VariantGenerator';
import { pioService } from './PioService';

/** 项目元数据接口 */
export interface ProjectMetadata {
    version: string;       // 项目格式版本
    name: string;          // 项目名称
    boardId: string;       // 板卡 ID (如 'generic_stm32f103c8')
    createdAt: number;     // 创建时间戳
    lastModified: number;  // 最后修改时间戳
    buildConfig?: any;     // 构建配置 (存储时允许松散类型)
}

/** 项目文件内容接口 (.ebproj 文件结构) */
export interface ProjectFileContent {
    metadata: ProjectMetadata;  // 项目元数据
    blocks: any;                // Blockly 积木状态 (JSON 格式)
}

/** 项目数据接口 (用于 IPC 传输) */
export interface ProjectData {
    metadata: ProjectMetadata;
    xml: string;   // Blockly 状态 (序列化为字符串)
    code: string;  // 生成的 C++ 代码
}

/**
 * 项目管理服务类
 * 负责项目的全生命周期管理
 */
class ProjectService {

    /**
     * 创建新项目
     * 
     * 创建过程:
     * 1. 创建项目文件夹和 src 子目录
     * 2. 生成初始 main.cpp 模板
     * 3. 创建 .ebproj 元数据文件
     * 4. 检测是否需要本地补丁 (local_patch)
     * 5. 生成 platformio.ini
     * 
     * @param parentDir 父目录
     * @param name 项目名称
     * @param boardId 板卡 ID
     * @param buildConfig 构建配置
     * @returns 创建结果，包含项目路径
     */
    async createProject(parentDir: string, name: string, boardId: string, buildConfig: any): Promise<{ success: boolean; path?: string; error?: string }> {
        try {
            const projectPath = path.join(parentDir, name);
            const ebprojPath = path.join(projectPath, `${name}.ebproj`);

            // 检查项目目录是否已存在
            if (fs.existsSync(projectPath)) {
                return { success: false, error: 'Project directory already exists' };
            }

            // 检查是否受支持 (8KB 闪存物理限制)
            const unsupportedListPath = path.join(app.getAppPath(), 'electron', 'config', 'unsupported_8kb_chips.json');
            if (fs.existsSync(unsupportedListPath)) {
                try {
                    const unsupportedChips = JSON.parse(fs.readFileSync(unsupportedListPath, 'utf-8'));
                    if (Array.isArray(unsupportedChips) && unsupportedChips.includes(boardId)) {
                        return {
                            success: false,
                            error: `Generation Failed: Board ${boardId} has an 8KB physical flash limit. The Arduino framework requires at least 11KB of flash memory to compile reliably. This board is structurally unsupported by EmbedBlocks.`
                        };
                    }
                } catch (e) {
                    console.warn('[ProjectService] Failed to check unsigned 8KB chips list', e);
                }
            }

            // 创建项目目录结构
            await fs.promises.mkdir(projectPath, { recursive: true });
            await fs.promises.mkdir(path.join(projectPath, 'src'), { recursive: true });

            // 生成初始 main.cpp
            const mainCppContent = `#include <Arduino.h>\n\nvoid setup() {\n  // put your setup code here, to run once:\n}\n\nvoid loop() {\n  // put your main code here, to run repeatedly:\n}\n`;
            await fs.promises.writeFile(path.join(projectPath, 'src', 'main.cpp'), mainCppContent);

            // [核心增强] 自动检测 local_patch 模式 (移动到元数据创建之前)
            // 这样确保保存到 .ebproj 的 buildConfig 是修正后的 (Board ID = eb_custom_board)
            let needsLocalPatch = buildConfig.local_patch;

            if (!needsLocalPatch && (buildConfig.framework === 'arduino' || !buildConfig.framework)) {
                const enhancedMapPath = path.join(app.getAppPath(), 'electron', 'config', 'stm32_compatibility_enhanced.json');
                if (fs.existsSync(enhancedMapPath)) {
                    try {
                        const enhancedMap = JSON.parse(fs.readFileSync(enhancedMapPath, 'utf-8'));
                        const enhancedInfo = enhancedMap[boardId];
                        if (enhancedInfo) {
                            needsLocalPatch = enhancedInfo.requiresLocalPatch || !enhancedInfo.pioBoardId;
                        } else {
                            // 芯片不在映射中，默认使用 local_patch 模式
                            // 只有当它是 STM32 板卡时 (简单判断 ID 格式或由调用者保证)
                            if (boardId.startsWith('generic_stm32')) {
                                needsLocalPatch = true;
                            }
                        }
                    } catch (e) {
                        console.warn('[ProjectService] Failed to load enhanced mapping for local_patch detection', e);
                    }
                }
            }

            // 如果需要本地补丁，强制更新 buildConfig
            if (needsLocalPatch) {
                console.log(`[ProjectService] Board ${boardId} requires local patch. Updating buildConfig.`);
                buildConfig.local_patch = true;
                buildConfig.original_board = boardId; // 保存原始 ID 供后续 templates.ts 判定
                buildConfig.board = 'eb_custom_board';
                if (!buildConfig.platform) buildConfig.platform = 'ststm32';
                if (!buildConfig.framework) buildConfig.framework = 'arduino';
            } else {
                // 非 patch 模式下的标准板卡回退补偿 (例如 Arduino Uno, Mega, Pro Mini)
                if (!buildConfig.platform) {
                    const idLower = boardId.toLowerCase();
                    const avrKeywords = ['uno', 'mega', 'nano', 'leonardo', 'pro', 'micro'];

                    if (avrKeywords.some(kw => idLower.includes(kw))) {
                        buildConfig.platform = 'atmelavr';
                    } else if (idLower.includes('esp32')) {
                        buildConfig.platform = 'espressif32';
                    } else {
                        buildConfig.platform = 'ststm32'; // 其它未知的保底
                    }
                }
                if (!buildConfig.framework) buildConfig.framework = 'arduino';
            }

            // 创建项目元数据
            const metadata: ProjectMetadata = {
                version: '1.0.0',
                name: name,
                boardId: boardId,
                createdAt: Date.now(),
                lastModified: Date.now(),
                buildConfig: buildConfig
            };

            const initialData: ProjectFileContent = {
                metadata: metadata,
                blocks: { languageVersion: 0, blocks: [] }  // 空的 Blockly 状态
            };

            await fs.promises.writeFile(ebprojPath, JSON.stringify(initialData, null, 2));

            // 生成 platformio.ini 和本地补丁
            try {
                // 应用本地补丁 (生成 boards/, variants/ 等)
                if (needsLocalPatch) {
                    await this.applyLocalPatch(projectPath, boardId);
                }

                // 生成 platformio.ini
                const iniContent = generateIniConfig(buildConfig);
                await fs.promises.writeFile(path.join(projectPath, 'platformio.ini'), iniContent);

                // [WBA Fix] 自动为 WBA 系列物理生成补丁脚本
                // 虽然 templates.ts 会在 INI 中注入指令，但这确保了脚本物理存在于项目中
                if (boardId.toLowerCase().includes('wba')) {
                    const wbaScriptContent = `# fix_wba_build.py (由 EmbedBlocks Studio 自动生成)
import os
from collections import deque

Import("env")

projenv = None
try:
    Import("projenv")
except:
    pass

mcu = env.BoardConfig().get("build.mcu", "").lower()

def to_list(items):
    if items is None: return []
    if isinstance(items, list): return items
    if isinstance(items, (tuple, deque)): return list(items)
    try: return [str(x) for x in items]
    except: return [items]

def purge_wb_defines(defines):
    raw_list = to_list(defines)
    new_defines = []
    purged = []
    
    for item in raw_list:
        is_wb = False
        item_str = str(item)
        if "STM32WBxx" in item_str and "STM32WBAxx" not in item_str:
            is_wb = True
        
        if is_wb: purged.append(item_str)
        else:
            if isinstance(item, (list, tuple)) and len(item) >= 2:
                new_defines.append((str(item[0]), str(item[1])))
            else:
                new_defines.append(item)
    return new_defines, purged

def redirect_wb_paths(paths):
    raw_list = to_list(paths)
    new_paths = []
    replaced = []
    for p in raw_list:
        p_str = str(p)
        if "STM32WBxx" in p_str and "STM32WBAxx" not in p_str:
            new_p = p_str.replace("STM32WBxx", "STM32WBAxx")
            new_paths.append(new_p)
            replaced.append(p_str)
        else: new_paths.append(p)
    return new_paths, replaced

def apply_wba_fix(target_env, label="env"):
    if target_env is None: return
    d, purged = purge_wb_defines(target_env.get("CPPDEFINES", []))
    if "STM32WBAxx" not in str(d): d.append("STM32WBAxx")
    
    # CMSIS EXTI Stub for STM32WBA50xx etc.
    if "EXTI_IMR1_IM10" not in str(d): d.append(("EXTI_IMR1_IM10", "0"))
    if "EXTI_IMR1_IM11" not in str(d): d.append(("EXTI_IMR1_IM11", "0"))
    target_env.Replace(CPPDEFINES=d)
    
    p, replaced = redirect_wb_paths(target_env.get("CPPPATH", []))
    target_env.Replace(CPPPATH=p)

    def wba_purge_middleware(cppdefines, cpppath, libpath, env=target_env):
        d, purged = purge_wb_defines(cppdefines)
        p, replaced = redirect_wb_paths(cpppath)
        if "STM32WBAxx" not in str(d): d.append("STM32WBAxx")
        if "EXTI_IMR1_IM10" not in str(d): d.append(("EXTI_IMR1_IM10", "0"))
        if "EXTI_IMR1_IM11" not in str(d): d.append(("EXTI_IMR1_IM11", "0"))
        return d, p, libpath

    target_env.AddBuildMiddleware(wba_purge_middleware)

if "stm32wba" in mcu:
    apply_wba_fix(env, "env")
    current_projenv = locals().get("projenv", None)
    if current_projenv and current_projenv != env:
                    apply_wba_fix(current_projenv, "projenv")
`;
                    await fs.promises.writeFile(path.join(projectPath, 'fix_wba_build.py'), wbaScriptContent);
                }

                if (boardId.toLowerCase().includes('wb') && !boardId.toLowerCase().includes('wba')) {
                    const wbScriptContent = `# fix_wb_build.py (由 EmbedBlocks Studio 自动生成)
# 修复 STM32WB/WB0 系列在 STM32duino 框架中的多个编译兼容性问题
import os
import io
import re
import sys
from collections import deque
Import("env")

projenv = None
try:
    Import("projenv")
except:
    pass

# 1. 补充缺失的链接器符号 (Shared BLE Memory) 和保证基本宏定义
env.Append(LINKFLAGS=[
    "-Wl,--defsym=_sMB_MEM1=0x20030000",
    "-Wl,--defsym=_eMB_MEM1=0x20030000",
    "-Wl,--defsym=_siMB_MEM1=0x20030000",
    "-Wl,--defsym=_sMB_MEM2=0x20030000",
    "-Wl,--defsym=_eMB_MEM2=0x20030000",
    "-Wl,--defsym=_siMB_MEM2=0x20030000",
    "-Wl,--defsym=_sbssblue=0x20000000",
    "-Wl,--defsym=_ebssblue=0x20000000"
])

mcu = env.BoardConfig().get("build.mcu", "").lower()

def to_list(items):
    if items is None: return []
    if isinstance(items, list): return items
    if isinstance(items, (tuple, deque)): return list(items)
    try: return [str(x) for x in items]
    except: return [items]

def purge_wb0_defines(defines):
    raw_list = to_list(defines)
    new_defines = []
    
    for item in raw_list:
        item_str = str(item)
        if "STM32WBxx" in item_str and "STM32WB0x" not in item_str:
            pass # drop STM32WBxx for WB0
        else:
            if isinstance(item, (list, tuple)) and len(item) >= 2:
                new_defines.append((str(item[0]), str(item[1])))
            else:
                new_defines.append(item)
    return new_defines

def redirect_wb0_paths(paths):
    raw_list = to_list(paths)
    new_paths = []
    for p in raw_list:
        p_str = str(p)
        if "STM32WBxx" in p_str and "STM32WB0x" not in p_str:
            new_p = p_str.replace("STM32WBxx", "STM32WB0x")
            new_paths.append(new_p)
        else: new_paths.append(p)
    return new_paths

def apply_wb0_fix(target_env):
    if target_env is None: return
    d = purge_wb0_defines(target_env.get("CPPDEFINES", []))
    if "STM32WB0x" not in str(d): d.append("STM32WB0x")
    target_env.Replace(CPPDEFINES=d)
    
    p = redirect_wb0_paths(target_env.get("CPPPATH", []))
    target_env.Replace(CPPPATH=p)

    def wb0_purge_middleware(cppdefines, cpppath, libpath, env=target_env):
        d = purge_wb0_defines(cppdefines)
        p = redirect_wb0_paths(cpppath)
        if "STM32WB0x" not in str(d): d.append("STM32WB0x")
        return d, p, libpath

    target_env.AddBuildMiddleware(wb0_purge_middleware)

# PIO 将 STM32WB0 的 series 解析为 STM32WBxx, 需要动态修正目录和宏
if "stm32wb0" in mcu:
    apply_wb0_fix(env)
    current_projenv = locals().get("projenv", None)
    if current_projenv and current_projenv != env:
        apply_wb0_fix(current_projenv)

# 获取 framework 目录 (最可靠的方式)
framework_dir = env.PioPlatform().get_package_dir("framework-arduinoststm32")
if not framework_dir:
    print("Warning: framework-arduinoststm32 not found, skipping WB patches")
else:
    src_dir = os.path.join(framework_dir, "libraries", "SrcWrapper", "src")

    def patch_file(rel_path, description, check_fn, patch_fn):
        """通用的源码补丁工具函数"""
        filepath = os.path.join(src_dir, rel_path)
        if not os.path.exists(filepath):
            return
        try:
            with io.open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            if check_fn(content):
                print(f"[WB0 Fix] Patching {rel_path}: {description}")
                new_content = patch_fn(content)
                with io.open(filepath, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"[WB0 Fix] {rel_path} patched successfully!")
        except Exception as e:
            print(f"[WB0 Fix] Failed to patch {rel_path}: {e}")

    # 2. 修复 HardwareTimer.cpp: hdma 成员在不支持 TIM_DMA 的芯片上不存在
    patch_file(
        "HardwareTimer.cpp",
        "guard hdma[] with TIM_DMA_SUPPORT",
        lambda c: "hdma[0]" in c and "TIM_DMA_SUPPORT" not in c,
        lambda c: re.sub(
            r"(_timerObj\\.handle\\.hdma\\[0\\].*?_timerObj\\.handle\\.hdma\\[6\\]\\s*=\\s*(?:NULL|nullptr);)",
            r"#if defined(TIM_DMA_SUPPORT)\\n  \\1\\n#endif",
            c, flags=re.DOTALL
        )
    )

    # 3. 修复 timer.c: TIM1_CC_IRQn 在 WB0 系列未定义 (WB0 只有合并的 TIM1_IRQn)
    patch_file(
        os.path.join("stm32", "timer.c"),
        "add TIM1_CC_IRQn fallback to TIM1_IRQn",
        lambda c: "TIM1_CC_IRQn" in c and "ifndef TIM1_CC_IRQn" not in c,
        lambda c: c.replace(
            "#if defined(HAL_TIM_MODULE_ENABLED) && !defined(HAL_TIM_MODULE_ONLY)",
            "#if defined(HAL_TIM_MODULE_ENABLED) && !defined(HAL_TIM_MODULE_ONLY)\\n"
            "/* [WB0 Fix] STM32WB0 系列没有独立的 TIM CC 中断, 回退到合并中断 */\\n"
            "#if defined(TIM1_BASE) && !defined(TIM1_CC_IRQn)\\n"
            "  #define TIM1_CC_IRQn TIM1_IRQn\\n"
            "#endif\\n"
            "#if defined(TIM8_BASE) && !defined(TIM8_CC_IRQn)\\n"
            "  #define TIM8_CC_IRQn TIM8_IRQn\\n"
            "#endif\\n"
            "#if defined(TIM20_BASE) && !defined(TIM20_CC_IRQn)\\n"
            "  #define TIM20_CC_IRQn TIM20_IRQn\\n"
            "#endif"
        )
    )

    # 4. 修复 uart.c: 
    #    (1) LPUART1 clock source config #error
    #        WB06/WB07 定义了 LPUART1_BASE 但没有 RCC_CFGR_LPUCLKSEL，
    #        导致 __HAL_RCC_LPUART1_CONFIG 和 __HAL_RCC_LPUART1_CLK_CONFIG 都未定义
    #    (2) HAL_UARTEx_EnableStopMode/DisableStopMode 不支持
    patch_file(
        os.path.join("stm32", "uart.c"),
        "replace LPUART1 clock config #error with no-op fallback & fix StopMode",
        lambda c: '#error "LPUART1 clock source config  not defined"' in c or "HAL_UARTEx_EnableStopMode(huart);" in c,
        lambda c: c.replace(
            '#error "LPUART1 clock source config  not defined"',
            '/* [WB0 Fix] 此芯片 LPUART1 无独立时钟源配置宏, 使用默认时钟 */\\n'
            '          (void)0;  /* no-op: use default clock */'
        ).replace(
            "      HAL_UARTEx_EnableStopMode(huart);\\n    } else {",
            "      #if !defined(STM32WB0x)\\n      HAL_UARTEx_EnableStopMode(huart);\\n      #endif\\n    } else {"
        ).replace(
            "      HAL_UARTEx_DisableStopMode(huart);\\n    }",
            "      #if !defined(STM32WB0x)\\n      HAL_UARTEx_DisableStopMode(huart);\\n      #endif\\n    }"
        )
    )

`;
                    await fs.promises.writeFile(path.join(projectPath, 'fix_wb_build.py'), wbScriptContent);
                }

                if (boardId.toLowerCase().startsWith('generic_stm32wl') || boardId.toLowerCase().startsWith('generic_stm32wle')) {
                    const wlScriptContent = `# fix_wl_build.py (由 EmbedBlocks Studio 自动生成)
import os
Import("env")

# 修复 STM32WL 系列多个 variant_*.cpp 被同时包含的问题
# 只保留 variant_generic.cpp

def filter_variant_files(env):
    proj_dir = env.get("PROJECT_DIR", "")
    variant_dir = os.path.join(proj_dir, "variants", "eb_custom_variant")
    if not os.path.exists(variant_dir): return

    to_exclude = []
    for f in os.listdir(variant_dir):
        if f.startswith("variant_") and f.endswith(".cpp") and f != "variant_generic.cpp":
            to_exclude.append(f)
    
    if to_exclude:
        # 使用 SRC_FILTER 过滤掉这些多余的变体源文件
        # 在 pre-script 中, 我们直接修改 SRC_FILTER
        filter_str = " ".join([f"-<variants/eb_custom_variant/{x}>" for x in to_exclude])
        env.Append(SRC_FILTER=[filter_str])
        print(f"\\n[EmbedBlocks FIX] (Pre-script) Excluded multiple WL variants: {', '.join(to_exclude)}\\n")

filter_variant_files(env)
`;
                    await fs.promises.writeFile(path.join(projectPath, 'fix_wl_build.py'), wlScriptContent);
                }

                // [C0 Fix] 修复外设引脚常量不存在的问题
                if (boardId.toLowerCase().startsWith('generic_stm32c0')) {
                    const c0ScriptContent = `# fix_c0_build.py (由 EmbedBlocks Studio 自动生成)
import os
Import("env")

proj_dir = env.get("PROJECT_DIR", "")
pp_file = os.path.join(proj_dir, "variants", "eb_custom_variant", "PeripheralPins.c")

if os.path.exists(pp_file):
    with open(pp_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if "GPIO_AF0_USART2" in content:
        content = content.replace("GPIO_AF0_USART2", "GPIO_AF1_USART2")
        with open(pp_file, 'w', encoding='utf-8') as f:
            f.write(content)
`;
                    await fs.promises.writeFile(path.join(projectPath, 'fix_c0_build.py'), c0ScriptContent);
                }

                // [H5 & U3 Fix] 修复由于 LL 库与 HAL 库脱节导致的 LL_DLYB 编译未知类型错误
                if (boardId.toLowerCase().startsWith('generic_stm32h5') || boardId.toLowerCase().startsWith('generic_stm32u3')) {
                    const dlybScriptContent = `# fix_ll_dlyb.py (由 EmbedBlocks Studio 自动生成)
import os
Import("env")

def empty_ll_dlyb(source, target, env):
    # Find framework-arduinoststm32 package path
    framework_dir = env.PioPlatform().get_package_dir("framework-arduinoststm32")
    if framework_dir:
        dlyb_file = os.path.join(framework_dir, "libraries", "SrcWrapper", "src", "LL", "stm32yyxx_ll_dlyb.c")
        if os.path.exists(dlyb_file):
            print(f"\\n[EmbedBlocks FIX] Emptying bugged LL library file: {dlyb_file}\\n")
            with open(dlyb_file, "w") as f:
                f.write("/* Emptied by EmbedBlocks due to LL_DLYB_CfgTypeDef bug */\\n")

empty_ll_dlyb(None, None, env)
`;
                    await fs.promises.writeFile(path.join(projectPath, 'fix_ll_dlyb.py'), dlybScriptContent);
                }

                // [L1 Fix] 修复 L1 通用变体引脚表中包含了实际不存在的端口(PF11-PF15, PG13-PG14)导致的未声明错误
                if (boardId.toLowerCase().startsWith('generic_stm32l1')) {
                    const l1ScriptContent = `# fix_l1_variant.py (由 EmbedBlocks Studio 自动生成)
import os
Import("env")

variant_cpp = os.path.join(env.subst("$PROJECT_DIR"), "variants", "eb_custom_variant", "variant_generic.cpp")
if os.path.exists(variant_cpp):
    with open(variant_cpp, "r", encoding="utf-8") as f:
        content = f.read()

    # 将未定义的引脚替换为 NC (Not Connected)
    bad_pins = ["PF_11", "PF_12", "PF_13", "PF_14", "PF_15", "PG_13", "PG_14", "PH_3", "PF_11,"]
    for pin in bad_pins:
        content = content.replace(f"  {pin},", f"  NC, // {pin} removed")

    with open(variant_cpp, "w", encoding="utf-8") as f:
        f.write(content)
`;
                    await fs.promises.writeFile(path.join(projectPath, 'fix_l1_variant.py'), l1ScriptContent);
                }

            } catch (e) {
                console.warn('[ProjectService] Failed to generate initial platformio.ini or patch', e);
            }

            // [核心增强] 生成终端辅助脚本 (eb_terminal.ps1)
            // 允许用户在没有添加 pio 到系统 PATH 的情况下，直接通过脚本进入预配置好的命令行环境
            await pioService.generateTerminalHelper(projectPath);

            return { success: true, path: ebprojPath };

        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    /**
     * 复制项目 (另存为)
     * 
     * 复制过程:
     * 1. 创建新目标目录
     * 2. 递归复制文件 (跳过 .pio, .git, build 等)
     * 3. 重命名 .ebproj 文件
     * 4. 更新元数据中的项目名称
     * 
     * @param srcPath 源项目目录
     * @param parentDir 目标父目录
     * @param newName 新项目名称
     */
    async copyProject(srcPath: string, parentDir: string, newName: string): Promise<{ success: boolean; newPath?: string; error?: string }> {
        try {
            if (!fs.existsSync(srcPath)) return { success: false, error: 'Source project not found' };

            const newProjectPath = path.join(parentDir, newName);
            const newEbprojPath = path.join(newProjectPath, `${newName}.ebproj`);

            if (fs.existsSync(newProjectPath)) {
                return { success: false, error: 'Target directory already exists' };
            }

            // 1. 创建目标目录
            await fs.promises.mkdir(newProjectPath, { recursive: true });

            // 2. 递归复制辅助函数
            const copyRecursive = async (src: string, dest: string) => {
                const stats = await fs.promises.stat(src);
                if (stats.isDirectory()) {
                    await fs.promises.mkdir(dest, { recursive: true });
                    const entries = await fs.promises.readdir(src);
                    for (const entry of entries) {
                        // 跳过构建产物和版本控制目录
                        if (entry === '.pio' || entry === '.git' || entry === '.history' || entry === 'build') continue;
                        await copyRecursive(path.join(src, entry), path.join(dest, entry));
                    }
                } else {
                    await fs.promises.copyFile(src, dest);
                }
            };

            // 3. 复制内容 (排除构建产物)
            await copyRecursive(srcPath, newProjectPath);

            // 4. 重命名 .ebproj 文件
            const oldEbprojName = path.basename(srcPath) + '.ebproj';
            const oldEbprojPath = path.join(newProjectPath, oldEbprojName);

            /**
             * 注意: 这里直接重命名而不是创建新文件
             * 这样可以保留原项目的 blocks 数据
             * 前端会立即保存，所以这里的内容会被覆盖
             */
            if (fs.existsSync(oldEbprojPath)) {
                await fs.promises.rename(oldEbprojPath, newEbprojPath);

                // 更新元数据中的项目名称
                try {
                    const content = JSON.parse(await fs.promises.readFile(newEbprojPath, 'utf-8'));
                    if (content.metadata) {
                        content.metadata.name = newName;
                        content.metadata.lastModified = Date.now();
                        await fs.promises.writeFile(newEbprojPath, JSON.stringify(content, null, 2));
                    }
                } catch (e) { console.warn('Failed to update metadata in copied project', e); }
            }

            return { success: true, newPath: newEbprojPath };

        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    /**
     * 保存项目
     * 
     * 保存过程:
     * 1. 读取现有 .ebproj 文件
     * 2. 更新元数据和 Blockly 状态
     * 3. 重新生成 platformio.ini (如果 buildConfig 变更)
     * 4. 保存 main.cpp
     * 5. 清理遗留文件和备份
     * 
     * @param ebprojPath 项目文件路径
     * @param data 要保存的数据
     */
    async saveProject(ebprojPath: string, data: { blocklyState: string, code: string, boardId?: string, buildConfig?: ProjectBuildConfig }): Promise<{ success: boolean; error?: string }> {
        try {
            console.log('[ProjectService] Saving project to:', ebprojPath);

            // 1. 读取现有文件
            if (!fs.existsSync(ebprojPath)) {
                return { success: false, error: 'Project file not found' };
            }

            const contentRaw = await fs.promises.readFile(ebprojPath, 'utf-8');
            let projectContent: ProjectFileContent;
            try {
                projectContent = JSON.parse(contentRaw);
            } catch (e) {
                return { success: false, error: 'Project file corrupted' };
            }

            // 2. 更新元数据
            projectContent.metadata.lastModified = Date.now();
            if (data.boardId) projectContent.metadata.boardId = data.boardId;
            if (data.buildConfig) projectContent.metadata.buildConfig = data.buildConfig;

            // 解析 Blockly 状态
            try {
                projectContent.blocks = JSON.parse(data.blocklyState);
            } catch (e) {
                console.error("Failed to parse blockly state", e);
            }

            await fs.promises.writeFile(ebprojPath, JSON.stringify(projectContent, null, 2));

            // 3. 重新生成 platformio.ini (如果 buildConfig 有效)
            if (data.buildConfig && Object.keys(data.buildConfig).length > 0) {
                try {
                    /**
                     * 注意: buildConfig 应该是完整的 PlatformIOTemplate
                     * 前端的 updateProjectConfig 会将更新合并到现有对象中
                     * 所以 projectMetadata.buildConfig 应该包含所有必要字段
                     */
                    const pioTemplate = data.buildConfig as any;

                    // [核心增强] 保存时重新生成补丁
                    if (pioTemplate.local_patch) {
                        await this.applyLocalPatch(path.dirname(ebprojPath), projectContent.metadata.boardId);
                    }

                    // 确保必要字段存在才生成 INI
                    if (pioTemplate.platform && pioTemplate.board && pioTemplate.framework) {
                        const iniContent = generateIniConfig(pioTemplate);
                        await fs.promises.writeFile(path.join(path.dirname(ebprojPath), 'platformio.ini'), iniContent);
                    }
                } catch (e) {
                    console.warn('[ProjectService] Failed to regenerate platformio.ini or patch on save', e);
                }
            }

            // 4. 保存 main.cpp
            const projectDir = path.dirname(ebprojPath);
            const cppPath = path.join(projectDir, 'src', 'main.cpp');
            if (!fs.existsSync(path.dirname(cppPath))) await fs.promises.mkdir(path.dirname(cppPath), { recursive: true });
            await fs.promises.writeFile(cppPath, data.code);

            // 5. 清理遗留的 .json 文件 (旧版格式)
            const legacyJsonPath = path.join(projectDir, `${path.basename(ebprojPath, '.ebproj')}.json`);
            if (fs.existsSync(legacyJsonPath)) {
                try { await fs.promises.unlink(legacyJsonPath); } catch (e) { /* ignore */ }
            }

            // 6. 成功保存后删除备份文件 (.swp)
            this.discardBackup(ebprojPath);

            return { success: true };

        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    // ==================== 备份机制 ====================

    /**
     * 生成备份文件路径
     * 格式: .<projectName>.ebproj.swp (隐藏文件)
     */
    private getBackupPath(ebprojPath: string): string {
        const dir = path.dirname(ebprojPath);
        const name = path.basename(ebprojPath, '.ebproj');
        return path.join(dir, `.${name}.ebproj.swp`);
    }

    /**
     * 创建项目备份
     * 用于定时自动保存，防止崩溃丢失数据
     * 
     * @param ebprojPath 项目文件路径
     * @param data 当前状态数据
     */
    async backupProject(ebprojPath: string, data: { blocklyState: string, code: string, boardId: string, buildConfig?: ProjectBuildConfig }): Promise<{ success: boolean; error?: string }> {
        try {
            if (!ebprojPath) return { success: false, error: 'No path' };
            const backupPath = this.getBackupPath(ebprojPath);
            const content = {
                timestamp: Date.now(),
                ...data
            };
            // 使用同步写入，确保备份完成
            fs.writeFileSync(backupPath, JSON.stringify(content));
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    /**
     * 检查是否存在备份
     * 用于应用启动时检测未保存的工作
     * 
     * @param ebprojPath 项目文件路径
     * @returns 备份信息
     */
    async checkBackup(ebprojPath: string): Promise<{ hasBackup: boolean; timestamp?: number }> {
        try {
            const backupPath = this.getBackupPath(ebprojPath);
            if (fs.existsSync(backupPath)) {
                /**
                 * 备份存在逻辑:
                 * .swp 文件存在 = 上次会话未正常关闭 (Save 会删除 swp)
                 * 因此可能包含未保存的工作
                 */
                const stat = fs.statSync(backupPath);
                return { hasBackup: true, timestamp: stat.mtimeMs };
            }
            return { hasBackup: false };
        } catch (e) {
            return { hasBackup: false };
        }
    }

    /**
     * 恢复备份
     * 读取并返回备份数据的内容
     */
    async restoreBackup(ebprojPath: string): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            const backupPath = this.getBackupPath(ebprojPath);
            if (!fs.existsSync(backupPath)) return { success: false, error: 'Backup not found' };

            const raw = fs.readFileSync(backupPath, 'utf-8');
            const data = JSON.parse(raw);
            return { success: true, data };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    /**
     * 丢弃备份
     * 在正常保存操作后调用
     */
    async discardBackup(ebprojPath: string): Promise<void> {
        try {
            const backupPath = this.getBackupPath(ebprojPath);
            if (fs.existsSync(backupPath)) {
                fs.unlinkSync(backupPath);
            }
        } catch (e) { /* ignore */ }
    }

    // ==================== 打开项目 ====================

    /**
     * 打开项目对话框
     * 显示文件选择器让用户选择 .ebproj 文件
     */
    async openProjectDialog(): Promise<{ cancelled: boolean; projectPath?: string; data?: ProjectData; error?: string }> {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            title: 'Open EmbedBlocks Project',
            defaultPath: configService.get('general.lastOpenDir') || configService.get('general.workDir'),
            filters: [{ name: 'EmbedBlocks Project', extensions: ['ebproj'] }],
            properties: ['openFile']
        });

        if (canceled || filePaths.length === 0) return { cancelled: true };

        const ebprojPath = filePaths[0];
        // 保存上次打开的目录
        configService.set('general.lastOpenDir', path.dirname(ebprojPath));

        return await this.openProject(ebprojPath);
    }

    /**
     * 打开项目
     * 
     * 打开过程:
     * 1. 读取 .ebproj 文件
     * 2. 处理格式迁移 (旧版 vs 新版)
     * 3. 读取 main.cpp 代码
     * 4. 更新工作目录配置
     * 
     * @param ebprojPath 项目文件路径
     */
    async openProject(ebprojPath: string): Promise<{ cancelled: boolean; error?: string; projectPath?: string; data?: ProjectData }> {
        try {
            // 检查文件是否存在
            if (!fs.existsSync(ebprojPath)) return { cancelled: false, error: 'Project file not found' };

            // 1. 读取 .ebproj
            const contentRaw = fs.readFileSync(ebprojPath, 'utf-8');
            const rawJson = JSON.parse(contentRaw);
            console.log('[ProjectService] Opened project:', ebprojPath);
            console.log('[ProjectService] Raw JSON keys:', Object.keys(rawJson));

            let metadata: ProjectMetadata;
            let blocks: any;

            /**
             * 格式迁移处理:
             * - 新格式: { metadata: {...}, blocks: {...} }
             * - 旧格式: 直接是 metadata 对象，blocks 存在单独的 .json 文件
             */
            if (rawJson.metadata && rawJson.blocks) {
                // 新格式
                metadata = rawJson.metadata;
                blocks = rawJson.blocks;
            } else {
                // 旧格式 - 需要迁移
                metadata = rawJson as ProjectMetadata;

                // 尝试读取遗留的 .json 文件
                const projectDir = path.dirname(ebprojPath);
                const legacyJsonPath = path.join(projectDir, `${metadata.name}.json`);
                if (fs.existsSync(legacyJsonPath)) {
                    const legacyContent = fs.readFileSync(legacyJsonPath, 'utf-8');
                    blocks = JSON.parse(legacyContent);
                } else {
                    // 没有遗留文件，创建空状态
                    blocks = { blocks: { languageVersion: 0, blocks: [] } };
                }
            }

            const projectDir = path.dirname(ebprojPath);

            // 2. 读取代码文件
            const cppPath = path.join(projectDir, 'src', 'main.cpp');
            let code = '';
            if (fs.existsSync(cppPath)) {
                code = fs.readFileSync(cppPath, 'utf-8');
            }

            // 3. (取消) 不再强制更新全局工作目录为当前项目父目录
            // configService.set('general.workDir', path.dirname(projectDir));

            return {
                cancelled: false,
                projectPath: ebprojPath,
                data: {
                    metadata,
                    xml: JSON.stringify(blocks), // 协议要求字符串格式
                    code
                }
            };
        } catch (error: any) {
            return { cancelled: false, error: `Failed to load project: ${error.message}` };
        }
    }

    /** loadProject 别名，用于内部调用 */
    async loadProject(ebprojPath: string) { return this.openProject(ebprojPath); }

    /**
     * [核心辅助] 应用本地板卡补丁
     * 
     * 用于没有官方 PIO 板卡定义的 STM32 芯片。
     * 生成项目本地的 boards/ 和 variants/ 目录。
     * 
     * 工作流程:
     * 1. 从 src/data/boards/stm32/ 查找芯片元数据
     * 2. 从增强兼容性映射获取父板卡和 variant 路径
     * 3. 调用 VariantGenerator 生成补丁文件
     * 
     * @param projectPath 项目路径
     * @param boardId 板卡 ID (如 'generic_stm32f103c8')
     */
    private async applyLocalPatch(projectPath: string, boardId: string): Promise<void> {
        try {
            // 芯片元数据目录
            const stm32DataDir = path.join(app.getAppPath(), 'src', 'data', 'boards', 'stm32');

            // 在系列子目录中搜索对应的芯片 JSON 文件
            // boardId 格式: "generic_stm32f103c8" -> 文件名: "STM32F103C8.json"
            const seriesDirs = fs.readdirSync(stm32DataDir);
            let targetPath = '';
            for (const series of seriesDirs) {
                const potentialPath = path.join(stm32DataDir, series, `${boardId.replace('generic_', '').toUpperCase()}.json`);
                if (fs.existsSync(potentialPath)) {
                    targetPath = potentialPath;
                    break;
                }
            }

            if (!targetPath) {
                console.warn(`[ProjectService] Could not find board metadata for patch: ${boardId}`);
                return;
            }

            // 读取芯片元数据
            const rawData = fs.readFileSync(targetPath, 'utf-8');
            const boardMetadata = JSON.parse(rawData) as VariantData;

            /**
             * [逻辑升级] 从增强兼容性映射获取额外信息
             * 
             * 增强映射提供:
             * - pioBoardId: 父板卡 ID (用于继承配置)
             * - variantPath: variant 文件路径
             * - productLine: 产品线 (如 F1, F4, G4)
             * - maxSize/maxDataSize: Flash/RAM 大小
             * 
             * 旧版 stm32_compatibility.json 已弃用 (匹配逻辑不可靠)
             */
            const enhancedPath = path.join(app.getAppPath(), 'electron', 'config', 'stm32_compatibility_enhanced.json');

            if (fs.existsSync(enhancedPath)) {
                try {
                    const enhancedMap = JSON.parse(fs.readFileSync(enhancedPath, 'utf-8'));
                    const enhancedInfo = enhancedMap[boardId];
                    if (enhancedInfo) {
                        // 注入增强信息到元数据
                        boardMetadata.parentBoardId = enhancedInfo.pioBoardId || undefined;
                        boardMetadata.enhancedVariantPath = enhancedInfo.variantPath;
                        boardMetadata.productLine = enhancedInfo.productLine;
                        boardMetadata.maxFlashSize = enhancedInfo.maxSize;
                        boardMetadata.maxRamSize = enhancedInfo.maxDataSize;
                        console.log(`[ProjectService] 使用增强兼容性映射: variantPath=${enhancedInfo.variantPath}, productLine=${enhancedInfo.productLine}`);
                    }
                } catch (e) {
                    console.warn(`[ProjectService] Failed to load enhanced compatibility map`, e);
                }
            }

            // 获取核心路径配置
            // [核心增强] 智能搜索 Arduino Core 路径 (Bundled > Config > Default)
            let corePath = '';

            // 1. 优先检查配置 (Dev/User Override)
            const configPath = configService.get('advanced.arduinoCorePath');
            if (configPath && fs.existsSync(path.join(configPath, 'variants'))) {
                corePath = configPath;
            }

            // 2. 检查内置资源目录 (Prod Bundled)
            // 部署时应将 Arduino_Core_STM32 仓库内容打包至 resources/arduino_core
            if (!corePath) {
                const bundledPath = path.join(process.resourcesPath, 'arduino_core');
                if (fs.existsSync(path.join(bundledPath, 'variants'))) {
                    corePath = bundledPath;
                    console.log('[ProjectService] Found bundled Arduino Core:', corePath);
                }
            }

            // 3. 回退到默认开发路径 (Dev Fallback)
            if (!corePath) {
                const devDefault = 'G:\\Project\\Easy_Embedded\\STM32_DATA\\Arduino_Core_STM32';
                if (fs.existsSync(path.join(devDefault, 'variants'))) {
                    corePath = devDefault;
                }
            }

            // 4. 最后尝试 PIO 内置路径 (可能过时，但在没有 bundled data 时是唯一的选择)
            if (!corePath) {
                // 尝试寻找 PIO 安装的 variants 目录的父级
                // 通常路径: .platformio/packages/framework-arduinoststm32/
                const pioFrameworkPath = path.join(require('os').homedir(), '.platformio', 'packages', 'framework-arduinoststm32');
                if (fs.existsSync(path.join(pioFrameworkPath, 'variants'))) {
                    corePath = pioFrameworkPath;
                }
            }
            const platformPath = configService.get('advanced.pioPlatformPath') || path.join(require('os').homedir(), '.platformio', 'platforms', 'ststm32');

            // 调用生成器生成补丁
            await variantGenerator.generatePatch(projectPath, boardMetadata, platformPath, corePath);
            console.log(`[ProjectService] Successfully applied local patch for ${boardId}`);

        } catch (e) {
            console.error('[ProjectService] Failed to apply local patch', e);
            throw e;
        }
    }
}

/** 导出单例服务实例 */
export const projectService = new ProjectService();
