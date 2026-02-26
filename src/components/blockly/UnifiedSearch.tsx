/**
 * ============================================================
 * 统一搜索组件 (Unified Search Component)
 * ============================================================
 * 
 * 提供 Blockly 工作区和工具箱的统一搜索功能。
 * 
 * 搜索模式:
 * - workspace: 搜索当前工作区中的已有积木
 * - toolbox: 搜索所有可用积木类型 (基于当前工具箱配置)
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
import { MiniBlockPreview } from './MiniBlockPreview';
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
 * 深度清洗积木文本
 * 移除占位符、括号和多余空格
 */
const cleanBlockText = (text: string): string => {
    let clean = text;
    // 1. 移除 % 占位符 (如 %1, %2)
    clean = clean.replace(/%[0-9]+/g, ' ');
    // 2. 移除问号占位符 (如 "repeat ? times" -> "repeat times")
    clean = clean.replace(/\s*\?\s*/g, ' ');
    // 3. 移除多余的括号
    clean = clean.replace(/\(\s*\)/g, '');
    // 4. 压缩连续空格
    clean = clean.replace(/\s+/g, ' ').trim();
    // 5. 长度限制
    if (clean.length > 50) {
        clean = clean.substring(0, 48) + '...';
    }
    return clean;
};

/**
 * 为积木生成搜索元数据 (包含双语关键词)
 */
const generateBlockMeta = (label: string, type: string): Set<string> => {
    const meta = new Set<string>();
    const typeLower = type.toLowerCase();
    const labelLower = label.toLowerCase();

    meta.add(typeLower);
    meta.add(labelLower);

    // 添加双语关键词
    const allMetaStr = typeLower + ' ' + labelLower;
    for (const [eng, zhArr] of Object.entries(BILINGUAL_MAP)) {
        const engLower = eng.toLowerCase();
        if (allMetaStr.includes(engLower) || zhArr.some(zh => allMetaStr.includes(zh))) {
            meta.add(engLower);
            zhArr.forEach(zh => meta.add(zh));
        }
    }
    return meta;
};

/**
 * 计算搜索匹配分数
 * @returns {score, matchType} score越小越好 (1=完全匹配), null表示不匹配
 */
const calculateMatchScore = (query: string, type: string, label: string, meta: Set<string>) => {
    if (!query.trim()) return null;
    const q = query.toLowerCase().trim();
    const typeLower = type.toLowerCase();
    const labelLower = label.toLowerCase();

    // 单词边界正则 (仅针对英文单词查询)
    const useWordBoundary = /^[a-z0-9]+$/i.test(q) && q.length < 4;

    let score = 1000;
    let matchType = '';

    // 1. Tier 1: 完全匹配
    if (typeLower === q || labelLower === q) {
        return { score: 1, matchType: 'exact' };
    }

    // 2. Tier 2: 前缀匹配 (Label, Type, Type Suffix)
    const isLabelPrefix = labelLower.startsWith(q);
    const isTypePrefix = typeLower.startsWith(q);
    const isTypeSuffixPrefix = typeLower.includes('_' + q);

    if (isLabelPrefix || isTypePrefix || isTypeSuffixPrefix) {
        // Label 前缀优先 (score += 0), Type 前缀次之 (score += 5)
        score = 10 + (isLabelPrefix ? 0 : 5) + label.length;
        matchType = 'prefix';
        return { score, matchType };
    }

    // 3. Tier 3: 包含匹配 (严格边界)
    if (typeLower.includes(q) || labelLower.includes(q)) {
        let isMatch = true;
        if (useWordBoundary) {
            const simpleCheck = (str: string) => {
                let idx = str.indexOf(q);
                // 必须循环查找由于可能多次出现 (如 "hello help")
                while (idx !== -1) {
                    const prev = idx > 0 ? str[idx - 1] : ' ';
                    // [FIX] 仅检查是否为单词开头 (允许前缀匹配，如 "whi" 匹配 "while")
                    // remove next check to allow partial match
                    const isBoundaryChar = (c: string) => /[^a-z0-9]/i.test(c) || c === '_' || c === ' ';

                    if (isBoundaryChar(prev)) {
                        return true;
                    }

                    idx = str.indexOf(q, idx + 1);
                }
                return false;
            };
            if (!simpleCheck(typeLower) && !simpleCheck(labelLower)) {
                isMatch = false;
            }
        }

        if (isMatch) {
            score = 100 + label.indexOf(q);
            matchType = useWordBoundary ? 'contains_start' : 'contains';
            return { score, matchType };
        }
    }

    // 4. Tier 4: 元数据匹配
    if (q.length >= 2) {
        for (const m of meta) {
            if (m.includes(q)) {
                let isMetaMatch = true;
                if (useWordBoundary) {
                    const idx = m.indexOf(q);
                    if (idx !== -1) {
                        const prev = idx > 0 ? m[idx - 1] : ' ';
                        const next = idx + q.length < m.length ? m[idx + q.length] : ' ';
                        const isBoundaryChar = (c: string) => /[^a-z0-9]/i.test(c) || c === '_' || c === ' ';
                        if (!isBoundaryChar(prev) || !isBoundaryChar(next)) {
                            isMetaMatch = false;
                        }
                    }
                }

                if (isMetaMatch) {
                    score = 500 + m.indexOf(q);
                    matchType = useWordBoundary ? 'meta_strict' : 'meta/bilingual';
                    return { score, matchType };
                }
            }
        }
    }

    return null;
};

/**
 * 工具箱搜索索引类
 * 为当前工具箱中可用的积木块类型构建搜索索引
 * 支持中英文双语搜索
 */
class ToolboxSearchIndex {
    /** 搜索索引: 唯一ID -> {type, label, meta, blockState} */
    private static index = new Map<string, { type: string; label: string; meta: Set<string>; blockState: any }>();
    /** 索引是否已构建 */
    private static isBuilt = false;
    /** 当前缓存的配置哈希 (简单比较) */
    private static currentConfigRef: any = null;

    /**
     * 重建搜索索引
     * 遍历工具箱配置，提取积木块配置项并构建索引
     * 
     * @param toolboxConfig 工具箱配置对象
     */
    static rebuild(toolboxConfig: any) {
        // 如果配置未变且已构建，则跳过
        if (this.isBuilt && this.currentConfigRef === toolboxConfig) return;

        this.index.clear();
        this.currentConfigRef = toolboxConfig;

        if (!toolboxConfig) {
            this.isBuilt = true;
            return;
        }

        const validBlocks: any[] = [];

        // 递归遍历工具箱配置树提取 block 配置项
        const traverse = (items: any[]) => {
            if (!Array.isArray(items)) return;

            for (const item of items) {
                if (item.kind === 'block') {
                    // 存储完整配置项 (包含 fields, inputs, extraState 等)
                    validBlocks.push(item);
                } else if (item.kind === 'category') {
                    // 处理普通分类
                    if (item.contents) {
                        traverse(item.contents);
                    }
                    // 处理动态分类 (Custom Categories)
                    if (item.custom) {
                        this.handleCustomCategory(item.custom, validBlocks);
                    }
                }
            }
        };

        // 开始遍历
        if (toolboxConfig.contents) {
            traverse(toolboxConfig.contents);
        }

        // 为提取出的积木配置构建索引
        this.buildIndexForBlocks(validBlocks);
        this.isBuilt = true;
        console.log(`[UnifiedSearch] Toolbox index rebuilt: ${this.index.size} blocks indexed (Item-Based).`);
    }

    /**
     * 处理动态分类，注入常用标准积木
     */
    private static handleCustomCategory(custom: string, validBlocks: any[]) {
        // 对变量分类，注入标准变量积木 (构造基础配置对象)
        if (custom === 'ARDUINO_VARIABLES' || custom === 'VARIABLE') {
            validBlocks.push({ kind: 'block', type: 'variables_get' });
            validBlocks.push({ kind: 'block', type: 'variables_set' });
            validBlocks.push({ kind: 'block', type: 'math_change' });
        }
        // 对函数分类，注入标准函数积木
        if (custom === 'ARDUINO_FUNCTIONS' || custom === 'PROCEDURE') {
            validBlocks.push({ kind: 'block', type: 'procedures_defnoreturn' });
            validBlocks.push({ kind: 'block', type: 'procedures_defreturn' });
            validBlocks.push({ kind: 'block', type: 'procedures_callnoreturn' });
            validBlocks.push({ kind: 'block', type: 'procedures_callreturn' });
            validBlocks.push({ kind: 'block', type: 'procedures_ifreturn' });
        }
    }

    /**
     * 为指定的积木配置列表构建元数据索引
     */
    private static buildIndexForBlocks(blocks: any[]) {
        const headless = new Blockly.Workspace(); // 创建无头工作区用于实例化

        try {
            for (let i = 0; i < blocks.length; i++) {
                const blockState = blocks[i];
                const type = blockState.type;

                // 确保类型在 Blockly 中已注册
                if (!Blockly.Blocks[type]) continue;

                let label = type;
                const def = Blockly.Blocks[type];

                // 尝试实例化积木块获取由配置决定的精准文本
                // 这是 WYSIWYG 搜索的核心：利用实际配置生成 Label
                try {
                    // 使用 serialization API 恢复完整积木状态
                    const block = Blockly.serialization.blocks.append(blockState, headless);

                    // 获取积木显示文本并清洗
                    const rawText = block.toString();
                    const cleanedText = cleanBlockText(rawText);

                    if (cleanedText.length > 0) {
                        label = cleanedText;
                    } else {
                        label = type;
                    }

                    block.dispose(false);
                } catch (e) {
                    // 如果实例化失败，回退到定义中的 message0
                    if (def.message0) {
                        const resolved = resolveMsg(def.message0);
                        const fallbackText = cleanBlockText(resolved);
                        label = fallbackText || type;
                    }
                }

                // 生成元数据 (包含双语)
                const meta = generateBlockMeta(label, type);

                // 使用 blockState (完整配置) 而非仅 type
                // key 使用 type + index 确保唯一性 (因为同一个 type可能有多个不同配置的积木)
                const uniqueKey = `${type}_${i}_${Math.random().toString(36).substr(2, 5)}`;
                this.index.set(uniqueKey, { type, label, meta, blockState });
            }
        } finally {
            headless.dispose();
        }
    }

    /**
     * 搜索积木块类型
     * 
     * @param query 搜索关键词
     * @param maxResults 最大结果数量
     * @returns 匹配的积木块列表 [{type, label, blockState}]
     */
    static search(query: string, maxResults = 50): Array<{ type: string; label: string; blockState: any }> {
        if (!query.trim()) return [];

        const q = query.toLowerCase().trim();
        const results: Array<{ type: string; label: string; blockState: any; score: number; matchType: string }> = [];

        // 遍历索引
        for (const [, entry] of this.index) {
            const match = calculateMatchScore(q, entry.type, entry.label, entry.meta);

            if (match) {
                results.push({
                    type: entry.type,
                    label: entry.label,
                    blockState: entry.blockState, // 传递完整配置
                    score: match.score,
                    matchType: match.matchType
                });
            }
        }

        // [DEBUG] 输出调试信息
        if (results.length > 0) {
            console.groupCollapsed(`[UnifiedSearch] Query: "${q}" found ${results.length} matches`);
            results.sort((a, b) => a.score - b.score).slice(0, 10).forEach(r => {
                console.log(`[${r.score}] ${r.label} (${r.type}) - Match: ${r.matchType}`);
            });
            console.groupEnd();
        }

        // 按分数排序并限制结果数量
        return results
            .sort((a, b) => a.score - b.score)
            .slice(0, maxResults)
            .map(r => ({ type: r.type, label: r.label, blockState: r.blockState }));
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
    /** 当前工具箱配置 (用于构建搜索索引) */
    toolboxConfiguration?: any;
}

export const UnifiedSearch: React.FC<UnifiedSearchProps> = ({
    workspace,
    isVisible,
    onClose,
    initialMode = 'workspace',
    toolboxConfiguration
}) => {
    const { t } = useTranslation();

    // ========== 状态管理 ==========
    const [query, setQuery] = useState('');                    // 搜索关键词
    const [mode, setMode] = useState<SearchMode>(initialMode); // 当前搜索模式
    // 更新工作区结果状态定义，增加 score 字段 (排序用)
    const [workspaceResults, setWorkspaceResults] = useState<Array<{ id: string; type: string; label: string; score: number }>>([]);
    const [toolboxResults, setToolboxResults] = useState<Array<{ type: string; label: string; blockState: any }>>([]); // 工具箱搜索结果
    const [currentIndex, setCurrentIndex] = useState(0);       // 当前选中的结果索引
    // [FIX] 添加工作区版本控制，用于实时监听积木变更
    const [workspaceVersion, setWorkspaceVersion] = useState(0);

    // [New] 记录上次触发重置索引的状态，用于防止 WorkspaceVersion 变更导致焦点跳页
    const lastResetStateRef = useRef({ query: '', mode: '', isVisible: false });

    // ========== Refs ==========
    const inputRef = useRef<HTMLInputElement>(null);           // 搜索输入框引用
    const resultsRef = useRef<HTMLUListElement>(null);         // 结果列表引用
    const previousHighlightRef = useRef<any>(null);            // 上一个高亮的积木块
    const allHighlightedRef = useRef<any[]>([]);               // 所有高亮的积木块列表

    // [FIX] 监听工作区变更事件 (增删改)
    useEffect(() => {
        if (!workspace || !isVisible) return;

        const handleWorkspaceChange = (event: any) => {
            // 仅响应影响搜索结果的事件类型
            if (event.type === Blockly.Events.BLOCK_CREATE ||
                event.type === Blockly.Events.BLOCK_DELETE ||
                event.type === Blockly.Events.BLOCK_CHANGE) {
                setWorkspaceVersion(v => v + 1);
            }
        };

        workspace.addChangeListener(handleWorkspaceChange);
        return () => {
            workspace.removeChangeListener(handleWorkspaceChange);
        };
    }, [workspace, isVisible]);

    // 监听工具箱配置变更，重建索引
    useEffect(() => {
        if (toolboxConfiguration) {
            ToolboxSearchIndex.rebuild(toolboxConfiguration);
        }
    }, [toolboxConfiguration]);

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
                const root = previousHighlightRef.current.getSvgRoot();
                if (root) {
                    root.style.filter = '';
                    const path = root.querySelector('.blocklyPath');
                    if (path) path.style.filter = '';
                }
            } catch (e) { }
            previousHighlightRef.current = null;
        }
        // 清除所有匹配项的高亮
        for (const block of allHighlightedRef.current) {
            try {
                const root = block.getSvgRoot();
                if (root) {
                    root.style.filter = '';
                    const path = root.querySelector('.blocklyPath');
                    if (path) path.style.filter = '';
                }
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
        // [FIX] 仅在可见时执行搜索逻辑，且每次 isVisible 变真时强制刷新
        if (!isVisible) return;

        // 记录变动前后的状态
        const prevQuery = lastResetStateRef.current.query;
        const prevMode = lastResetStateRef.current.mode;
        const prevVisible = lastResetStateRef.current.isVisible;

        // [Important] 确定是否需要重置索引 (查询变了、模式变了、或者刚打开)
        const shouldResetIndex = prevQuery !== query || prevMode !== mode || (isVisible && !prevVisible);

        // 如果只是工作区积木变动 (workspaceVersion)，且当前处于工具箱模式，则不触发任何逻辑
        // 这可以防止添加积木时工具箱搜索列表跳回页首，并减少无效计算
        const onlyWorkspaceChanged = prevQuery === query && prevMode === mode && prevVisible === isVisible;
        if (onlyWorkspaceChanged && mode === 'toolbox') {
            return;
        }

        // 更新记录状态
        lastResetStateRef.current = { query, mode, isVisible };

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
            const blocks = workspace.getAllBlocks(false);
            const matched: Array<{ id: string; type: string; label: string; score: number; x: number; y: number }> = [];

            // 遍历所有积木块，查找匹配项
            for (const block of blocks) {
                const type = block.type || '';
                const rawText = block.toString();
                const label = cleanBlockText(rawText) || type;
                const meta = generateBlockMeta(label, type);
                const match = calculateMatchScore(query, type, label, meta);

                if (match) {
                    const pos = block.getRelativeToSurfaceXY();
                    matched.push({
                        id: block.id,
                        type: type,
                        label: label,
                        score: match.score,
                        x: pos.x,
                        y: pos.y
                    });
                }
            }

            // 按匹配度 -> Y坐标 -> X坐标 排序
            matched.sort((a, b) => {
                if (a.score !== b.score) return a.score - b.score;
                if (Math.abs(a.y - b.y) > 10) return a.y - b.y;
                return a.x - b.x;
            });

            setWorkspaceResults(matched);

            // [FIX] 计算新的索引：如果需要重置则为0，否则保持当前索引并钳制
            const nextIndex = shouldResetIndex ? 0 : Math.max(0, Math.min(currentIndex, matched.length - 1));
            setCurrentIndex(nextIndex);

            // 为所有匹配项添加高亮
            clearAllHighlights();
            for (const m of matched) {
                try {
                    const block = workspace.getBlockById(m.id);
                    if (block) {
                        const root = block.getSvgRoot();
                        if (root) {
                            const path = root.querySelector('.blocklyPath');
                            if (path instanceof HTMLElement || path instanceof SVGElement) {
                                path.style.filter = 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.8)) drop-shadow(0 0 16px rgba(251, 191, 36, 0.6))';
                            }
                        }
                        allHighlightedRef.current.push(block);
                    }
                } catch (e) { }
            }

            // 为选中的项添加焦点高亮
            if (matched[nextIndex]) {
                highlightCurrentBlock(matched[nextIndex].id);
            }
        } else {
            // ===== 工具箱搜索模式 =====
            clearAllHighlights();
            if (toolboxConfiguration) {
                ToolboxSearchIndex.rebuild(toolboxConfiguration);
            }

            const results = ToolboxSearchIndex.search(query);
            setToolboxResults(results);

            if (shouldResetIndex) {
                setCurrentIndex(0);
            } else {
                // 工具箱结果列表通常是静态的，直接保持索引即可，加一层安全检查
                setCurrentIndex(prev => Math.max(0, Math.min(prev, results.length - 1)));
            }
        }

        // [FIX] 添加 isVisible 到依赖项，确保重新打开时刷新。添加 toolboxConfiguration 确保动态更新。
        // [FIX] 添加 workspaceVersion 依赖，确保积木增删改时实时刷新结果
    }, [query, mode, workspace, clearAllHighlights, toolboxConfiguration, isVisible, workspaceVersion]);

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
                const root = previousHighlightRef.current.getSvgRoot();
                if (root) {
                    const path = root.querySelector('.blocklyPath');
                    if (path) {
                        // 恢复为黄色 (普通匹配项颜色)
                        path.style.filter = 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.8)) drop-shadow(0 0 16px rgba(251, 191, 36, 0.6))';
                    }
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

                const root = block.getSvgRoot();
                if (root) {
                    const path = root.querySelector('.blocklyPath');
                    if (path) {
                        // 青色发光表示当前选中 (更醒目 - 双重光晕)
                        path.style.filter = 'drop-shadow(0 0 10px rgba(6, 182, 212, 0.9)) drop-shadow(0 0 20px rgba(6, 182, 212, 0.7))';
                    }
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
     * @param result 积木块搜索结果 (包含 blockState)
     */
    const addBlockToWorkspace = useCallback((result: { type: string, blockState: any }) => {
        if (!workspace) return;
        try {
            let block;
            if (result.blockState && Blockly.serialization) {
                // 使用序列化状态恢复积木 (WYSIWYG)
                block = Blockly.serialization.blocks.append(result.blockState, workspace);
            } else {
                // 回退到简单类型创建
                block = workspace.newBlock(result.type);
            }
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

    /** 键盘事件处理 (绑定到容器) */
    const handleContainerKeyDown = (e: React.KeyboardEvent) => {
        if (e.nativeEvent.isComposing) return;

        switch (e.key) {
            case 'Escape':
                e.preventDefault();
                onClose();
                break;
            case 'Enter':
                e.preventDefault();
                const results = mode === 'workspace' ? workspaceResults : toolboxResults;
                if (results[currentIndex]) {
                    if (mode === 'workspace') {
                        if (e.shiftKey) goPrev(); else goNext();
                    } else {
                        // 工具箱模式 - 添加并关闭建议
                        addBlockToWorkspace(results[currentIndex] as any);
                        // 保持输入框焦点以便继续搜索
                        inputRef.current?.focus();
                    }
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                goNext();
                break;
            case 'ArrowUp':
                e.preventDefault();
                goPrev();
                break;
            case 'Tab':
                e.preventDefault();
                // [FIX] 确保 Tab 只在两个模式间切换
                const newMode = mode === 'workspace' ? 'toolbox' : 'workspace';
                setMode(newMode);
                // 强制聚焦输入框，防止焦点跳到浏览器栏
                // 使用 setTimeout 确保 React 渲染后再聚焦
                setTimeout(() => {
                    if (inputRef.current) inputRef.current.focus();
                }, 0);
                break;
        }
    };

    /** [FIX] 容器点击处理：点击空白处归还焦点给输入框 */
    const handleContainerClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;

        // 如果点击的是交互元素(输入框、按钮、列表项)，则不做处理 (它们有自己的逻辑)
        if (target.tagName === 'INPUT' ||
            target.tagName === 'BUTTON' ||
            target.closest('button') ||
            target.closest('.unified-search-item')) {
            return;
        }

        // 其他所有非交互区域的点击，都聚焦输入框
        // 例如：图标、标题栏空白、Tabs空白、底部提示等
        e.preventDefault();
        inputRef.current?.focus();
    };

    // 不可见时不渲染
    if (!isVisible) return null;

    // ========== 渲染搜索界面 ==========
    return (
        <div
            className="unified-search-container"
            // [FIX] 在此处统一阻止事件冒泡，防止触发外部快捷键
            onKeyDown={(e) => {
                e.stopPropagation();
                handleContainerKeyDown(e);
            }}
            onKeyUp={(e) => e.stopPropagation()}
            onMouseDown={(e) => {
                // 阻止容器本身的点击事件冒泡，但允许内部元素交互
                // 注意：不用 preventDefault，否则 input 无法聚焦
                e.stopPropagation();
            }}
            onClick={handleContainerClick} // [FIX] 容器点击接管焦点
        >
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
                    // [FIX] 移除禁止冒泡，允许事件传递给容器处理
                    autoComplete="off"
                    spellCheck={false}
                    // [FIX] 无论如何强制获取焦点。这会处理点击输入框失效的情况。
                    autoFocus
                    onMouseDown={(e) => {
                        e.stopPropagation(); // 阻止容器拦截
                        // 不需要 preventDefault，否则无法输入
                    }}
                    onClick={(e) => {
                        e.stopPropagation(); // 阻止容器拦截
                        inputRef.current?.focus();
                    }}
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
                        // [FIX] 防止点击时夺走焦点
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); goPrev(); inputRef.current?.focus(); }}
                        disabled={results.length === 0}
                        title={t('search.prev')}
                    >▲</button>
                    <button
                        className="unified-search-nav-btn"
                        // [FIX] 防止点击时夺走焦点
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); goNext(); inputRef.current?.focus(); }}
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
                    // [FIX] 防止点击时夺走焦点
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { setMode('workspace'); inputRef.current?.focus(); }}
                >
                    {t('search.tabWorkspace')}
                </button>
                <button
                    className={`unified-search-tab ${mode === 'toolbox' ? 'active' : ''}`}
                    // [FIX] 防止点击时夺走焦点
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { setMode('toolbox'); inputRef.current?.focus(); }}
                >
                    {t('search.tabToolbox')}
                </button>
            </div>

            {/* 搜索结果列表 */}
            {results.length > 0 && (
                <ul className="unified-search-results" ref={resultsRef}>
                    {results.map((result, index) => {
                        const isSelected = index === currentIndex;
                        let blockJson = null;

                        // 只有被选中的项才生成预览数据，避免性能问题
                        if (isSelected) {
                            if (mode === 'workspace' && workspace) {
                                try {
                                    const block = workspace.getBlockById((result as any).id);
                                    if (block) {
                                        blockJson = Blockly.serialization.blocks.save(block);
                                    }
                                } catch (e) {
                                    // 忽略获取失败的情况
                                }
                            } else if (mode === 'toolbox') {
                                blockJson = (result as any).blockState;
                            }
                        }

                        return (
                            <li
                                key={mode === 'workspace' ? (result as any).id : (result as any).type + index}
                                className={`unified-search-item ${isSelected ? 'selected' : ''}`}
                                // [FIX] 点击结果项时，强制聚焦输入框，防止焦点跑偏导致键盘失效
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    inputRef.current?.focus();

                                    // [FIX] 点击即选中，更新视觉状态 (无论是工作区还是工具箱模式)
                                    setCurrentIndex(index);

                                    if (mode === 'workspace') {
                                        navigateTo(index);
                                    } else {
                                        addBlockToWorkspace(result as any);
                                    }
                                }}
                            >
                                <div className="result-header">
                                    <span className="result-label">{result.label}</span>
                                    <span className="result-type">{(result as any).type}</span>
                                </div>

                                {/* 内联积木预览 */}
                                {isSelected && blockJson && (
                                    <div className="result-preview" style={{
                                        height: '90px',
                                        marginTop: '10px',
                                        borderRadius: '6px',
                                        overflow: 'hidden',
                                        backgroundColor: 'rgba(0,0,0,0.02)',
                                        border: '1px solid var(--border-color, #e5e7eb)'
                                    }}>
                                        <MiniBlockPreview blockJson={blockJson} />
                                    </div>
                                )}
                            </li>
                        );
                    })}
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
