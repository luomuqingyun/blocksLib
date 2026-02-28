// ----------------------------------------------------------------------------
// 顶部工具栏组件 (Top Bar Component)
// ----------------------------------------------------------------------------
// 应用程序顶部工具栏，包含:
// - 项目操作: 新建、打开、保存、导出
// - 编译操作: 编译、上传
// - 串口选择: 端口下拉、刷新
// - 设置入口: 应用设置、项目设置、扩展
// 
// 使用 useToolbarActions Hook 聚合多个 Context，降低组件耦合度
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------

import React from 'react';
import { Board } from '../../types/board';
import {
    FilePlus, FolderOpen, Save, SaveAll, FileCode,
    Settings, RefreshCw, Play, Upload, Puzzle, FileInput, X, Sliders,
    Sun, Moon, Grid3X3, Box, Cpu, Eraser
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BoardRegistry } from '../../registries/BoardRegistry';
import { boardRepository } from '../../data/BoardRepository';
import { useBoards } from '../../hooks/useBoards';
import { useToolbarActions } from '../../hooks/useToolbarActions';
import { getI18nString } from '../../utils/i18n_utils';

export const TopBar: React.FC = () => {
    const { t, i18n } = useTranslation();
    const boards = useBoards();

    // 使用聚合 Hook 替代 4 个独立 Context 调用 (串口、项目、构建、UI)
    const { serial, project, build, ui } = useToolbarActions();
    const config = build.config;

    /**
     * 处理上传逻辑
     * 调用 build 模块的上传功能，并传入当前选中的串口端口
     */
    const handleUpload = async () => {
        await build.uploadProject(serial.selectedPort);
    };

    return (
        <div className="h-12 bg-[#252526] border-b border-[#333] flex items-center px-3 gap-2 select-none shadow-sm z-10">
            {/* 项目名称显示区域 */}
            <div className="flex items-center gap-2 mr-2">
                <span className="text-blue-500 font-bold text-sm">EmbedBlocks</span>
                {project.projectMetadata?.name && (
                    <>
                        <span className="text-slate-600">/</span>
                        <span className="text-slate-200 text-sm font-medium">{project.projectMetadata.name}</span>
                        {/* 关闭当前项目按钮 */}
                        <button
                            onClick={project.closeProject}
                            className="ml-2 p-0.5 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded transition-colors"
                            title={t('app.closeProject') || "Close Project"}
                        >
                            <X size={14} />
                        </button>
                    </>
                )}
            </div>

            <div className="h-5 w-px bg-[#3e3e42] mx-1"></div>

            {/* 文件操作组: 新建、打开、保存、另存为、导入 */}
            <div className="flex items-center gap-1">
                <button onClick={project.newProject} className="p-1.5 hover:bg-[#37373d] rounded-md text-slate-400 hover:text-slate-100 transition-all" title={t('app.newProject')}><FilePlus size={18} /></button>
                <button onClick={project.openProject} className="p-1.5 hover:bg-[#37373d] rounded-md text-slate-400 hover:text-slate-100 transition-all" title={t('app.openProject')}><FolderOpen size={18} /></button>
                <button onClick={project.saveProject} className="p-1.5 hover:bg-[#37373d] rounded-md text-slate-400 hover:text-slate-100 transition-all" title={t('app.save')}><Save size={18} /></button>
                <button onClick={project.saveProjectAs} className="p-1.5 hover:bg-[#37373d] rounded-md text-slate-400 hover:text-slate-100 transition-all" title={t('app.saveAs')}><SaveAll size={18} /></button>
                <div className="h-5 w-px bg-[#3e3e42] mx-1"></div>
                <button onClick={project.importBlocklyJson} className="p-1.5 hover:bg-[#37373d] rounded-md text-slate-400 hover:text-slate-100 transition-all" title={t('app.importJson')}><FileInput size={18} /></button>
            </div>

            <div className="h-5 w-px bg-[#3e3e42] mx-1"></div>

            {/* 工具组: 导出代码、扩展中心、项目设置、全局设置 */}
            <div className="flex items-center gap-1">
                <button onClick={project.exportCode} className="p-1.5 hover:bg-[#37373d] rounded-md text-slate-400 hover:text-slate-100 transition-all" title={t('app.exportCode')}><FileCode size={18} /></button>
                <div className="h-5 w-px bg-[#3e3e42] mx-1"></div>
                <button onClick={ui.openExtensions} className="p-1.5 hover:bg-[#37373d] rounded-md text-slate-400 hover:text-slate-100 transition-all" title={t('app.extensions') || "Extensions"}><Puzzle size={18} /></button>
                <button onClick={ui.openProjectSettings} className="p-1.5 hover:bg-[#37373d] rounded-md text-slate-400 hover:text-slate-100 transition-all" title={t('settings.projectSettings') || "Project Settings"}><Sliders size={18} /></button>
                <button onClick={ui.openSettings} className="p-1.5 hover:bg-[#37373d] rounded-md text-slate-400 hover:text-slate-100 transition-all" title={t('app.settings')}><Settings size={18} /></button>
                <div className="h-5 w-px bg-[#3e3e42] mx-1"></div>

                {/* [NEW] 快捷外观设置组 */}
                <div className="flex items-center gap-1 bg-black/20 rounded-lg px-1 py-0.5 border border-white/5">
                    {/* 主题切换按钮 */}
                    <button
                        onClick={() => {
                            const newTheme = config.appearance?.theme === 'light' ? 'dark' : 'light';
                            build.updateConfig('appearance.theme', newTheme);
                        }}
                        className={`p-1.5 rounded-md transition-all ${config.appearance?.theme === 'light' ? 'text-orange-400 hover:bg-orange-400/10' : 'text-blue-400 hover:bg-blue-400/10'}`}
                        title={t('settings.theme')}
                    >
                        {config.appearance?.theme === 'light' ? <Sun size={16} /> : <Moon size={16} />}
                    </button>
                    {/* 栅格切换按钮 */}
                    <button
                        onClick={() => {
                            const newGrid = !(config.appearance?.showGrid ?? true);
                            build.updateConfig('appearance.showGrid', newGrid);
                        }}
                        className={`p-1.5 rounded-md transition-all ${config.appearance?.showGrid !== false ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-800'}`}
                        title={t('settings.showGrid')}
                    >
                        <Grid3X3 size={16} />
                    </button>
                </div>
            </div>

            <div className="h-5 w-px bg-[#3e3e42] mx-1"></div>

            {/* 硬件配置组: 串口选择和开发板显示 */}
            <div className="flex items-center gap-3">
                {/* 串口端口选择器 */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-mono whitespace-nowrap hidden xl:inline">{t('app.port')}:</span>
                    <div className="relative w-fit group">
                        {/* 测量用的隐藏文本 (Measuring Span) - 强制容器宽度与当前选中内容一致 */}
                        <div className="invisible px-2 py-1.5 text-xs font-medium whitespace-nowrap min-w-[80px] max-w-[300px]">
                            {(() => {
                                const p = serial.ports.find(p => p.path === serial.selectedPort);
                                return p ? `${p.friendlyName || p.path} (${p.manufacturer || 'Unknown'})` : (serial.selectedPort || '');
                            })()}
                            {/* 为右侧自定义箭头预留空间 */}
                            <span className="inline-block w-6"></span>
                        </div>

                        {/* 实际的选择框 - 绝对定位覆盖在测量层之上 */}
                        <select
                            className="absolute inset-0 w-full h-full bg-[#333] hover:bg-[#3c3c3c] text-xs text-slate-200 rounded px-2 py-1.5 outline-none border border-transparent focus:border-blue-500 transition-colors appearance-none cursor-pointer pr-8 whitespace-nowrap"
                            value={serial.selectedPort}
                            onChange={(e) => serial.setSelectedPort(e.target.value)}
                        >
                            {serial.ports.map(port => (
                                <option key={port.path} value={port.path} className="bg-[#252526]">
                                    {port.friendlyName || port.path} ({port.manufacturer || 'Unknown'})
                                </option>
                            ))}
                        </select>
                        {/* 自定义下拉箭头 */}
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </div>
                    </div>
                    {/* 刷新端口列表按钮 */}
                    <button onClick={serial.refreshPorts} className="p-1.5 hover:bg-[#37373d] rounded text-slate-400 hover:text-slate-100" title={t('app.refreshPorts') || "Refresh Ports"}>
                        <RefreshCw size={14} />
                    </button>
                </div>

                {/* 开发板显示 (只读，项目内不建议切换以保证环境稳定性) */}
                <div className="flex items-center gap-2 px-2 py-1.5 bg-[#333]/50 rounded border border-white/5 text-slate-400 cursor-default">
                    <span className="text-xs font-mono whitespace-nowrap hidden xl:inline">{t('app.board')}:</span>
                    <div className="flex items-center gap-2">
                        {(() => {
                            const board = BoardRegistry.get(build.selectedBoard);
                            const family = board?.family || 'unknown';
                            return (
                                <>
                                    {family === 'arduino' ? <Box size={14} className="text-teal-400 opacity-70" /> :
                                        family === 'esp32' ? <Box size={14} className="text-orange-400 opacity-70" /> :
                                            <Cpu size={14} className="text-blue-400 opacity-70" />}
                                    <span className="text-xs font-semibold whitespace-nowrap">
                                        {board ? getI18nString(board.name, i18n.language) : build.selectedBoard}
                                    </span>
                                </>
                            );
                        })()}
                    </div>
                </div>
            </div>

            {/* 操作按钮组: 清理、编译和上传 */}
            <div className="flex items-center gap-1 ml-auto">
                {/* 清理构建按钮 */}
                <button
                    onClick={build.cleanProject}
                    className="flex items-center gap-2 bg-[#444] hover:bg-[#555] text-slate-200 px-3 py-1.5 rounded-sm text-xs font-medium transition-colors mr-1"
                    title={t('app.cleanBuild', '清理构建产物 (Clean Build)')}
                >
                    <Eraser size={14} />
                    <span className="hidden lg:inline">{t('app.clean', '清理')}</span>
                </button>
                {/* 编译按钮 */}
                <button
                    onClick={build.buildProject}
                    className="flex items-center gap-2 bg-[#0e639c] hover:bg-[#1177bb] text-white px-3 py-1.5 rounded-sm text-xs font-medium transition-colors"
                    title={t('app.build')}
                >
                    <Play size={14} fill="currentColor" />
                    <span className="hidden lg:inline">{t('app.build')}</span>
                </button>
                {/* 上传按钮 */}
                <button
                    onClick={handleUpload}
                    className="flex items-center gap-2 bg-[#0e639c] hover:bg-[#1177bb] text-white px-3 py-1.5 rounded-sm text-xs font-medium transition-colors ml-1"
                    title={t('app.upload')}
                >
                    <Upload size={14} />
                    <span className="hidden lg:inline">{t('app.upload')}</span>
                </button>
            </div>
        </div>
    );
};
