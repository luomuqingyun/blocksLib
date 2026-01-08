// ----------------------------------------------------------------------------
// 新建项目模态框 (New Project Modal)
// ----------------------------------------------------------------------------
// 双用途对话框:
// - 新建项目: 选择项目名称、位置和开发板类型
// - 另存为: 保存当前项目副本到新位置
// 支持拖拽移动位置
// ----------------------------------------------------------------------------

import React, { useState, useEffect } from 'react';
import { X, FolderPlus, Folder, AlertCircle, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFileSystem } from '../contexts/FileSystemContext';
import { useUI } from '../contexts/UIContext';
import { BoardRegistry } from '../registries/BoardRegistry';
import { useBoards } from '../hooks/useBoards';
import { BaseModal } from './BaseModal';
import { getI18nString } from '../utils/i18n_utils';

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

    const boards = useBoards();
    const [projectName, setProjectName] = useState('MyProject');
    const [selectedBoardId, setSelectedBoardId] = useState(boards.length > 0 ? boards[0].id : '');
    const [parentDir, setParentDir] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const nameInputRef = React.useRef<HTMLInputElement>(null);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Center on open
    useEffect(() => {
        if (isOpen) {
            setPos({
                x: (window.innerWidth - 500) / 2,
                y: (window.innerHeight - 550) / 2
            });
        }
    }, [isOpen]);

    const constrainPos = (px: number, py: number) => {
        const maxX = Math.max(0, window.innerWidth - 500 - 20);
        const maxY = Math.max(0, window.innerHeight - 550 - 20);
        return {
            x: Math.min(Math.max(10, px), maxX),
            y: Math.min(Math.max(10, py), maxY)
        };
    };

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setPos(constrainPos(e.clientX - dragOffset.x, e.clientY - dragOffset.y));
            }
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

    // Initialize state and force focus when modal opens
    useEffect(() => {
        if (isOpen) {
            setErrorMessage(null);

            if (isSaveAs) {
                // Save As Mode initialization
                const currentName = projectMetadata?.name || 'MyProject';
                setProjectName(`${currentName}_copy`);
                if (projectMetadata?.boardId) {
                    setSelectedBoardId(projectMetadata.boardId);
                }
            } else {
                // New Project Mode initialization
                // Only set default name if it's CURRENTLY 'MyProject' or empty (effectively only on first open)
                if (projectName === 'MyProject' || !projectName) {
                    setProjectName('MyProject');
                }

                // Initialize board if not set
                if (!selectedBoardId && boards.length > 0) {
                    setSelectedBoardId(boards[0].id);
                }
            }

            // Focus and select the name input
            const timer = setTimeout(() => {
                if (nameInputRef.current) {
                    nameInputRef.current.focus();
                    nameInputRef.current.select();
                }
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isOpen]); // Only trigger when modal visibility changes

    // Sync parent dir with global workDir (e.g. after Browse)
    useEffect(() => {
        if (isOpen) {
            setParentDir(workDir);
        }
    }, [isOpen, workDir]);

    const handleClose = () => {
        setIsNewProjectOpen(false);
        setIsSaveAsOpen(false);
    };

    const handleConfirm = async () => {
        setErrorMessage(null);
        if (!projectName.trim()) {
            setErrorMessage(t('dialog.enterProjectName'));
            return;
        }
        if (!parentDir) {
            setErrorMessage(t('dialog.selectParentDir'));
            return;
        }

        if (isSaveAs) {
            const result = await performSaveAs(projectName, parentDir);
            if (result.success) {
                handleClose();
            } else {
                setErrorMessage(result.error || 'Save As failed');
            }
        } else {
            const result = await createNewProject(projectName, selectedBoardId, parentDir);
            if (result.success) {
                handleClose();
            } else {
                setErrorMessage(result.error || 'Creation failed');
            }
        }
    };

    const handleBrowse = async () => {
        await handleSetWorkDir();
    };

    if (!isOpen) return null;

    return (
        <BaseModal isOpen={isOpen} onClose={handleClose}>
            <div
                style={{ left: pos.x, top: pos.y }}
                className="absolute bg-[#1e1e1e] w-[500px] rounded-lg shadow-2xl border border-slate-700 flex flex-col overflow-hidden pointer-events-auto"
            >
                <div
                    className="flex justify-between items-center p-4 border-b border-slate-700 bg-[#252526] cursor-move select-none"
                    onMouseDown={(e) => {
                        setIsDragging(true);
                        setDragOffset({ x: e.clientX - pos.x, y: e.clientY - pos.y });
                    }}
                >
                    <h2 className="text-md font-bold text-slate-200 flex items-center gap-2 pointer-events-none">
                        <FolderPlus size={18} className="text-blue-500" />
                        {isSaveAs ? t('menu.saveAs') : t('app.newProject')}
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-[#333] rounded"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Error Message */}
                    {errorMessage && (
                        <div className="bg-red-900/50 border border-red-900 text-red-200 px-4 py-2 rounded text-sm mb-4">
                            {errorMessage}
                        </div>
                    )}

                    {/* Project Name */}
                    <div className="space-y-2 select-text">
                        <label className="block text-sm font-medium text-slate-300">{t('app.projectName')}</label>
                        <input
                            ref={nameInputRef}
                            type="text"
                            value={projectName}
                            onChange={(e) => {
                                setProjectName(e.target.value);
                                if (errorMessage) setErrorMessage(null);
                            }}
                            className="w-full bg-[#333] border border-slate-600 rounded px-3 py-2 text-slate-200 text-sm focus:border-blue-500 outline-none select-text pointer-events-auto cursor-text"
                            placeholder="MyNewRobot"
                            autoFocus
                            spellCheck={false}
                        />
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-300">{t('app.location')}</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={parentDir}
                                readOnly
                                className="flex-1 bg-[#333] border border-slate-600 rounded px-3 py-2 text-slate-400 text-sm font-mono cursor-not-allowed"
                            />
                            <button
                                onClick={handleBrowse}
                                className="bg-[#333] hover:bg-[#444] border border-slate-600 text-slate-200 px-3 py-2 rounded text-sm transition-colors"
                            >
                                <Folder size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Board Selection */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-300">{t('app.board')}</label>
                        <select
                            value={selectedBoardId}
                            onChange={(e) => setSelectedBoardId(e.target.value)}
                            disabled={isSaveAs} // Disabled in Save As mode
                            className={`w-full bg-[#333] border border-slate-600 rounded px-3 py-2 text-slate-200 text-sm focus:border-blue-500 outline-none appearance-none ${isSaveAs ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {boards.map(board => (
                                <option key={board.id} value={board.id}>{getI18nString(board.name, i18n.language)}</option>
                            ))}
                        </select>
                        {!isSaveAs ? (
                            <div className="mt-2 flex items-center justify-between text-[11px]">
                                <span className="text-slate-500 italic">
                                    {t('newProject.cantFindBoard', "Can't find your board?")}
                                </span>
                                <button
                                    onClick={() => setIsExtensionsOpen(true)}
                                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                                >
                                    <Download size={10} />
                                    {t('newProject.importNow', "Import From Extension")}
                                </button>
                            </div>
                        ) : (
                            <p className="text-xs text-slate-500 mt-1">Board cannot be changed during Save As.</p>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-[#252526] border-t border-slate-700 flex justify-end gap-3">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 hover:bg-[#333] text-slate-300 rounded text-sm transition-colors"
                    >
                        {t('dialog.cancel')}
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                    >
                        {isSaveAs ? t('app.saveAs') : t('dialog.create')}
                    </button>
                </div>
            </div>
        </BaseModal>
    );
};
