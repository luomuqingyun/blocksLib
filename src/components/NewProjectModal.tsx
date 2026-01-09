// ----------------------------------------------------------------------------
// 新建项目模态框 (New Project Modal)
// ----------------------------------------------------------------------------
// 改进版: 支持标准/高级视图双模式选择
// - Standard: 常用板卡 (列表视图 + 预览)
// - Advanced: STM32全系列 (层级树视图 + 预览)
// ----------------------------------------------------------------------------

import React, { useState, useEffect, useMemo } from 'react';
import { X, FolderPlus, Folder, AlertCircle, Download, ChevronRight, ChevronDown, Cpu, Box } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFileSystem } from '../contexts/FileSystemContext';
import { useUI } from '../contexts/UIContext';
import { BaseModal } from './BaseModal';
import { BoardPreview } from './BoardPreview';
import { getI18nString } from '../utils/i18n_utils';

// Import Data (Moved to src/data)
import standardDataRaw from '../data/standard_board_data.json';
import stm32DataRaw from '../data/stm32_board_data.json';

const standardData: any = standardDataRaw;
const stm32Data: any = stm32DataRaw;

export const NewProjectModal: React.FC = () => {
    const { t, i18n } = useTranslation();
    const {
        isNewProjectOpen, setIsNewProjectOpen,
        isSaveAsOpen, setIsSaveAsOpen,
        setIsExtensionsOpen
    } = useUI();
    const { createNewProject, workDir, handleSetWorkDir, performSaveAs, projectMetadata } = useFileSystem();

    const isOpen = isNewProjectOpen || isSaveAsOpen;
    const isSaveAs = isSaveAsOpen;

    // ----- State -----
    const [projectName, setProjectName] = useState('MyProject');
    const [parentDir, setParentDir] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const nameInputRef = React.useRef<HTMLInputElement>(null);

    // UI State
    const [activeTab, setActiveTab] = useState<'standard' | 'advanced'>('standard');
    const [selectedBoardId, setSelectedBoardId] = useState<string>('');
    const [selectedBoardData, setSelectedBoardData] = useState<any>(null); // For preview

    // STM32 Tree State
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

    // Window Dragging
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // ----- Effects -----

    // Center on open & Init
    useEffect(() => {
        if (isOpen) {
            setPos({ x: (window.innerWidth - 800) / 2, y: (window.innerHeight - 600) / 2 });
            setErrorMessage(null);

            if (isSaveAs) {
                const currentName = projectMetadata?.name || 'MyProject';
                setProjectName(`${currentName}_copy`);
                // Restore board if possible (flat check)
                // If ID exists in standard, switch to standard. If in STM32, switch.
            } else {
                if (projectName === 'MyProject' || !projectName) setProjectName('MyProject');

                // Default Selection: Arduino Uno
                if (!selectedBoardId) {
                    // Try to find Uno in standard data
                    const uno = standardData['Arduino']?.find((b: any) => b.id === 'uno');
                    if (uno) handleSelectBoard(uno);
                }
            }

            setParentDir(workDir);

            // Focus Name
            setTimeout(() => {
                nameInputRef.current?.focus();
                nameInputRef.current?.select();
            }, 50);
        }
    }, [isOpen]);

    // Update parent dir if global workDir changes while open
    useEffect(() => {
        if (isOpen) setParentDir(workDir);
    }, [workDir, isOpen]);

    // Dragging Logic
    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (isDragging) setPos({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
        };
        const onMouseUp = () => setIsDragging(false);
        if (isDragging) {
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [isDragging, dragOffset]);

    // ----- Handlers -----

    const handleSelectBoard = (board: any) => {
        setSelectedBoardId(board.id);
        setSelectedBoardData(board);
    };

    const toggleNode = (nodeName: string) => {
        const newSet = new Set(expandedNodes);
        if (newSet.has(nodeName)) newSet.delete(nodeName);
        else newSet.add(nodeName);
        setExpandedNodes(newSet);
    };

    const handleClose = () => {
        setIsNewProjectOpen(false);
        setIsSaveAsOpen(false);
    };

    const handleConfirm = async () => {
        setErrorMessage(null);
        if (!projectName.trim()) return setErrorMessage(t('dialog.enterProjectName'));
        if (!parentDir) return setErrorMessage(t('dialog.selectParentDir'));
        if (!selectedBoardId && !isSaveAs) return setErrorMessage(t('dialog.selectBoard'));

        if (isSaveAs) {
            const res = await performSaveAs(projectName, parentDir);
            if (res.success) handleClose();
            else setErrorMessage(res.error || 'Save As failed');
        } else {
            // Note: Currently creating project just with ID.
            // Future: Pass extra variant path data if needed.
            const res = await createNewProject(projectName, selectedBoardId, parentDir);
            if (res.success) handleClose();
            else setErrorMessage(res.error || 'Creation failed');
        }
    };

    // ----- Render Helpers -----

    const renderStandardList = () => (
        <div className="space-y-4">
            {Object.entries(standardData).map(([category, boards]: [string, any]) => (
                <div key={category}>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">{category}</h3>
                    <div className="space-y-1">
                        {boards.map((board: any) => (
                            <button
                                key={board.id}
                                onClick={() => handleSelectBoard(board)}
                                className={`w-full text-left px-3 py-2 rounded flex items-center justify-between group transition-colors ${selectedBoardId === board.id
                                        ? 'bg-blue-600/20 text-blue-300 border border-blue-600/50'
                                        : 'hover:bg-[#333] text-slate-300 border border-transparent'
                                    }`}
                            >
                                <span className="text-sm truncate">{board.name}</span>
                                {selectedBoardId === board.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );

    const renderSTM32Tree = (data: any, pathIdx = 0) => {
        // Recursive tree renderer for STM32 structure
        // Structure: { STM32: { STM32F0: { ...vars... }, STM32F1: { ... } } }
        // Or if it's already the sub-object.

        if (!data || typeof data !== 'object') return null;

        return (
            <div className="pl-2 border-l border-slate-700/50 space-y-1">
                {Object.entries(data).map(([key, value]: [string, any]) => {
                    const isLeaf = value.id && value.mcu; // It's a board definition
                    const id = isLeaf ? value.id : key;
                    const isExpanded = expandedNodes.has(key);

                    if (isLeaf) {
                        // Leaf Node (Board)
                        // Note: In refined data, leaves might be inside an array or directly objects.
                        // stm32_board_data structure: { STM32: { Series: { Board: { info } } } }
                        return (
                            <button
                                key={value.id}
                                onClick={() => handleSelectBoard(value)}
                                className={`w-full text-left px-2 py-1.5 rounded flex items-center gap-2 text-sm ${selectedBoardId === value.id
                                        ? 'bg-purple-600/20 text-purple-300'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#333]'
                                    }`}
                            >
                                <Box size={14} className="opacity-70" />
                                <span className="truncate">{key}</span>
                            </button>
                        );
                    } else {
                        // Directory Node (Series/Group)
                        return (
                            <div key={key}>
                                <button
                                    onClick={() => toggleNode(key)}
                                    className="w-full flex items-center gap-1.5 px-2 py-1 text-slate-300 hover:text-white text-sm font-medium hover:bg-[#333] rounded"
                                >
                                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    {key}
                                </button>
                                {isExpanded && renderSTM32Tree(value, pathIdx + 1)}
                            </div>
                        );
                    }
                })}
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <BaseModal isOpen={isOpen} onClose={handleClose}>
            <div
                style={{ left: pos.x, top: pos.y }}
                className="absolute bg-[#1e1e1e] w-[800px] h-[600px] rounded-lg shadow-2xl border border-slate-700 flex flex-col overflow-hidden pointer-events-auto"
            >
                {/* Header */}
                <div
                    className="flex justify-between items-center p-3 border-b border-slate-700 bg-[#252526] cursor-move select-none"
                    onMouseDown={(e) => { setIsDragging(true); setDragOffset({ x: e.clientX - pos.x, y: e.clientY - pos.y }); }}
                >
                    <h2 className="text-md font-bold text-slate-200 flex items-center gap-2 pointer-events-none">
                        <FolderPlus size={18} className="text-blue-500" />
                        {isSaveAs ? t('menu.saveAs') : t('app.newProject')}
                    </h2>
                    <button onClick={handleClose} className="text-slate-400 hover:text-white p-1 rounded hover:bg-[#333]" onMouseDown={e => e.stopPropagation()}>
                        <X size={20} />
                    </button>
                </div>

                {/* Main Content Area: Master-Detail Layout */}
                <div className="flex-1 flex overflow-hidden">

                    {/* Left: Input & List */}
                    <div className="w-[300px] flex flex-col border-r border-slate-700 bg-[#1e1e1e]">

                        {/* Top Config Section */}
                        <div className="p-4 space-y-4 border-b border-slate-700 select-text">
                            {/* Project Name */}
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-400 uppercase">{t('app.projectName')}</label>
                                <input
                                    ref={nameInputRef}
                                    type="text"
                                    value={projectName}
                                    onChange={(e) => { setProjectName(e.target.value); setErrorMessage(null); }}
                                    className="w-full bg-[#2a2a2a] border border-slate-600 rounded px-2 py-1.5 text-slate-200 text-sm focus:border-blue-500 outline-none"
                                    placeholder="MyNewRobot"
                                    spellCheck={false}
                                />
                            </div>

                            {/* Location */}
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-400 uppercase">{t('app.location')}</label>
                                <div className="flex gap-1">
                                    <input
                                        type="text" value={parentDir} readOnly
                                        className="flex-1 bg-[#2a2a2a] border border-slate-600 rounded px-2 py-1.5 text-slate-400 text-xs font-mono truncate cursor-not-allowed"
                                    />
                                    <button onClick={handleSetWorkDir} className="bg-[#333] hover:bg-[#444] border border-slate-600 text-slate-200 px-2 rounded">
                                        <Folder size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        {!isSaveAs && (
                            <div className="flex border-b border-slate-700">
                                <button
                                    onClick={() => setActiveTab('standard')}
                                    className={`flex-1 py-2 text-xs font-medium transition-colors ${activeTab === 'standard' ? 'bg-[#1e1e1e] text-blue-400 border-b-2 border-blue-500' : 'bg-[#252526] text-slate-500 hover:text-slate-300'}`}
                                >
                                    Standard
                                </button>
                                <button
                                    onClick={() => setActiveTab('advanced')}
                                    className={`flex-1 py-2 text-xs font-medium transition-colors ${activeTab === 'advanced' ? 'bg-[#1e1e1e] text-purple-400 border-b-2 border-purple-500' : 'bg-[#252526] text-slate-500 hover:text-slate-300'}`}
                                >
                                    STM32 / Advanced
                                </button>
                            </div>
                        )}

                        {/* List Area */}
                        {!isSaveAs ? (
                            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-700">
                                {activeTab === 'standard' ? renderStandardList() : renderSTM32Tree(stm32Data['STM32'] || stm32Data)}
                            </div>
                        ) : (
                            <div className="flex-1 p-4 text-center text-slate-500 text-sm flex flex-col justify-center items-center">
                                <AlertCircle size={24} className="mb-2" />
                                Board selection locked<br />in Save As mode.
                            </div>
                        )}

                    </div>

                    {/* Right: Preview Panel */}
                    <div className="flex-1 bg-[#1e1e1e] p-6 flex flex-col">
                        <label className="text-xs font-medium text-slate-500 uppercase mb-3 block">Selection Preview</label>
                        {selectedBoardData ? (
                            <BoardPreview
                                name={selectedBoardData.name || selectedBoardData.id}
                                description={selectedBoardData.description || t('board.noDescription')}
                                specs={selectedBoardData.specs} // e.g. "32k Flash"
                                images={selectedBoardData.images}
                                pageUrl={selectedBoardData.page_url}
                                className="flex-1 shadow-lg"
                            />
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 border border-slate-700 border-dashed rounded-lg bg-[#252526]/50">
                                <Cpu size={48} className="mb-2 opacity-50" />
                                <span className="text-sm">Select a board to view details</span>
                            </div>
                        )}

                        {/* Extension Import Link */}
                        {!isSaveAs && (
                            <div className="mt-4 flex justify-end">
                                <button onClick={() => setIsExtensionsOpen(true)} className="text-xs text-blue-500 hover:text-blue-400 flex items-center gap-1">
                                    <Download size={12} /> Import more boards
                                </button>
                            </div>
                        )}
                    </div>

                </div>

                {/* Footer Buttons */}
                <div className="p-4 bg-[#252526] border-t border-slate-700 flex justify-end gap-3 items-center">
                    {errorMessage && <span className="text-red-400 text-xs mr-auto">{errorMessage}</span>}

                    <button onClick={handleClose} className="px-4 py-2 hover:bg-[#333] text-slate-300 rounded text-sm transition-colors">
                        {t('dialog.cancel')}
                    </button>
                    <button
                        onClick={handleConfirm}
                        className={`px-6 py-2 rounded text-sm font-medium transition-colors shadow-lg ${!projectName || !selectedBoardId
                                ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                    >
                        {isSaveAs ? t('app.saveAs') : t('dialog.create')}
                    </button>
                </div>
            </div>
        </BaseModal>
    );
};
