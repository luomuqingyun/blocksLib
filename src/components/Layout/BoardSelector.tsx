import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Search, Check, ChevronRight, Box, Cpu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { boardRepository } from '../../data/BoardRepository';
import { BoardRegistry } from '../../registries/BoardRegistry';
import { getI18nString } from '../../utils/i18n_utils';
import { Board } from '../../types/board';
import { useUI } from '../../contexts/UIContext'; // Assuming we might need click outside handling via refs usually

interface BoardSelectorProps {
    selectedId: string;
    onSelect: (id: string) => void;
    disabled?: boolean;
    isProjectActive?: boolean;
}

export const BoardSelector: React.FC<BoardSelectorProps> = ({ selectedId, onSelect, disabled, isProjectActive }) => {
    const { t, i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Reactive Data State
    const [standardData, setStandardData] = useState(() => boardRepository.getStandardBoards());
    const [stm32Data, setStm32Data] = useState(() => boardRepository.getSTM32Boards().STM32);

    // Subscribe to Registry changes (e.g. when STM32 boards finish loading)
    useEffect(() => {
        const refresh = () => {
            console.log('[BoardSelector] Registry updated, refreshing data...');
            setStandardData(boardRepository.getStandardBoards());
            setStm32Data(boardRepository.getSTM32Boards().STM32);
        };

        // If STM32 is not loaded yet, this will trigger the background load
        refresh();

        return BoardRegistry.subscribe(refresh);
    }, []);

    // Get current board details for display
    const selectedBoard = useMemo(() => BoardRegistry.get(selectedId), [selectedId]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search on open
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Check compatibility if project is active
    const isCompatible = (b: any) => {
        if (!isProjectActive || !selectedBoard) return true;
        return b.family === selectedBoard.family;
    };

    const handleSelect = (board: any) => {
        if (isProjectActive && !isCompatible(board)) {
            alert(`Project locked to ${selectedBoard?.family.toUpperCase()} family.`);
            return;
        }
        onSelect(board.id);
        setIsOpen(false);
        setSearchTerm('');
    };

    const toggleSeries = (series: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newSet = new Set(expandedSeries);
        if (newSet.has(series)) newSet.delete(series);
        else newSet.add(series);
        setExpandedSeries(newSet);
    };

    // Filter Logic
    const filteredBoards = useMemo(() => {
        const term = searchTerm.toLowerCase();

        // Helper to flatten and filter
        const filterList = (list: any[]) => list.filter(b => {
            const name = getI18nString(b.name, i18n.language).toLowerCase();
            const id = b.id.toLowerCase();
            return (name.includes(term) || id.includes(term)) && isCompatible(b);
        });

        // If searching, return flat list
        if (term) {
            const std = Object.values(standardData).flat();
            const stm = Object.values(stm32Data).flat();
            return {
                flat: filterList([...std, ...stm] as any[])
            };
        }

        // Otherwise return structured data
        return {
            standard: Object.entries(standardData).reduce((acc, [cat, boards]) => {
                const valid = (boards as any[]).filter(isCompatible);
                if (valid.length > 0) acc[cat] = valid;
                return acc;
            }, {} as Record<string, any[]>),
            stm32: Object.entries(stm32Data).reduce((acc, [series, boards]) => {
                const valid = (boards as any[]).filter(isCompatible);
                if (valid.length > 0) acc[series] = valid;
                return acc;
            }, {} as Record<string, any[]>)
        };
    }, [searchTerm, i18n.language, standardData, stm32Data, isProjectActive, selectedBoard]);


    return (
        <div className="relative" ref={containerRef}>
            {/* Trigger Button */}
            <button
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`flex items-center gap-2 bg-[#333] hover:bg-[#3c3c3c] text-xs text-slate-200 rounded px-2 py-1.5 border border-transparent transition-all min-w-[160px] max-w-[240px] justify-between ${isOpen ? 'border-blue-500' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={isProjectActive ? "Board selection restricted to current family" : "Select Board"}
            >
                <div className="flex items-center gap-2 truncate">
                    {selectedBoard ? (
                        <>
                            {/* Simple Icon Logic */}
                            {selectedBoard.family === 'arduino' ? <Box size={14} className="text-teal-400" /> :
                                selectedBoard.family === 'esp32' ? <Box size={14} className="text-orange-400" /> :
                                    <Cpu size={14} className="text-blue-400" />}
                            <span className="truncate">{getI18nString(selectedBoard.name, i18n.language)}</span>
                        </>
                    ) : (
                        <span className="text-slate-400">Select Board...</span>
                    )}
                </div>
                <ChevronDown size={12} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-[320px] max-h-[500px] bg-[#1e1e1e] border border-slate-700 rounded-lg shadow-2xl flex flex-col z-50 overflow-hidden">
                    {/* Search Header */}
                    <div className="p-2 border-b border-slate-700 bg-[#252526]">
                        <div className="relative">
                            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                className="w-full bg-[#1e1e1e] border border-slate-600 rounded pl-8 pr-2 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 outline-none"
                                placeholder="Search chips (e.g. F103, ESP32)..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Scrollable List */}
                    <div className="flex-1 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-slate-700">
                        {searchTerm ? (
                            /* Search Results (Flat) */
                            filteredBoards.flat && filteredBoards.flat.length > 0 ? (
                                filteredBoards.flat.map((b: any) => (
                                    <SearchResultItem
                                        key={b.id}
                                        board={b}
                                        isSelected={selectedId === b.id}
                                        onClick={() => handleSelect(b)}
                                        lang={i18n.language}
                                    />
                                ))
                            ) : (
                                <div className="p-4 text-center text-slate-500 text-xs">No matching boards found</div>
                            )
                        ) : (
                            /* Structured List */
                            <div className="space-y-1">
                                {/* Standard Categories */}
                                {filteredBoards.standard && Object.entries(filteredBoards.standard).map(([cat, boards]) => (
                                    <div key={cat}>
                                        <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-[#252526]/50">{cat}</div>
                                        {boards.map((b: any) => (
                                            <SearchResultItem
                                                key={b.id}
                                                board={b}
                                                isSelected={selectedId === b.id}
                                                onClick={() => handleSelect(b)}
                                                lang={i18n.language}
                                            />
                                        ))}
                                    </div>
                                ))}

                                {/* STM32 Series (Collapsible) */}
                                {filteredBoards.stm32 && Object.keys(filteredBoards.stm32).length > 0 && (
                                    <>
                                        <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-[#252526]/50 mt-2">STM32 Series</div>
                                        {Object.entries(filteredBoards.stm32).map(([series, boards]) => {
                                            const isExpanded = expandedSeries.has(series);
                                            const count = (boards as any[]).length;

                                            // Split prefix logic if needed, but Accordion is usually better for Series
                                            return (
                                                <div key={series}>
                                                    <button
                                                        onClick={(e) => toggleSeries(series, e)}
                                                        className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-[#2a2a2a] text-slate-300 text-xs rounded transition-colors group"
                                                    >
                                                        {isExpanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                                                        <span className="font-medium flex-1 text-left">{series}</span>
                                                        <span className="text-[10px] text-slate-600 group-hover:text-slate-500 bg-[#252526] px-1.5 rounded-full">{count}</span>
                                                    </button>

                                                    {/* Sub List */}
                                                    {isExpanded && (
                                                        <div className="pl-3 border-l border-slate-700/50 ml-2 mt-0.5 space-y-0.5">
                                                            {(boards as any[]).map((b: any) => (
                                                                <SearchResultItem
                                                                    key={b.id}
                                                                    board={b}
                                                                    isSelected={selectedId === b.id}
                                                                    onClick={() => handleSelect(b)}
                                                                    lang={i18n.language}
                                                                    compact
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const SearchResultItem = ({ board, isSelected, onClick, lang, compact }: any) => (
    <button
        onClick={onClick}
        className={`w-full text-left px-2 py-1.5 rounded flex items-center gap-2 text-xs transition-colors ${isSelected
            ? 'bg-blue-600/20 text-blue-300'
            : 'text-slate-300 hover:bg-[#2a2a2a] hover:text-slate-100'
            }`}
    >
        {!compact && (
            board.family === 'stm32' ? <Cpu size={14} className="opacity-50" /> : <Box size={14} className="opacity-50" />
        )}
        <span className="flex-1 truncate">{getI18nString(board.name, lang)}</span>
        {isSelected && <Check size={14} className="text-blue-400" />}
    </button>
);
