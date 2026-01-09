import React, { useState } from 'react';
import { Cpu, MemoryStick, Link, Maximize2 } from 'lucide-react';

interface BoardImages {
    board: string | null;
    pinmap: string | null;
}

interface BoardPreviewProps {
    name: string;
    description?: string;
    specs?: string; // e.g. "32k Flash / 2k RAM"
    images?: BoardImages;
    pageUrl?: string; // Documentation Link
    className?: string;
}

export const BoardPreview: React.FC<BoardPreviewProps> = ({
    name,
    description,
    specs,
    images,
    pageUrl,
    className
}) => {
    const [showPinmap, setShowPinmap] = useState(false);
    const [imgError, setImgError] = useState(false);

    // If pinmap is requested but not available, fallback to board
    const activeImage = showPinmap && images?.pinmap ? images.pinmap : images?.board;
    const canToggle = !!(images?.board && images?.pinmap);

    return (
        <div className={`flex flex-col h-full bg-[#252526] rounded-lg border border-slate-700 overflow-hidden ${className}`}>
            {/* Image Area */}
            <div className="relative flex-1 bg-[#1e1e1e] flex items-center justify-center p-4 min-h-[200px] group">
                {activeImage && !imgError ? (
                    <img
                        src={activeImage}
                        alt={name}
                        className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className="text-slate-600 flex flex-col items-center gap-2">
                        <Cpu size={48} />
                        <span className="text-xs">No Preview Available</span>
                    </div>
                )}

                {/* Toggle Button */}
                {canToggle && (
                    <button
                        onClick={() => setShowPinmap(!showPinmap)}
                        className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white text-xs px-2 py-1 rounded backdrop-blur-sm transition-colors flex items-center gap-1"
                    >
                        {showPinmap ? <Cpu size={12} /> : <Maximize2 size={12} />}
                        {showPinmap ? 'Show Board' : 'Show Pinmap'}
                    </button>
                )}
            </div>

            {/* Info Area */}
            <div className="p-4 space-y-3 bg-[#252526]">
                <div>
                    <h3 className="text-lg font-bold text-slate-100">{name}</h3>
                    {specs && (
                        <div className="flex items-center gap-2 text-xs text-blue-400 mt-1 font-mono">
                            <MemoryStick size={12} />
                            {specs}
                        </div>
                    )}
                </div>

                {description && (
                    <p className="text-sm text-slate-400 leading-relaxed line-clamp-3">
                        {description}
                    </p>
                )}

                {pageUrl && (
                    <a
                        href={pageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-400 transition-colors"
                    >
                        <Link size={12} />
                        Documentation
                    </a>
                )}
            </div>
        </div>
    );
};
