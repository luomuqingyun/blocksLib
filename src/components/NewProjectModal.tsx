/**
 * ============================================================
 * 新建项目模态框 (New Project Modal Component)
 * ============================================================
 * 
 * 创建新项目或保存已有项目的对话框。
 * 
 * 核心功能:
 * - 标准视角: 以品牌分类展示常用开发板 (Arduino, ESP32 等)
 * - 高级视角: 以树形目录展示 STM32 全系列芯片及引脚图预览
 * - 项目命名和保存路径选择
 * - 开发板/芯片选择与预览
 * 
 * 数据来源:
 * - BoardRepository: 统一管理底层硬件定义文件 (JSON)
 * - Vite Glob 静态分析的板卡词典
 * 
 * 界面特性:
 * - 支持模态框拖拽移动
 * - 支持 ESC 键关闭
 * - 响应式布局
 * 
 * @file src/components/NewProjectModal.tsx
 * @module EmbedBlocks/Frontend/Components/NewProjectModal
 */

import React, { useState, useEffect, useMemo } from 'react';
import { X, FolderPlus, Folder, AlertCircle, Download, ChevronRight, ChevronDown, Cpu, Box } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFileSystem } from '../contexts/FileSystemContext';
import { useUI } from '../contexts/UIContext';
import { BaseModal } from './BaseModal';
import { BoardPreview } from './BoardPreview';
import { getI18nString } from '../utils/i18n_utils';

// 通过 BoardRepository 统一访问底层硬件定义文件 (JSON)
import { boardRepository } from '../data/BoardRepository';

// 数据加载器: 利用 Vite Glob 静态分析出的板卡词典
const standardData = boardRepository.getStandardBoards();
const stm32Data = boardRepository.getSTM32Boards();

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

    // ----- 业务状态 -----
    const [projectName, setProjectName] = useState('MyProject'); // 项目名称
    const [parentDir, setParentDir] = useState('');              // 父级保存路径
    const [errorMessage, setErrorMessage] = useState<string | null>(null); // 错误提示
    const nameInputRef = React.useRef<HTMLInputElement>(null);

    // 交互状态
    const [activeTab, setActiveTab] = useState<'standard' | 'advanced'>('standard'); // 当前选项卡
    const [selectedBoardId, setSelectedBoardId] = useState<string>('');              // 选中的板卡 ID
    const [selectedBoardData, setSelectedBoardData] = useState<any>(null);           // 选中的板卡完整数据 (用于预览)

    // STM32 树形视图状态
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

    // 窗口拖拽位置状态
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // ----- 副作用处理 -----

    // 切换选项卡时的副作用: 重置选中状态
    useEffect(() => {
        if (!isOpen) return;

        // 当切换到 Standard 模式时，尝试自动选中第一个板卡 (Arduino Uno)
        if (activeTab === 'standard') {
            const uno = standardData['Arduino']?.find((b: any) => b.id === 'uno');
            if (uno && !selectedBoardId) handleSelectBoard(uno);
        }
        // 当切换到 Advanced 模式时，清空选中状态，让用户看到“ST”Logo等待选择
        else if (activeTab === 'advanced') {
            setSelectedBoardId('');
            setSelectedBoardData(null);
        }
    }, [activeTab]);

    // 弹窗打开时的初始化逻辑
    useEffect(() => {
        if (isOpen) {
            // 居中显示
            setPos({ x: (window.innerWidth - 800) / 2, y: (window.innerHeight - 600) / 2 });
            setErrorMessage(null);

            if (isSaveAs) {
                // 如果是“另存为”模式，默认名称加前缀
                const currentName = projectMetadata?.name || 'MyProject';
                setProjectName(`${currentName}_copy`);
            } else {
                if (projectName === 'MyProject' || !projectName) setProjectName('MyProject');

                // 默认选中 Arduino Uno (仅当在 Standard 模式或初始加载时)
                // 强制将选项卡重置为 Standard (符合用户习惯)
                setActiveTab('standard');
                const uno = standardData['Arduino']?.find((b: any) => b.id === 'uno');
                if (uno) handleSelectBoard(uno);
            }

            setParentDir(workDir);

            // 自动聚焦并全选输入框内容
            setTimeout(() => {
                nameInputRef.current?.focus();
                nameInputRef.current?.select();
            }, 50);
        }
    }, [isOpen]);

    // 当全局工作目录变化时，同步更新路径输入框
    useEffect(() => {
        if (isOpen) setParentDir(workDir);
    }, [workDir, isOpen]);

    // 实现模态框的自定义拖拽逻辑
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

    // ----- 处理器函数 -----

    /**
     * 选择板卡时的处理
     * @param board 板卡数据对象
     */
    const handleSelectBoard = (board: any) => {
        setSelectedBoardId(board.id);
        setSelectedBoardData(board);
    };

    /**
     * 切换 STM32 树节点的展开/折叠状态
     */
    const toggleNode = (nodeName: string) => {
        const newSet = new Set(expandedNodes);
        if (newSet.has(nodeName)) newSet.delete(nodeName);
        else newSet.add(nodeName);
        setExpandedNodes(newSet);
    };

    /**
     * 关闭弹窗
     */
    const handleClose = () => {
        setIsNewProjectOpen(false);
        setIsSaveAsOpen(false);
    };

    /**
     * 确认提交逻辑
     */
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
            // 通过 FileSystemContext 调用后端服务创建物理项目目录
            const res = await createNewProject(projectName, selectedBoardId, parentDir);
            if (res.success) handleClose();
            else setErrorMessage(res.error || 'Creation failed');
        }
    };

    // ----- 渲染部分辅助函数 -----

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

    /**
     * 渲染 STM32 树形结构
     * 递归处理嵌套的目录/板卡数据结构
     * 
     * @param data 树节点数据 (可能是数组或对象)
     * @param pathIdx 当前路径深度
     */
    const renderSTM32Tree = (data: any, pathIdx = 0) => {
        if (!data) return null;

        // 情况1: 数组 - 叶子节点列表 (如 STM32F4 -> [boards...])
        if (Array.isArray(data)) {
            return (
                <div className="pl-2 border-l border-slate-700/50 space-y-1">
                    {data.map((board: any) => (
                        <button
                            key={board.id}
                            onClick={() => handleSelectBoard(board)}
                            className={`w-full text-left px-2 py-1.5 rounded flex items-center gap-2 text-sm ${selectedBoardId === board.id
                                ? 'bg-purple-600/20 text-purple-300'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-[#333]'
                                }`}
                        >
                            <Box size={14} className="opacity-70" />
                            <span className="truncate">{board.name || board.id}</span>
                        </button>
                    ))}
                </div>
            );
        }

        // 情况2: 对象 - 目录/分组 (如 STM32 -> STM32F4)
        if (typeof data === 'object') {
            return (
                <div className="pl-2 border-l border-slate-700/50 space-y-1">
                    {Object.entries(data).map(([key, value]: [string, any]) => {
                        const isExpanded = expandedNodes.has(key);

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
                    })}
                </div>
            );
        }

        return null;
    };

    if (!isOpen) return null;

    return (
        <BaseModal isOpen={isOpen} onClose={handleClose}>
            <div
                style={{ left: pos.x, top: pos.y }}
                className="absolute bg-[#1e1e1e] w-[800px] h-[600px] rounded-lg shadow-2xl border border-slate-700 flex flex-col overflow-hidden pointer-events-auto"
            >
                {/* 标题栏 - 支持拖拽 */}
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

                {/* 主内容区域: 左右分栏布局 */}
                <div className="flex-1 flex overflow-hidden">

                    {/* 左侧: 输入框和列表 */}
                    <div className="w-[300px] flex flex-col border-r border-slate-700 bg-[#1e1e1e]">

                        {/* 项目配置区域 */}
                        <div className="p-4 space-y-4 border-b border-slate-700 select-text">
                            {/* 项目名称 */}
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

                            {/* 保存位置选择 */}
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

                        {/* 标签页切换 (Standard / STM32 Advanced) */}
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

                        {/* 板卡列表区域 */}
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

                    {/* 右侧: 板卡预览面板 */}
                    <div className="flex-1 bg-[#1e1e1e] p-6 flex flex-col">
                        <label className="text-xs font-medium text-slate-500 uppercase mb-3 block">选择预览</label>
                        {selectedBoardData ? (
                            <BoardPreview
                                name={selectedBoardData.name || selectedBoardData.id}
                                mcu={selectedBoardData.mcu}
                                packageType={selectedBoardData.package}
                                pinCount={selectedBoardData.pinCount}
                                pinMap={selectedBoardData.pinMap}
                                pins={selectedBoardData.pin_options?.digital?.map((p: any) => Array.isArray(p) ? p[0] : p)}
                                description={selectedBoardData.description || t('board.noDescription')}
                                specs={selectedBoardData.specs} // e.g. "32k Flash"
                                images={selectedBoardData.images}
                                pageUrl={selectedBoardData.page_url}
                                className="flex-1 shadow-lg"
                            />
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 border border-slate-700 border-dashed rounded-lg bg-[#252526]/50 select-none">
                                {activeTab === 'advanced' ? (
                                    <>
                                        {/* ST Logo 通用占位符 */}
                                        <div className="w-24 h-24 bg-blue-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-900/20">
                                            <span className="text-white font-bold text-4xl italic tracking-tighter">ST</span>
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-200 mb-1">STM32 系列</h3>
                                        <span className="text-sm">选择芯片以查看详情</span>
                                    </>
                                ) : (
                                    <>
                                        <Cpu size={48} className="mb-2 opacity-50" />
                                        <span className="text-sm">选择板卡以查看详情</span>
                                    </>
                                )}
                            </div>
                        )}

                        {/* 扩展导入链接 */}
                        {!isSaveAs && (
                            <div className="mt-4 flex justify-end">
                                <button onClick={() => setIsExtensionsOpen(true)} className="text-xs text-blue-500 hover:text-blue-400 flex items-center gap-1">
                                    <Download size={12} /> 导入更多板卡
                                </button>
                            </div>
                        )}
                    </div>

                </div>

                {/* 底部按钮栏 */}
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
