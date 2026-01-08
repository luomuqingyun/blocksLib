// ----------------------------------------------------------------------------
// 扩展管理模态框 (Extensions Modal)
// ----------------------------------------------------------------------------
// 管理和浏览扩展:
// - 已安装: 显示已安装扩展及其功能标签
// - Marketplace: 链接到 GitHub 扩展仓库
// - 导入: 支持从本地文件夹导入扩展
// ----------------------------------------------------------------------------

import React, { useState, useEffect } from 'react';
import { X, Package, Puzzle, Download, Box, Layers, Cpu, Code, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LoadedExtension, ExtensionRegistry } from '../registries/ExtensionRegistry';
import { BoardRegistry } from '../registries/BoardRegistry';

// --- 组件属性类型 ---
interface ExtensionsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ExtensionsModal: React.FC<ExtensionsModalProps> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const [extensions, setExtensions] = useState<LoadedExtension[]>([]);
    const [activeTab, setActiveTab] = useState<'installed' | 'marketplace'>('installed');

    useEffect(() => {
        if (isOpen) {
            loadExtensions();
        }
    }, [isOpen]);

    const loadExtensions = async () => {
        if (window.electronAPI) {
            const exts = await window.electronAPI.extensionsList();
            setExtensions(exts);
        }
    };

    const handleImport = async () => {
        if (window.electronAPI) {
            try {
                const result = await window.electronAPI.importExtension();
                if (result.success) {
                    alert(result.message);
                    await ExtensionRegistry.reload(); // Reload resources to update Toolbox
                    loadExtensions(); // Refresh list UI
                } else {
                    if (result.message !== 'Canceled') {
                        alert('Import Failed: ' + result.message);
                    }
                }
            } catch (error) {
                console.error("IPC invoke failed:", error);
                alert("IPC Error: " + error);
            }
        } else {
            console.error("electronAPI not available");
            alert("Internal Error: electronAPI not available");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[10005] flex items-center justify-center backdrop-blur-sm">
            <div className="bg-[#1e1e1e] w-[900px] h-[700px] rounded-lg shadow-2xl border border-slate-700 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="h-14 bg-[#252526] border-b border-slate-700 flex items-center justify-between px-4 select-none">
                    <div className="flex items-center gap-2 text-slate-200 font-medium">
                        <Puzzle className="text-blue-500" size={20} />
                        <span>{t('extensions.title')}</span>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-700 bg-[#252526] justify-between pr-4 items-center">
                    <div className="flex">
                        <button
                            onClick={() => setActiveTab('installed')}
                            className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'installed' ? 'border-blue-500 text-white bg-[#1e1e1e]' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#2a2d2e]'}`}
                        >
                            {t('app.extensions')}
                        </button>
                        <button
                            onClick={() => setActiveTab('marketplace')}
                            className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'marketplace' ? 'border-blue-500 text-white bg-[#1e1e1e]' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#2a2d2e]'}`}
                        >
                            {t('extensions.marketplace')}
                        </button>
                    </div>
                    {/* Import Button */}
                    <button
                        onClick={handleImport}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#333] hover:bg-[#444] text-slate-200 rounded text-xs border border-slate-600 transition-colors"
                        title={t('extensions.importLocal')}
                    >
                        <Download size={14} /> {t('extensions.importLocal')}
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-[#1e1e1e]">
                    {activeTab === 'installed' ? (
                        <div className="space-y-4">
                            {extensions.length === 0 ? (
                                <div className="text-center py-20 text-slate-500">
                                    <Package size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>No extensions installed.</p>
                                    <p className="text-xs mt-2">Place extensions in your user data folder.</p>
                                </div>
                            ) : (
                                extensions.map((ext) => (
                                    <ExtensionItem key={ext.manifest.id} ext={ext} onReload={loadExtensions} />
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-slate-500">
                            <Download size={48} className="mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-medium text-slate-300 mb-2">{t('extensions.marketplace')}</h3>
                            <p className="max-w-md mx-auto mb-6">
                                {t('extensions.hintMore')}
                                <br />
                                <a href="https://github.com/luomuqingyun/blocksLib" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline">
                                    https://github.com/luomuqingyun/blocksLib
                                </a>
                            </p>
                            <div className="bg-[#252526] p-4 rounded-lg max-w-sm mx-auto text-left text-sm border border-slate-700">
                                <p className="font-bold text-slate-300 mb-2">{t('extensions.hintTitle')}</p>
                                <ol className="list-decimal list-inside space-y-1 text-slate-400">
                                    <li>{t('extensions.hint1')}</li>
                                    <li>{t('extensions.hint2')}</li>
                                </ol>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ExtensionItem: React.FC<{ ext: LoadedExtension, onReload: () => void }> = ({ ext, onReload }) => {
    const { t } = useTranslation();
    const [iconUrl, setIconUrl] = useState<string | null>(null);

    useEffect(() => {
        if (ext.manifest.icon && window.electronAPI) {
            window.electronAPI.extensionReadFile(ext.manifest.id, ext.manifest.icon, 'base64')
                .then(content => {
                    if (content) {
                        // Detect mime type or just assume standard images based on extension could be better, 
                        // but usually base64 returned by fs read doesn't have data URI prefix unless we add it.
                        // Wait, fs.readFileSync with encoding returns string. 'base64' encoding returns raw base64 string.
                        // We need to prefix it.
                        const extName = ext.manifest.icon?.split('.').pop()?.toLowerCase();
                        let mimeType = 'image/png';
                        if (extName === 'jpg' || extName === 'jpeg') mimeType = 'image/jpeg';
                        if (extName === 'svg') mimeType = 'image/svg+xml';
                        if (extName === 'gif') mimeType = 'image/gif';

                        setIconUrl(`data:${mimeType};base64,${content}`);
                    }
                })
                .catch(err => console.error("Failed to load icon", err));
        }
    }, [ext]);

    return (
        <div className="bg-[#252526] border border-slate-700 rounded-lg p-4 flex gap-4 hover:border-slate-600 transition-colors">
            <div className="w-16 h-16 bg-[#333] rounded-md flex items-center justify-center text-slate-500 shrink-0 overflow-hidden">
                {iconUrl ? (
                    <img src={iconUrl} alt={ext.manifest.name} className="w-full h-full object-cover" />
                ) : (
                    <Puzzle size={28} />
                )}
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-bold text-slate-200">{ext.manifest.name}</h3>
                        <p className="text-xs text-slate-500 font-mono mb-1">{ext.manifest.id} v{ext.manifest.version}</p>
                    </div>
                    <div className="flex gap-2">
                        {/* Badges for contributions */}
                        {ext.hasBoards && <span className="px-2 py-0.5 bg-green-900/30 text-green-400 text-[10px] rounded border border-green-900/50 flex items-center gap-1"><Cpu size={10} /> {t('extensions.boards')}</span>}
                        {ext.hasBlocks && <span className="px-2 py-0.5 bg-yellow-900/30 text-yellow-400 text-[10px] rounded border border-yellow-900/50 flex items-center gap-1"><Box size={10} /> {t('extensions.blocks')}</span>}
                        {ext.hasGenerators && <span className="px-2 py-0.5 bg-blue-900/30 text-blue-400 text-[10px] rounded border border-blue-900/50 flex items-center gap-1"><Code size={10} /> {t('extensions.code')}</span>}
                        {ext.hasLibraries && <span className="px-2 py-0.5 bg-purple-900/30 text-purple-400 text-[10px] rounded border border-purple-900/50 flex items-center gap-1"><Layers size={10} /> {t('extensions.libs')}</span>}
                    </div>
                </div>
                <p className="text-sm text-slate-300 mt-2 line-clamp-2">{ext.manifest.description}</p>

                {/* Compatibility Indicators */}
                {ext.manifest.compatibility && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        {ext.manifest.compatibility.families && ext.manifest.compatibility.families.length > 0 && (
                            <span className="px-2 py-0.5 bg-orange-900/30 text-orange-400 text-[10px] rounded border border-orange-900/50 flex items-center gap-1" title="Required Board Families">
                                Family: {ext.manifest.compatibility.families.join(', ')}
                            </span>
                        )}
                        {ext.manifest.compatibility.boards && ext.manifest.compatibility.boards.length > 0 && (
                            <span className="px-2 py-0.5 bg-red-900/30 text-red-400 text-[10px] rounded border border-red-900/50 flex items-center gap-1" title="Required Specific Boards">
                                Board: {ext.manifest.compatibility.boards.join(', ')}
                            </span>
                        )}
                    </div>
                )}

                <div className="mt-3 flex gap-2">
                    {/* Settings button hidden until implemented */}

                    {/* Uninstall Button */}
                    <button
                        className="text-xs bg-red-900/30 hover:bg-red-900/50 text-red-400 px-3 py-1.5 rounded transition-colors border border-red-900/50 flex items-center gap-1"
                        onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm(`${t('dialog.unsavedChangesDesc', "Are you sure you want to uninstall")} "${ext.manifest.name}"?`)) {
                                const result = await window.electronAPI.uninstallExtension(ext.manifest.id);
                                if (result.success) {
                                    BoardRegistry.unregisterExtension(ext.manifest.id);
                                    onReload(); // Refresh list
                                } else {
                                    alert(result.message);
                                }
                            }
                        }}
                        title={t('extensions.uninstall')}
                    >
                        <Trash2 size={12} /> {t('extensions.uninstall')}
                    </button>
                </div>
            </div>
        </div>
    );
};
