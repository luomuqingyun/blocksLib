/**
 * ============================================================
 * UI 状态上下文 (UI Context)
 * ============================================================
 * 
 * 管理应用的 UI 状态:
 * - 布局: 右侧面板宽度、活动标签页
 * - 模态框: 设置、扩展、新建项目、另存为、项目设置
 * - 帮助系统: 帮助弹窗内容
 * - 关于弹窗
 * - 通知系统: Toast 消息
 * 
 * 这个 Context 不包含业务逻辑，只管理 UI 状态。
 * 
 * @file src/contexts/UIContext.tsx
 * @module EmbedBlocks/Frontend/Contexts/UI
 */

import React, { createContext, useContext, useState } from 'react';

/** UI 上下文类型定义 */
interface UIContextType {
    // 布局相关状态 (Layout)
    /** 右侧面面板的宽度 (像素) */
    rightPanelWidth: number;
    setRightPanelWidth: (width: number) => void;
    /** 当前活动的下方面板标签页 ('build' 编译日志, 'serial' 串口监视器, 或 'ai' 助手) */
    activeTab: 'build' | 'serial' | 'ai';
    setActiveTab: (tab: 'build' | 'serial' | 'ai') => void;
    /** 是否处于手动代码编辑模式 (绕过积木块) */
    isManualEditMode: boolean;
    setIsManualEditMode: (mode: boolean) => void;

    // 模态框开关状态 (Modals)
    /** 系统设置弹窗是否打开 */
    isSettingsOpen: boolean;
    setIsSettingsOpen: (isOpen: boolean) => void;
    /** 系统设置弹窗打开时默认显示的标签页 */
    settingsTab: string;
    setSettingsTab: (tab: string) => void;
    /** 扩展程序弹窗是否打开 */
    isExtensionsOpen: boolean;
    setIsExtensionsOpen: (isOpen: boolean) => void;
    /** 新建项目向导弹窗是否打开 */
    isNewProjectOpen: boolean;
    setIsNewProjectOpen: (isOpen: boolean) => void;
    /** 另存为弹窗是否打开 */
    isSaveAsOpen: boolean;
    setIsSaveAsOpen: (isOpen: boolean) => void;
    /** 项目特定设置弹窗是否打开 */
    isProjectSettingsOpen: boolean;
    setIsProjectSettingsOpen: (isOpen: boolean) => void;

    // 帮助系统 (Help System)
    /** 帮助侧边栏/弹窗是否打开 */
    isHelpOpen: boolean;
    /** 当前帮助内容的标题 */
    helpTitle: string;
    /** 当前帮助内容的 Markdown 或纯文本内容 */
    helpContent: string;
    /** (可选) 关联的远程文档路径或本地标识 */
    helpPath: string;
    /** 打开帮助窗口并加载指定内容 */
    openHelp: (title: string, content: string, path?: string) => void;
    /** 关闭帮助窗口 */
    closeHelp: () => void;

    // 关于弹窗 (About Modal)
    /** 关于软件弹窗是否打开 */
    isAboutOpen: boolean;
    /** 关于页面的内容文本 */
    aboutContent: string;
    /** 打开关于窗口 */
    openAbout: (content: string) => void;
    /** 关闭关于窗口 */
    closeAbout: () => void;

    // 通知系统 (Notification System)
    /** 当前显示的通知对象，为 null 时表示无通知 */
    notification: { message: string; type: 'info' | 'error' | 'success' } | null;
    /** 触发显示一个新的通知消息 (Toast) */
    showNotification: (message: string, type?: 'info' | 'error' | 'success') => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [rightPanelWidth, setRightPanelWidth] = useState(500);
    const [activeTab, setActiveTab] = useState<'build' | 'serial' | 'ai'>('build');
    const [isManualEditMode, setIsManualEditMode] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState('general');
    const [isExtensionsOpen, setIsExtensionsOpen] = useState(false);
    const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
    const [isSaveAsOpen, setIsSaveAsOpen] = useState(false);
    const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [helpTitle, setHelpTitle] = useState('');
    const [helpContent, setHelpContent] = useState('');
    const [helpPath, setHelpPath] = useState('');

    const openHelp = (title: string, content: string, path: string = '') => {
        setHelpTitle(title);
        setHelpContent(content);
        setHelpPath(path);
        setIsHelpOpen(true);
    };

    const closeHelp = () => {
        setIsHelpOpen(false);
    };

    const [isAboutOpen, setIsAboutOpen] = useState(false);
    const [aboutContent, setAboutContent] = useState('');

    const openAbout = (content: string) => {
        setAboutContent(content);
        setIsAboutOpen(true);
    };

    const closeAbout = () => {
        setIsAboutOpen(false);
    };

    // ========== 通知系统 (Notification System) ==========
    const [notification, setNotification] = useState<{ message: string; type: 'info' | 'error' | 'success' } | null>(null);

    /** 显示通知并设定 3 秒后自动关闭 */
    const showNotification = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
        setNotification({ message, type });
        // 3 秒后自动消失
        setTimeout(() => setNotification(null), 3000);
    };

    const value = React.useMemo(() => ({
        rightPanelWidth, setRightPanelWidth,
        activeTab, setActiveTab,
        isManualEditMode, setIsManualEditMode,
        isSettingsOpen, setIsSettingsOpen,
        settingsTab, setSettingsTab,
        isExtensionsOpen, setIsExtensionsOpen, isNewProjectOpen, setIsNewProjectOpen, isSaveAsOpen, setIsSaveAsOpen, isProjectSettingsOpen, setIsProjectSettingsOpen,
        isHelpOpen, helpTitle, helpContent, helpPath, openHelp, closeHelp,
        isAboutOpen, aboutContent, openAbout, closeAbout,
        notification, showNotification
    }), [
        rightPanelWidth, activeTab, isManualEditMode,
        isSettingsOpen, settingsTab,
        isExtensionsOpen, isNewProjectOpen, isSaveAsOpen, isProjectSettingsOpen,
        isHelpOpen, helpTitle, helpContent, helpPath,
        isAboutOpen, aboutContent,
        notification
    ]);

    return (
        <UIContext.Provider value={value}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (context === undefined) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
};
