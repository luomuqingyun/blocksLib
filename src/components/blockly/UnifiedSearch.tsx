/**
 * ============================================================
 * 统一搜索组件 (Unified Search Component)
 * ============================================================
 * 
 * 提供 Blockly 工作区和工具箱的统一搜索功能。
 * 
 * 搜索模式:
 * - workspace: 搜索当前工作区中的已有积木
 * - toolbox: 搜索所有可用积木类型 (从工具箱)
 * 
 * 功能:
 * - 双语搜索 (中英文关键词字典)
 * - 工作区搜索时高亮匹配的积木块
 * - 工具箱搜索时点击即可添加积木
 * - Tab 键切换搜索模式
 * - 上下箭头导航搜索结果
 * 
 * 快捷键:
 * - Ctrl+F: 工作区搜索
 * - Ctrl+Shift+F: 工具箱搜索
 * 
 * @file src/components/blockly/UnifiedSearch.tsx
 * @module EmbedBlocks/Frontend/Components/Blockly
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
// @ts-ignore
import * as Blockly from 'blockly';
import { BILINGUAL_MAP } from '../../config/search_dictionary';
import { useTranslation } from 'react-i18next';
import './UnifiedSearch.css';

/**
 * 解析 Blockly 消息引用
 * 将 %{BKY_XXX} 格式的消息引用转换为实际文本
 * 
 * @param msg 原始消息字符串
 * @returns 解析后的小写文本
 */
const resolveMsg = (msg: any) => {
    if (typeof msg !== 'string') return '';
    try {
        return Blockly.utils.parsing.replaceMessageReferences(msg).toLowerCase();
    } catch (e) {
        return msg.toLowerCase();
    }
};

/**
 * 工具箱搜索索引类
 * 为所有可用的积木块类型构建搜索索引
 * 支持中英文双语搜索
 */
class ToolboxSearchIndex {
    /** 搜索索引: 积木块类型 -> {type, label, meta元数据集合} */
    private static index = new Map<string, { type: string; label: string; meta: Set<string> }>();
    /** 索引是否已构建 */
    private static isBuilt = false;

    /**
     * 重建搜索索引
     * 遍历所有已注册的积木块类型，提取元数据用于搜索
     */
    static rebuild() {
        if (this.isBuilt) return; // 已构建则跳过

        // 创建无头工作区用于实例化积木块
        const headless = new Blockly.Workspace();
        try {
            const allTypes = Object.keys(Blockly.Blocks);
            for (const type of allTypes) {
                const meta = new Set<string>();
                const typeLower = type.toLowerCase();
                meta.add(typeLower); // 添加类型名作为元数据

                let label = type;
                const def = Blockly.Blocks[type];
                if (def) {
                    // 从 message0 提取显示文本
                    if (def.message0) {
                        const resolved = resolveMsg(def.message0);
                        meta.add(resolved);
                        // 取 % 前的部分作为标签 (去除参数占位符)
                        label = resolved.split('%')[0].trim() || type;
                    }
                    // 添加 tooltip 作为元数据
                    if (def.tooltip) meta.add(resolveMsg(def.tooltip));
                }

                // 尝试实例化积木块获取完整文本
                try {
                    const block = headless.newBlock(type);
                    const blockText = block.toString();
                    meta.add(blockText.toLowerCase());
                    // 使用实例文本作为标签 (如果长度合适)
                    if (blockText.length > 2 && blockText.length < 60) {
                        label = blockText;
                    }
                    block.dispose(false);
                } catch (e) { /* 忽略无法实例化的块 */ }

                // 添加双语关键词 (中英文映射)
                const allMeta = Array.from(meta).join(' ');
                for (const [eng, zhArr] of Object.entries(BILINGUAL_MAP)) {
                    const engLower = eng.toLowerCase();
                    // 如果元数据包含英文或中文关键词，添加双向映射
                    if (allMeta.includes(engLower) || zhArr.some(zh => allMeta.includes(zh))) {
                        meta.add(engLower);
                        zhArr.forEach(zh => meta.add(zh));
                    }
                }

                this.index.set(typeLower, { type, label, meta });
            }
            this.isBuilt = true;
        } finally {
            headless.dispose(); // 清理无头工作区
        }
    }

    /**
     * 搜索积木块类型
     * 
     * @param query 搜索关键词
     * @param maxResults 最大结果数量
     * @returns 匹配的积木块列表 [{type, label}]
     */
    static search(query: string, maxResults = 50): Array<{ type: string; label: string }> {
        if (!query.trim()) return [];
        this.rebuild(); // 确保索引已构建

        const q = query.toLowerCase().trim();
        const results: Array<{ type: string; label: string; score: number }> = [];

        // 遍历索引查找匹配项
        for (const [, entry] of this.index) {
            for (const m of entry.meta) {
                if (m.includes(q)) {
                    // 使用匹配位置作为分数 (越小越靠前)
                    const score = m.indexOf(q);
                    results.push({ type: entry.type, label: entry.label, score });
                    break; // 每个块只记录一次
                }
            }
        }

        // 按分数排序并限制结果数量
        return results
            .sort((a, b) => a.score - b.score)
            .slice(0, maxResults)
            .map(r => ({ type: r.type, label: r.label }));
    }
}

/** 搜索模式: 工作区搜索 | 工具箱搜索 */
type SearchMode = 'workspace' | 'toolbox';

/** 统一搜索组件属性 */
interface UnifiedSearchProps {
    /** Blockly 工作区实例 */
    workspace: any;
    /** 搜索框是否可见 */
    isVisible: boolean;
    /** 关闭搜索框回调 */
    onClose: () => void;
    /** 初始搜索模式 */
    initialMode?: SearchMode;
}

export const UnifiedSearch: React.FC<UnifiedSearchProps> = ({ workspace, isVisible, onClose, initialMode = 'workspace' }) => {
    const { t } = useTranslation();

    // ========== 状态管理 ==========
    const [query, setQuery] = useState('');                    // 搜索关键词
    const [mode, setMode] = useState<SearchMode>(initialMode); // 当前搜索模式
    const [workspaceResults, setWorkspaceResults] = useState<Array<{ id: string; type: string; label: string }>>([]); // 工作区搜索结果
    const [toolboxResults, setToolboxResults] = useState<Array<{ type: string; label: string }>>([]); // 工具箱搜索结果
    const [currentIndex, setCurrentIndex] = useState(0);       // 当前选中的结果索引

    // ========== Refs ==========
    const inputRef = useRef<HTMLInputElement>(null);           // 搜索输入框引用
    const resultsRef = useRef<HTMLUListElement>(null);         // 结果列表引用
    const previousHighlightRef = useRef<any>(null);            // 上一个高亮的积木块
    const allHighlightedRef = useRef<any[]>([]);               // 所有高亮的积木块列表

    // 根据模式选择结果列表
    const results = mode === 'workspace' ? workspaceResults : toolboxResults;

    /**
     * 清除所有积木块高亮效果
     * 包括当前选中的高亮和所有匹配项的高亮
     */
    const clearAllHighlights = useCallback(() => {
        // 清除当前选中项的高亮
        if (previousHighlightRef.current) {
            try {
                previousHighlightRef.current.setHighlighted(false);
                previousHighlightRef.current.removeSelect();
                // 移除自定义样式
                const svg = previousHighlightRef.current.getSvgRoot();
                if (svg) svg.style.filter = '';
            } catch (e) { }
            previousHighlightRef.current = null;
        }
        // 清除所有匹配项的高亮
        for (const block of allHighlightedRef.current) {
            try {
                const svg = block.getSvgRoot();
                if (svg) svg.style.filter = '';
            } catch (e) { }
        }
        allHighlightedRef.current = [];
    }, []);

    // 搜索框可见时自动聚焦输入框
    useEffect(() => {
        if (isVisible && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();  // 选中已有文本
            setMode(initialMode);       // 重置为初始模式
        } else {
            clearAllHighlights();       // 隐藏时清除高亮
        }
    }, [isVisible, initialMode, clearAllHighlights]);

    // 搜索并高亮匹配的积木块
    useEffect(() => {
        // 空查询时清空结果
        if (!query.trim()) {
            setWorkspaceResults([]);
            setToolboxResults([]);
            setCurrentIndex(0);
            clearAllHighlights();
            return;
        }

        if (mode === 'workspace') {
            // ===== 工作区搜索模式 =====
            if (!workspace) return;
            const q = query.toLowerCase();
            const blocks = workspace.getAllBlocks(false);
            const matched: Array<{ id: string; type: string; label: string }> = [];

            // 遍历所有积木块，查找匹配项
            for (const block of blocks) {
                const type = block.type || '';
                const text = block.toString().toLowerCase();

                if (type.toLowerCase().includes(q) || text.includes(q)) {
                    matched.push({
                        id: block.id,
                        type: type,
                        label: block.toString()
                    });
                }
            }
            setWorkspaceResults(matched);
            setCurrentIndex(0);

            // 为所有匹配项添加黄色高亮
            clearAllHighlights();
            for (const m of matched) {
                try {
                    const block = workspace.getBlockById(m.id);
                    if (block) {
                        const svg = block.getSvgRoot();
                        if (svg) {
                            // 黄色发光表示匹配项
                            svg.style.filter = 'drop-shadow(0 0 8px #fbbf24) brightness(1.1)';
                        }
                        allHighlightedRef.current.push(block);
                    }
                } catch (e) { }
            }

            // 为第一个匹配项添加当前选中高亮 (青色)
            if (matched.length > 0) {
                highlightCurrentBlock(matched[0].id);
            }
        } else {
            // ===== 工具箱搜索模式 =====
            const results = ToolboxSearchIndex.search(query);
            setToolboxResults(results);
            setCurrentIndex(0);
        }
    }, [query, mode, workspace, clearAllHighlights]);

    /**
     * 高亮当前选中的积木块 (使用青色发光效果)
     * 同时将视图居中到该积木块
     * 
     * @param blockId 积木块 ID
     */
    const highlightCurrentBlock = useCallback((blockId: string) => {
        if (!workspace) return;

        // 移除上一个选中项的高亮样式
        if (previousHighlightRef.current) {
            try {
                previousHighlightRef.current.setHighlighted(false);
                previousHighlightRef.current.removeSelect();
                const svg = previousHighlightRef.current.getSvgRoot();
                if (svg) {
                    // 恢复为黄色 (普通匹配项颜色)
                    svg.style.filter = 'drop-shadow(0 0 8px #fbbf24) brightness(1.1)';
                }
            } catch (e) { }
        }

        try {
            const block = workspace.getBlockById(blockId);
            if (block) {
                // 将视图居中到积木块
                workspace.centerOnBlock(blockId);
                block.setHighlighted(true);
                block.addSelect();
                // 青色发光表示当前选中 (更醒目)
                const svg = block.getSvgRoot();
                if (svg) {
                    svg.style.filter = 'drop-shadow(0 0 12px #06b6d4) drop-shadow(0 0 20px #06b6d4) brightness(1.2)';
                }
                previousHighlightRef.current = block;
            }
        } catch (e) { }
    }, [workspace]);

    /**
     * 导航到指定索引的搜索结果
     * @param index 结果索引
     */
    const navigateTo = useCallback((index: number) => {
        if (index < 0 || index >= results.length) return;
        setCurrentIndex(index);

        if (mode === 'workspace') {
            // 工作区模式: 高亮并居中到积木块
            const result = workspaceResults[index];
            if (result) {
                highlightCurrentBlock(result.id);
            }
        } else {
            // 工具箱模式: 只更新选中状态，用户可按 Enter 或点击添加
            setCurrentIndex(index);
        }
    }, [mode, results, workspaceResults, highlightCurrentBlock]);

    /**
     * 将积木块添加到工作区 (工具箱模式)
     * @param type 积木块类型
     */
    const addBlockToWorkspace = useCallback((type: string) => {
        if (!workspace) return;
        try {
            const block = workspace.newBlock(type);
            block.initSvg();
            block.render();
            // 计算视口中心位置
            const metrics = workspace.getMetrics();
            const x = metrics.viewLeft + metrics.viewWidth / 2 - 50;
            const y = metrics.viewTop + 50;
            block.moveBy(x / workspace.scale, y / workspace.scale);
        } catch (e) { }
    }, [workspace]);

    // 滚动到当前选中的结果项
    useEffect(() => {
        if (resultsRef.current && currentIndex >= 0) {
            const selectedItem = resultsRef.current.children[currentIndex] as HTMLElement;
            if (selectedItem) {
                selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [currentIndex]);

    /** 导航到下一个结果 */
    const goNext = useCallback(() => {
        if (results.length === 0) return;
        const next = (currentIndex + 1) % results.length; // 循环到开头
        navigateTo(next);
    }, [results.length, currentIndex, navigateTo]);

    /** 导航到上一个结果 */
    const goPrev = useCallback(() => {
        if (results.length === 0) return;
        const prev = currentIndex <= 0 ? results.length - 1 : currentIndex - 1; // 循环到末尾
        navigateTo(prev);
    }, [results.length, currentIndex, navigateTo]);

    /** 键盘事件处理 */
    const handleKeyDown = (e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'Escape':
                // Esc 关闭搜索框
                onClose();
                break;
            case 'Enter':
                e.preventDefault();
                if (mode === 'toolbox' && toolboxResults[currentIndex]) {
                    // 工具箱模式 - 添加选中的积木块
                    addBlockToWorkspace(toolboxResults[currentIndex].type);
                } else if (mode === 'workspace') {
                    // 工作区模式 - 导航到下一个/上一个
                    if (e.shiftKey) {
                        goPrev(); // Shift+Enter 上一个
                    } else {
                        goNext(); // Enter 下一个
                    }
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                goNext(); // 下箭头导航到下一个
                break;
            case 'ArrowUp':
                e.preventDefault();
                goPrev(); // 上箭头导航到上一个
                break;
            case 'Tab':
                e.preventDefault();
                // Tab 切换模式 (工作区/工具箱)
                setMode(m => m === 'workspace' ? 'toolbox' : 'workspace');
                break;
        }
    };

    // 不可见时不渲染
    if (!isVisible) return null;

    // ========== 渲染搜索界面 ==========
    return (
        <div className="unified-search-container">
            {/* 搜索框头部 */}
            <div className="unified-search-header">
                <span className="unified-search-icon">🔍</span>
                {/* 搜索输入框 */}
                <input
                    ref={inputRef}
                    type="text"
                    className="unified-search-input"
                    placeholder={mode === 'workspace' ? t('search.workspace') : t('search.toolbox')}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => {
                        e.stopPropagation();
                        handleKeyDown(e);
                    }}
                    onKeyUp={e => e.stopPropagation()}
                    autoComplete="off"
                    spellCheck={false}
                />
                {/* 结果计数器 */}
                {results.length > 0 && (
                    <span className="unified-search-counter">
                        {currentIndex + 1}/{results.length}
                    </span>
                )}
                {/* 导航按钮 */}
                <div className="unified-search-nav">
                    <button
                        className="unified-search-nav-btn"
                        onClick={goPrev}
                        disabled={results.length === 0}
                        title={t('search.prev')}
                    >▲</button>
                    <button
                        className="unified-search-nav-btn"
                        onClick={goNext}
                        disabled={results.length === 0}
                        title={t('search.next')}
                    >▼</button>
                </div>
                {/* 关闭按钮 */}
                <button className="unified-search-close" onClick={onClose} title={t('search.close')}>×</button>
            </div>

            {/* 模式切换标签页 */}
            <div className="unified-search-tabs">
                <button
                    className={`unified-search-tab ${mode === 'workspace' ? 'active' : ''}`}
                    onClick={() => setMode('workspace')}
                >
                    {t('search.tabWorkspace')}
                </button>
                <button
                    className={`unified-search-tab ${mode === 'toolbox' ? 'active' : ''}`}
                    onClick={() => setMode('toolbox')}
                >
                    {t('search.tabToolbox')}
                </button>
            </div>

            {/* 搜索结果列表 */}
            {results.length > 0 && (
                <ul className="unified-search-results" ref={resultsRef}>
                    {results.map((result, index) => (
                        <li
                            key={mode === 'workspace' ? (result as any).id : (result as any).type}
                            className={`unified-search-result ${index === currentIndex ? 'selected' : ''}`}
                            onClick={() => {
                                if (mode === 'workspace') {
                                    // 工作区模式 - 导航到选中的积木块
                                    navigateTo(index);
                                } else {
                                    // 工具箱模式 - 点击添加积木块
                                    addBlockToWorkspace((result as any).type);
                                }
                            }}
                        >
                            <span className="result-label">{result.label}</span>
                            <span className="result-type">{(result as any).type}</span>
                        </li>
                    ))}
                </ul>
            )}
            {/* 无结果提示 */}
            {query && results.length === 0 && (
                <div className="unified-search-empty">
                    {mode === 'workspace' ? t('search.noMatchWorkspace') : t('search.noMatchToolbox')}
                </div>
            )}

            {/* 底部快捷键提示 */}
            <div className="unified-search-hint">
                <span><kbd>Tab</kbd> {t('search.hintSwitch')}</span>
                <span><kbd>↑↓</kbd> {t('search.hintNav')}</span>
                <span><kbd>Enter</kbd> {mode === 'workspace' ? t('search.hintNext') : t('search.hintAdd')}</span>
                <span><kbd>Esc</kbd> {t('search.hintClose')}</span>
            </div>
        </div>
    );
};

export default UnifiedSearch;
