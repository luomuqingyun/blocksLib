import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useUI } from '../contexts/UIContext';

export const Toast: React.FC = () => {
    const { notification } = useUI();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (notification) {
            setVisible(true);
        } else {
            setVisible(false);
        }
    }, [notification]);

    if (!notification || !visible) return null;

    const bgColors = {
        info: 'bg-blue-600',
        error: 'bg-red-600',
        success: 'bg-emerald-600'
    };

    const icons = {
        info: <Info size={18} />,
        error: <AlertCircle size={18} />,
        success: <CheckCircle size={18} />
    };

    return (
        <div className={`fixed bottom-8 right-8 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white ${bgColors[notification.type]} animate-in slide-in-from-bottom-5 fade-in duration-300`}>
            {icons[notification.type]}
            <span className="text-sm font-medium">{notification.message}</span>
        </div>
    );
};
