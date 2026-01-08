// ----------------------------------------------------------------------------
// 项目设置模态框 (Project Settings Modal)
// ----------------------------------------------------------------------------
// 提供项目级别的 PlatformIO 配置界面:
// - 通用: 项目描述
// - 编译器: 优化级别、C++ 标准
// - 库: 依赖库 (lib_deps)
// - 上传: 协议、接口、调试工具
// - 高级: 额外编译标志、自定义 INI
// ----------------------------------------------------------------------------

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, RotateCcw } from 'lucide-react';
import { BaseModal } from '../BaseModal';
import { BoardRegistry } from '../../registries/BoardRegistry';
import { useUI } from '../../contexts/UIContext';
import { useFileSystem } from '../../contexts/FileSystemContext';
import { ProjectBuildConfig } from '../../types/board';

export const ProjectSettingsModal: React.FC = () => {
    const { t } = useTranslation();
    const { isProjectSettingsOpen, setIsProjectSettingsOpen } = useUI();
    const { projectMetadata, updateProjectConfig } = useFileSystem();

    // --- 组件状态 ---
    const [activeTab, setActiveTab] = useState<'general' | 'compiler' | 'libs' | 'upload' | 'advanced'>('general');
    const [config, setConfig] = useState<ProjectBuildConfig>({});

    // 更新配置字段 (将 'default' 值转为 undefined 以使用开发板默认值)
    const updateField = (field: keyof ProjectBuildConfig, value: any) => {
        // Sanitize "default" values to undefined so they don't override board defaults or get written to file
        const cleanValue = value === 'default' ? undefined : value;
        setConfig(prev => ({ ...prev, [field]: cleanValue }));
    };

    // Define allowed protocols per family
    const PROTOCOL_OPTIONS: Record<string, { value: string; label: string }[]> = {
        'stm32': [
            { value: 'stlink', label: 'ST-Link' },
            { value: 'serial', label: 'Serial (UART / Bootloader)' },
            { value: 'jlink', label: 'J-Link' },
            { value: 'cmsis-dap', label: 'CMSIS-DAP' },
            { value: 'blackmagic', label: 'Black Magic Probe' },
            { value: 'dfu', label: 'DFU' }
        ],
        'esp32': [
            { value: 'esptool', label: 'esptool (Serial)' },
            { value: 'esp-prog', label: 'ESP-Prog' },
            { value: 'esp-bridge', label: 'ESP-Bridge' },
            { value: 'esp-builtin', label: 'ESP-Builtin' },
            { value: 'espota', label: 'ESPOTA (Over-the-Air)' },
            { value: 'jlink', label: 'J-Link' },
            { value: 'cmsis-dap', label: 'CMSIS-DAP' },
            { value: 'iot-bus-jtag', label: 'IoT-Bus JTAG' },
            { value: 'minimodule', label: 'FTDI MiniModule' },
            { value: 'olimex-arm-usb-ocd', label: 'Olimex ARM-USB-OCD' },
            { value: 'olimex-arm-usb-ocd-h', label: 'Olimex ARM-USB-OCD-H' },
            { value: 'olimex-arm-usb-tiny-h', label: 'Olimex ARM-USB-TINY-H' },
            { value: 'olimex-jtag-tiny', label: 'Olimex JTAG-TINY' },
            { value: 'tumpa', label: 'TIAO USB Multi-Protocol Adapter' },
            { value: 'dfu', label: 'DFU' }
        ],
        'arduino': [
            { value: 'serial', label: 'Serial (Default)' },
            { value: 'usbasp', label: 'USBasp' },
            { value: 'avrisp', label: 'AVR ISP' },
            { value: 'arduinoasisp', label: 'Arduino as ISP' },
            { value: 'usbtinyisp', label: 'USBtinyISP' }
        ],
        'default': [
            { value: 'serial', label: 'Serial' },
            { value: 'stlink', label: 'ST-Link' },
            { value: 'jlink', label: 'J-Link' }
        ]
    };

    const getBoardFamily = () => {
        if (!projectMetadata?.boardId) return 'default';
        const boardDef = BoardRegistry.get(projectMetadata.boardId);
        return boardDef?.family || 'default';
    };

    const family = getBoardFamily();
    const options = PROTOCOL_OPTIONS[family] || PROTOCOL_OPTIONS['default'];

    // Initialize default if undefined
    useEffect(() => {
        if (projectMetadata?.boardId) {
            const boardDef = BoardRegistry.get(projectMetadata.boardId);
            const currentProtocol = config.upload_protocol;

            // If protocol is undefined or 'default', set it to board default immediately
            if (!currentProtocol || currentProtocol === 'default') {
                const defaultProtocol = boardDef?.build?.upload_protocol || 'serial'; // Fallback to serial
                updateField('upload_protocol', defaultProtocol);
            }
        }
    }, [projectMetadata?.boardId, config.upload_protocol]);

    // Load config on open
    useEffect(() => {
        if (isProjectSettingsOpen && projectMetadata) {
            setConfig(projectMetadata.buildConfig || {});
        }
    }, [isProjectSettingsOpen, projectMetadata]);

    if (!isProjectSettingsOpen) return null;

    const handleSave = () => {
        updateProjectConfig(config);
        setIsProjectSettingsOpen(false);
    };



    // Helper for array fields (lib_deps, build_flags) from text area
    const handleArrayInput = (field: 'lib_deps' | 'extraBuildFlags', text: string) => {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        updateField(field, lines);
    };

    const getArrayText = (field: 'lib_deps' | 'extraBuildFlags') => {
        return (config[field] || []).join('\n');
    };

    return (
        <BaseModal isOpen={isProjectSettingsOpen} onClose={() => setIsProjectSettingsOpen(false)}>
            <div className="bg-[#1e1e1e] w-[700px] h-[500px] rounded-lg shadow-2xl border border-[#333] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#333] bg-[#252526]">
                    <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                        {t('settings.projectSettings', 'Project Settings')}
                    </h2>
                    <button onClick={() => setIsProjectSettingsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar Tabs */}
                    <div className="w-40 bg-[#252526] border-r border-[#333] flex flex-col py-2">
                        {[
                            { id: 'general', label: t('settings.configuration.general', 'General') },
                            { id: 'compiler', label: t('settings.configuration.compiler', 'Compiler') },
                            { id: 'libs', label: t('settings.configuration.libs', 'Libraries') },
                            { id: 'upload', label: t('settings.configuration.upload', 'Upload & Monitor') },
                            { id: 'advanced', label: t('settings.configuration.advanced', 'Advanced') }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-4 py-2 text-left text-sm transition-colors ${activeTab === tab.id ? 'bg-[#37373d] text-white border-l-2 border-blue-500' : 'text-slate-400 hover:bg-[#2d2d2d] hover:text-slate-200 border-l-2 border-transparent'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 p-6 overflow-y-auto bg-[#1e1e1e]">
                        {/* GENERAL TAB */}
                        {activeTab === 'general' && (
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400 font-mono block">{t('settings.configuration.description', 'Description')}</label>
                                    <textarea
                                        className="w-full bg-[#2d2d2d] text-slate-200 text-sm p-2 rounded border border-[#333] focus:border-blue-500 outline-none h-24 resize-none"
                                        value={config.description || ''}
                                        onChange={e => updateField('description', e.target.value)}
                                        placeholder={t('settings.configuration.description', 'Description')}
                                    />
                                </div>
                            </div>
                        )}

                        {/* COMPILER TAB */}
                        {activeTab === 'compiler' && (
                            <div className="space-y-5">
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400 font-mono block">{t('settings.configuration.optLevel', 'Optimization Level')}</label>
                                    <select
                                        className="w-full bg-[#2d2d2d] text-slate-200 text-sm p-2 rounded border border-[#333] focus:border-blue-500 outline-none"
                                        value={config.optimizationLevel || '-Os'}
                                        onChange={e => updateField('optimizationLevel', e.target.value)}
                                    >
                                        <option value="-Os">-Os ({t('settings.configuration.sizeOpt', 'Size Optimization')}) [{t('settings.configuration.default', 'Default')}]</option>
                                        <option value="-O0">-O0 ({t('settings.configuration.noneDebug', 'None / Debugging')})</option>
                                        <option value="-O1">-O1 ({t('settings.configuration.speedOpt', 'Optimization')})</option>
                                        <option value="-O2">-O2 ({t('settings.configuration.moreOpt', 'More Optimization')})</option>
                                        <option value="-O3">-O3 ({t('settings.configuration.maxSpeed', 'Max Speed')})</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400 font-mono block">{t('settings.configuration.cppStandard', 'C++ Standard')}</label>
                                    <select
                                        className="w-full bg-[#2d2d2d] text-slate-200 text-sm p-2 rounded border border-[#333] focus:border-blue-500 outline-none"
                                        value={config.cppStandard || '-std=gnu++11'}
                                        onChange={e => updateField('cppStandard', e.target.value)}
                                    >
                                        <option value="-std=gnu++11">GNU++11 [{t('settings.configuration.default', 'Default')}]</option>
                                        <option value="-std=gnu++14">GNU++14</option>
                                        <option value="-std=gnu++17">GNU++17</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* LIBRARIES TAB */}
                        {activeTab === 'libs' && (
                            <div className="space-y-2 h-full flex flex-col">
                                <label className="text-xs text-slate-400 font-mono block">
                                    {t('settings.configuration.libDeps', 'Library Dependencies (lib_deps)')}
                                    <span className="ml-2 text-slate-500 text-[10px]">{t('settings.configuration.libDepsHint', 'One per line')}</span>
                                </label>
                                <textarea
                                    className="flex-1 w-full bg-[#2d2d2d] text-slate-200 font-mono text-xs p-2 rounded border border-[#333] focus:border-blue-500 outline-none resize-none"
                                    value={getArrayText('lib_deps')}
                                    onChange={e => handleArrayInput('lib_deps', e.target.value)}
                                    placeholder={t('settings.configuration.libDepsPlaceholder', 'Adafruit NeoPixel\nArduinoJson')}
                                />
                            </div>
                        )}

                        {/* UPLOAD TAB */}
                        {activeTab === 'upload' && (
                            <div className="space-y-5">
                                {/* Upload Port Override */}
                                {/* Show for Serial-based protocols */}
                                {(config.upload_protocol === 'serial' || config.upload_protocol === 'esptool' || config.upload_protocol === 'default' || !config.upload_protocol) && (
                                    <div className="space-y-1 p-3 bg-[#2d2d2d]/30 border border-[#333] rounded">
                                        <label className="text-xs text-slate-300 font-bold block flex items-center gap-2">
                                            {t('settings.configuration.uploadPort', 'Upload Port')}
                                            <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 rounded border border-red-500/30">{t('common.advanced')}</span>
                                        </label>
                                        <div className="text-[10px] text-slate-500 mb-1.5 leading-relaxed">
                                            {t('settings.configuration.uploadPortHint', 'Leave empty to use Monitor Port.')}
                                        </div>
                                        <input
                                            type="text"
                                            className="w-full bg-[#2d2d2d] text-slate-200 text-sm p-2 rounded border border-[#333] focus:border-blue-500 outline-none placeholder:text-slate-600"
                                            value={config.upload_port || ''}
                                            onChange={e => updateField('upload_port', e.target.value)}
                                            placeholder="COM5 or /dev/ttyUSB1"
                                        />
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400 font-mono block">{t('settings.configuration.uploadProtocol', 'Upload Protocol')}</label>
                                    <select
                                        className="w-full bg-[#2d2d2d] text-slate-200 text-sm p-2 rounded border border-[#333] focus:border-blue-500 outline-none"
                                        value={config.upload_protocol || ''}
                                        onChange={e => updateField('upload_protocol', e.target.value)}
                                    >
                                        {options.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400 font-mono block">{t('settings.configuration.uploadInterface', 'Interface')}</label>
                                    <select
                                        className="w-full bg-[#2d2d2d] text-slate-200 text-sm p-2 rounded border border-[#333] focus:border-blue-500 outline-none"
                                        value={config.upload_interface || ''}
                                        onChange={e => updateField('upload_interface', e.target.value)}
                                    >
                                        <option value="">{t('settings.configuration.auto', 'Auto')}</option>
                                        <option value="swd">{t('settings.configuration.swd', 'SWD')}</option>
                                        <option value="jtag">{t('settings.configuration.jtag', 'JTAG')}</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400 font-mono block">{t('settings.configuration.debugTool', 'Debug Tool')}</label>
                                    <select
                                        className="w-full bg-[#2d2d2d] text-slate-200 text-sm p-2 rounded border border-[#333] focus:border-blue-500 outline-none"
                                        value={config.debug_tool || ''}
                                        onChange={e => updateField('debug_tool', e.target.value)}
                                    >
                                        <option value="">{t('settings.configuration.defaultDebug', 'Default')}</option>
                                        {options.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                        <option value="custom">{t('settings.configuration.customDebug', 'Custom')}</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400 font-mono block">{t('settings.configuration.monitorSpeed', 'Monitor Speed')}</label>
                                        <input
                                            type="text"
                                            className="w-full bg-[#2d2d2d] text-slate-200 text-sm p-2 rounded border border-[#333] focus:border-blue-500 outline-none"
                                            value={config.monitor_speed || ''}
                                            onChange={e => updateField('monitor_speed', e.target.value)}
                                            placeholder={`${t('settings.configuration.default', 'Default')} (115200)`}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400 font-mono block">{t('settings.configuration.uploadSpeed', 'Upload Speed')}</label>
                                        <input
                                            type="text"
                                            className="w-full bg-[#2d2d2d] text-slate-200 text-sm p-2 rounded border border-[#333] focus:border-blue-500 outline-none"
                                            value={config.upload_speed || ''}
                                            onChange={e => updateField('upload_speed', e.target.value)}
                                            placeholder={`${t('settings.configuration.default', 'Default')} (921600)`}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ADVANCED TAB */}
                        {activeTab === 'advanced' && (
                            <div className="space-y-4 h-full flex flex-col">
                                <div className="flex-1 flex flex-col gap-1">
                                    <label className="text-xs text-slate-400 font-mono block">{t('settings.configuration.extraFlags', 'Extra Build Flags')}</label>
                                    <textarea
                                        className="flex-1 w-full bg-[#2d2d2d] text-slate-200 font-mono text-xs p-2 rounded border border-[#333] focus:border-blue-500 outline-none resize-none"
                                        value={getArrayText('extraBuildFlags')}
                                        onChange={e => handleArrayInput('extraBuildFlags', e.target.value)}
                                        placeholder={t('settings.configuration.extraFlagsPlaceholder', '-D DEBUG_MODE')}
                                    />
                                </div>
                                <div className="flex-1 flex flex-col gap-1">
                                    <label className="text-xs text-slate-400 font-mono block">{t('settings.configuration.customIni', 'Custom INI Content')}</label>
                                    <textarea
                                        className="flex-1 w-full bg-[#2d2d2d] text-slate-200 font-mono text-xs p-2 rounded border border-[#333] focus:border-blue-500 outline-none resize-none"
                                        value={config.customIni || ''}
                                        onChange={e => updateField('customIni', e.target.value)}
                                        placeholder={t('settings.configuration.customIniPlaceholder', 'board_build.f_cpu = ...')}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-3 bg-[#252526] border-t border-[#333] flex justify-end gap-2">
                    <button
                        onClick={() => setIsProjectSettingsOpen(false)}
                        className="px-4 py-1.5 rounded text-sm text-slate-300 hover:bg-[#37373d] transition-colors"
                    >
                        {t('dialog.cancel', 'Cancel')}
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-1.5 rounded text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors flex items-center gap-2"
                    >
                        <Save size={14} />
                        {t('dialog.save', 'Save')}
                    </button>
                </div>
            </div>
        </BaseModal>
    );
};
