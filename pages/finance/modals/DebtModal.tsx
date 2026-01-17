import React from 'react';
import { X } from 'lucide-react';
import { DebtContract, Ledger, Transaction } from '../../../types';
import { formatCurrency } from '../../../constants';

interface DebtModalProps {
    isOpen: boolean;
    editingItem: DebtContract | null;
    ledgers: Ledger[];
    transactions: Transaction[];
    onClose: () => void;
    onSave: (debt: DebtContract) => Promise<void>;
    onUpdateTransaction: (t: Transaction) => Promise<void>;
    onEditingItemChange: (item: any) => void;
}

export const DebtModal: React.FC<DebtModalProps> = ({
    isOpen,
    editingItem,
    ledgers,
    transactions,
    onClose,
    onSave,
    onUpdateTransaction,
    onEditingItemChange,
}) => {
    if (!isOpen || !editingItem) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const oldInstallmentAmount = editingItem.installmentAmount || 0;
        const newInstallmentAmount = parseFloat(String(editingItem.installmentAmount)) || 0;

        // Update the debt contract
        await onSave(editingItem);

        // If installment amount changed, propagate to all related transactions
        if (oldInstallmentAmount !== newInstallmentAmount) {
            const relatedTxs = transactions.filter(t => t.contractId === editingItem.id);
            for (const tx of relatedTxs) {
                await onUpdateTransaction({ ...tx, amount: newInstallmentAmount });
            }
        }

        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-[#1F1F1F] rounded-2xl p-10 w-full max-w-lg shadow-2xl border border-white/10 animate-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-black text-white">Editar Dívida</h3>
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
                            Credor
                        </label>
                        <input
                            required
                            className="w-full bg-[#2A2A2A] border-2 border-white/10 rounded-xl p-4 font-black text-white focus:border-brand-500 focus:outline-none transition-colors"
                            value={editingItem.creditor || ''}
                            onChange={e => onEditingItemChange({ ...editingItem, creditor: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-[#808080] mb-2 block tracking-widest">
                            Descrição
                        </label>
                        <input
                            className="w-full bg-[#2A2A2A] border-2 border-white/10 rounded-xl p-4 font-black text-white focus:border-brand-500 focus:outline-none transition-colors"
                            value={editingItem.description || ''}
                            onChange={e => onEditingItemChange({ ...editingItem, description: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-[#808080] mb-2 block tracking-widest">
                                Valor da Parcela
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                className="w-full bg-[#2A2A2A] border-2 border-white/10 rounded-xl p-4 font-black text-white focus:border-brand-500 focus:outline-none transition-colors"
                                value={editingItem.installmentAmount || 0}
                                onChange={e => {
                                    const newVal = parseFloat(e.target.value) || 0;
                                    const remaining = editingItem.installmentsRemaining || 0;
                                    onEditingItemChange({
                                        ...editingItem,
                                        installmentAmount: newVal,
                                        totalDebtRemaining: newVal * remaining
                                    });
                                }}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-[#808080] mb-2 block tracking-widest">
                                Parcelas Restantes
                            </label>
                            <input
                                type="number"
                                step="1"
                                required
                                className="w-full bg-[#2A2A2A] border-2 border-white/10 rounded-xl p-4 font-black text-white focus:border-brand-500 focus:outline-none transition-colors"
                                value={editingItem.installmentsRemaining || 0}
                                onChange={e => {
                                    const newVal = parseInt(e.target.value) || 0;
                                    const installment = editingItem.installmentAmount || 0;
                                    onEditingItemChange({
                                        ...editingItem,
                                        installmentsRemaining: newVal,
                                        totalDebtRemaining: installment * newVal
                                    });
                                }}
                            />
                        </div>
                    </div>

                    {/* Auto-calculated Saldo Devedor display */}
                    <div className="bg-[#2A2A2A] p-4 rounded-xl border-2 border-white/10">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-black uppercase text-[#808080]">Saldo Devedor (calculado)</p>
                                <p className="text-xl font-black text-red-500">
                                    {formatCurrency(editingItem.totalDebtRemaining || 0)}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-bold text-[#606060]">
                                    {editingItem.installmentsRemaining || 0} × {formatCurrency(editingItem.installmentAmount || 0)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-[#808080] mb-2 block tracking-widest">
                            Dia de Vencimento
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="31"
                            required
                            className="w-full bg-[#2A2A2A] border-2 border-white/10 rounded-xl p-4 font-black text-white focus:border-brand-500 focus:outline-none transition-colors"
                            value={editingItem.dueDay || 1}
                            onChange={e => onEditingItemChange({ ...editingItem, dueDay: parseInt(e.target.value) || 1 })}
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-brand-600 text-white py-5 rounded-xl font-black shadow-xl shadow-brand-500/30 uppercase text-[11px] tracking-widest mt-4 hover:bg-brand-700 transition-all"
                    >
                        Salvar Dívida
                    </button>
                </form>
            </div>
        </div>
    );
};
