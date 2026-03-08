/**
 * ============================================================
 * 应用设置模态框 (Settings Modal)
 * ============================================================
 * 
 * 应用全局设置界面，包含四个标签页:
 * - 通用 (General): 语言、工作目录、历史记录
 * - 串口 (Serial): 默认波特率、行尾符等串口参数
 * - 工具箱 (Toolbox): 积木分类显示/隐藏
 * - 高级 (Advanced): PlatformIO 路径等高级配置
 * 
 * 支持 JSON 模式直接编辑配置文件。
 * 
 * @file src/components/SettingsModal.tsx
 * @module EmbedBlocks/Frontend/Components/SettingsModal
 */

import React from 'react';
import {
    X, Monitor, Settings,
    FileJson, ArrowLeft, Sliders
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CodeEditor } from './CodeEditor';

// 引入拆分的设置逻辑和分区组件
import { useSettingsLogic } from './settings/hooks/useSettingsLogic';
import { GeneralSettings } from './settings/sections/GeneralSettings';
import { SerialSettings } from './settings/sections/SerialSettings';
import { AdvancedSettings } from './settings/sections/AdvancedSettings';
import { ToolboxSettings } from './settings/sections/ToolboxSettings';
import { AiSettings } from './settings/sections/AiSettings';
import { LayoutGrid, Bot } from 'lucide-react';
import { BaseModal } from './BaseModal';

/** 设置模态框属性 */
interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedBoard?: string;
    /** 初始打开的标签页 (可选) */
    initialTab?: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, selectedBoard, initialTab = 'general' }) => {
    // 多语言支持
    const { t } = useTranslation();
    // 使用自定义 Hook 处理设置逻辑（状态管理、保存、JSON 切换等）
    const {
        activeTab, setActiveTab,
        isJsonMode, setIsJsonMode,
        jsonContent, setJsonContent,
        jsonError,
        config, setConfig,
        handleSave,
        handleSelectWorkDir,
        handleClose
    } = useSettingsLogic(isOpen, onClose, initialTab);

    // 如果模态框未打开，不进行任何渲染
    if (!isOpen) return null;

    return (
        <BaseModal isOpen={isOpen} onClose={handleClose}>
            {/* 黑色背景、大阴影、圆角的设置窗口容器 */}
            <div className="bg-[#1e1e1e] w-[800px] h-[600px] rounded-lg shadow-2xl border border-slate-700 flex overflow-hidden">
                {/* 侧边栏 (Sidebar) */}
                <div className="w-48 bg-[#252526] border-r border-slate-700 flex flex-col">
                    <div className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {t('settings.title')}
                    </div>
                    {/* 映射并渲染标签页按钮 */}
                    {[
                        { id: 'general', icon: Monitor, label: t('settings.general') },
                        { id: 'serial', icon: Monitor, label: t('settings.serial') },
                        { id: 'toolbox', icon: LayoutGrid, label: t('settings.toolbox') },
                        { id: 'ai', icon: Bot, label: t('settings.ai') },
                        { id: 'advanced', icon: Sliders, label: t('settings.advanced') }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            disabled={isJsonMode} // JSON 模式下禁用标签切换
                            className={`flex items-center gap-2 px-4 py-3 text-sm transition-colors ${activeTab === tab.id
                                ? 'bg-[#37373d] text-white border-l-2 border-blue-500' // 选中项高亮
                                : 'text-slate-400 hover:text-slate-200 hover:bg-[#2a2d2e]'
                                } ${isJsonMode ? 'opacity-50 cursor-not-allowed hover:bg-transparent hover:text-slate-400' : ''}`}
                        >
                            <tab.icon size={16} /> {tab.label}
                        </button>
                    ))}
                </div>

                {/* 内容区域 (Content) */}
                <div className="flex-1 flex flex-col">
                    {/* 头部导航栏 */}
                    <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-[#1e1e1e]">
                        <h2 className="text-lg font-medium text-slate-200">
                            {/* 根据模式和标签页显示标题 */}
                            {isJsonMode ? 'settings.json' : (
                                activeTab === 'general' ? t('settings.general') :
                                    activeTab === 'serial' ? t('settings.serial') :
                                        activeTab === 'toolbox' ? t('settings.toolbox') :
                                            activeTab === 'ai' ? t('settings.ai') :
                                                t('settings.advanced')
                            )}
                        </h2>
                        {/* 操作按钮区 */}
                        <div className="flex items-center gap-2">
                            {isJsonMode ? (
                                <div className="flex items-center gap-2">
                                    {/* JSON 错误提示 */}
                                    {jsonError && (
                                        <span className="text-red-400 text-xs flex items-center gap-1 bg-red-900/20 px-2 py-1 rounded border border-red-900/50">
                                            <X size={12} /> {t('settings.jsonError')}
                                        </span>
                                    )}
                                    {/* 退出 JSON 模式并返回 */}
                                    <button
                                        onClick={() => handleClose()}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors border border-blue-500"
                                        title={t('settings.exitJsonMode')}
                                    >
                                        <ArrowLeft size={16} /> {t('settings.exitJsonMode')}
                                    </button>
                                </div>
                            ) : (
                                // 进入 JSON 处理模式
                                <button
                                    onClick={() => {
                                        setJsonContent(JSON.stringify(config, null, 4));
                                        setIsJsonMode(true);
                                    }}
                                    className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400 hover:text-slate-100 transition-colors"
                                    title={t('settings.jsonMode')}
                                >
                                    <FileJson size={18} />
                                </button>
                            )}
                            {/* 关闭按钮 */}
                            <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* 主要显示区 */}
                    <div className="flex-1 overflow-y-auto p-0 relative">
                        {isJsonMode ? (
                            // JSON 编辑器模式
                            <CodeEditor
                                code={jsonContent}
                                onChange={(val) => setJsonContent(val || '')}
                                readOnly={false}
                                language="json"
                            />
                        ) : (
                            // 各功能页面的表单
                            <div className="p-6">
                                {activeTab === 'general' && (
                                    <GeneralSettings
                                        config={config}
                                        handleSave={handleSave}
                                        handleSelectWorkDir={handleSelectWorkDir}
                                        setConfig={setConfig}
                                    />
                                )}
                                {activeTab === 'serial' && (
                                    <SerialSettings config={config} handleSave={handleSave} />
                                )}
                                {activeTab === 'toolbox' && (
                                    <ToolboxSettings config={config} handleSave={handleSave} selectedBoard={selectedBoard} />
                                )}
                                {activeTab === 'ai' && (
                                    <AiSettings config={config} handleSave={handleSave} />
                                )}
                                {activeTab === 'advanced' && (
                                    <AdvancedSettings config={config} handleSave={handleSave} />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </BaseModal>
    );
};
