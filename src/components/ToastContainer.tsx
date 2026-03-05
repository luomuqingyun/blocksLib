import React, { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { notificationService, Notification } from '../services/NotificationService';

export const ToastContainer: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        return notificationService.subscribe(setNotifications);
    }, []);

    if (notifications.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
            {notifications.map((n) => (
                <div
                    key={n.id}
                    className={`
                        min-w-[300px] p-4 rounded-lg shadow-2xl border flex items-start gap-3 
                        pointer-events-auto animate-in slide-in-from-right fade-in duration-300
                        ${n.type === 'error' ? 'bg-red-950/90 border-red-500 text-red-200' : ''}
                        ${n.type === 'warning' ? 'bg-amber-950/90 border-amber-500 text-amber-200' : ''}
                        ${n.type === 'success' ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200' : ''}
                        ${n.type === 'info' ? 'bg-slate-900/90 border-slate-700 text-slate-200' : ''}
                    `}
                >
                    <div className="mt-0.5">
                        {n.type === 'error' && <AlertCircle size={18} />}
                        {n.type === 'warning' && <AlertTriangle size={18} />}
                        {n.type === 'success' && <CheckCircle size={18} />}
                        {n.type === 'info' && <Info size={18} />}
                    </div>
                    <div className="flex-1 text-sm font-medium">
                        {n.message}
                    </div>
                    <button
                        onClick={() => notificationService.remove(n.id)}
                        className="opacity-50 hover:opacity-100 transition-opacity"
                    >
                        <X size={16} />
                    </button>
                </div>
            ))}
        </div>
    );
};
