import React, { useState, useEffect, useRef, useCallback } from 'react';
// @ts-ignore
import * as Blockly from 'blockly';
import { BILINGUAL_MAP } from '../../config/search_dictionary';
import { useTranslation } from 'react-i18next';
import './UnifiedSearch.css';

// Helper to resolve Blockly message references
const resolveMsg = (msg: any) => {
    if (typeof msg !== 'string') return '';
    try {
        return Blockly.utils.parsing.replaceMessageReferences(msg).toLowerCase();
    } catch (e) {
        return msg.toLowerCase();
    }
};

// Search index for toolbox (all available blocks)
class ToolboxSearchIndex {
    private static index = new Map<string, { type: string; label: string; meta: Set<string> }>();
    private static isBuilt = false;

    static rebuild() {
        if (this.isBuilt) return;

        const headless = new Blockly.Workspace();
        try {
            const allTypes = Object.keys(Blockly.Blocks);
            for (const type of allTypes) {
                const meta = new Set<string>();
                const typeLower = type.toLowerCase();
                meta.add(typeLower);

                let label = type;
                const def = Blockly.Blocks[type];
                if (def) {
                    if (def.message0) {
                        const resolved = resolveMsg(def.message0);
                        meta.add(resolved);
                        label = resolved.split('%')[0].trim() || type;
                    }
                    if (def.tooltip) meta.add(resolveMsg(def.tooltip));
                }

                try {
                    const block = headless.newBlock(type);
                    const blockText = block.toString();
                    meta.add(blockText.toLowerCase());
                    if (blockText.length > 2 && blockText.length < 60) {
                        label = blockText;
                    }
                    block.dispose(false);
                } catch (e) { }

                const allMeta = Array.from(meta).join(' ');
                for (const [eng, zhArr] of Object.entries(BILINGUAL_MAP)) {
                    const engLower = eng.toLowerCase();
                    if (allMeta.includes(engLower) || zhArr.some(zh => allMeta.includes(zh))) {
                        meta.add(engLower);
                        zhArr.forEach(zh => meta.add(zh));
                    }
                }

                this.index.set(typeLower, { type, label, meta });
            }
            this.isBuilt = true;
        } finally {
            headless.dispose();
        }
    }

    static search(query: string, maxResults = 50): Array<{ type: string; label: string }> {
        if (!query.trim()) return [];
        this.rebuild();

        const q = query.toLowerCase().trim();
        const results: Array<{ type: string; label: string; score: number }> = [];

        for (const [, entry] of this.index) {
            for (const m of entry.meta) {
                if (m.includes(q)) {
                    const score = m.indexOf(q);
                    results.push({ type: entry.type, label: entry.label, score });
                    break;
                }
            }
        }

        return results
            .sort((a, b) => a.score - b.score)
            .slice(0, maxResults)
            .map(r => ({ type: r.type, label: r.label }));
    }
}

type SearchMode = 'workspace' | 'toolbox';

interface UnifiedSearchProps {
    workspace: any;
    isVisible: boolean;
    onClose: () => void;
    initialMode?: SearchMode;
}

export const UnifiedSearch: React.FC<UnifiedSearchProps> = ({ workspace, isVisible, onClose, initialMode = 'workspace' }) => {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [mode, setMode] = useState<SearchMode>(initialMode);
    const [workspaceResults, setWorkspaceResults] = useState<Array<{ id: string; type: string; label: string }>>([]);
    const [toolboxResults, setToolboxResults] = useState<Array<{ type: string; label: string }>>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLUListElement>(null);
    const previousHighlightRef = useRef<any>(null);
    const allHighlightedRef = useRef<any[]>([]); // Track all highlighted blocks

    const results = mode === 'workspace' ? workspaceResults : toolboxResults;

    // Clear all highlights
    const clearAllHighlights = useCallback(() => {
        // Clear current selection highlight
        if (previousHighlightRef.current) {
            try {
                previousHighlightRef.current.setHighlighted(false);
                previousHighlightRef.current.removeSelect();
                // Remove custom style
                const svg = previousHighlightRef.current.getSvgRoot();
                if (svg) svg.style.filter = '';
            } catch (e) { }
            previousHighlightRef.current = null;
        }
        // Clear all match highlights
        for (const block of allHighlightedRef.current) {
            try {
                const svg = block.getSvgRoot();
                if (svg) svg.style.filter = '';
            } catch (e) { }
        }
        allHighlightedRef.current = [];
    }, []);

    // Focus input when visible
    useEffect(() => {
        if (isVisible && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
            setMode(initialMode);
        } else {
            clearAllHighlights();
        }
    }, [isVisible, initialMode, clearAllHighlights]);

    // Search and highlight
    useEffect(() => {
        if (!query.trim()) {
            setWorkspaceResults([]);
            setToolboxResults([]);
            setCurrentIndex(0);
            clearAllHighlights();
            return;
        }

        if (mode === 'workspace') {
            if (!workspace) return;
            const q = query.toLowerCase();
            const blocks = workspace.getAllBlocks(false);
            const matched: Array<{ id: string; type: string; label: string }> = [];

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

            // Highlight all matches with yellow tint
            clearAllHighlights();
            for (const m of matched) {
                try {
                    const block = workspace.getBlockById(m.id);
                    if (block) {
                        const svg = block.getSvgRoot();
                        if (svg) {
                            // Yellow tint for all matches
                            svg.style.filter = 'drop-shadow(0 0 8px #fbbf24) brightness(1.1)';
                        }
                        allHighlightedRef.current.push(block);
                    }
                } catch (e) { }
            }

            // Highlight first match with current selection color
            if (matched.length > 0) {
                highlightCurrentBlock(matched[0].id);
            }
        } else {
            const results = ToolboxSearchIndex.search(query);
            setToolboxResults(results);
            setCurrentIndex(0);
        }
    }, [query, mode, workspace, clearAllHighlights]);

    // Highlight current selected block with distinct color (cyan glow)
    const highlightCurrentBlock = useCallback((blockId: string) => {
        if (!workspace) return;

        // Remove previous current selection style
        if (previousHighlightRef.current) {
            try {
                previousHighlightRef.current.setHighlighted(false);
                previousHighlightRef.current.removeSelect();
                const svg = previousHighlightRef.current.getSvgRoot();
                if (svg) {
                    // Reset to yellow (all matches color)
                    svg.style.filter = 'drop-shadow(0 0 8px #fbbf24) brightness(1.1)';
                }
            } catch (e) { }
        }

        try {
            const block = workspace.getBlockById(blockId);
            if (block) {
                workspace.centerOnBlock(blockId);
                block.setHighlighted(true);
                block.addSelect();
                // Cyan glow for current selection - more prominent
                const svg = block.getSvgRoot();
                if (svg) {
                    svg.style.filter = 'drop-shadow(0 0 12px #06b6d4) drop-shadow(0 0 20px #06b6d4) brightness(1.2)';
                }
                previousHighlightRef.current = block;
            }
        } catch (e) { }
    }, [workspace]);

    // Navigate to result
    const navigateTo = useCallback((index: number) => {
        if (index < 0 || index >= results.length) return;
        setCurrentIndex(index);

        if (mode === 'workspace') {
            const result = workspaceResults[index];
            if (result) {
                highlightCurrentBlock(result.id);
            }
        } else {
            // Toolbox mode - just update selection, let user decide to add
            // User can press Enter again or click to add the block
            setCurrentIndex(index);
        }
    }, [mode, results, workspaceResults, highlightCurrentBlock]);

    // Add block to workspace (toolbox mode, user action)
    const addBlockToWorkspace = useCallback((type: string) => {
        if (!workspace) return;
        try {
            const block = workspace.newBlock(type);
            block.initSvg();
            block.render();
            const metrics = workspace.getMetrics();
            const x = metrics.viewLeft + metrics.viewWidth / 2 - 50;
            const y = metrics.viewTop + 50;
            block.moveBy(x / workspace.scale, y / workspace.scale);
        } catch (e) { }
    }, [workspace]);

    // Scroll to selected item
    useEffect(() => {
        if (resultsRef.current && currentIndex >= 0) {
            const selectedItem = resultsRef.current.children[currentIndex] as HTMLElement;
            if (selectedItem) {
                selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [currentIndex]);

    // Go to next/prev
    const goNext = useCallback(() => {
        if (results.length === 0) return;
        const next = (currentIndex + 1) % results.length;
        navigateTo(next);
    }, [results.length, currentIndex, navigateTo]);

    const goPrev = useCallback(() => {
        if (results.length === 0) return;
        const prev = currentIndex <= 0 ? results.length - 1 : currentIndex - 1;
        navigateTo(prev);
    }, [results.length, currentIndex, navigateTo]);

    // Keyboard
    const handleKeyDown = (e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'Escape':
                onClose();
                break;
            case 'Enter':
                e.preventDefault();
                if (mode === 'toolbox' && toolboxResults[currentIndex]) {
                    // Toolbox mode - add selected block
                    addBlockToWorkspace(toolboxResults[currentIndex].type);
                } else if (mode === 'workspace') {
                    // Workspace mode - go to next/prev
                    if (e.shiftKey) {
                        goPrev();
                    } else {
                        goNext();
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
                setMode(m => m === 'workspace' ? 'toolbox' : 'workspace');
                break;
        }
    };

    if (!isVisible) return null;

    return (
        <div className="unified-search-container">
            <div className="unified-search-header">
                <span className="unified-search-icon">🔍</span>
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
                {results.length > 0 && (
                    <span className="unified-search-counter">
                        {currentIndex + 1}/{results.length}
                    </span>
                )}
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
                <button className="unified-search-close" onClick={onClose} title={t('search.close')}>×</button>
            </div>

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

            {results.length > 0 && (
                <ul className="unified-search-results" ref={resultsRef}>
                    {results.map((result, index) => (
                        <li
                            key={mode === 'workspace' ? (result as any).id : (result as any).type}
                            className={`unified-search-result ${index === currentIndex ? 'selected' : ''}`}
                            onClick={() => {
                                if (mode === 'workspace') {
                                    navigateTo(index);
                                } else {
                                    // Toolbox mode - user clicks to add block
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
            {query && results.length === 0 && (
                <div className="unified-search-empty">
                    {mode === 'workspace' ? t('search.noMatchWorkspace') : t('search.noMatchToolbox')}
                </div>
            )}

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
