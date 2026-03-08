import React, { useMemo, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { useTranslation } from 'react-i18next';

/**
 * PinMapping: 物理引脚映射接口
 * 用于记录引脚名称（如 "PA0"）与其在芯片封装上的物理位置（如 "10"）的对应关系。
 */
interface PinMapping {
    name: string;
    position: string;
}

/**
 * ChipRendererProps: 芯片渲染组件属性
 */
interface ChipRendererProps {
    mcu: string;          // MCU 型号名称 (如 "STM32F103C8")
    packageType: string;  // 封装类型 (如 "LQFP", "QFN", "CUSTOM_SVG")
    pinCount: number;     // 总引脚数
    pins: string[];       // 当前板卡正在使用的功能引脚列表 (用于高亮)
    pinMap?: PinMapping[]; // 可选的官方物理位置映射表
    boardId?: string;     // 板卡唯一 ID
    visuals?: {           // 视觉资源
        svgPath?: string;
        svgContent?: string;
    };
    className?: string;   // 外部样式类名
}

/**
 * ChipRenderer: 一个动态 SVG 组件，用于渲染微控制器（尤其是 STM32）的芯片引脚图。
 * 
 * 核心逻辑:
 * 1. 优先使用官方提供的 `pinMap` (物理位置映射) 来渲染引脚。
 * 2. 如果缺少 `pinMap`，则开启启发式回退模式，按字母顺序列出引脚 (回退到旧逻辑)。
 * 3. 自动计算正方形封装 (LQFP/QFN) 的四周分布，确保外观接近 STM32CubeMX。
 */
export const ChipRenderer: React.FC<ChipRendererProps> = ({
    mcu,
    packageType,
    pinCount,
    pins,
    pinMap = [],
    boardId,
    visuals,
    className
}) => {
    const { t } = useTranslation();
    // 引用用于辅助操作 SVG DOM
    const containerRef = useRef<HTMLDivElement>(null);

    // 安全清理并缓存自定义 SVG 内容
    const sanitizedSvg = useMemo(() => {
        if (packageType === 'CUSTOM_SVG' && visuals?.svgContent) {
            return DOMPurify.sanitize(visuals.svgContent, {
                USE_PROFILES: { svg: true, svgFilters: true },
                ADD_ATTR: ['id', 'class'] // 保证 id 用于引脚高亮锁定
            });
        }
        return null;
    }, [packageType, visuals?.svgContent]);

    // 处理 CUSTOM_SVG 模式下的引脚交互高亮
    useEffect(() => {
        if (packageType !== 'CUSTOM_SVG' || !containerRef.current || !sanitizedSvg) return;

        // 获取 SVG 内部所有带 id 的节点 (引脚通常命名为 pin_XXX)
        const svgElement = containerRef.current.querySelector('svg');
        if (!svgElement) return;

        // 清除所有现有高亮 (如果有)
        const highlighted = svgElement.querySelectorAll('.pin-highlight');
        highlighted.forEach(el => el.classList.remove('pin-highlight'));

        // 应用新高亮
        pins.forEach(pinName => {
            // 支持多种通配符命名: pin_D13, pin_13, D13
            const possibleIds = [`pin_${pinName}`, pinName, `pin_${pinName.toLowerCase()}`];
            for (const id of possibleIds) {
                const node = svgElement.getElementById(id);
                if (node) {
                    node.classList.add('pin-highlight');
                    break;
                }
            }
        });
    }, [pins, sanitizedSvg, packageType]);

    // 如果是自定义 SVG，直接渲染清理后的 HTML
    if (packageType === 'CUSTOM_SVG' && sanitizedSvg) {
        return (
            <div
                ref={containerRef}
                className={`custom-svg-renderer flex items-center justify-center overflow-hidden ${className || ''}`}
                style={{
                    width: '100%',
                    height: '100%',
                    '--highlight-color': '#4ade80'
                } as React.CSSProperties}
            >
                <style dangerouslySetInnerHTML={{
                    __html: `
                    .custom-svg-renderer svg {
                        width: 100% !important;
                        height: 100% !important;
                        max-width: 100%;
                        max-height: 100%;
                        display: block;
                        margin: auto;
                    }
                ` }} />
                <div
                    className="w-full h-full flex items-center justify-center"
                    dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
                />
            </div>
        );
    }
    // 基础视觉参数及板型检测
    const isBoard = packageType.startsWith('BOARD_');
    const size = isBoard ? 400 : 300;           // SVG 视图大小
    const padding = 60;        // 留白大小，用于放置引脚文字
    const pinLength = 12;      // 物理引脚伸出的长度
    const fontSize = 7;        // 文字大小

    // 特定板型快速检测
    const isUno = packageType === 'BOARD_UNO_R3';
    const isMega = packageType === 'BOARD_MEGA';
    // 解析 DIP 板卡的引脚数，例如 BOARD_DIP_30 -> 30, BOARD_DIP_38 -> 38
    const dipMatch = packageType?.match(/BOARD_DIP_(\d+)/);
    const isDipBoard = !!dipMatch;
    const dipPinCount = isDipBoard ? parseInt(dipMatch![1]) : 0;

    // 确定封装几何形状
    // 检测是否为双列直插式封装 (TSSOP, SOIC, DIP, SOP) - 这种显示为长方形，引脚分布在左右两侧
    const isDualInline = /TSSOP|SOIC|DIP|SOP/i.test(packageType || '');
    const isBGA = /GA|WLCSP|LCC/i.test(packageType || ''); // Detect BGA/LGA/PGA/WLCSP/LCC/TFBGA...
    const isSquare = /LQFP|QFP|QFN/i.test(packageType || '');

    // 综合判断封装是否已识别 (用于 auto-generation 回退拦截)
    const isIdentified = isUno || isMega || isDipBoard || isDualInline || isBGA || isSquare;

    // 确定总引脚数
    const totalPins = pinCount > 0 ? pinCount : (isDipBoard ? dipPinCount : (isDualInline ? 20 : (isBGA ? 100 : 0)));

    // [FIX] Move positionMap and sortedHeuristicPins declarations up to avoid ReferenceError when using them in DIP board branches before line 685.
    // 构建位置映射快速查找表: 将物理位置编号 (如 "1", "A1") 映射到引脚信号名 (如 "PA0")
    const positionMap: Record<string, string> = {};
    if (pinMap.length > 0) {
        pinMap.forEach(p => {
            positionMap[p.position] = p.name;
        });
    }

    // 提取纯数字编号用于内部排序 (作为启发式回退)
    // 当官方数据缺失时，按端口顺序 (PA0, PA1, PB0...) 排列，尽量模拟合理分布
    const sortedHeuristicPins = [...pins].sort((a, b) => {
        const portA = a.charAt(1);
        const portB = b.charAt(1);
        if (portA !== portB) return portA.localeCompare(portB);
        const numA = parseInt(a.slice(2));
        const numB = parseInt(b.slice(2));
        return (isNaN(numA) || isNaN(numB)) ? 0 : numA - numB;
    });


    // 空状态/无预览数据拦截: 如果没标明引脚数，或者封装类型未识别，则显示提示而非强行生成错误预览
    if (packageType !== 'CUSTOM_SVG' && (!totalPins || !isIdentified)) {
        return (
            <div className={`relative flex items-center justify-center p-4 bg-[#1e1e1e] rounded-lg border border-slate-700/50 ${className} min-h-[300px]`}>
                <div className="flex flex-col items-center justify-center text-slate-500">
                    <svg className="w-12 h-12 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    <span className="text-sm font-medium tracking-wide">
                        {!totalPins ? t('chip.noPreview') : t('chip.incompleteInfo')}
                    </span>
                    <span className="text-xs text-slate-600 mt-1">{t('chip.checkBoardJson')}</span>
                </div>
            </div>
        );
    }
    let pinsPerSide = 0;
    let pinSpacing = 0;
    let bodyWidth = 0;
    let bodyHeight = 0;

    // BGA 专用网格参数
    let bgaGridRows = 0;
    let bgaGridCols = 0;
    let bgaRowMap: string[] = [];  // 行号映射 (A, B, C...)
    const bgaPinMap: Record<string, { x: number, y: number }> = {}; // 预计算 BGA 坐标

    // 渲染风格: 蓝绿色 PCB (Teal), 黑色排母, 金色焊盘
    const pcbColor = "#008C9E"; // Arduino Teal-ish
    const headerColor = "#1a1a1a"; // Black plastic
    const padColor = "#d4af37"; // Gold/Silver

    /**
     * 辅助函数: 渲染排母引脚 (Header Pin)
     * @param cx 引脚中心 X 轴坐标
     * @param cy 引脚中心 Y 轴坐标
     * @param label 引脚显示的标签 (如 D13, 5V)
     * @param isFuncPin 是否为当前选中的功能引脚 (开启高亮和脉冲动画)
     * @param labelPos 标签相对于引脚的位置 ('top' | 'left' | 'right' | 'bottom')
     */
    const renderHeaderPin = (cx: number, cy: number, label: string | undefined, isFuncPin: boolean, labelPos: 'top' | 'left' | 'right' | 'bottom' = 'top') => {
        // --- 调整引脚视觉参数 (Mega 采用更小的尺寸以适应高密度布局) ---
        const pinR = isMega ? 2 : 3; // 引脚孔半径
        const fs = isMega ? 5 : 7;   // 字体大小

        // 标签位置计算逻辑
        let textProps: React.SVGProps<SVGTextElement> = {};
        const labelOffset = isMega ? 10 : 15; // 标签与引脚的间距系数

        if (labelPos === 'left') {
            textProps = { x: cx - labelOffset, y: cy, textAnchor: 'end', dominantBaseline: 'middle', transform: undefined };
        } else if (labelPos === 'right') {
            textProps = { x: cx + labelOffset, y: cy, textAnchor: 'start', dominantBaseline: 'middle', transform: undefined };
        } else if (labelPos === 'bottom') {
            // 下方标签额外增加偏移量以保持视觉对称感，并应用 45 度旋转
            textProps = { x: cx, y: cy + labelOffset + 5, textAnchor: 'middle', transform: `rotate(45, ${cx}, ${cy + labelOffset + 5})` };
        } else {
            // 默认位置 (Top)，应用 -45 度旋转
            textProps = { x: cx, y: cy - labelOffset, textAnchor: 'start', transform: `rotate(-45, ${cx}, ${cy - labelOffset})` };
        }

        return (
            <g key={`${cx}-${cy}`} className="group/pin">
                {/* 1. 排母黑色塑料底座 (Header Plastic Base) */}
                <rect
                    x={cx - (isMega ? 2.5 : 5)}
                    y={cy - (isMega ? 2.5 : 5)}
                    width={isMega ? 5 : 10}
                    height={isMega ? 5 : 10}
                    fill={headerColor}
                    rx={1}
                />
                {/* 2. 金属镀金/银焊盘孔 (Metal Pad Hole) */}
                <circle cx={cx} cy={cy} r={pinR} fill={padColor} />
                {/* 3. 隐形交互热区: 增加点击灵敏度 */}
                <circle cx={cx} cy={cy} r={5} className="fill-transparent stroke-none hover:stroke-yellow-400 hover:stroke-2 cursor-crosshair" />

                {/* 4. 功能引脚高亮动画 (Blue Pulse highlight) */}
                {isFuncPin && (
                    <circle
                        cx={cx} cy={cy}
                        r={pinR + (isMega ? 1.0 : 1.2)}
                        className="fill-none stroke-blue-400/60 stroke-[1.5] animate-pulse"
                    />
                )}

                {/* 5. 引脚文字说明 */}
                {label && (
                    <text
                        {...textProps}
                        className={`pointer-events-none select-none font-mono ${isFuncPin ? 'fill-blue-200 font-bold' : 'fill-white/60'}`}
                        style={{ fontSize: fs }}
                    >
                        {label}
                    </text>
                )}
                {label && <title>{label}</title>}
            </g>
        );
    };

    if (isBoard) {
        // --- 板卡渲染模式 (PCB View) ---



        if (isUno) {
            // --- Arduino UNO R3 / Leonardo 布局 (采用锚点系统 refactored) ---
            const pcbW = 320;
            const pcbH = 190;
            const startX = (size - pcbW) / 2;
            const startY = (size - pcbH) / 2;

            const pinPitch = 12; // 引脚间距

            // 锚点位置: 相对于 PCB 边缘
            const topY = 25;           // 顶部引脚纵坐标
            const bottomY = pcbH - 22; // 底部引脚纵坐标

            // 组起始横坐标 (基于 Uno R3 标准尺寸)
            const powerHeaderX = 50;
            const analogHeaderX = 195;
            const digHighX = 45;
            const digLowX = 200;

            // 组渲染器: 自动处理各组引脚的偏移
            const renderGroup = (pinsList: string[], groupX: number, groupY: number, dirX: number) => {
                return pinsList.map((pName, i) => {
                    const cx = startX + (groupX + i * dirX * pinPitch);
                    const cy = startY + groupY;
                    const isFunc = pins.includes(pName);
                    return renderHeaderPin(cx, cy, pName, isFunc);
                });
            };

            return (
                <div className={`relative flex items-center justify-center p-4 bg-[#1e1e1e] rounded-lg border border-slate-700/50 ${className}`}>
                    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full max-w-[400px]" style={{ overflow: 'visible' }}>
                        {/* PCB 主体 (Arduino 蓝绿色) - 采用连续路径绘制特征边缘 */}
                        <path
                            d={`
                                M ${startX} ${startY + 20}
                                v ${pcbH - 40} l 10 20
                                h ${pcbW - 20} l 10 -10
                                v -${pcbH - 20} l -10 -10
                                h -${pcbW - 40} l -10 10
                                h -10 Z
                            `}
                            fill={pcbColor}
                            stroke="#1e293b"
                            strokeWidth="2"
                        />

                        {/* USB 接口: 根据型号区分 Leonardo (Micro-USB) 与 Uno (USB-B) */}
                        {mcu === 'ATMEGA32U4' ? (
                            <rect x={startX - 5} y={startY + 20} width={18} height={25} fill="#94a3b8" rx={1} />
                        ) : (
                            <rect x={startX - 12} y={startY + 18} width={28} height={35} fill="#94a3b8" stroke="#475569" />
                        )}

                        {/* DC 电源插座 (左下) */}
                        <rect x={startX - 15} y={startY + pcbH - 55} width={35} height={45} fill="#1e293b" stroke="#0f172a" />

                        {/* 复位按键 (左上) */}
                        <rect x={startX + 35} y={startY + 70} width={15} height={15} fill="#334155" rx={1} />
                        <circle cx={startX + 42.5} cy={startY + 77.5} r={4} fill="#94a3b8" />

                        {/* 板卡型号文字标牌 */}
                        <text x={startX + pcbW * 0.55} y={startY + 75} textAnchor="middle" className="fill-white/80 font-bold text-2xl select-none" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                            {mcu === 'ATMEGA32U4' ? 'LEONARDO' : 'UNO'}
                        </text>
                        <text x={startX + pcbW * 0.55} y={startY + 90} textAnchor="middle" className="fill-white/40 text-[9px] select-none uppercase tracking-widest font-bold">
                            {isUno ? 'R3' : 'BOARD'}
                        </text>

                        {/* 核心 MCU 芯片: 区分 Uno DIP 封装与 Leonardo QFP 封装 */}
                        {mcu === 'ATMEGA32U4' ? (
                            <g transform={`translate(${startX + pcbW * 0.6}, ${startY + pcbH * 0.65})`}>
                                <rect x="-15" y="-15" width="30" height="30" fill="#1a1a1a" rx={1} />
                                <rect x="-17" y="-12" width="34" height="24" fill="none" stroke="#d4af37" strokeWidth="1" strokeDasharray="1 1" />
                                <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" className="fill-white/40 font-mono text-[5px] select-none">MEGA32U4</text>
                            </g>
                        ) : (
                            <g transform={`translate(${startX + pcbW * 0.6}, ${startY + pcbH * 0.65})`}>
                                <rect x="-40" y="-12" width="80" height="24" fill="#1a1a1a" rx={2} />
                                <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" className="fill-white/30 font-mono text-[8px] pointer-events-none">ATMEGA328P</text>
                            </g>
                        )}

                        {/* 引脚排母渲染 */}
                        {renderGroup(["SCL", "SDA", "AREF", "GND", "13", "12", "11", "10", "9", "8"], digHighX, topY, 1)}
                        {renderGroup(["7", "6", "5", "4", "3", "2", "1", "0"], digLowX, topY, 1)}
                        {renderGroup(["IOREF", "RST", "3V3", "5V", "GND", "GND", "Vin"], powerHeaderX, bottomY, 1)}
                        {renderGroup(["A0", "A1", "A2", "A3", "A4", "A5"], analogHeaderX, bottomY, 1)}

                        {/* ICSP 编程接口焊盘 */}
                        <g transform={`translate(${startX + pcbW - 40}, ${startY + 100})`}>
                            <circle cx="0" cy="0" r="2" fill={padColor} />
                            <circle cx="8" cy="0" r="2" fill={padColor} />
                            <circle cx="0" cy="8" r="2" fill={padColor} />
                            <circle cx="8" cy="8" r="2" fill={padColor} />
                            <circle cx="0" cy="16" r="2" fill={padColor} />
                            <circle cx="8" cy="16" r="2" fill={padColor} />
                        </g>
                    </svg>
                </div>
            );
        } else if (isMega) {
            // --- Arduino Mega 2560 "大师级" 视觉重构 (V3 High-Fidelity) ---
            const scale = 0.6;
            const pcbW = 520; // 适当缩窄以增强紧凑感
            const pcbH = 300;

            const scaledW = pcbW * scale;
            const scaledH = pcbH * scale;
            const startX = (size - scaledW) / 2;
            const startY = (size - scaledH) / 2;

            const pinPitch = 12;

            // 锚点设置
            const topY = 22;
            const bottomY = pcbH - 24;
            const rightX = pcbW - 55;

            // 渲染单引脚 (带 D 前缀自动剥离逻辑，用于匹配 Pins 数组)
            const renderPin = (x: number, y: number, name: string, labelPos: 'top' | 'left' | 'right' | 'bottom' = 'top') => {
                const isFunc = pins.includes(name) || pins.includes(name.replace('D', ''));
                return renderHeaderPin(x, y, name, isFunc, labelPos);
            };

            // 渲染引脚功能组 (带独立丝印框标识)
            const renderGroup = (pinsList: string[], groupX: number, groupY: number, labelPrefix: string = '') => {
                const count = pinsList.length;
                const gW = (count * pinPitch + 6);

                return (
                    <g key={`${groupX}-${groupY}`}>
                        {/* 1. 组级丝印外框 (Silk Screen Frame) - 增强群组协调感 */}
                        <rect
                            x={startX + (groupX - 8) * scale}
                            y={startY + (groupY - 8) * scale}
                            width={gW * scale} height={16 * scale}
                            fill="none" stroke="white" strokeWidth="0.5" strokeOpacity="0.15" rx={1}
                        />
                        {/* 2. 连续排母塑料条背景 (Continuous Header Strip) */}
                        <rect
                            x={startX + (groupX - 5) * scale}
                            y={startY + (groupY - 5) * scale}
                            width={(count * pinPitch - 2) * scale} height={10 * scale}
                            fill="#151515" rx={0.5}
                        />
                        {/* 3. 引脚分布渲染 */}
                        {pinsList.map((pName, i) => {
                            const finalX = startX + (groupX + i * pinPitch) * scale;
                            const finalY = startY + groupY * scale;
                            return renderPin(finalX, finalY, labelPrefix + pName, groupY < pcbH / 2 ? 'top' : 'bottom');
                        })}
                    </g>
                );
            };

            return (
                <div className={`relative flex items-center justify-center p-4 bg-[#1e1e1e] rounded-xl border border-slate-800 shadow-2xl overflow-hidden ${className}`}>
                    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full max-w-[400px]" style={{ overflow: 'visible' }}>
                        <defs>
                            <filter id="shadow">
                                <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.5" />
                            </filter>
                            {/* 金属光泽渐变 用于模拟 USB 母口等金属部件 */}
                            <linearGradient id="metal" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#94a3b8" />
                                <stop offset="50%" stopColor="#cbd5e1" />
                                <stop offset="100%" stopColor="#64748b" />
                            </linearGradient>
                        </defs>

                        {/* PCB 板卡主体 */}
                        <rect x={startX} y={startY} width={scaledW} height={scaledH} fill={pcbColor} rx={8} filter="url(#shadow)" />

                        {/* 内部丝印装饰线: 增强硬件专业视效 */}
                        <rect x={startX + 5 * scale} y={startY + 5 * scale} width={scaledW - 10 * scale} height={scaledH - 10 * scale} fill="none" stroke="white" strokeWidth="0.3" strokeOpacity="0.08" rx={6} />

                        {/* 组件区: USB / DC / 电源管理电路 */}
                        <g opacity="0.9">
                            {/* 1. USB-B 接口 (金属渐变壳体 + 内部座子) */}
                            <rect x={startX - 5 * scale} y={startY + 35 * scale} width={45 * scale} height={40 * scale} fill="url(#metal)" rx={2} />
                            <rect x={startX + 5 * scale} y={startY + 42 * scale} width={30 * scale} height={26 * scale} fill="#020617" rx={1} />

                            {/* 2. DC 电源插座 */}
                            <rect x={startX} y={startY + 190 * scale} width={45 * scale} height={60 * scale} fill="#020617" rx={1} />
                            <rect x={startX + 5 * scale} y={startY + 195 * scale} width={35 * scale} height={50 * scale} fill="#0f172a" rx={0.5} />

                            {/* 3. 稳压电路元件 (电压调节器 + 电解电容模拟) */}
                            <rect x={startX + 60 * scale} y={startY + 210 * scale} width={20 * scale} height={25 * scale} fill="#1a1a1a" rx={1} />
                            <circle cx={startX + 95 * scale} cy={startY + 225 * scale} r={8 * scale} fill="#334155" />
                        </g>

                        {/* 基本元器件: 复位键与晶振 */}
                        <g transform={`translate(${startX + 25 * scale}, ${startY + 15 * scale})`}>
                            <rect width={15 * scale} height={15 * scale} fill="#1e293b" />
                            <circle cx={7.5 * scale} cy={7.5 * scale} r={4 * scale} fill="#ef4444" />
                        </g>
                        {/* 16MHz 金属晶振 */}
                        <ellipse cx={startX + 100 * scale} cy={startY + 115 * scale} rx={12 * scale} ry={6 * scale} fill="url(#metal)" opacity="0.6" />

                        {/* ATmega2560 主控芯片 (视觉重心核心) */}
                        <g transform={`translate(${startX + 220 * scale}, ${startY + (pcbH / 2 - 10) * scale})`}>
                            {/* 芯片本体与精细引脚线 (模拟 100-pin TQFP) */}
                            <rect x={-55 * scale} y={-55 * scale} width={110 * scale} height={110 * scale} fill="#111" rx={2} stroke="#ffffff11" strokeWidth="0.5" />
                            <g stroke="#444" strokeWidth="0.4">
                                {[...Array(25)].map((_, i) => (
                                    <React.Fragment key={i}>
                                        <line x1={-58 * scale} y1={(i * 4.4 - 52.8) * scale} x2={-55 * scale} y2={(i * 4.4 - 52.8) * scale} />
                                        <line x1={58 * scale} y1={(i * 4.4 - 52.8) * scale} x2={55 * scale} y2={(i * 4.4 - 52.8) * scale} />
                                        <line x1={(i * 4.4 - 52.8) * scale} y1={-58 * scale} x2={(i * 4.4 - 52.8) * scale} y2={-55 * scale} />
                                        <line x1={(i * 4.4 - 52.8) * scale} y1={58 * scale} x2={(i * 4.4 - 52.8) * scale} y2={55 * scale} />
                                    </React.Fragment>
                                ))}
                            </g>
                            <text textAnchor="middle" dominantBaseline="middle" className="fill-white/40 font-bold select-none" style={{ fontSize: 8 * scale }}>ATMEGA</text>
                            <text y={12 * scale} textAnchor="middle" dominantBaseline="middle" className="fill-white/10 font-mono select-none" style={{ fontSize: 6 * scale }}>2560-16AU</text>
                        </g>

                        {/* 品牌标识与功能说明文字 */}
                        <text x={startX + 400 * scale} y={startY + (pcbH - 60) * scale} textAnchor="middle" className="fill-white/5 font-bold italic select-none" style={{ fontSize: 30 * scale }}>MEGA 2560</text>
                        <text x={startX + 400 * scale} y={startY + (pcbH - 35) * scale} textAnchor="middle" className="fill-white/10 font-mono select-none" style={{ fontSize: 10 * scale }}>COMMUNICATION / DIGITAL</text>

                        {/* 排母引脚组 (通过锚点系统精确定位) */}
                        {renderGroup(["SCL", "SDA", "AREF", "GND", "13", "12", "11", "10", "9", "8"], 95, topY)}
                        {renderGroup(["7", "6", "5", "4", "3", "2", "1", "0"], 235, topY)}
                        {renderGroup(["14", "15", "16", "17", "18", "19", "20", "21"], 345, topY)}

                        {renderGroup(["IOREF", "RST", "3V3", "5V", "GND", "GND", "Vin"], 95, bottomY)}
                        {renderGroup(["A0", "A1", "A2", "A3", "A4", "A5", "A6", "A7"], 195, bottomY)}
                        {renderGroup(["A8", "A9", "A10", "A11", "A12", "A13", "A14", "A15"], 305, bottomY)}

                        {/* 右侧扩展区: 双排直立排母 */}
                        {(() => {
                            const count = 16;
                            const xBase = rightX * scale;
                            const yBase = 40 * scale;
                            const hCount = (count - 1) * 12 + 10;
                            return (
                                <g>
                                    {/* 扩展区丝印外框 */}
                                    <rect x={startX + xBase - 12 * scale} y={startY + yBase - 8 * scale} width={42 * scale} height={(hCount + 16) * scale} fill="none" stroke="white" strokeWidth="0.5" strokeOpacity="0.1" rx={1} />
                                    {/* 垂直排母塑料条背景 */}
                                    <rect x={startX + xBase - 5 * scale} y={startY + yBase - 5 * scale} width={28 * scale} height={hCount * scale} fill="#151515" rx={0.5} />
                                    {[...Array(count)].map((_, i) => {
                                        const pL = 22 + i * 2;
                                        const pR = 23 + i * 2;
                                        const cy = startY + yBase + (i * 12) * scale;
                                        return (
                                            <React.Fragment key={i}>
                                                {renderPin(startX + xBase, cy, `D${pL}`, 'left')}
                                                {renderPin(startX + xBase + 18 * scale, cy, `D${pR}`, 'right')}
                                            </React.Fragment>
                                        );
                                    })}
                                </g>
                            );
                        })()}
                    </svg>
                </div>
            );
        } else if (isDipBoard) {
            // --- DIP 板卡布局 (Nano, ESP32, ESP8266 等长条形板卡) ---
            const pinsPerSide = dipPinCount / 2;
            const pitch = 16;
            const pinMargin = 12; // 增加内边距以容纳更美观的标签旋转

            // 逻辑: 如果引脚很多 (如 ESP32)，则横向显示，否则纵向
            const isHorizontal = pinsPerSide > 12;
            const isESP = mcu.toUpperCase().includes('ESP');

            const boardLong = (pinsPerSide + 1) * pitch;
            const boardShort = isESP ? 120 : 100;

            const boardWidth = isHorizontal ? boardLong : boardShort;
            const boardHeight = isHorizontal ? boardShort : boardLong;

            const startX = (size - boardWidth) / 2;
            const startY = (size - boardHeight) / 2;

            return (
                <div className={`relative flex items-center justify-center p-4 bg-[#1e1e1e] rounded-lg border border-slate-700/50 ${className}`}>
                    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full max-w-[400px]" style={{ overflow: 'visible' }}>
                        {/* PCB 主体 */}
                        <rect x={startX} y={startY} width={boardWidth} height={boardHeight} rx={4} fill={pcbColor} stroke="#1e293b" strokeWidth="2" />

                        {/* USB 接口锚点布局 */}
                        {isHorizontal ? (
                            <rect x={startX - 6} y={startY + boardHeight / 2 - 12} width={15} height={24} fill="#94a3b8" rx={2} />
                        ) : (
                            <rect x={startX + boardWidth / 2 - 12} y={startY - 6} width={24} height={15} fill="#94a3b8" rx={2} />
                        )}

                        {/* 中心芯片: 区分 ESP 屏蔽罩样式与 Nano TQFP 旋转样式 */}
                        <g transform={`translate(${size / 2}, ${size / 2})`}>
                            {isESP ? (
                                // ESP32 风格: 银色屏蔽罩屏蔽罩
                                <g transform={isHorizontal ? "" : "rotate(90)"}>
                                    <rect x="-25" y="-18" width="50" height="36" rx={2} fill="#e2e8f0" />
                                    <rect x="-22" y="-15" width="44" height="30" fill="none" stroke="#94a3b8" strokeWidth="1" />
                                    <text x="0" y="2" textAnchor="middle" dominantBaseline="middle" className="fill-slate-600 font-bold text-[6px] select-none">{mcu.substring(0, 10)}</text>
                                </g>
                            ) : (
                                // Nano/Pro 风格: 45度旋转 QFP
                                <g transform="rotate(45)">
                                    <rect x="-15" y="-15" width="30" height="30" rx={1} fill="#333" />
                                    <rect x="-17" y="-12" width="34" height="24" fill="none" stroke="#d4af37" strokeWidth="0.5" strokeDasharray="1 1" />
                                    <text x="0" y="0" transform="rotate(-45)" textAnchor="middle" dominantBaseline="middle" className="fill-white/40 font-bold text-[5px] select-none">{mcu.substring(0, 6)}</text>
                                </g>
                            )}
                        </g>

                        {/* 边缘锚定引脚渲染 */}
                        {Array.from({ length: pinsPerSide }).map((_, i) => {
                            const p1Idx = i;
                            const p2Idx = i + pinsPerSide;

                            const p1Name = positionMap[String(p1Idx + 1)] || String(p1Idx + 1);
                            const p2Name = positionMap[String(p2Idx + 1)] || String(p2Idx + 1);

                            const isP1Func = pins.includes(p1Name);
                            const isP2Func = pins.includes(p2Name);

                            if (isHorizontal) {
                                // 横向模式: 引脚在顶部和底部
                                const cx = startX + (i + 1) * pitch;
                                const topY = startY + pinMargin;
                                const bottomY = startY + boardHeight - pinMargin;
                                return (
                                    <g key={i}>
                                        {renderHeaderPin(cx, topY, p1Name, isP1Func, 'top')}
                                        {renderHeaderPin(cx, bottomY, p2Name, isP2Func, 'bottom')}
                                    </g>
                                );
                            } else {
                                // 纵向模式: 引脚在左侧和右侧
                                const cy = startY + (i + 1) * pitch;
                                const leftX = startX + pinMargin;
                                const rightX = startX + boardWidth - pinMargin;
                                return (
                                    <g key={i}>
                                        {renderHeaderPin(leftX, cy, p1Name, isP1Func, 'left')}
                                        {renderHeaderPin(rightX, cy, p2Name, isP2Func, 'right')}
                                    </g>
                                );
                            }
                        })}
                    </svg>
                </div>
            );
        }
    }


    if (isBGA) {
        // --- BGA 布局 (球栅阵列) ---
        // 尝试从 pinMap 中推断网格大小
        // BGA 通常是矩阵排列, 如 10x10, 12x12
        if (pinMap.length > 0) {
            // 解析所有位置坐标 (如 "A1", "C12")
            // 找出最大行(字母)和最大列(数字)
            const rows = new Set<string>();
            const cols = new Set<number>();

            pinMap.forEach(p => {
                const match = p.position.match(/^([A-Z]+)(\d+)$/);
                if (match) {
                    rows.add(match[1]);
                    cols.add(parseInt(match[2]));
                }
            });

            // 排序行号 (A, B, C... AA, AB...)
            // 简单处理：假设单字母或标准双字母组合
            bgaRowMap = Array.from(rows).sort((a, b) => {
                if (a.length !== b.length) return a.length - b.length;
                return a.localeCompare(b);
            });
            bgaGridRows = bgaRowMap.length;
            bgaGridCols = Math.max(...Array.from(cols), 0);
        }

        // 如果无法推断 (无 pinMap)，则根据 pinCount 估算正方形矩阵
        if (bgaGridRows === 0 || bgaGridCols === 0) {
            const side = Math.ceil(Math.sqrt(totalPins));
            bgaGridRows = side;
            bgaGridCols = side;
            // 生成默认行号 A, B, C...
            bgaRowMap = Array.from({ length: side }, (_, i) => String.fromCharCode(65 + i));
        }

        // BGA 尺寸设定
        // 为了容纳网格，需要足够的空间
        const pitch = 18; // 焊球间距
        bodyWidth = (bgaGridCols + 1) * pitch;
        bodyHeight = (bgaGridRows + 1) * pitch;

        // 确保整体视图放得下
        // 如果 body 太大，通常需要调整 SVG viewBox 或缩放
        // 当前 pitch 设置下，20x20 的矩阵 (240px) 小于 300px 视图，显示正常。


    } else if (isDualInline) {
        // --- 双列布局 (长方形) ---
        // 视觉上我们可以让它稍微瘦高一点，模拟 DIP/SOIC 形状
        // 宽度设为高度的一半，或者根据引脚数自适应
        const pinsPerColumn = Math.ceil(totalPins / 2);
        const dynamicHeight = Math.max(160, pinsPerColumn * 12); // 最小高度
        const dynamicWidth = dynamicHeight * 0.45; // 宽高比

        // 为了居中，重新计算 padding
        // 注意：这里为了简单，我们还是固定在 300x300 的框里居中画
        // 但如果引脚太多，可能会溢出。这里暂时假设引脚数不会特别夸张 (TSSOP通常 < 64)
        bodyWidth = dynamicWidth; // 修正: 使用计算出的 width
        bodyHeight = dynamicHeight; // 修正: 使用计算出的 height
        pinSpacing = bodyHeight / (pinsPerColumn + 1);
        pinsPerSide = pinsPerColumn; // Reuse variable for consistent rendering loop access if needed
    } else {
        // --- 四边布局 (正方形: LQFP, QFN) ---
        // 针对超多引脚 (如 144, 176, 208)，原先 padding=60, body=180 可能不够
        // 176 pins -> 44/side. 180/45 = 4px spacing. Tight but renders.
        // 208 pins -> 52/side. 180/53 = 3.4px spacing. Very tight.

        pinsPerSide = Math.ceil(totalPins / 4);

        // 动态调整 padding 和 bodySize
        // 如果引脚很多，减少 padding，增大 bodySize
        const adjustedPadding = totalPins > 100 ? 40 : 60;
        const bodySize = size - adjustedPadding * 2;

        bodyWidth = bodySize;
        bodyHeight = bodySize;
        pinSpacing = bodySize / (pinsPerSide + 1);
    }

    // 芯片主体起始坐标 (居中)
    const startX = (size - bodyWidth) / 2;
    const startY = (size - bodyHeight) / 2;

    /**
     * 根据物理位置索引获取引脚显示名称
     * @param pos 物理引脚位置 (1-indexed)
     */
    const getPinName = (pos: number) => {
        const posStr = pos.toString();
        // 1. 优先使用传入的官方引脚映射表
        if (positionMap[posStr]) return positionMap[posStr];

        // 2. 启发式逻辑回退: 如果没有官方映射，则按功能引脚的字母顺序依次填充
        return sortedHeuristicPins[pos - 1] || '';
    };

    /**
     * 渲染单个引脚及其标签
     * @param pos 物理引脚索引 (1-indexed)
     * @param side 所在的边 (bottom | right | top | left)
     * @param indexOnSide 在该边的第几个引脚 (0-indexed)
     */
    const renderPin = (pos: number, side: 'bottom' | 'right' | 'top' | 'left', indexOnSide: number) => {
        const pinName = getPinName(pos);
        // 如果没有引脚名且超过了已知引脚总数，则不渲染
        if (!pinName && pos > totalPins) return null;

        let x1, y1, x2, y2, textX, textY, textAnchor, transform = '';

        // 计算该引脚基于其所在边的偏移 (从左/上 起始)
        const offset = (indexOnSide + 1) * pinSpacing;

        // 根据引脚所在的边，计算起点、终点和文字标注的坐标
        // 注意：基准坐标改为 dynamic startX/startY
        switch (side) {
            case 'bottom': // 下边: 引脚向下伸出
                x1 = startX + offset; // 这里 bottom 是从右到左？不对，标准是逆时针。
                // 1. Bottom: 1...N (通常 LQFP 左下角是 1，逆时针转)
                // 等等，SVG 里的引脚顺序：
                // 标准芯片 (Top View): 
                // Pin 1: Bottom-Left (or Top-Left for DIP)
                // Let's stick to the Quadrant logic used before:
                // Previous logic: Bottom -> Right -> Top -> Left (Clockwise starting from Bottom-Leftish?)
                // Actually previous logic loop was: i=0
                // renderPin(i+1, 'bottom')
                // renderPin(..., 'right')
                // This implies Pin 1 is on Bottom edge.
                // LQFP standard: Pin 1 at Top-Left corner usually? No, check ST datasheets.
                // ST LQFP: Pin 1 is Top-Left or Bottom-Left depending on orientation mark.
                // Usually counter-clockwise.
                // Let's keep existing logic for Quad to avoid regressions, but use computed startX/Y.

                // Existing Quad Logic (Clockwise from Bottom?):
                // loop i from 0 to pinsPerSide
                // Pin 1..N -> Bottom 
                // Pin N..2N -> Right
                // ...
                // This is weird but if it visually matches, fine.
                // Let's just fix coordinates relative to startX/startY

                x1 = startX + offset;
                y1 = startY + bodyHeight;
                x2 = x1;
                y2 = y1 + pinLength;
                textX = x1;
                textY = y2 + 4;
                textAnchor = 'middle';
                transform = `rotate(90, ${textX}, ${textY})`; // 垂直放置文字
                break;
            case 'right': // 右边: 引脚向右伸出
                x1 = startX + bodyWidth;
                y1 = startY + bodyHeight - offset; // Bottom-up
                x2 = x1 + pinLength;
                y2 = y1;
                textX = x2 + 2;
                textY = y1 + 2.5;
                textAnchor = 'start';
                break;
            case 'top': // 上边: 引脚向上伸出
                x1 = startX + bodyWidth - offset;
                y1 = startY;
                x2 = x1;
                y2 = y1 - pinLength;
                textX = x1;
                textY = y2 - 4;
                textAnchor = 'middle';
                transform = `rotate(-90, ${textX}, ${textY})`;
                break;
            case 'left': // 左边: 引脚向左伸出
                x1 = startX;
                y1 = startY + offset; // Top-down
                x2 = startX - pinLength;
                y2 = y1;
                textX = x2 - 2;
                textY = y1 + 2.5;
                textAnchor = 'end';
                break;
        }

        // 判断该引脚是否在当前板卡的功能定义中 (用于视觉高亮)
        const isFuncPin = pins.includes(pinName);

        return (
            <g key={`${side}-${pos}`} className="group/pin">
                {/* 模拟物理引脚的线条 */}
                <line
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    className={`stroke-slate-500 group-hover/pin:stroke-blue-400 transition-colors ${isFuncPin ? 'stroke-slate-300' : 'stroke-slate-600'}`}
                    strokeWidth={isFuncPin ? "1.5" : "1"}
                />
                {/* 引脚标号文字 */}
                <text
                    x={textX} y={textY}
                    transform={transform}
                    textAnchor={textAnchor}
                    className={`transition-colors pointer-events-none ${isFuncPin ? 'fill-blue-400 font-bold' : 'fill-slate-500'}`}
                    style={{ fontSize: `${fontSize}px`, fontFamily: 'monospace' }}
                >
                    {pinName}
                </text>
            </g>
        );
    };

    return (
        <div className={`relative flex items-center justify-center p-4 bg-[#1e1e1e] rounded-lg border border-slate-700/50 ${className}`}>
            <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full max-w-[400px]" style={{ overflow: 'visible' }}> {/* overflow allowed for big chips */}
                {/* 芯片主体 (矩形) */}
                <rect
                    x={startX} y={startY}
                    width={bodyWidth} height={bodyHeight}
                    rx={isBGA ? 0 : 4} // BGA 通常是直角基板
                    className="fill-slate-800 stroke-slate-500"
                    strokeWidth="2"
                />

                {/* 芯片表面信息 */}
                {!isBGA && (
                    <>
                        <text
                            x={size / 2} y={size / 2 - 10}
                            textAnchor="middle"
                            className="fill-slate-400 font-bold"
                            style={{ fontSize: '14px' }}
                        >
                            ST
                        </text>
                        <text
                            x={size / 2} y={size / 2 + 10}
                            textAnchor="middle"
                            className="fill-slate-500"
                            style={{ fontSize: '10px' }}
                        >
                            {mcu}
                        </text>
                        <text
                            x={size / 2} y={size / 2 + 25}
                            textAnchor="middle"
                            className="fill-slate-600 italic uppercase"
                            style={{ fontSize: '8px' }}
                        >
                            {/* 如果封装名已包含引脚数 (如 LQFP64)，则不再重复显示 */}
                            {packageType.toUpperCase().endsWith(String(totalPins)) ? packageType : `${packageType}${totalPins}`}
                        </text>
                    </>
                )}

                {isBGA && (
                    <text x={size / 2} y={startY - 15} textAnchor="middle" className="fill-slate-500" style={{ fontSize: '10px' }}>
                        {mcu} ({totalPins} pins) - Bottom View
                    </text>
                )}


                {/* 引脚渲染逻辑 */}
                {isBGA ? (
                    <g>
                        {/* 坐标轴标签 */}
                        {/* Columns (1, 2, 3...) Top */}
                        {Array.from({ length: bgaGridCols }).map((_, i) => {
                            const pitch = 16;
                            const pitchX = bodyWidth / (bgaGridCols + 1);
                            const cx = startX + (i + 1) * pitchX;
                            const cy = startY - 8;
                            return (
                                <text key={`col-${i}`} x={cx} y={cy} textAnchor="middle" className="fill-slate-600" style={{ fontSize: '6px' }}>
                                    {i + 1}
                                </text>
                            );
                        })}
                        {/* Rows (A, B, C...) Left */}
                        {bgaRowMap.map((label, i) => {
                            const pitchY = bodyHeight / (bgaGridRows + 1);
                            const cy = startY + (i + 1) * pitchY;
                            const cx = startX - 8;
                            return (
                                <text key={`row-${i}`} x={cx} y={cy + 2} textAnchor="end" className="fill-slate-600" style={{ fontSize: '6px' }}>
                                    {label}
                                </text>
                            );
                        })}

                        {/* Grid Points */}
                        {bgaRowMap.map((rowLabel, rIndex) => (
                            Array.from({ length: bgaGridCols }).map((_, cIndex) => {
                                const colLabel = cIndex + 1;
                                const posStr = `${rowLabel}${colLabel}`;
                                const pinName = positionMap[posStr];

                                const pitchX = bodyWidth / (bgaGridCols + 1);
                                const pitchY = bodyHeight / (bgaGridRows + 1);

                                const cx = startX + (cIndex + 1) * pitchX;
                                const cy = startY + (rIndex + 1) * pitchY;

                                const isFuncPin = pinName && pins.includes(pinName);

                                return (
                                    <g key={posStr} className="group/pin">
                                        <circle
                                            cx={cx} cy={cy}
                                            r={isFuncPin ? 3.5 : 2.5}
                                            className={`transition-colors ${isFuncPin ? 'fill-blue-400' : (pinName ? 'fill-slate-600' : 'fill-[#2a2a2a]')}`}
                                        />
                                        {/* Pin Name Text (Micro-sized for Zooming) */}
                                        {pinName && (
                                            <text
                                                x={cx} y={cy}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                                className={`pointer-events-none select-none ${isFuncPin ? 'fill-white' : 'fill-slate-300'}`}
                                                style={{ fontSize: '2px', fontWeight: 'bold' }} // Extremely small, but vector scalable
                                            >
                                                {pinName.replace(/_/g, '').substring(0, 4)}
                                            </text>
                                        )}
                                        <title>{posStr}: {pinName}</title>
                                    </g>
                                );
                            })
                        ))}

                        {/* A1 Marker Triangle (Top Left Corner of the Grid) */}
                        <path d={`M ${startX} ${startY} L ${startX + 15} ${startY} L ${startX} ${startY + 15} Z`} className="fill-slate-600/30" />
                    </g>
                ) : isDualInline ? (
                    // --- 双列渲染逻辑 ---
                    <>
                        {Array.from({ length: pinsPerSide }).map((_, i) => { // pinsPerSide 即 calculated pinsPerColumn
                            const pinNumLeft = i + 1;
                            const pinRightNum = totalPins - i;

                            return (
                                <React.Fragment key={i}>
                                    {renderPin(pinNumLeft, 'left', i)}
                                    {renderPin(pinRightNum, 'right', i)}
                                </React.Fragment>
                            );
                        })}
                    </>
                ) : (
                    // --- 四边渲染逻辑 (保留原有逻辑，适配新坐标) ---
                    Array.from({ length: pinsPerSide }).map((_, i) => (
                        <React.Fragment key={i}>
                            {renderPin(i + 1, 'bottom', i)}
                            {renderPin(i + 1 + pinsPerSide, 'right', i)}
                            {renderPin(i + 1 + pinsPerSide * 2, 'top', i)}
                            {renderPin(i + 1 + pinsPerSide * 3, 'left', i)}
                        </React.Fragment>
                    ))
                )}

                {/* Pin 1 指示点 */}
                <circle
                    cx={isDualInline ? startX + 8 : startX + 8}
                    cy={isDualInline ? startY + 8 : startY + bodyHeight - 8} // 双列在左上，四边在左下(根据之前的逻辑)
                    // 上面的四边逻辑是 Bottom 起始，所以 Pin 1 在 Bottom-Right of Left edge? No.
                    // Loop 1 matches 'bottom' helper. 'bottom' helper puts pins on bottom edge.
                    // So Pin 1 is on Bottom Edge.
                    // Usually Pin 1 is Top-Left. 
                    // But if the previous visualization was acceptable, maybe I shouldn't break Quad orientation unless asked.
                    // User asked for "True Layout". 
                    // LQFP Pin 1 is Top-Left. Numbering Counter-Clockwise.
                    // Pin 1..N/4 on LEFT side (Top-Down)? No.
                    // LQFP Standard:
                    // Pin 1 top-left corner.
                    // Pins 1..k on Left (Top-Down)? No.
                    // Pins are usually 1 at Top-Left, running Counter-Clockwise.
                    // So 1..k on Left (Top-Down) -> k+1..2k on Bottom (Left-Right) -> ...

                    // Current Quad Logic:
                    // batch 1 -> Bottom
                    // batch 2 -> Right
                    // batch 3 -> Top
                    // batch 4 -> Left
                    // This implies Pin 1 is on Bottom.
                    // This seems wrong for standard LQFP (usually Top-Left or Top).
                    // BUT, I will ONLY fix Dual Inline layout as explicitly requested ("TSSOP/SOIC").
                    // For Quad, I will leave the logic structurally same to avoid breaking "what users are used to" unless I'm sure.
                    // However, I must ensure Pin 1 dot is consistent with Pin 1 location.
                    // Quad Pin 1 is in 'bottom' batch -> so it's on the bottom edge.
                    // So Dot should be near Pin 1.
                    // 'bottom' batch x1 = startX + offset (index 0 -> Left side of bottom edge).
                    // So Pin 1 is Bottom-Left.
                    // So Dot at Bottom-Left (startY + bodyHeight - 8) is correct for the current rendering logic.

                    // For Dual Inline (TSSOP):
                    // Pin 1 is Top-Left.
                    // So Dot should be at startY + 8.

                    r="2.5"
                    className="fill-slate-600"
                />
            </svg>
        </div>
    );
};
