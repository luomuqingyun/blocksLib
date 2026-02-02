// ----------------------------------------------------------------------------
// 欢迎屏幕组件 (Welcome Screen Component)
// ----------------------------------------------------------------------------
// 应用程序启动页面，显示:
// - 快捷操作: 新建项目、打开项目、打开保存目录
// - 最近项目列表
// - 版本信息和设置入口
// ----------------------------------------------------------------------------

import React from 'react';
import { Plus, FolderOpen, Clock, Github, Settings, FileCode, X, HardDrive, Puzzle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFileSystem } from '../contexts/FileSystemContext';

// --- 组件属性类型 ---
interface WelcomeScreenProps {
    /** 打开新建项目弹窗的回调 */
    onNewProject: () => void;
    /** 打开设置弹窗的回调 */
    onOpenConfig: () => void;
    /** 打开扩展管理弹窗的回调 */
    onOpenExtensions: () => void;
    /** 最近项目路径列表 */
    recentProjects: string[];
    /** 刷新最近项目列表的回调 (可选) */
    onRefreshRecent?: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onNewProject, onOpenConfig, onOpenExtensions, recentProjects, onRefreshRecent }) => {
    const { t } = useTranslation();
    const { openProject, openProjectByPath } = useFileSystem();

    // 错误提示信息状态
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

    /**
     * 处理打开最近项目
     * 如果项目文件不存在，提示用户是否从列表中移除
     * 
     * @param path 项目文件路径
     */
    const handleOpenRecent = async (path: string) => {
        setErrorMessage(null); // 清除之前的错误信息
        const result = await openProjectByPath(path);
        if (!result.success) {
            setErrorMessage(result.error || t('welcome.openError', 'Failed to open project'));

            // 如果文件不存在，提示用户是否移除
            if (result.error && (result.error.includes('not found') || result.error.includes('ENOENT'))) {
                setTimeout(async () => {
                    // 使用 t('key', { path }) 进行字符串插值
                    if (confirm(t('welcome.confirmRemoveRecent', { path: path }))) {
                        if (window.electronAPI.removeRecentProject) {
                            await window.electronAPI.removeRecentProject(path);
                            onRefreshRecent?.(); // 刷新最近项目列表
                            setErrorMessage(null);
                        }
                    }
                }, 100);
            }
        }
    };

    return (
        <div className="flex flex-col items-center h-full w-full bg-[#1e1e1e] text-slate-200 p-8 select-none overflow-y-auto auto-hide-scrollbar">
            <div className="max-w-2xl w-full space-y-8 flex-shrink-0">

                {/* 标题区域 - Logo 和应用名称 */}
                <div className="text-center space-y-4">
                    <div className="inline-block p-4 mb-4">
                        <img src="./EmbedBlocks.png" alt="EmbedBlocks Logo" className="w-24 h-24 object-contain drop-shadow-2xl" />
                    </div>
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                        EmbedBlocks Studio
                    </h1>
                    <p className="text-slate-500 text-lg">
                        {t('welcome.subtitle', 'Visual Embedded Programming for Everyone')}
                    </p>
                </div>

                {/* 主要操作按钮 - 新建、打开、目录、扩展 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button
                        onClick={onNewProject}
                        className="group flex flex-col items-center p-6 bg-[#252526] hover:bg-[#2a2d2e] border border-slate-700/50 hover:border-blue-500/50 rounded-xl transition-all duration-200 text-center"
                    >
                        <div className="p-3 bg-blue-500/10 rounded-lg group-hover:scale-110 transition-transform mb-4">
                            <Plus size={24} className="text-blue-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-slate-200 group-hover:text-blue-400 transition-colors">
                                {t('welcome.newProject', 'New Project')}
                            </h3>
                            <p className="text-sm text-slate-500">
                                {t('welcome.newProjectDesc', 'Create a new sketch from scratch')}
                            </p>
                        </div>
                    </button>

                    <button
                        onClick={openProject}
                        className="group flex flex-col items-center p-6 bg-[#252526] hover:bg-[#2a2d2e] border border-slate-700/50 hover:border-emerald-500/50 rounded-xl transition-all duration-200 text-center"
                    >
                        <div className="p-3 bg-emerald-500/10 rounded-lg group-hover:scale-110 transition-transform mb-4">
                            <FolderOpen size={24} className="text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-slate-200 group-hover:text-emerald-400 transition-colors">
                                {t('welcome.openProject', 'Open Project')}
                            </h3>
                            <p className="text-sm text-slate-500">
                                {t('welcome.openProjectDesc', 'Open an existing .ebproj file')}
                            </p>
                        </div>
                    </button>

                    <button
                        onClick={() => window.electronAPI.openWorkDir?.()}
                        className="group flex flex-col items-center p-6 bg-[#252526] hover:bg-[#2a2d2e] border border-slate-700/50 hover:border-amber-500/50 rounded-xl transition-all duration-200 text-center"
                    >
                        <div className="p-3 bg-amber-500/10 rounded-lg group-hover:scale-110 transition-transform mb-4">
                            <HardDrive size={24} className="text-amber-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-slate-200 group-hover:text-amber-400 transition-colors">
                                {t('welcome.openSaveDir', 'Open Save Directory')}
                            </h3>
                            <p className="text-sm text-slate-500">
                                {t('welcome.openSaveDirDesc', 'Browse your saved project files')}
                            </p>
                        </div>
                    </button>

                    <button
                        onClick={onOpenExtensions}
                        className="group flex flex-col items-center p-6 bg-[#252526] hover:bg-[#2a2d2e] border border-slate-700/50 hover:border-purple-500/50 rounded-xl transition-all duration-200 text-center"
                    >
                        <div className="p-3 bg-purple-500/10 rounded-lg group-hover:scale-110 transition-transform mb-4">
                            <Puzzle size={24} className="text-purple-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-slate-200 group-hover:text-purple-400 transition-colors">
                                {t('app.extensions', 'Extensions')}
                            </h3>
                            <p className="text-sm text-slate-500">
                                {t('welcome.extensionsDesc', 'Manage boards and block sets')}
                            </p>
                        </div>
                    </button>
                </div>

                {/* 错误提示横幅 */}
                {errorMessage && (
                    <div className="bg-red-900/50 border border-red-900 text-red-200 px-4 py-3 rounded-xl flex items-center justify-between">
                        <span>{errorMessage}</span>
                        <button onClick={() => setErrorMessage(null)} className="text-red-200 hover:text-white"><X size={18} /></button>
                    </div>
                )}

                {/* 最近项目列表 - 限制最大高度并支持滚动 */}
                {recentProjects.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <Clock size={16} />
                            {t('welcome.recent', 'Recent Projects')}
                        </h2>
                        <div className="bg-[#252526] border border-slate-700/50 rounded-xl overflow-hidden max-h-48 overflow-y-auto auto-hide-scrollbar">
                            {recentProjects.slice(0, 10).map((path, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleOpenRecent(path)}
                                    className="w-full flex items-center px-6 py-3 hover:bg-[#2a2d2e] border-b border-slate-700/50 last:border-0 text-left text-sm text-slate-300 hover:text-white transition-colors group"
                                >
                                    <span className="flex-1 truncate font-mono opacity-80 group-hover:opacity-100">{path}</span>
                                    <span className="opacity-0 group-hover:opacity-100 text-slate-500 text-xs">{t('common.open')}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* 底部工具栏 - 版本号和设置入口 */}
                <div className="flex items-center justify-between text-slate-600 text-sm pt-4 pb-4">
                    <span>v1.0.0</span>
                    <div className="flex gap-4">
                        <button onClick={onOpenConfig} className="hover:text-slate-400 transition-colors" title={t('app.settings')}>
                            <Settings size={18} />
                        </button>
                        {/* <a href="https://github.com/EmbedBlocks" target="_blank" rel="noreferrer" className="hover:text-slate-400 transition-colors">
                            <Github size={18} />
                        </a> */}
                    </div>
                </div>

            </div>
        </div>
    );
};
