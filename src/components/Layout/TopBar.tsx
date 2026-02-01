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
    Settings, RefreshCw, Play, Upload, Puzzle, FileInput, X, Sliders
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

    // 使用聚合 Hook 替代 4 个独立 Context 调用
    const { serial, project, build, ui } = useToolbarActions();

    const handleUpload = async () => {
        await build.uploadProject(serial.selectedPort);
    };

    return (
        <div className="h-12 bg-[#252526] border-b border-[#333] flex items-center px-3 gap-2 select-none shadow-sm z-10">
            {/* Project Name Display */}
            <div className="flex items-center gap-2 mr-2">
                <span className="text-blue-500 font-bold text-sm">EmbedBlocks</span>
                {project.projectMetadata?.name && (
                    <>
                        <span className="text-slate-600">/</span>
                        <span className="text-slate-200 text-sm font-medium">{project.projectMetadata.name}</span>
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

            {/* File Operations Group */}
            <div className="flex items-center gap-1">
                <button onClick={project.newProject} className="p-1.5 hover:bg-[#37373d] rounded-md text-slate-400 hover:text-slate-100 transition-all" title={t('app.newProject')}><FilePlus size={18} /></button>
                <button onClick={project.openProject} className="p-1.5 hover:bg-[#37373d] rounded-md text-slate-400 hover:text-slate-100 transition-all" title={t('app.openProject')}><FolderOpen size={18} /></button>
                <button onClick={project.saveProject} className="p-1.5 hover:bg-[#37373d] rounded-md text-slate-400 hover:text-slate-100 transition-all" title={t('app.save')}><Save size={18} /></button>
                <button onClick={project.saveProjectAs} className="p-1.5 hover:bg-[#37373d] rounded-md text-slate-400 hover:text-slate-100 transition-all" title={t('app.saveAs')}><SaveAll size={18} /></button>
                <div className="h-5 w-px bg-[#3e3e42] mx-1"></div>
                <button onClick={project.importBlocklyJson} className="p-1.5 hover:bg-[#37373d] rounded-md text-slate-400 hover:text-slate-100 transition-all" title={t('app.importJson')}><FileInput size={18} /></button>
            </div>

            <div className="h-5 w-px bg-[#3e3e42] mx-1"></div>

            {/* Tools Group */}
            <div className="flex items-center gap-1">
                <button onClick={project.exportCode} className="p-1.5 hover:bg-[#37373d] rounded-md text-slate-400 hover:text-slate-100 transition-all" title={t('app.exportCode')}><FileCode size={18} /></button>
                <div className="h-5 w-px bg-[#3e3e42] mx-1"></div>
                <button onClick={ui.openExtensions} className="p-1.5 hover:bg-[#37373d] rounded-md text-slate-400 hover:text-slate-100 transition-all" title={t('app.extensions') || "Extensions"}><Puzzle size={18} /></button>
                <button onClick={ui.openProjectSettings} className="p-1.5 hover:bg-[#37373d] rounded-md text-slate-400 hover:text-slate-100 transition-all" title={t('settings.projectSettings') || "Project Settings"}><Sliders size={18} /></button>
                <button onClick={ui.openSettings} className="p-1.5 hover:bg-[#37373d] rounded-md text-slate-400 hover:text-slate-100 transition-all" title={t('app.settings')}><Settings size={18} /></button>
            </div>

            <div className="h-5 w-px bg-[#3e3e42] mx-1"></div>

            {/* Hardware Settings Group */}
            <div className="flex items-center gap-3 flex-1 overflow-hidden">
                {/* Port Selector */}
                <div className="flex items-center gap-2 min-w-[120px] max-w-[200px]">
                    <span className="text-xs text-slate-500 font-mono whitespace-nowrap hidden xl:inline">{t('app.port')}:</span>
                    <div className="relative flex-1">
                        <select
                            className="w-full bg-[#333] hover:bg-[#3c3c3c] text-xs text-slate-200 rounded px-2 py-1.5 outline-none border border-transparent focus:border-blue-500 transition-colors appearance-none cursor-pointer truncate pr-6"
                            value={serial.selectedPort}
                            onChange={(e) => serial.setSelectedPort(e.target.value)}
                            title={t('dialog.selectPort')}
                        >
                            <option value="">{t('dialog.selectPort')}</option>
                            {serial.ports.map(port => (
                                <option key={port.path} value={port.path}>
                                    {port.friendlyName || port.path} ({port.manufacturer || 'Unknown'})
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </div>
                    </div>
                    <button onClick={serial.refreshPorts} className="p-1.5 hover:bg-[#37373d] rounded text-slate-400 hover:text-slate-100" title={t('app.refreshPorts') || "Refresh Ports"}>
                        <RefreshCw size={14} />
                    </button>
                </div>

                {/* Board Selector */}
                <div className="flex items-center gap-2 min-w-[120px] max-w-[200px]">
                    <span className="text-xs text-slate-500 font-mono whitespace-nowrap hidden xl:inline">{t('app.board')}:</span>
                    <div className="relative flex-1">
                        <select
                            className={`w-full bg-[#333] hover:bg-[#3c3c3c] text-xs text-slate-200 rounded px-2 py-1.5 outline-none border border-transparent focus:border-blue-500 transition-colors appearance-none cursor-pointer truncate pr-6 ${project.projectMetadata ? 'border-amber-500/30' : ''}`}
                            value={build.selectedBoard}
                            onChange={(e) => {
                                const newBoardId = e.target.value;
                                if (project.projectMetadata) {
                                    // Smart Lock Check: Ensure new board is same family
                                    const current = BoardRegistry.get(build.selectedBoard);
                                    const target = BoardRegistry.get(newBoardId);
                                    if (current && target && current.family !== target.family) {
                                        alert(`Cannot switch family from ${current.family.toUpperCase()} to ${target.family.toUpperCase()} in an active project. Please create a new project.`);
                                        return;
                                    }
                                    project.updateProjectBoard(newBoardId);
                                }
                                build.setSelectedBoard(newBoardId);
                            }}
                            // Smart Lock: Do NOT disable, just filter visible options (or validate onChange)
                            // Better UX: Show all but filter *rendering* of options or group them?
                            // Implementation: If project active, filter options to same family.
                            title={project.projectMetadata ? "Only compatible boards shown" : "Select Board"}
                        >
                            {(() => {
                                const renderGroups = () => {
                                    const standard = boardRepository.getStandardBoards();
                                    const stm32 = boardRepository.getSTM32Boards().STM32;
                                    const currentBoard = BoardRegistry.get(build.selectedBoard);

                                    const filterBoard = (b: any) => {
                                        if (!project.projectMetadata) return true;
                                        return currentBoard && b.family === currentBoard.family;
                                    };

                                    const groups = [];

                                    // 1. Standard Boards (Arduino, ESP32, etc.)
                                    Object.entries(standard).forEach(([category, boards]) => {
                                        const typedBoards = boards as unknown as Board[];
                                        const filtered = typedBoards.filter(filterBoard);
                                        if (filtered.length > 0) {
                                            groups.push(
                                                <optgroup key={category} label={category}>
                                                    {filtered.map(b => (
                                                        <option key={b.id} value={b.id}>
                                                            {getI18nString(b.name, i18n.language)}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            );
                                        }
                                    });

                                    // 2. STM32 Boards (Grouped by Series)
                                    Object.entries(stm32).forEach(([series, boards]: [string, any[]]) => {
                                        const filtered = boards.filter(filterBoard);
                                        if (filtered.length > 0) {
                                            groups.push(
                                                <optgroup key={series} label={series}>
                                                    {filtered.map(b => (
                                                        <option key={b.id} value={b.id}>
                                                            {getI18nString(b.name, i18n.language)}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            );
                                        }
                                    });

                                    return groups;
                                };

                                return renderGroups();
                            })()}
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons Group */}
            <div className="flex items-center gap-1 ml-auto">
                <button
                    onClick={build.buildProject}
                    className="flex items-center gap-2 bg-[#0e639c] hover:bg-[#1177bb] text-white px-3 py-1.5 rounded-sm text-xs font-medium transition-colors"
                    title={t('app.build')}
                >
                    <Play size={14} fill="currentColor" />
                    <span className="hidden lg:inline">{t('app.build')}</span>
                </button>
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
