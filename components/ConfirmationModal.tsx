import React from 'react';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info' | 'success';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'danger'
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (variant) {
            case 'danger': return <AlertTriangle size={48} className="text-red-500" />;
            case 'warning': return <AlertTriangle size={48} className="text-amber-500" />;
            case 'info': return <Info size={48} className="text-blue-500" />;
            case 'success': return <CheckCircle size={48} className="text-emerald-500" />;
        }
    };

    const getButtonColor = () => {
        switch (variant) {
            case 'danger': return 'bg-red-600 hover:bg-red-700 shadow-red-500/20';
            case 'warning': return 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20';
            case 'info': return 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20';
            case 'success': return 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20';
        }
    };

    const getIconBg = () => {
        switch (variant) {
            case 'danger': return 'bg-red-50';
            case 'warning': return 'bg-amber-50';
            case 'info': return 'bg-blue-50';
            case 'success': return 'bg-emerald-50';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#1F1F1F] rounded-[40px] p-10 w-full max-w-md shadow-2xl animate-in zoom-in duration-200 text-center border border-white/5">
                <div className={`p-5 ${getIconBg()} rounded-full mb-6 inline-block bg-opacity-10`}>
                    {getIcon()}
                </div>

                <h3 className="text-2xl font-black text-white mb-2">
                    {title}
                </h3>

                <p className="text-[#A0A0A0] font-bold text-sm mb-8 leading-relaxed">
                    {description}
                </p>

                <div className="flex gap-3 w-full">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-[#252525] text-[#808080] py-4 rounded-2xl font-black text-[11px] uppercase hover:bg-[#303030] hover:text-white transition-all border border-white/5"
                    >
                        {cancelText}
                    </button>

                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 text-white py-4 rounded-2xl font-black text-[11px] uppercase shadow-lg transition-all ${getButtonColor()}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
