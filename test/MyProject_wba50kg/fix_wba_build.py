# fix_wba_build.py v14 (日志英文，注释中文)
import os
from collections import deque

# 导入 PlatformIO 的全局构建环境
Import("env")

# 初始化项目环境对象
projenv = None
try:
    Import("projenv")
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
        if "STM32WBxx" in item_str and "STM32WBAxx" not in item_str:
            is_wb = True
        
        if is_wb:
            purged.append(item_str)
        else:
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
        if "STM32WBxx" in p_str and "STM32WBAxx" not in p_str:
            new_p = p_str.replace("STM32WBxx", "STM32WBAxx")
            new_paths.append(new_p)
            replaced.append(p_str)
        else:
            new_paths.append(p)
    return new_paths, replaced

def apply_wba_fix(target_env, label="env"):
    """为指定的环境对象应用完整的 WBA 构建修复逻辑。"""
    if target_env is None: return
    # 这里的 print 使用纯英文，避免 Windows 终端乱码
    print(">>> [WBA Fix v14] Patching %s environment..." % label)
    
    # 1. 清理宏定义
    d, purged = purge_wb_defines(target_env.get("CPPDEFINES", []))
    if purged:
        print("    [%s] Purged conflicting defines: %s" % (label, ", ".join(purged)))
    
    if "STM32WBAxx" not in str(d):
        d.append("STM32WBAxx")
    
    # 补齐部分硬件缺失的宏
    if "EXTI_IMR1_IM10" not in str(d): d.append(("EXTI_IMR1_IM10", "0"))
    if "EXTI_IMR1_IM11" not in str(d): d.append(("EXTI_IMR1_IM11", "0"))

    target_env.Replace(CPPDEFINES=d)
    
    # 2. 修正路径
    p, replaced = redirect_wb_paths(target_env.get("CPPPATH", []))
    if replaced:
        print("    [%s] Redirected %d include paths from WB to WBA." % (label, len(replaced)))
    target_env.Replace(CPPPATH=p)

    # 3. 注册构建拦截中间件
    def wba_purge_middleware(cppdefines, cpppath, libpath, env=target_env):
        d, purged = purge_wb_defines(cppdefines)
        p, replaced = redirect_wb_paths(cpppath)
        
        if "STM32WBAxx" not in str(d): d.append("STM32WBAxx")
        if "EXTI_IMR1_IM10" not in str(d): d.append(("EXTI_IMR1_IM10", "0"))
        if "EXTI_IMR1_IM11" not in str(d): d.append(("EXTI_IMR1_IM11", "0"))
        
        return d, p, libpath

    target_env.AddBuildMiddleware(wba_purge_middleware)

# 仅当检测到芯片为 WBA 系列时运行
if "stm32wba" in mcu:
    apply_wba_fix(env, "env")
    
    current_projenv = locals().get("projenv", None)
    if current_projenv and current_projenv != env:
        apply_wba_fix(current_projenv, "projenv")
    
    print(">>> [WBA Fix v14] Interceptor is active.\n")
