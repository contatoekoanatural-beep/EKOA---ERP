import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

interface ToastContextType {
    toasts: Toast[];
    showToast: (type: ToastType, message: string, duration?: number) => void;
    removeToast: (id: string) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
    info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

// Toast Item Component
const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
    const icons = {
        success: <CheckCircle size={20} />,
        error: <XCircle size={20} />,
        warning: <AlertTriangle size={20} />,
        info: <Info size={20} />
    };

    const styles = {
        success: 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30',
        error: 'bg-red-600 text-white shadow-lg shadow-red-500/30',
        warning: 'bg-amber-500 text-white shadow-lg shadow-amber-500/30',
        info: 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
    };

    return (
        <div
            className={`flex items-center gap-3 px-5 py-4 rounded-2xl ${styles[toast.type]} animate-in slide-in-from-right-5 fade-in duration-300`}
            role="alert"
        >
            <div className="flex-shrink-0">
                {icons[toast.type]}
            </div>
            <p className="font-bold text-sm flex-1">{toast.message}</p>
            <button
                onClick={() => onRemove(toast.id)}
                className="flex-shrink-0 p-1 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Fechar"
            >
                <X size={16} />
            </button>
        </div>
    );
};

// Toast Container Component
const ToastContainer: React.FC<{ toasts: Toast[]; onRemove: (id: string) => void }> = ({ toasts, onRemove }) => {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 max-w-sm">
            {toasts.map(toast => (
                <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
            ))}
        </div>
    );
};

// Toast Provider Component
export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((type: ToastType, message: string, duration = 4000) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const newToast: Toast = { id, type, message, duration };

        setToasts(prev => [...prev, newToast]);

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, [removeToast]);

    const success = useCallback((message: string) => showToast('success', message), [showToast]);
    const error = useCallback((message: string) => showToast('error', message, 6000), [showToast]); // Errors stay longer
    const warning = useCallback((message: string) => showToast('warning', message, 5000), [showToast]);
    const info = useCallback((message: string) => showToast('info', message), [showToast]);

    return (
        <ToastContext.Provider value={{ toasts, showToast, removeToast, success, error, warning, info }}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
};
