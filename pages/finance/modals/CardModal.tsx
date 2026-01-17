import React from 'react';
import { X } from 'lucide-react';
import { CreditCard } from '../../../types';

interface CardModalProps {
    isOpen: boolean;
    editingItem: Partial<CreditCard> | null;
    onClose: () => void;
    onSave: (card: any) => Promise<void>;
    onEditingItemChange: (item: any) => void;
}

export const CardModal: React.FC<CardModalProps> = ({
    isOpen,
    editingItem,
    onClose,
    onSave,
    onEditingItemChange,
}) => {
    if (!isOpen || !editingItem) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave(editingItem);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-[#1F1F1F] rounded-2xl p-10 w-full max-w-lg shadow-2xl border border-white/10 animate-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-black text-white">
                        {editingItem.id ? 'Editar Cartão' : 'Novo Cartão'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="bg-[#2A2A2A] p-2 rounded-xl text-[#808080] hover:text-red-500 transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="text-[10px] font-black uppercase text-[#808080] mb-2 block tracking-widest">
                            Nome
                        </label>
                        <input
                            required
                            className="w-full bg-[#2A2A2A] border-2 border-white/10 rounded-xl p-4 font-black text-white focus:border-brand-500 focus:outline-none transition-colors"
                            value={editingItem.name || ''}
                            onChange={e => onEditingItemChange({ ...editingItem, name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-[#808080] mb-2 block tracking-widest">
                                Fechamento
                            </label>
                            <input
                                type="number"
                                required
                                min={1}
                                max={31}
                                className="w-full bg-[#2A2A2A] border-2 border-white/10 rounded-xl p-4 font-black text-white focus:border-brand-500 focus:outline-none transition-colors"
                                value={editingItem.closingDay || ''}
                                onChange={e => onEditingItemChange({ ...editingItem, closingDay: parseInt(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-[#808080] mb-2 block tracking-widest">
                                Vencimento
                            </label>
                            <input
                                type="number"
                                required
                                min={1}
                                max={31}
                                className="w-full bg-[#2A2A2A] border-2 border-white/10 rounded-xl p-4 font-black text-white focus:border-brand-500 focus:outline-none transition-colors"
                                value={editingItem.dueDay || ''}
                                onChange={e => onEditingItemChange({ ...editingItem, dueDay: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-[#808080] mb-2 block tracking-widest">
                            Limite Total
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            className="w-full bg-[#2A2A2A] border-2 border-white/10 rounded-xl p-4 font-black text-white focus:border-brand-500 focus:outline-none transition-colors"
                            value={editingItem.limit || ''}
                            onChange={e => onEditingItemChange({ ...editingItem, limit: parseFloat(e.target.value) })}
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-brand-600 text-white py-5 rounded-xl font-black shadow-xl shadow-brand-500/30 uppercase text-[11px] tracking-widest mt-4 hover:bg-brand-700 transition-all"
                    >
                        Salvar Cartão
                    </button>
                </form>
            </div>
        </div>
    );
};
