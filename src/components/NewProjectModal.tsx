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
import { useBoards } from '../hooks/useBoards';

// 通过 BoardRepository 统一访问底层硬件定义文件 (JSON)
import { boardRepository } from '../data/BoardRepository';

/** 默认板卡数据 (延迟到组件内部初始化) */
// const standardData = boardRepository.getStandardBoards();
// stm32Data 改为组件内异步加载
// const stm32Data = boardRepository.getSTM32Boards();

export const NewProjectModal: React.FC = () => {
    const { t, i18n } = useTranslation();
    const {
        isNewProjectOpen, setIsNewProjectOpen,
        isSaveAsOpen, setIsSaveAsOpen,
        setIsExtensionsOpen
    } = useUI();
    const { createNewProject, workDir, handleSetWorkDir, performSaveAs, projectMetadata } = useFileSystem();

    // [OPTIMIZATION] 将标准板卡数据移入用 useMemo 延迟加载
    const standardData = useMemo(() => boardRepository.getStandardBoards(), []);

    // 获取所有已注册的板卡 (包括通过扩展加载的)
    const allRegisteredBoards = useBoards();

    // 过滤出扩展提供的板卡 (ID 通常带有命名空间前缀 ':')
    const extensionBoards = useMemo(() => {
        return allRegisteredBoards.filter(b => b.id.includes(':'));
    }, [allRegisteredBoards]);

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

    // [OPTIMIZATION] 异步加载 STM32 数据
    const [stm32Data, setStm32Data] = useState<any>({ STM32: {} });
    const [isStm32Loading, setIsStm32Loading] = useState(false);

    // 搜索与收藏状态
    const [searchTerm, setSearchTerm] = useState('');
    const [favorites, setFavorites] = useState<Set<string>>(new Set()); // 收藏的板卡 ID 集合 (用于 UI 显示星星)
    const [favoriteLimit, setFavoriteLimit] = useState(10);             // 收藏上限
    const [favoriteCache, setFavoriteCache] = useState<any[]>([]);      // 收藏板卡的元数据缓存 (用于秒开预览)

    // 窗口拖拽位置状态
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // [FIX] 统一初始化逻辑：优先加载收藏，设置默认选中板卡
    useEffect(() => {
        if (!isOpen) return;

        const initModal = async () => {
            // 1. 重置基础状态
            setProjectName(isSaveAs ? (projectMetadata?.name || 'MyProject_Copy') : 'MyProject');
            setSearchTerm('');
            setActiveTab('standard');
            setPos({ x: 0, y: 0 });

            if (workDir) setParentDir(workDir);

            // 2. 加载收藏夹数据
            let currentCache: any[] = [];
            if (window.electronAPI) {
                const limit = await window.electronAPI.getConfig('general.favoriteLimit') || 10;
                currentCache = await window.electronAPI.getConfig('general.favoriteBoardsCache') || [];
                setFavoriteLimit(limit);
                setFavoriteCache(currentCache);
                setFavorites(new Set(currentCache.map((b: any) => b.id)));
            }

            // 3. 决定初始选中的板卡 (User Request: 不再默认选中 Uno)
            setSelectedBoardId('');
            setSelectedBoardData(null);

            // 4. [OPTIMIZATION] 移除在此处的 eagerly load STM32 数据
            // 由于 App.tsx 在后台预热时会 import NewProjectModal，
            // 此时不应该触发耗时 2000ms 的 STM32 加载，而应推迟到用户真正点击 STM32 选项卡时。
        };

        initModal();
    }, [isOpen]);

    // [REMOVED] 移除了原有的 metadata 同步 Effect，防止后台加载完成导致 UI 抖动 (以静制动)

    // [New] 监听 Electron 发出的配置变更广播
    useEffect(() => {
        if (!window.electronAPI || !window.electronAPI.onConfigChanged) return;

        const unsubscribe = window.electronAPI.onConfigChanged((key) => {
            // 如果变更的是收藏列表或上限，立即刷新
            if (key.startsWith('general.favorite')) {
                console.log('[NewProjectModal] Syncing due to config broadcast:', key);
                const refresh = async () => {
                    const limit = await window.electronAPI.getConfig('general.favoriteLimit') || 10;
                    const cache = await window.electronAPI.getConfig('general.favoriteBoardsCache') || [];
                    setFavoriteLimit(limit);
                    setFavoriteCache(cache);
                    setFavorites(new Set(cache.map((b: any) => b.id)) as Set<string>);
                };
                refresh();
            }
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    /**
     * 切换板卡的收藏状态
     * 收藏后的元数据会存入软件缓存，即使 STM32 数据包没加载完也能显示
     */
    const toggleFavorite = async (board: any, e: React.MouseEvent) => {
        e.stopPropagation();
        const boardId = board.id;
        const newFavorites = new Set(favorites);
        let newCache = [...favoriteCache];

        if (newFavorites.has(boardId)) {
            // 取消收藏
            newFavorites.delete(boardId);
            newCache = newCache.filter(b => b.id !== boardId);
        } else {
            // 添加收藏
            if (newFavorites.size >= favoriteLimit) {
                alert(t('settings.favoriteLimitReached', { limit: favoriteLimit }));
                return;
            }
            newFavorites.add(boardId);

            // [OPTIMIZATION] 存入尽可能完整的元数据。
            // 之前的“最小化”数据会导致秒开时预览图信息不足（如缺少引脚图定义）。
            newCache.push({
                ...board,
                // 显式保留核心字段，防止对象解构丢失重要元数据
                id: board.id,
                name: board.name,
                mcu: board.mcu,
                package: board.package,
                pinCount: board.pinCount,
                pinMap: board.pinMap,
                pin_options: board.pin_options,
                specs: board.specs,
                description: board.description,
                family: board.family,
                variant: board.variant
            });
        }

        setFavorites(newFavorites);
        setFavoriteCache(newCache);

        // 同步到软件配置文件
        if (window.electronAPI) {
            await window.electronAPI.setConfig('general.favoriteBoardsCache', newCache);
        }
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setPos({
                    x: e.clientX - dragOffset.x,
                    y: e.clientY - dragOffset.y
                });
            }
        };
        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset]);

    /**
     * 选择板卡时的处理
     * @param board 板卡数据对象
     */
    /**
     * 选择板卡时的处理
     * [OPTIMIZATION] 统一设置 ID 和数据，并在切换时重置预览区域的相关瞬态，防止视觉抖动。
     */
    const handleSelectBoard = (board: any) => {
        // 如果点击的是当前已选中的，则不触发更新，减少无谓的重绘
        if (selectedBoardId === board.id) return;

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

    // Helper: 渲染星星图标
    const renderStar = (board: any) => {
        const isFav = favorites.has(board.id);
        return (
            <button
                onClick={(e) => toggleFavorite(board, e)}
                className={`p-1 rounded hover:bg-slate-700 transition-colors ${isFav ? 'text-yellow-400' : 'text-slate-600 hover:text-slate-400'}`}
                title={isFav ? "取消收藏" : "收藏"}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill={isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
            </button>
        );
    };

    const renderBoardItem = (board: any) => (
        <div
            role="button"
            tabIndex={0}
            key={board.id}
            onClick={() => handleSelectBoard(board)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelectBoard(board);
                }
            }}
            className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 group transition-colors border border-transparent cursor-pointer ${selectedBoardId === board.id
                ? 'bg-blue-600/20 text-blue-300 border-blue-600/50'
                : 'hover:bg-[#333] text-slate-300'
                }`}
        >
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm truncate font-medium">{board.name || board.id}</span>
                </div>
            </div>
            {renderStar(board)}
        </div>
    );

    const renderFavorites = () => {
        if (favoriteCache.length === 0) return null;

        return (
            <div className="mb-4">
                <h3 className="text-xs font-bold text-yellow-500 uppercase tracking-wider mb-2 px-2 flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                    Favorites
                </h3>
                <div className="space-y-1">
                    {favoriteCache.map(renderBoardItem)}
                </div>
                <div className="h-px bg-slate-700/50 my-2 mx-2"></div>
            </div>
        );
    };

    /**
     * 渲染扩展板卡 (已安装的插件板卡)
     */
    const renderExtensions = () => {
        if (extensionBoards.length === 0) return null;

        return (
            <div className="mb-4">
                <h3 className="text-xs font-bold text-green-500 uppercase tracking-wider mb-2 px-2 flex items-center gap-1">
                    <Box size={12} />
                    Installed / Extensions
                </h3>
                <div className="space-y-1">
                    {extensionBoards.map(renderBoardItem)}
                </div>
                <div className="h-px bg-slate-700/50 my-2 mx-2"></div>
            </div>
        );
    };

    // 扁平化搜索结果
    const renderSearchResults = () => {
        if (!searchTerm) return null;

        const term = searchTerm.toLowerCase();

        // [FIX] 搜索逻辑优化：直接使用 allRegisteredBoards，
        // 确保能搜索到内置标准版、STM32全系列以及用户安装的所有扩展版。
        const results = allRegisteredBoards.filter(b => {
            const name = typeof b.name === 'string' ? b.name :
                (typeof b.name === 'object' && b.name ? (getI18nString(b.name, i18n.language) || b.id) : b.id);
            return name.toLowerCase().includes(term) || b.id.toLowerCase().includes(term);
        });

        if (results.length === 0) return <div className="p-4 text-center text-slate-500 text-sm">No matching boards found</div>;

        return (
            <div className="space-y-1">
                {results.map(renderBoardItem)}
            </div>
        );
    };

    const renderStandardList = () => (
        <div className="space-y-4">
            {/* 只有在没有搜索且不是收藏夹模式时才显示分类 */}
            {renderFavorites()}
            {renderExtensions()}

            {Object.entries(standardData).map(([category, boards]: [string, any]) => (
                <div key={category}>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">{category}</h3>
                    <div className="space-y-1">
                        {boards.map(renderBoardItem)}
                    </div>
                </div>
            ))}
        </div>
    );

    /**
     * 智能分组: 将大列表按名称前缀分组
     */
    const groupBoards = (boards: any[]) => {
        if (boards.length <= 12) return boards; // 数量少时不分组

        const groups: Record<string, any[]> = {};
        const singles: any[] = [];

        boards.forEach(board => {
            // 尝试提取前缀 (例如 STM32F103C8 -> STM32F103)
            // 假设命名规范通常为 STM32 + Series(1) + Line(2) + Package/Flash
            // 取前 9 位通常能命中 STM32F103 这一层级
            const name = board.name || board.id;
            const prefix = name.length > 9 ? name.substring(0, 9) : 'Other';

            if (!groups[prefix]) groups[prefix] = [];
            groups[prefix].push(board);
        });

        // 如果某个分组只有一个元素，或者分组太多导致并没有简化多少，则还需要进一步优化
        // 这里的简单策略：如果分组后的 Keys 数量比原数量减少了至少 30%，则采用分组，否则原样返回
        const groupKeys = Object.keys(groups);

        // [FIX] 防止无限递归：如果全部分组后只有一个组 (例如 STM32F103 下全是 F103)，说明无法进一步拆分，直接返回原列表
        if (groupKeys.length === 1) return boards;

        if (groupKeys.length > boards.length * 0.8) return boards;

        return groups;
    };

    /**
     * 渲染 STM32 树形结构
     * 递归处理嵌套的目录/板卡数据结构
     * 
     * @param data 树节点数据 (可能是数组或对象)
     * @param pathIdx 当前路径深度
     */
    const renderSTM32Tree = (data: any, pathIdx = 0) => {
        if (!data) return null;

        // 如果是根节点渲染 (pathIdx === 0)，先渲染收藏夹
        // 注意：这里需要由于递归调用，只在最外层渲染收藏夹，但我们已在 list 渲染时统一处理了收藏夹

        // 情况1: 数组 - 叶子节点列表
        if (Array.isArray(data)) {
            // 尝试智能分组
            const grouped = groupBoards(data);

            // 如果分组后不再是数组，说明产生了子目录，递归调用自己处理
            if (!Array.isArray(grouped)) {
                return renderSTM32Tree(grouped, pathIdx);
            }

            // 否则渲染扁平列表
            return (
                <div className="pl-2 border-l border-slate-700/50 space-y-1">
                    {/* [MODIFIED] 使用 renderBoardItem 统一渲染 */}
                    {grouped.map(renderBoardItem)}
                </div>
            );
        }

        // 情况2: 对象 - 目录/分组 (如 STM32 -> STM32F4)
        if (typeof data === 'object') {
            return (
                <div className="pl-2 border-l border-slate-700/50 space-y-1">
                    {Object.entries(data).map(([key, value]: [string, any]) => {
                        // 为自动分组生成的 Key 创建唯一的 toggle ID
                        const nodeKey = key; // 实际逻辑中最好带 path，暂时简化
                        const isExpanded = expandedNodes.has(nodeKey);

                        // 动态计算包含的板卡数量
                        const count = Array.isArray(value) ? value.length : Object.keys(value).length;

                        return (
                            <div key={key}>
                                <button
                                    onClick={() => toggleNode(nodeKey)}
                                    className="w-full flex items-center gap-1.5 px-2 py-1 text-slate-300 hover:text-white text-sm font-medium hover:bg-[#333] rounded group"
                                >
                                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    <span className="flex-1 text-left truncate">{key}</span>
                                    <span className="text-xs text-slate-600 group-hover:text-slate-500">{count}</span>
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
                className="relative bg-[#1e1e1e] w-[800px] h-[600px] rounded-lg shadow-2xl border border-slate-700 flex flex-col overflow-hidden pointer-events-auto"
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
                                    placeholder={t('dialog.enterProjectName')}
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
                        {!isSaveAs && !searchTerm && (
                            <div className="flex border-b border-slate-700">
                                <button
                                    onClick={() => {
                                        setActiveTab('standard');
                                        // 切换回标准模式时，如果当前选择是高级板卡，则清空选择
                                        if (selectedBoardId.includes('stm32') || selectedBoardId.includes('f4') || selectedBoardId.includes('f1')) {
                                            setSelectedBoardId('');
                                            setSelectedBoardData(null);
                                        }
                                    }}
                                    className={`flex-1 py-2 text-xs font-medium transition-colors ${activeTab === 'standard' ? 'bg-[#1e1e1e] text-blue-400 border-b-2 border-blue-500' : 'bg-[#252526] text-slate-500 hover:text-slate-300'}`}
                                >
                                    Standard
                                </button>
                                <button
                                    onClick={async () => {
                                        setActiveTab('advanced');
                                        // 切换到高级模式时，如果当前选择不是高级板卡，则清空选择以显示 ST Logo 占位符
                                        // (除非未来我们想在这里也默认选一个 F103)
                                        if (!selectedBoardId || (!selectedBoardId.includes('stm32') && !selectedBoardId.includes('f4') && !selectedBoardId.includes('f1'))) {
                                            setSelectedBoardId('');
                                            setSelectedBoardData(null);
                                        }

                                        // [OPTIMIZATION] 按需加载 STM32 配置
                                        if (Object.keys(stm32Data.STM32 || {}).length === 0) {
                                            setIsStm32Loading(true);
                                            try {
                                                const data = await boardRepository.loadSTM32Boards();
                                                setStm32Data(data);
                                            } catch (e) {
                                                console.error("Failed to load STM32 boards:", e);
                                            } finally {
                                                setIsStm32Loading(false);
                                            }
                                        }
                                    }}
                                    className={`flex-1 py-2 text-xs font-medium transition-colors ${activeTab === 'advanced' ? 'bg-[#1e1e1e] text-purple-400 border-b-2 border-purple-500' : 'bg-[#252526] text-slate-500 hover:text-slate-300'}`}
                                >
                                    STM32 / Advanced
                                </button>
                            </div>
                        )}

                        {/* 搜索框 & 过滤器 */}
                        {!isSaveAs && (
                            <div className="px-2 py-1.5 border-b border-slate-700 bg-[#252526] space-y-1.5">
                                <input
                                    type="text"
                                    placeholder="Search boards (e.g. F401)..."
                                    className="w-full bg-[#1e1e1e] border border-slate-600 rounded pl-2 pr-2 py-1 text-xs text-slate-200 outline-none focus:border-blue-500"
                                    value={searchTerm}
                                    onChange={async (e) => {
                                        const val = e.target.value;
                                        setSearchTerm(val);
                                        // [FIX] 如果输入了搜索词且尚未加载 STM32 数据，自动触发后台加载，
                                        // 保证全局搜索能立刻搜到芯片而无需用户手动切到高级标签页。
                                        if (val.trim() && Object.keys(stm32Data.STM32 || {}).length === 0 && !isStm32Loading) {
                                            setIsStm32Loading(true);
                                            try {
                                                const data = await boardRepository.loadSTM32Boards();
                                                setStm32Data(data);
                                            } catch (err) {
                                                console.error("Failed to lazy-load STM32 boards for search:", err);
                                            } finally {
                                                setIsStm32Loading(false);
                                            }
                                        }
                                    }}
                                />
                            </div>
                        )}

                        {/* 板卡列表区域 */}
                        {!isSaveAs ? (
                            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-700">
                                {searchTerm ? renderSearchResults() : (
                                    activeTab === 'standard' ? renderStandardList() : (
                                        <>
                                            {renderFavorites()}
                                            {isStm32Loading ? (
                                                <div className="flex items-center justify-center p-8 text-slate-500 gap-2">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-500 border-t-transparent"></div>
                                                    <span className="text-sm">Loading definitions...</span>
                                                </div>
                                            ) : (
                                                renderSTM32Tree(stm32Data['STM32'] || stm32Data)
                                            )}
                                        </>
                                    )
                                )
                                }
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
                        {selectedBoardData ? (
                            <>
                                <BoardPreview
                                    key={selectedBoardId}
                                    name={selectedBoardData.name || selectedBoardData.id}
                                    mcu={selectedBoardData.mcu}
                                    packageType={selectedBoardData.package}
                                    pinCount={selectedBoardData.pinCount}
                                    pinMap={selectedBoardData.pinMap}
                                    pins={selectedBoardData.pin_options?.digital?.map((p: any) => Array.isArray(p) ? p[0] : p)}
                                    description={selectedBoardData.description || t('board.noDescription')}
                                    specs={selectedBoardData.specs}
                                    images={selectedBoardData.images}
                                    pageUrl={selectedBoardData.page_url}
                                    className="flex-1 shadow-lg"
                                />
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 border border-slate-700 border-dashed rounded-lg bg-[#252526]/50 select-none">
                                {activeTab === 'advanced' ? (
                                    <>
                                        {/* ST Logo 通用占位符 (更精致的样式 + 持续浮动动效 + 点击反馈) */}
                                        <div className="w-20 h-20 bg-[#03234b] rounded-xl flex items-center justify-center mb-6 shadow-xl border border-blue-500/20 animate-float-reverse active:scale-95 active:brightness-110 active:shadow-inner transition-all duration-150 cursor-pointer select-none group">
                                            <span className="text-white font-black text-4xl italic tracking-tighter group-active:rotate-[360deg] transition-transform duration-500">ST</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-200 mb-1">STM32 / Advanced</h3>
                                        <span className="text-sm opacity-60 font-medium text-slate-400">{t('newProject.selectBoardOrChip')}</span>
                                    </>
                                ) : (
                                    <>
                                        {/* Arduino Logo 通用占位符 (方形样式 + 持续浮动动效 + 点击反馈) */}
                                        <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center mb-6 shadow-xl border border-slate-200/50 animate-float active:scale-95 active:brightness-105 active:shadow-inner transition-all duration-150 cursor-pointer select-none group">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="120" height="60" viewBox="0 0 120 60" fill="#00979c" className="w-[85%] h-auto group-active:rotate-[360deg] transition-transform duration-500">
                                                <path d="M27.275 40.518l-3.768 12.3h2.965l.68-2.292h3.676l.662 2.292h3.224l-3.768-12.3zm.622 7.534l1.12-3.825 1.107 3.825zm13.9-.845l-.136-.135.272-.113a3.08 3.08 0 0 0 .934-.655c.26-.27.472-.6.617-.973s.216-.794.216-1.26c0-.644-.116-1.2-.345-1.656a2.92 2.92 0 0 0-.994-1.127c-.415-.278-.92-.48-1.502-.598-.56-.113-1.188-.17-1.87-.17h-3.846v12.3h2.95v-4.806h.088a1.48 1.48 0 0 1 .822.217c.23.147.404.36.537.655l1.783 3.933h3.432L42.6 48.43c-.262-.533-.522-.933-.792-1.224zm-1.283-2.36c-.085.162-.204.296-.362.407a1.84 1.84 0 0 1-.616.267 3.6 3.6 0 0 1-.868.096h-.575v-2.6h.648c.675 0 1.177.106 1.5.315.274.182.407.5.407.94 0 .218-.04.402-.126.564zm12.884-2.867c-.497-.5-1.123-.873-1.862-1.1-.72-.232-1.567-.35-2.52-.35h-3.9v12.3h3.396c1.096 0 2.054-.15 2.85-.444.807-.298 1.48-.73 2.002-1.286s.9-1.23 1.153-2.012c.24-.764.36-1.624.36-2.555 0-1.015-.12-1.905-.36-2.646-.245-.76-.62-1.397-1.117-1.896zm-2.412 7.475c-.512.57-1.255.845-2.27.845h-.65v-7.262h.805c.57 0 1.046.08 1.418.24a1.99 1.99 0 0 1 .854.663c.218.3.376.676.47 1.117.098.467.15 1.008.15 1.608 0 1.28-.26 2.22-.776 2.8zm10.997-1.112c0 .424-.04.785-.117 1.074-.072.27-.18.5-.317.654s-.295.27-.496.34c-.218.078-.498.117-.83.117-.352 0-.643-.045-.864-.134a1.3 1.3 0 0 1-.522-.376 1.48 1.48 0 0 1-.297-.627 4.26 4.26 0 0 1-.097-.961v-7.913h-2.95v8.046c0 .665.082 1.275.244 1.814.17.56.446 1.043.826 1.437s.877.698 1.478.903c.584.2 1.3.303 2.097.303.722 0 1.385-.102 1.97-.303.597-.205 1.112-.515 1.53-.923s.743-.922.965-1.527c.218-.594.33-1.3.33-2.068v-7.682h-2.95v7.825m4.457-5.35h2.647v7.333H66.44v2.492h8.28v-2.492h-2.647v-7.333h2.647V40.52h-8.28v2.474m16.5 4.534l-3.297-7.008h-3.34v12.3h2.747v-7.142l3.315 7.142h3.322v-12.3H82.93v7.008m12.296-5.554c-.86-1.095-2.152-1.65-3.837-1.65-.72 0-1.408.128-2.043.38a4.51 4.51 0 0 0-1.692 1.182c-.48.53-.85 1.2-1.12 2.006-.265.796-.4 1.75-.4 2.836 0 2.007.427 3.568 1.27 4.64.86 1.098 2.152 1.655 3.837 1.655a5.52 5.52 0 0 0 2.044-.38c.644-.256 1.213-.653 1.7-1.182s.85-1.2 1.12-2.006c.264-.795.4-1.75.4-2.836 0-2.012-.427-3.576-1.27-4.646zm-1.94 6.4c-.084.454-.216.837-.392 1.138-.167.287-.373.497-.63.642s-.575.218-.948.218c-.737 0-1.25-.274-1.57-.84-.35-.62-.53-1.596-.53-2.904 0-.614.044-1.165.132-1.638.084-.453.217-.835.395-1.136a1.71 1.71 0 0 1 .632-.644c.252-.144.57-.217.942-.217.743 0 1.258.274 1.575.837.35.62.526 1.598.526 2.905 0 .616-.044 1.167-.132 1.638zm-19.1-12.994c-3.843 0-7.13-1.296-10.02-3.946-1.786-1.637-3.26-3.642-4.614-5.727-1.355 2.085-2.828 4.1-4.614 5.727-3.107 2.848-6.67 4.132-10.9 3.925-8.046-.035-14.58-6.385-14.58-14.185 0-7.822 6.57-14.185 14.648-14.185 4.42 0 8.14 1.463 11.375 4.47 1.554 1.445 2.865 3.122 4.06 4.876 1.196-1.754 2.508-3.43 4.06-4.876 3.234-3 6.955-4.47 11.375-4.47 8.077 0 14.648 6.363 14.648 14.185 0 7.8-6.535 14.15-14.58 14.185-.292.014-.582.02-.868.02zM62.493 20.973c1.603 2.6 3.16 5.022 5.054 6.758 2.14 1.96 4.394 2.767 7.3 2.613l.13-.004c5.316 0 9.64-4.117 9.64-9.178s-4.325-9.178-9.64-9.178c-3.138 0-5.67.995-7.965 3.13-1.715 1.595-3.13 3.64-4.53 5.86zm-18.38-9c-5.316 0-9.64 4.118-9.64 9.178s4.325 9.178 9.64 9.178l.13.004c2.915.154 5.17-.652 7.308-2.613 1.895-1.737 3.45-4.157 5.054-6.758-1.398-2.22-2.814-4.264-4.528-5.86-2.296-2.136-4.827-3.13-7.965-3.13z" /><path d="M75.65 19.343v-2.715h-2.826v2.715H70.1v2.812h2.715V24.9h2.826v-2.735h2.715v-2.812H75.65M40.05 19.3h8.923v2.9H40.05z" fill="#00979c" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-200 mb-1">Standard Boards</h3>
                                        <span className="text-sm opacity-60 font-medium text-slate-400">{t('newProject.selectBoardOrChip')}</span>
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
        </BaseModal >
    );
};

