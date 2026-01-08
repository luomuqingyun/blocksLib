import React, { useState } from 'react';

interface WorkspaceLayoutProps {
    leftPanel: React.ReactNode;
    rightPanel: React.ReactNode;

    // Right Panel Width State (Lifted up if needed, or managed locally if only layout cares)
    // App.tsx currently manages it, so we'll accept it as props to keep App.tsx in control for now, 
    // or we can move it here if App doesn't need to know the width.
    // App passes width to RightPanel, so App knows it.
    rightPanelWidth: number;
    setRightPanelWidth: (width: number) => void;
}

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
    leftPanel,
    rightPanel,
    rightPanelWidth,
    setRightPanelWidth
}) => {
    const [isDragging, setIsDragging] = useState(false);

    const startResizing = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopResizing);
    };

    const handleMouseMove = (e: MouseEvent) => {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth > 200 && newWidth < window.innerWidth - 200) {
            setRightPanelWidth(newWidth);
        }
    };

    const stopResizing = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', stopResizing);
    };

    return (
        <div className="flex-1 flex overflow-hidden">
            {/* Left Panel (Flexible) */}
            <div className="flex-1 relative">
                {leftPanel}
            </div>

            {/* Resize Handle */}
            <div
                className={`w-1 cursor-col-resize hover:bg-blue-500 transition-colors z-20 flex items-center justify-center ${isDragging ? 'bg-blue-600' : 'bg-slate-300'}`}
                onMouseDown={startResizing}
            >
                <div className="h-8 w-0.5 bg-slate-400 rounded-full"></div>
            </div>

            {/* Right Panel (Fixed Width) */}
            {rightPanel}
        </div>
    );
};
