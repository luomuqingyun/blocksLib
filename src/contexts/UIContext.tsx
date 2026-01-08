import React, { createContext, useContext, useState } from 'react';

interface UIContextType {
    // Layout
    rightPanelWidth: number;
    setRightPanelWidth: (width: number) => void;
    activeTab: 'build' | 'serial';
    setActiveTab: (tab: 'build' | 'serial') => void;
    isManualEditMode: boolean;
    setIsManualEditMode: (mode: boolean) => void;

    // Modals
    isSettingsOpen: boolean;
    setIsSettingsOpen: (isOpen: boolean) => void;
    isExtensionsOpen: boolean;
    setIsExtensionsOpen: (isOpen: boolean) => void;
    isNewProjectOpen: boolean;
    setIsNewProjectOpen: (isOpen: boolean) => void;
    isSaveAsOpen: boolean;
    setIsSaveAsOpen: (isOpen: boolean) => void;
    isProjectSettingsOpen: boolean;
    setIsProjectSettingsOpen: (isOpen: boolean) => void;
    isHelpOpen: boolean;
    helpTitle: string;
    helpContent: string;
    helpPath: string;
    openHelp: (title: string, content: string, path?: string) => void;
    closeHelp: () => void;

    // About
    isAboutOpen: boolean;
    aboutContent: string;
    openAbout: (content: string) => void;
    closeAbout: () => void;

    // Notification
    notification: { message: string; type: 'info' | 'error' | 'success' } | null;
    showNotification: (message: string, type?: 'info' | 'error' | 'success') => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [rightPanelWidth, setRightPanelWidth] = useState(500);
    const [activeTab, setActiveTab] = useState<'build' | 'serial'>('build');
    const [isManualEditMode, setIsManualEditMode] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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

    // Notification System
    const [notification, setNotification] = useState<{ message: string; type: 'info' | 'error' | 'success' } | null>(null);

    const showNotification = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
        setNotification({ message, type });
        // Auto-dismiss after 3 seconds
        setTimeout(() => setNotification(null), 3000);
    };

    const value = React.useMemo(() => ({
        rightPanelWidth, setRightPanelWidth,
        activeTab, setActiveTab,
        isManualEditMode, setIsManualEditMode,
        isSettingsOpen, setIsSettingsOpen, isExtensionsOpen, setIsExtensionsOpen, isNewProjectOpen, setIsNewProjectOpen, isSaveAsOpen, setIsSaveAsOpen, isProjectSettingsOpen, setIsProjectSettingsOpen,
        isHelpOpen, helpTitle, helpContent, helpPath, openHelp, closeHelp,
        isAboutOpen, aboutContent, openAbout, closeAbout,
        notification, showNotification
    }), [
        rightPanelWidth, activeTab, isManualEditMode,
        isSettingsOpen, isExtensionsOpen, isNewProjectOpen, isSaveAsOpen, isProjectSettingsOpen,
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
