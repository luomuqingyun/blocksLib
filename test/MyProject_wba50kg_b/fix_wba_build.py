# fix_wba_build.py v12 (含中文注释)
import os
from collections import deque

# 导入 PlatformIO 的全局构建环境
Import("env")

# 初始化项目环境对象
# 在 PlatformIO 中，projenv 通常用于编译项目的 src 目录
projenv = None
try:
    # 尝试导入 projenv，这在某些编译阶段可能会失败，所以使用 try/except
    Import("projenv")
    # 如果导入成功，projenv 现在就在当前脚本的命名空间中
except:
    pass

# 获取板卡配置信息，用于判断是否为 WBA 系列
board = env.BoardConfig()
mcu = board.get("build.mcu", "").lower()

def to_list(items):
    """安全地将 SCons 的属性列表、双端队列或其他可迭代对象转换为标准 Python 列表。"""
    if items is None: return []
    if isinstance(items, list): return items
    if isinstance(items, (tuple, deque)): return list(items)
    try:
        # 处理 SCons.Util.CLVar 或其他 SCons 特有类型，将其元素转换为字符串
        return [str(x) for x in items]
    except:
        return [items]

def purge_wb_defines(defines):
    """从宏定义列表中移除 STM32WBxx，防止 stm32_def.h 错误识别芯片系列。"""
    raw_list = to_list(defines)
    new_defines = []
    purged = []
    
    for item in raw_list:
        is_wb = False
        item_str = str(item)
        # 匹配包含 "STM32WBxx" 但不包含 "STM32WBAxx" 的项
        if "STM32WBxx" in item_str and "STM32WBAxx" not in item_str:
            is_wb = True
        
        if is_wb:
            purged.append(item_str)
        else:
            # 保持原有的元组（如宏的值定义）或字符串
            if isinstance(item, (list, tuple)) and len(item) >= 2:
                new_defines.append((str(item[0]), str(item[1])))
            else:
                new_defines.append(item)
    
    return new_defines, purged

def redirect_wb_paths(paths):
    """将所有指向 STM32WBxx 的包含路径替换为对应的 STM32WBAxx 路径。"""
    raw_list = to_list(paths)
    new_paths = []
    replaced = []
    for p in raw_list:
        p_str = str(p)
        # 同样的逻辑：识别 WB 路径并替换为 WBA
        if "STM32WBxx" in p_str and "STM32WBAxx" not in p_str:
            new_p = p_str.replace("STM32WBxx", "STM32WBAxx")
            new_paths.append(new_p)
            replaced.append(f"{p_str} -> {new_p}")
        else:
            new_paths.append(p)
    return new_paths, replaced

def apply_wba_fix(target_env, label="env"):
    """为指定的环境对象应用完整的 WBA 构建修复逻辑。"""
    if target_env is None: return
    print(f">>> [WBA Fix v12] 正在修复 {label} 环境...")
    
    # 1. 立即清理当前的宏定义
    d, purged = purge_wb_defines(target_env.get("CPPDEFINES", []))
    if purged:
        print(f"    [{label}] 已移除冲突宏: {', '.join(purged)}")
    
    # 确保强制开启 STM32WBAxx 定义
    if "STM32WBAxx" not in str(d):
        d.append("STM32WBAxx")
    
    # 补齐某些 HAL 库中缺失的 EXTI 基础定义（避免编译报错）
    if "EXTI_IMR1_IM10" not in str(d): d.append(("EXTI_IMR1_IM10", "0"))
    if "EXTI_IMR1_IM11" not in str(d): d.append(("EXTI_IMR1_IM11", "0"))

    # 应用修改后的宏定义列表
    target_env.Replace(CPPDEFINES=d)
    
    # 2. 立即修正当前的包含路径
    p, replaced = redirect_wb_paths(target_env.get("CPPPATH", []))
    if replaced:
        print(f"    [{label}] 已重定向包含路径数量: {len(replaced)}")
    target_env.Replace(CPPPATH=p)

    # 3. 注册“构建中间件”，用于在编译每一项（.c/.cpp）前动态拦截
    # 这是为了解决某些库在编译过程中又被平台脚本重新注入 WB 定义的情况
    def wba_purge_middleware(cppdefines, cpppath, libpath, env=target_env):
        d, purged = purge_wb_defines(cppdefines)
        p, replaced = redirect_wb_paths(cpppath)
        
        # 在动态拦截中同样确保正确宏定义的注入
        if "STM32WBAxx" not in str(d): d.append("STM32WBAxx")
        if "EXTI_IMR1_IM10" not in str(d): d.append(("EXTI_IMR1_IM10", "0"))
        if "EXTI_IMR1_IM11" not in str(d): d.append(("EXTI_IMR1_IM11", "0"))
        
        if purged or replaced:
            # 只有在真正拦截到 WB 相关内容时才打印，减少噪音
            print(f"    [Interceptor] 在 {label} 环境动态编译中拦截并修正了 WB 冲突信息！")
            
        return d, p, libpath

    # 将拦截器加入 SCons 构建链
    target_env.AddBuildMiddleware(wba_purge_middleware)

# 仅当检测到 MCU 型号属于 stm32wba 系列时运行
if "stm32wba" in mcu:
    # 修复全局环境
    apply_wba_fix(env, "env")
    
    # 检查 projenv 是否被导入（PIO 会区分项目环境和库编译环境）
    current_projenv = locals().get("projenv", None)
    if current_projenv and current_projenv != env:
        # 对项目特定环境应用相同的修复
        apply_wba_fix(current_projenv, "projenv")
    
    print(">>> [WBA Fix v12] 构建拦截器已就绪。\n")
