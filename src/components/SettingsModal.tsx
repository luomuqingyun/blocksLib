import React from 'react';
import {
    X, Monitor, Settings,
    FileJson, ArrowLeft, Sliders
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CodeEditor } from './CodeEditor';

// Import refactored parts
import { useSettingsLogic } from './settings/hooks/useSettingsLogic';
import { GeneralSettings } from './settings/sections/GeneralSettings';
import { SerialSettings } from './settings/sections/SerialSettings';
import { AdvancedSettings } from './settings/sections/AdvancedSettings';
import { ToolboxSettings } from './settings/sections/ToolboxSettings';
import { LayoutGrid } from 'lucide-react';
import { BaseModal } from './BaseModal';


interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedBoard?: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, selectedBoard }) => {
    const { t } = useTranslation();
    const {
        activeTab, setActiveTab,
        isJsonMode, setIsJsonMode,
        jsonContent, setJsonContent,
        jsonError,
        config, setConfig,
        handleSave,
        handleSelectWorkDir,
        handleClose
    } = useSettingsLogic(isOpen, onClose);

    if (!isOpen) return null;

    return (
        <BaseModal isOpen={isOpen} onClose={handleClose}>
            <div className="bg-[#1e1e1e] w-[800px] h-[600px] rounded-lg shadow-2xl border border-slate-700 flex overflow-hidden">
                {/* Sidebar */}
                <div className="w-48 bg-[#252526] border-r border-slate-700 flex flex-col">
                    <div className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {t('settings.title')}
                    </div>
                    {[
                        { id: 'general', icon: Settings, label: t('settings.general') },
                        { id: 'serial', icon: Monitor, label: t('settings.serial') },
                        { id: 'toolbox', icon: LayoutGrid, label: t('settings.toolbox') },
                        { id: 'advanced', icon: Sliders, label: t('settings.advanced') }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            disabled={isJsonMode}
                            className={`flex items-center gap-2 px-4 py-3 text-sm transition-colors ${activeTab === tab.id
                                ? 'bg-[#37373d] text-white border-l-2 border-blue-500'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-[#2a2d2e]'
                                } ${isJsonMode ? 'opacity-50 cursor-not-allowed hover:bg-transparent hover:text-slate-400' : ''}`}
                        >
                            <tab.icon size={16} /> {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col">
                    <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-[#1e1e1e]">
                        <h2 className="text-lg font-medium text-slate-200">
                            {isJsonMode ? 'settings.json' : (
                                activeTab === 'general' ? t('settings.general') :
                                    activeTab === 'serial' ? t('settings.serial') :
                                        activeTab === 'toolbox' ? t('settings.toolbox') :
                                            t('settings.advanced')
                            )}
                        </h2>
                        <div className="flex items-center gap-2">
                            {isJsonMode ? (
                                <div className="flex items-center gap-2">
                                    {jsonError && (
                                        <span className="text-red-400 text-xs flex items-center gap-1 bg-red-900/20 px-2 py-1 rounded border border-red-900/50">
                                            <X size={12} /> {t('settings.jsonError')}
                                        </span>
                                    )}
                                    <button
                                        onClick={() => handleClose()}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors border border-blue-500"
                                        title={t('settings.exitJsonMode')}
                                    >
                                        <ArrowLeft size={16} /> {t('settings.exitJsonMode')}
                                    </button>
                                </div>
                            ) : (
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
                            <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-0 relative">
                        {isJsonMode ? (
                            <CodeEditor
                                code={jsonContent}
                                onChange={(val) => setJsonContent(val || '')}
                                readOnly={false}
                                language="json"
                            />
                        ) : (
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
