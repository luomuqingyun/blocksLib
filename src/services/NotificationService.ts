/**
 * ============================================================
 * 全局通知服务 (Global Notification Service)
 * ============================================================
 */

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
    id: string;
    type: NotificationType;
    message: string;
    duration?: number;
}

class NotificationService {
    private listeners: ((notifications: Notification[]) => void)[] = [];
    private notifications: Notification[] = [];

    public subscribe(listener: (notifications: Notification[]) => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify() {
        this.listeners.forEach(l => l([...this.notifications]));
    }

    public show(message: string, type: NotificationType = 'info', duration: number = 5000) {
        const id = Math.random().toString(36).substring(7);
        const notification: Notification = { id, type, message, duration };
        this.notifications.push(notification);
        this.notify();

        if (duration > 0) {
            setTimeout(() => {
                this.remove(id);
            }, duration);
        }
    }

    public remove(id: string) {
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.notify();
    }
}

export const notificationService = new NotificationService();
