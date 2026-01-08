// ----------------------------------------------------------------------------
// 扩展管理模态框 (Extensions Modal)
// ----------------------------------------------------------------------------
// 管理和浏览扩展:
// - 已安装: 显示已安装扩展及其功能标签
// - Marketplace: 链接到 GitHub 扩展仓库
// - 导入: 支持从本地文件夹导入扩展
// ----------------------------------------------------------------------------

import React, { useState, useEffect } from 'react';
import { X, Package, Puzzle, Download, Box, Layers, Cpu, Code, Trash2, Plus, Link as LinkIcon, Loader2, Globe, BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LoadedExtension, ExtensionRegistry } from '../registries/ExtensionRegistry';
import { BoardRegistry } from '../registries/BoardRegistry';
import { BaseModal } from './BaseModal';

// --- 组件属性类型 ---
interface ExtensionsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ExtensionsModal: React.FC<ExtensionsModalProps> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const [extensions, setExtensions] = useState<LoadedExtension[]>([]);
    const [activeTab, setActiveTab] = useState<'installed' | 'marketplace'>('installed');

    // Marketplace State
    const [marketplaces, setMarketplaces] = useState<string[]>([]);
    const [remoteExtensions, setRemoteExtensions] = useState<any[]>([]);
    const [isLoadingMarketplace, setIsLoadingMarketplace] = useState(false);
    const [isAddingMarketplace, setIsAddingMarketplace] = useState(false);
    const [newMarketplaceUrl, setNewMarketplaceUrl] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadExtensions();
            if (activeTab === 'marketplace') {
                loadMarketplaces();
            }
        }
    }, [isOpen, activeTab]);

    const loadExtensions = async () => {
        // Ensure registry is initialized so it has processed translations
        await ExtensionRegistry.ensureInitialized();
        // Get the processed extensions (with translated names/descriptions)
        setExtensions([...ExtensionRegistry.getExtensions()]);
    };

    const loadMarketplaces = async () => {
        if (window.electronAPI) {
            try {
                const urls = await window.electronAPI.marketplaceListUrls();
                setMarketplaces(urls);

                setIsLoadingMarketplace(true);
                const results = await Promise.all(urls.map(async (url) => {
                    try {
                        return await window.electronAPI.marketplaceFetchRemote(url);
                    } catch (e) {
                        console.error(`Failed to fetch from ${url}`, e);
                        return [];
                    }
                }));
                setRemoteExtensions(results.flat());
            } catch (e) {
                console.error("Failed to load marketplaces", e);
            } finally {
                setIsLoadingMarketplace(false);
            }
        }
    };

    const handleAddMarketplace = async () => {
        if (!newMarketplaceUrl.trim()) return;
        if (window.electronAPI) {
            await window.electronAPI.marketplaceAddUrl(newMarketplaceUrl.trim());
            setNewMarketplaceUrl('');
            setIsAddingMarketplace(false);
            loadMarketplaces();
        }
    };

    const handleRemoveMarketplace = async (url: string) => {
        if (window.electronAPI) {
            await window.electronAPI.marketplaceRemoveUrl(url);
            loadMarketplaces();
        }
    };

    const handleInstall = async (ext: any) => {
        if (window.electronAPI) {
            setIsLoadingMarketplace(true);
            try {
                const result = await window.electronAPI.marketplaceInstall(ext);
                if (result.success) {
                    alert(result.message);
                    await ExtensionRegistry.reload();
                    loadExtensions();
                } else {
                    alert(result.message);
                }
            } catch (error) {
                console.error("Installation failed:", error);
                alert("Installation failed: " + error);
            } finally {
                setIsLoadingMarketplace(false);
            }
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

    const handleOpenGuide = () => {
        if (window.electronAPI && window.electronAPI.openHelpGuide) {
            window.electronAPI.openHelpGuide('marketplace');
        }
    };

    if (!isOpen) return null;

    return (
        <BaseModal isOpen={isOpen} onClose={onClose}>
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
                        <div className="space-y-6">
                            {extensions.length === 0 ? (
                                <div className="text-center py-20 text-slate-500">
                                    <Package size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>{t('extensions.noInstalled', "No extensions installed.")}</p>
                                    <p className="text-xs mt-2">{t('extensions.installTip', "Place extensions in your user data folder.")}</p>
                                </div>
                            ) : (
                                <>
                                    {/* Hardware Support Group */}
                                    {extensions.some(e => e.hasBoards) && (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider px-1">
                                                <Cpu size={12} />
                                                <span>{t('extensions.hardware', 'Hardware Support')}</span>
                                            </div>
                                            {extensions.filter(e => e.hasBoards).map((ext) => (
                                                <ExtensionItem key={ext.manifest.id} ext={ext} onReload={loadExtensions} />
                                            ))}
                                        </div>
                                    )}

                                    {/* Software Extensions Group */}
                                    {extensions.some(e => !e.hasBoards) && (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider px-1 mt-6">
                                                <Box size={12} />
                                                <span>{t('extensions.software', 'Software Extensions')}</span>
                                            </div>
                                            {extensions.filter(e => !e.hasBoards).map((ext) => (
                                                <ExtensionItem key={ext.manifest.id} ext={ext} onReload={loadExtensions} />
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Marketplace Management */}
                            <div className="bg-[#252526] p-4 rounded-lg border border-slate-700">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-2 text-slate-300 font-medium">
                                        <Globe size={16} />
                                        <span>{t('extensions.marketplaceSources')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setIsAddingMarketplace(!isAddingMarketplace)}
                                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                        >
                                            <Plus size={14} /> {t('common.add')}
                                        </button>
                                        <button
                                            onClick={handleOpenGuide}
                                            className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white px-2 py-1 rounded flex items-center gap-1.5 transition-colors border border-slate-600"
                                            title={t('help.viewGuide', 'View Publishing Guide')}
                                        >
                                            <BookOpen size={13} />
                                            <span>{t('help.guide', 'Guide')}</span>
                                        </button>
                                    </div>
                                </div>

                                {isAddingMarketplace && (
                                    <div className="flex gap-2 mb-4">
                                        <input
                                            type="text"
                                            placeholder={t('extensions.placeholderUrl')}
                                            className="flex-1 bg-[#1e1e1e] border border-slate-600 rounded px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                                            value={newMarketplaceUrl}
                                            onChange={(e) => setNewMarketplaceUrl(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddMarketplace()}
                                            autoFocus
                                        />
                                        <button
                                            onClick={handleAddMarketplace}
                                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded text-sm transition-colors"
                                        >
                                            {t('common.confirm')}
                                        </button>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    {marketplaces.map(url => (
                                        <div key={url} className="flex justify-between items-center group bg-[#1e1e1e] p-2 rounded border border-slate-800">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <LinkIcon size={12} className="text-slate-500 shrink-0" />
                                                <span className="text-xs text-slate-400 truncate">{url}</span>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveMarketplace(url)}
                                                className="text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Remote Extension List */}
                            <div className="space-y-4">
                                {isLoadingMarketplace ? (
                                    <div className="text-center py-20 text-slate-500">
                                        <Loader2 size={32} className="mx-auto mb-4 animate-spin opacity-50" />
                                        <p>{t('extensions.searching')}</p>
                                    </div>
                                ) : remoteExtensions.length === 0 ? (
                                    <div className="text-center py-10 text-slate-500">
                                        <Download size={48} className="mx-auto mb-4 opacity-50" />
                                        <h3 className="text-lg font-medium text-slate-300 mb-2">{t('extensions.marketplace')}</h3>
                                        <p className="max-w-md mx-auto mb-6">
                                            {t('extensions.noExtensionsFound', "No extensions found in the registered marketplaces.")}
                                        </p>
                                        <button
                                            onClick={handleOpenGuide}
                                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm text-slate-200 flex items-center gap-2 mx-auto transition-colors"
                                        >
                                            <BookOpen size={16} />
                                            {t('help.viewGuide', 'Read Publishing Guide')}
                                        </button>
                                    </div>
                                ) : (
                                    remoteExtensions.map((ext) => {
                                        const isInstalled = extensions.some(le => le.manifest.id === ext.id);
                                        return (
                                            <div key={ext.id} className="bg-[#252526] border border-slate-700 rounded-lg p-4 flex gap-4 hover:border-slate-600 transition-colors">
                                                <div className="w-16 h-16 bg-[#333] rounded-md flex items-center justify-center text-slate-500 shrink-0 overflow-hidden">
                                                    {ext.icon ? (
                                                        <img src={ext.icon} alt={ext.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Puzzle size={28} />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h3 className="text-lg font-bold text-slate-200">{ext.name}</h3>
                                                            <p className="text-xs text-slate-500 font-mono mb-1">{ext.id} v{ext.version} {ext.author && t('extensions.installedBy', { author: ext.author })}</p>
                                                        </div>
                                                        <button
                                                            disabled={isInstalled}
                                                            onClick={() => handleInstall(ext)}
                                                            className={`text-xs px-4 py-1.5 rounded transition-colors flex items-center gap-1 border ${isInstalled
                                                                ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                                                                : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500'
                                                                }`}
                                                        >
                                                            {isInstalled ? t('extensions.installed') : t('extensions.install')}
                                                        </button>
                                                    </div>
                                                    <p className="text-sm text-slate-300 mt-2 line-clamp-2">{ext.description}</p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </BaseModal >
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
