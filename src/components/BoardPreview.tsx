import React, { useState, useEffect, useRef } from 'react';
import { Cpu, MemoryStick, Link, Maximize2, X, Focus } from 'lucide-react';
import { PinMapping } from '../types/board';
import { ChipRenderer } from './ChipRenderer';
import { BaseModal } from './BaseModal';

/**
 * BoardImages: 板卡相关的媒体资源定义
 */
interface BoardImages {
    board: string | null;   // 板卡实物照片 URL
    pinmap: string | null;  // 官方引脚说明图 URL
}

/**
 * BoardPreviewProps: 板卡预览组件属性
 */
interface BoardPreviewProps {
    name: string;           // 板卡名称
    mcu?: string;           // MCU 型号
    packageType?: string;   // 封装类型
    pinCount?: number;      // 引脚数量
    pins?: string[];        // 正在使用的功能引脚
    pinMap?: PinMapping[];  // 实物引脚物理映射
    description?: string;   // 板卡描述
    specs?: string;         // 规格摘要 (如 "32k Flash / 2k RAM")
    images?: BoardImages;   // 媒体图片对象
    pageUrl?: string;       // 官方文档链接
    className?: string;     // 外部布局类名
}

/**
 * BoardPreview: 硬件选择预览组件
 * 
 * 功能:
 * 1. 展示板卡实物照片，并支持在“照片”与“引脚参考图”之间切换。
 * 2. 如果没有实物照片，自动调用 ChipRenderer 渲染基于物理数据的芯片 3D/SVG 图。
 * 3. 支持点击“查看大图”功能，在全屏模态框中展示高清图或芯片图。
 */
export const BoardPreview: React.FC<BoardPreviewProps> = ({
    name,
    mcu,
    packageType,
    pinCount = 0,
    pins = [],
    pinMap = [],
    description,
    specs,
    images,
    pageUrl,
    className
}) => {
    // 内部状态
    const [showPinmap, setShowPinmap] = useState(false); // 是否显示引脚图 (如果是实物图切换)
    const [imgError, setImgError] = useState(false);     // 图片加载失败标志
    const [isImgLoading, setIsImgLoading] = useState(true); // 图片加载中动画
    const [isExpanded, setIsExpanded] = useState(false); // 是否处于大图模式

    // 变换状态：缩放比例与平移坐标 (x, y)
    const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });

    // 拖拽与缩放交互的 Ref
    const zoomContainerRef = useRef<HTMLDivElement>(null); // 大图容器引用
    const isDragging = useRef(false); // 是否正在拖拽 (逻辑状态)
    const [isGrabbing, setIsGrabbing] = useState(false); // 抓取状态 (视觉状态: grab/grabbing)
    const startPos = useRef({ x: 0, y: 0 }); // 拖拽起始位置

    // 使用非被动事件监听器解决 Wheel 滚动报错 + 实现以鼠标为中心的缩放
    useEffect(() => {
        const container = zoomContainerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            // 简单的缩放逻辑: 向上滚(deltaY<0)放大，向下滚(deltaY>0)缩小
            if (e.ctrlKey || e.metaKey || true) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.1 : 0.1;

                // 计算鼠标相对于容器中心的位置 (容器 origin 是 center)
                const rect = container.getBoundingClientRect();
                // 容器中心点坐标
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                // 鼠标相对于容器左上角的坐标
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                // 鼠标相对于中心的偏移量 (未缩放坐标系下?)
                // 不，我们需要基于当前的 transform 来计算。
                // 公式：
                // oldX_world = (mouseX - centerX - tx) / oldScale
                // newScale = oldScale + delta
                // newTx = mouseX - centerX - oldX_world * newScale

                // 但 React state 的获取在 listener 里可能是旧的 (闭包)。
                // 更好的方式是使用 functional state update，但这里我们需要用到 e.clientX 和 rect
                // 所以我们必须获取最新的 transform state。

                // 为了避免 stale closure，这里可以使用 ref 来追踪 transform，或者重写 setTransform 逻辑。
                // 鉴于这是一个 simple component，直接用 setTransform(prev => ...) 并在里面计算即可。
                // 但是 prev 只有 scale, x, y，没有鼠标位置信息。
                // 鼠标位置 e.clientX 是固定的。

                setTransform(prev => {
                    const oldScale = prev.scale;
                    const newScale = Math.min(5, Math.max(0.1, oldScale + delta));

                    if (newScale === oldScale) return prev; // 无变化

                    // 计算鼠标点在"世界坐标系"(无缩放平移)中的位置
                    const worldX = (mouseX - centerX - prev.x) / oldScale;
                    const worldY = (mouseY - centerY - prev.y) / oldScale;

                    // 计算新的平移量，使得世界坐标点保持在鼠标位置下
                    // mouseX = centerX + newTx + worldX * newScale
                    // => newTx = mouseX - centerX - worldX * newScale
                    const newX = mouseX - centerX - worldX * newScale;
                    const newY = mouseY - centerY - worldY * newScale;

                    return {
                        scale: newScale,
                        x: newX,
                        y: newY
                    };
                });
            }
        };

        // { passive: false } 是关键，允许我们在 listener 中调用 e.preventDefault()
        container.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            container.removeEventListener('wheel', handleWheel);
        };
    }, [isExpanded]); // 当模态框打开时重新绑定

    // 计算当前应当显示的图片路径
    const activeImage = showPinmap && images?.pinmap ? images.pinmap : images?.board;
    // 判断是否具备“实物图/引脚图”切换能力
    const canToggle = !!(images?.board && images?.pinmap);

    // 判断逻辑
    const hasImages = !!(images?.board || images?.pinmap);
    const canRenderChip = pinCount > 0;

    return (
        <div className={`flex flex-col h-full bg-[#252526] rounded-lg border border-slate-700 overflow-hidden ${className}`}>

            {/* 视觉展示区域 (图片或芯片渲染) */}
            <div
                className={`relative flex-1 bg-[#1e1e1e] flex items-center justify-center min-h-[220px] group overflow-hidden ${hasImages || canRenderChip ? 'cursor-zoom-in' : ''}`}
                onClick={() => (hasImages || canRenderChip) && setIsExpanded(true)}
            >
                {hasImages && !imgError ? (
                    <>
                        {/* 加载中的骨架图动画 */}
                        {isImgLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-[#1e1e1e]">
                                <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                            </div>
                        )}

                        <img
                            src={activeImage!}
                            alt={name}
                            onLoad={() => setIsImgLoading(false)}
                            className={`max-h-full max-w-full object-contain transition-all duration-500 ${isImgLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'} group-hover:scale-105`}
                            onError={() => { setImgError(true); setIsImgLoading(false); }}
                        />

                        {/* 视图切换按钮 (照片 vs 引脚图) */}
                        {canToggle && !isImgLoading && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowPinmap(!showPinmap); }}
                                className="absolute bottom-2 left-2 bg-black/60 hover:bg-black/80 text-white text-xs px-2 py-1 rounded backdrop-blur-sm transition-colors flex items-center gap-1 z-10"
                            >
                                <Cpu size={12} />
                                {showPinmap ? '显示板卡' : '显示引脚'}
                            </button>
                        )}
                    </>
                ) : canRenderChip ? (
                    <ChipRenderer
                        mcu={mcu || name}
                        packageType={packageType || 'Unknown'}
                        pinCount={pinCount}
                        pins={pins}
                        pinMap={pinMap}
                        className="w-full h-full p-4 pointer-events-none"
                    />
                ) : (
                    <div className="p-12 flex flex-col items-center justify-center text-slate-600 border-b border-slate-700 bg-[#1e1e1e]/50">
                        <Cpu size={64} className="mb-4 opacity-20" />
                        <span className="text-xs opacity-40">暂无板卡预览图</span>
                    </div>
                )}

                {/* “查看大图”悬浮按钮 (仅在有内容时显示) */}
                {(hasImages || canRenderChip) && (
                    <button
                        onClick={() => setIsExpanded(true)}
                        className="absolute top-2 right-2 p-2 bg-black/40 hover:bg-blue-600 text-white rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0"
                        title="查看大图"
                    >
                        <Maximize2 size={16} />
                    </button>
                )}
            </div>

            {/* 信息展示区域 (文本) - 限制最大高度为 60% 并允许滚动 */}
            <div className="p-4 space-y-3 bg-[#252526] max-h-[60%] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                <div>
                    <h3 className="text-lg font-bold text-slate-100">{name}</h3>
                    {/* 规格标签 (Flash/RAM 等) */}
                    {specs && (
                        <div className="flex items-center gap-2 text-xs text-blue-400 mt-1 font-mono">
                            <MemoryStick size={12} />
                            {specs}
                        </div>
                    )}
                </div>

                {/* 板卡详细描述 */}
                {description && (
                    <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">
                        {description}
                    </p>
                )}

                {/* 外部官方指南链接 */}
                {pageUrl && (
                    <a
                        href={pageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-400 transition-colors pt-2"
                    >
                        <Link size={12} />
                        官方文档 (Documentation)
                    </a>
                )}
            </div>

            {/* 全屏大图模态框 */}
            <BaseModal
                isOpen={isExpanded}
                onClose={() => { setIsExpanded(false); setTransform({ scale: 1, x: 0, y: 0 }); }}
                className="w-[90vw] h-[90vh] max-w-5xl bg-[#1e1e1e] border border-slate-700 rounded-xl overflow-hidden shadow-2xl relative flex flex-col"
            >
                {/* 头部装饰 */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-black/20 z-10 select-none">
                    <div>
                        <h2 className="text-slate-100 font-bold">{name}</h2>
                        <span className="text-xs text-slate-500">{showPinmap ? '引脚定义图' : '实物照片/芯片视觉'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* 缩放控制工具栏 */}
                        <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 mr-4">
                            <button
                                onClick={() => setTransform(prev => ({ ...prev, scale: Math.max(0.1, prev.scale - 0.25) }))}
                                className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                                title="缩小 (Zoom Out)"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                            </button>
                            <span className="text-xs font-mono text-slate-400 w-12 text-center">{Math.round(transform.scale * 100)}%</span>
                            <button
                                onClick={() => setTransform(prev => ({ ...prev, scale: Math.min(5, prev.scale + 0.25) }))}
                                className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                                title="放大 (Zoom In)"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                            </button>
                            <div className="w-px h-4 bg-slate-700 mx-1"></div>
                            <button
                                onClick={() => setTransform({ scale: 1, x: 0, y: 0 })}
                                className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors flex items-center justify-center"
                                title="重置/居中 (Center & Reset)"
                            >
                                <Focus size={16} />
                            </button>
                        </div>

                        <button
                            onClick={() => { setIsExpanded(false); setTransform({ scale: 1, x: 0, y: 0 }); }}
                            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* 大图内容区 (Canvas-like controls) */}
                <div
                    ref={zoomContainerRef}
                    className="flex-1 bg-[#1e1e1e] relative overflow-hidden select-none"
                    style={{ cursor: isGrabbing ? 'grabbing' : 'grab' }}
                    onMouseDown={(e) => {
                        isDragging.current = true;
                        setIsGrabbing(true);
                        startPos.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
                    }}
                    onMouseMove={(e) => {
                        if (!isDragging.current) return;
                        setTransform(prev => ({
                            ...prev,
                            x: e.clientX - startPos.current.x,
                            y: e.clientY - startPos.current.y
                        }));
                    }}
                    onMouseUp={() => {
                        isDragging.current = false;
                        setIsGrabbing(false);
                    }}
                    onMouseLeave={() => {
                        isDragging.current = false;
                        setIsGrabbing(false);
                    }}
                >
                    <div
                        className="w-full h-full flex items-center justify-center origin-center transition-transform duration-75 ease-out"
                        style={{
                            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                        }}
                    >
                        {activeImage && !imgError ? (
                            <img
                                src={activeImage}
                                alt={name}
                                className="max-w-none object-contain shadow-2xl pointer-events-none"
                                style={{ maxHeight: '80vh', maxWidth: '80vw' }}
                            />
                        ) : canRenderChip ? (
                            <div className="w-[800px] h-[800px] pointer-events-none">
                                <ChipRenderer
                                    mcu={mcu || name}
                                    packageType={packageType || 'Unknown'}
                                    pinCount={pinCount}
                                    pins={pins}
                                    pinMap={pinMap}
                                    className="w-full h-full border-none bg-transparent"
                                />
                            </div>
                        ) : null}
                    </div>
                </div>
            </BaseModal>
        </div>
    );
};
