/**
 * ============================================================
 * 扩展管理模态框 (Extensions Modal Component)
 * ============================================================
 * 
 * 应用程序的扩展 (插件) 管理界面。
 * 
 * 功能:
 * - 已安装标签页: 显示已安装扩展的列表，包括功能标签
 * - 市场标签页: 从远程源浏览和安装扩展
 * - 源管理: 添加/删除扩展源 (Marketplace Sources)
 * - 导入: 支持从本地文件夹导入扩展
 * - 卸载: 支持卸载已安装的扩展
 * 
 * 扩展类型:
 * - boards: 开发板定义
 * - blocks: 积木块定义
 * - generators: 代码生成器
 * - toolbox: 工具箱配置
 * 
 * @file src/components/ExtensionsModal.tsx
 * @module EmbedBlocks/Frontend/Components/ExtensionsModal
 */

import React, { useState, useEffect } from 'react';
import { X, Package, Puzzle, Download, Box, Layers, Cpu, Code, Trash2, Plus, Link as LinkIcon, Loader2, Globe, BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LoadedExtension, ExtensionRegistry } from '../registries/ExtensionRegistry';
import { BoardRegistry } from '../registries/BoardRegistry';
import { BaseModal } from './BaseModal';
import { useUI } from '../contexts/UIContext';

// --- 组件属性类型 ---

/**
 * 简易版本号比较函数
 * 用于判断远程扩展版本与已安装版本的关系
 * 
 * @param v1 版本号 1
 * @param v2 版本号 2
 * @returns 1:更新, -1:降级, 0:相同
 */
function compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;
        if (p1 > p2) return 1;
        if (p1 < p2) return -1;
    }
    return 0;
}

interface ExtensionsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ExtensionsModal: React.FC<ExtensionsModalProps> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const { openHelp } = useUI();
    // ========== 状态管理 ==========
    const [extensions, setExtensions] = useState<LoadedExtension[]>([]);           // 已安装的扩展列表
    const [activeTab, setActiveTab] = useState<'installed' | 'marketplace'>('installed'); // 当前标签页

    // 市场状态
    const [marketplaces, setMarketplaces] = useState<string[]>([]);          // 已添加的市场源 URL 列表
    const [remoteExtensions, setRemoteExtensions] = useState<any[]>([]);     // 远程扩展列表
    const [isLoadingMarketplace, setIsLoadingMarketplace] = useState(false); // 市场加载中状态
    const [isAddingMarketplace, setIsAddingMarketplace] = useState(false);   // 添加市场源弹窗状态
    const [newMarketplaceUrl, setNewMarketplaceUrl] = useState('');          // 新市场源 URL

    // 模态框打开或标签页切换时加载数据
    useEffect(() => {
        if (isOpen) {
            loadExtensions();  // 加载已安装扩展
            if (activeTab === 'marketplace') {
                loadMarketplaces();  // 加载市场数据
            }
        }
    }, [isOpen, activeTab]);

    /** 加载已安装的扩展列表 */
    const loadExtensions = async () => {
        // 确保注册表已初始化 (包括翻译处理)
        await ExtensionRegistry.ensureInitialized();
        // 获取已处理的扩展 (包含翻译后的名称/描述)
        setExtensions([...ExtensionRegistry.getExtensions()]);
    };

    /** 加载市场源列表并获取远程扩展 */
    const loadMarketplaces = async () => {
        if (window.electronAPI) {
            try {
                // 获取已添加的市场源 URL
                const urls = await window.electronAPI.marketplaceListUrls();
                setMarketplaces(urls);

                // 从每个市场源获取扩展列表
                setIsLoadingMarketplace(true);
                const results = await Promise.all(urls.map(async (url) => {
                    try {
                        return await window.electronAPI.marketplaceFetchRemote(url);
                    } catch (e) {
                        console.error(`从 ${url} 获取失败`, e);
                        return [];
                    }
                }));
                setRemoteExtensions(results.flat());
            } catch (e) {
                console.error("加载市场失败", e);
            } finally {
                setIsLoadingMarketplace(false);
            }
        }
    };

    /** 添加新的市场源 */
    const handleAddMarketplace = async () => {
        if (!newMarketplaceUrl.trim()) return;
        if (window.electronAPI) {
            await window.electronAPI.marketplaceAddUrl(newMarketplaceUrl.trim());
            setNewMarketplaceUrl('');
            setIsAddingMarketplace(false);
            loadMarketplaces();  // 重新加载市场列表
        }
    };

    /** 删除市场源 */
    const handleRemoveMarketplace = async (url: string) => {
        if (window.electronAPI) {
            await window.electronAPI.marketplaceRemoveUrl(url);
            loadMarketplaces();
        }
    };

    /**
     * 安装扩展
     * 支持升级、降级确认
     * 
     * @param ext 远程扩展对象
     * @param force 是否强制安装 (降级时)
     */
    const handleInstall = async (ext: any, force: boolean = false) => {
        if (window.electronAPI) {
            setIsLoadingMarketplace(true);
            try {
                const result = await window.electronAPI.marketplaceInstall(ext, force);
                if (result.success) {
                    alert(result.message);
                    await ExtensionRegistry.reload();
                    loadExtensions();
                } else if (result.status === 'downgrade') {
                    // 处理降级确认
                    if (confirm(t('dialog.confirmDowngrade', {
                        current: result.currentVersion,
                        new: result.newVersion,
                        defaultValue: `检测到降级!\n当前: v${result.currentVersion}\n新版本: v${result.newVersion}\n\n是否覆盖?`
                    }))) {
                        // 用户确认，强制安装
                        await handleInstall(ext, true);
                        return;
                    }
                } else {
                    alert(result.message);
                }
            } catch (error) {
                console.error("安装失败:", error);
                alert("安装失败: " + error);
            } finally {
                setIsLoadingMarketplace(false);
            }
        }
    };

    /** 卸载扩展 */
    const handleUninstall = async (ext: LoadedExtension) => {
        if (window.electronAPI) {
            if (confirm(t('dialog.confirmUninstall', { name: ext.manifest.name, defaultValue: `确定要卸载 "${ext.manifest.name}" 吗?` }))) {
                const result = await window.electronAPI.uninstallExtension(ext.manifest.id);
                if (result.success) {
                    BoardRegistry.unregisterExtension(ext.manifest.id);
                    await ExtensionRegistry.reload(); // 重要: 更新注册表缓存
                    loadExtensions(); // 刷新 UI
                } else {
                    alert(result.message);
                }
            }
        }
    };

    /**
     * 导入本地扩展
     * 从文件夹选择扩展并复制到 extensions 目录
     * 支持降级确认重试
     * 
     * @param forceOptions 强制导入选项 (用于降级确认后的重试)
     */
    const handleImport = async (forceOptions?: { force: boolean, sourcePath: string }) => {
        if (window.electronAPI) {
            try {
                const result = await window.electronAPI.importExtension(forceOptions);
                if (result.success) {
                    await ExtensionRegistry.reload(); // 重新加载资源以更新工具箱
                    loadExtensions(); // 刷新列表 UI

                    // 查找导入的扩展以获取本地化名称
                    let extName = "Extension";
                    if (result.extensionId) {
                        // 必须再次从注册表获取，因为 loadExtensions() 是异步设置状态的
                        const freshExtensions = ExtensionRegistry.getExtensions();
                        const importedExt = freshExtensions.find(e => e.manifest.id === result.extensionId);
                        if (importedExt) {
                            extName = importedExt.manifest.name;
                        }
                    }

                    alert(t('dialog.importSuccess', { name: extName, defaultValue: `Extension "${extName}" imported successfully!` }));
                } else if (result.status === 'downgrade') {
                    // 处理本地导入的降级确认
                    if (confirm(t('dialog.confirmDowngrade', {
                        current: result.currentVersion,
                        new: result.newVersion,
                        defaultValue: `Downgrade detected!\nCurrent: v${result.currentVersion}\nNew: v${result.newVersion}\n\nDo you want to overwrite it?`
                    }))) {
                        if (result.actualSourcePath) {
                            // 用户确认，强制导入
                            await handleImport({ force: true, sourcePath: result.actualSourcePath });
                        } else {
                            alert("Error: Cannot retry import (path lost). Please try again.");
                        }
                    }
                } else {
                    // 显示错误信息 (除非用户取消)
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

    /** 打开扩展开发指南 (Markdown 帮助文档) */
    const handleOpenGuide = async () => {
        if (window.electronAPI) {
            const result = await window.electronAPI.readHelpFile('marketplace');
            openHelp(t('help.guide', 'Guide'), result.content, result.path);
        }
    };

    if (!isOpen) return null;

    return (
        <BaseModal isOpen={isOpen} onClose={onClose}>
            <div className="bg-[#1e1e1e] w-[900px] h-[700px] rounded-lg shadow-2xl border border-slate-700 flex flex-col overflow-hidden">
                {/* 标题栏 */}
                <div className="h-14 bg-[#252526] border-b border-slate-700 flex items-center justify-between px-4 select-none">
                    <div className="flex items-center gap-2 text-slate-200 font-medium">
                        <Puzzle className="text-blue-500" size={20} />
                        <span>{t('extensions.title')}</span>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* 标签页切换 */}
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
                    {/* 导入按钮 */}
                    <button
                        onClick={() => handleImport()}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#333] hover:bg-[#444] text-slate-200 rounded text-xs border border-slate-600 transition-colors"
                        title={t('extensions.importLocal')}
                    >
                        <Download size={14} /> {t('extensions.importLocal')}
                    </button>
                </div>

                {/* 内容区域 */}
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
                                    {/* 硬件支持分组 */}
                                    {extensions.some(e => e.hasBoards) && (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider px-1">
                                                <Cpu size={12} />
                                                <span>{t('extensions.hardware', 'Hardware Support')}</span>
                                            </div>
                                            {extensions.filter(e => e.hasBoards).map((ext) => (
                                                <ExtensionItem key={ext.manifest.id} ext={ext} onUninstall={handleUninstall} />
                                            ))}
                                        </div>
                                    )}

                                    {/* 软件扩展分组 */}
                                    {extensions.some(e => !e.hasBoards) && (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider px-1 mt-6">
                                                <Box size={12} />
                                                <span>{t('extensions.software', 'Software Extensions')}</span>
                                            </div>
                                            {extensions.filter(e => !e.hasBoards).map((ext) => (
                                                <ExtensionItem key={ext.manifest.id} ext={ext} onUninstall={handleUninstall} />
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* 市场源管理 */}
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
                                        <button
                                            onClick={() => {
                                                setNewMarketplaceUrl('');
                                                setIsAddingMarketplace(false);
                                            }}
                                            className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded text-sm transition-colors"
                                        >
                                            {t('dialog.cancel', 'Cancel')}
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

                            {/* 远程扩展列表 */}
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
                                    </div>
                                ) : (
                                    remoteExtensions.map((ext) => (
                                        <RemoteExtensionItem
                                            key={ext.id}
                                            ext={ext}
                                            installedExt={extensions.find(le => le.manifest.id === ext.id)}
                                            onInstall={(e, f) => handleInstall(e, f)}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </BaseModal >
    );
};

/**
 * 已安装扩展卡片组件
 * 显示扩展的图标、名称、版本、功能标签和卸载按钮
 */
const ExtensionItem: React.FC<{ ext: LoadedExtension, onUninstall: (ext: LoadedExtension) => void }> = ({ ext, onUninstall }) => {
    const { t } = useTranslation();
    // 扩展图标 URL (从扩展目录加载)
    const [iconUrl, setIconUrl] = useState<string | null>(null);

    // 加载扩展图标
    useEffect(() => {
        if (ext.manifest.icon && window.electronAPI) {
            window.electronAPI.extensionReadFile(ext.manifest.id, ext.manifest.icon, 'base64')
                .then(content => {
                    if (content) {
                        // 根据文件扩展名确定 MIME 类型
                        const extName = ext.manifest.icon?.split('.').pop()?.toLowerCase();
                        let mimeType = 'image/png';
                        if (extName === 'jpg' || extName === 'jpeg') mimeType = 'image/jpeg';
                        if (extName === 'svg') mimeType = 'image/svg+xml';
                        if (extName === 'gif') mimeType = 'image/gif';

                        // 构建 Data URI
                        setIconUrl(`data:${mimeType};base64,${content}`);
                    }
                })
                .catch(err => console.error("加载图标失败", err));
        }
    }, [ext]);

    return (
        <div className="bg-[#252526] border border-slate-700 rounded-lg p-4 flex gap-4 hover:border-slate-600 transition-colors">
            {/* 扩展图标 */}
            <div className="w-16 h-16 bg-[#333] rounded-md flex items-center justify-center text-slate-500 shrink-0 overflow-hidden">
                {iconUrl ? (
                    <img src={iconUrl} alt={ext.manifest.name} className="w-full h-full object-cover" />
                ) : (
                    <Puzzle size={28} />
                )}
            </div>
            {/* 扩展信息 */}
            <div className="flex-1">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-bold text-slate-200">{ext.manifest.name}</h3>
                        <p className="text-xs text-slate-500 font-mono mb-1">{ext.manifest.id} v{ext.manifest.version}</p>
                    </div>
                    <div className="flex gap-2">
                        {/* 功能标签: 板卡/积木块/代码生成器/库 */}
                        {ext.hasBoards && <span className="px-2 py-0.5 bg-green-900/30 text-green-400 text-[10px] rounded border border-green-900/50 flex items-center gap-1"><Cpu size={10} /> {t('extensions.boards')}</span>}
                        {ext.hasBlocks && <span className="px-2 py-0.5 bg-yellow-900/30 text-yellow-400 text-[10px] rounded border border-yellow-900/50 flex items-center gap-1"><Box size={10} /> {t('extensions.blocks')}</span>}
                        {ext.hasGenerators && <span className="px-2 py-0.5 bg-blue-900/30 text-blue-400 text-[10px] rounded border border-blue-900/50 flex items-center gap-1"><Code size={10} /> {t('extensions.code')}</span>}
                        {ext.hasLibraries && <span className="px-2 py-0.5 bg-purple-900/30 text-purple-400 text-[10px] rounded border border-purple-900/50 flex items-center gap-1"><Layers size={10} /> {t('extensions.libs')}</span>}
                    </div>
                </div>
                <p className="text-sm text-slate-300 mt-2 line-clamp-2">{ext.manifest.description}</p>

                {/* 兼容性指示器 (Family/Board 限制) */}
                {ext.manifest.compatibility && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        {ext.manifest.compatibility.families && ext.manifest.compatibility.families.length > 0 && (
                            <span className="px-2 py-0.5 bg-orange-900/30 text-orange-400 text-[10px] rounded border border-orange-900/50 flex items-center gap-1" title="所需的板卡家族">
                                家族: {ext.manifest.compatibility.families.join(', ')}
                            </span>
                        )}
                        {ext.manifest.compatibility.boards && ext.manifest.compatibility.boards.length > 0 && (
                            <span className="px-2 py-0.5 bg-red-900/30 text-red-400 text-[10px] rounded border border-red-900/50 flex items-center gap-1" title="所需的特定板卡">
                                板卡: {ext.manifest.compatibility.boards.join(', ')}
                            </span>
                        )}
                    </div>
                )}

                <div className="mt-3 flex gap-2">
                    {/* 设置按钮暂时隐藏，待实现 */}

                    {/* 卸载按钮 */}
                    <button
                        className="text-xs bg-red-900/30 hover:bg-red-900/50 text-red-400 px-3 py-1.5 rounded transition-colors border border-red-900/50 flex items-center gap-1"
                        onClick={(e) => {
                            e.stopPropagation();
                            onUninstall(ext);
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

/**
 * 远程市场扩展卡片组件
 * 显示扩展信息和安装/更新/降级按钮
 */
const RemoteExtensionItem: React.FC<{ ext: any, installedExt?: LoadedExtension, onInstall: (ext: any, force?: boolean) => void }> = ({ ext, installedExt, onInstall }) => {
    const { t } = useTranslation();
    // 扩展图标 URL (优先使用缓存)
    const [iconUrl, setIconUrl] = useState<string | null>(null);

    // 图标缓存加载逻辑
    useEffect(() => {
        let isMounted = true;
        if (ext.icon && window.electronAPI) {
            window.electronAPI.marketplaceGetCachedIcon(ext.icon)
                .then(cachedBase64 => {
                    if (isMounted) {
                        if (cachedBase64) {
                            // 使用缓存的图标
                            setIconUrl(cachedBase64);
                        } else {
                            // 回退到原始 URL
                            setIconUrl(ext.icon);
                        }
                    }
                })
                .catch(err => {
                    console.error("获取缓存图标失败", err);
                    if (isMounted) setIconUrl(ext.icon);
                });
        }
        return () => { isMounted = false; };
    }, [ext.icon]);

    // 判断安装状态
    const isInstalled = !!installedExt;
    // 按钮文本和样式
    let btnLabel = t('extensions.install');
    let btnClass = "bg-blue-600 hover:bg-blue-500 text-white border-blue-500";
    let isDisabled = false;

    if (isInstalled) {
        // 比较远程版本与已安装版本
        const comparison = compareVersions(ext.version, installedExt!.manifest.version);
        if (comparison > 0) {
            // 远程版本更新 -> 显示更新按钮
            btnLabel = t('extensions.update', { version: ext.version, defaultValue: `Update to v${ext.version}` });
            btnClass = "bg-green-600 hover:bg-green-500 text-white border-green-500";
        } else if (comparison < 0) {
            // 远程版本更旧 -> 显示降级按钮 (警告)
            btnLabel = t('extensions.downgrade', { version: ext.version, defaultValue: `Downgrade to v${ext.version}` });
            btnClass = "bg-red-900/50 hover:bg-red-900/80 text-red-200 border-red-800";
        } else {
            // 版本相同 -> 禁用按钮
            btnLabel = t('extensions.installed');
            btnClass = "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed";
            isDisabled = true;
        }
    }

    return (
        <div className="bg-[#252526] border border-slate-700 rounded-lg p-4 flex gap-4 hover:border-slate-600 transition-colors">
            {/* 扩展图标 */}
            <div className="w-16 h-16 bg-[#333] rounded-md flex items-center justify-center text-slate-500 shrink-0 overflow-hidden">
                {iconUrl ? (
                    <img src={iconUrl} alt={ext.name} className="w-full h-full object-cover" />
                ) : (
                    <Puzzle size={28} />
                )}
            </div>
            {/* 扩展信息 */}
            <div className="flex-1">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-bold text-slate-200">{ext.name}</h3>
                        <p className="text-xs text-slate-500 font-mono mb-1">{ext.id} v{ext.version} {ext.author && t('extensions.installedBy', { author: ext.author })}</p>
                    </div>
                    <button
                        disabled={isDisabled}
                        onClick={() => onInstall(ext)}
                        className={`text-xs px-4 py-1.5 rounded transition-colors flex items-center gap-1 border ${btnClass}`}
                    >
                        {btnLabel}
                    </button>
                </div>
                <p className="text-sm text-slate-300 mt-2 line-clamp-2">{ext.description}</p>
            </div>
        </div>
    );
};
