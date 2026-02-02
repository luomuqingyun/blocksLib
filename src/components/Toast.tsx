/**
 * ============================================================
 * 全局通知提示组件 (Toast Notification Component)
 * ============================================================
 * 
 * 显示应用程序的全局通知消息，支持三种类型：
 * - info: 蓝色信息提示
 * - error: 红色错误提示
 * - success: 绿色成功提示
 * 
 * 功能:
 * - 自动从 UIContext 读取当前通知状态
 * - 底部右侧固定位置显示
 * - 带有入场动画效果
 * 
 * @file src/components/Toast.tsx
 * @module EmbedBlocks/Frontend/Components/Toast
 */

import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useUI } from '../contexts/UIContext';

/**
 * 全局通知提示组件
 * 从 UIContext 获取通知状态并渲染相应样式的提示框
 */
export const Toast: React.FC = () => {
    // 从 UI 上下文获取当前通知
    const { notification } = useUI();
    // 控制通知的可见性 (用于动画)
    const [visible, setVisible] = useState(false);

    // 当 notification 变化时更新可见性
    useEffect(() => {
        if (notification) {
            setVisible(true);  // 有通知时显示
        } else {
            setVisible(false); // 无通知时隐藏
        }
    }, [notification]);

    // 无通知或不可见时不渲染
    if (!notification || !visible) return null;

    // 根据通知类型定义背景颜色
    const bgColors = {
        info: 'bg-blue-600',
        error: 'bg-red-600',
        success: 'bg-emerald-600'
    };

    // 根据通知类型定义图标
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
