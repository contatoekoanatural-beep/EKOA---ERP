import React from 'react';
import { X } from 'lucide-react';
import { OpeningBalance, Ledger } from '../../../types';
import { formatCurrency } from '../../../constants';
import { formatMonthDisplay } from '../constants';

interface CashBalanceModalProps {
    isOpen: boolean;
    baseCashBalance: OpeningBalance | null;
    selectedLedger: Ledger | undefined;
    filterMonth: string;
    editValue: number;
    onClose: () => void;
    onSave: (balance: OpeningBalance) => Promise<void>;
    onEditValueChange: (value: number) => void;
}

export const CashBalanceModal: React.FC<CashBalanceModalProps> = ({
    isOpen,
    baseCashBalance,
    selectedLedger,
    filterMonth,
    editValue,
    onClose,
    onSave,
    onEditValueChange,
}) => {
    if (!isOpen || !baseCashBalance) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave({
            ...baseCashBalance,
            amount: editValue,
            baseMonth: filterMonth // Save the current month as the starting point for calculations
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#1F1F1F] rounded-2xl p-8 max-w-md w-full shadow-2xl border border-white/10 animate-in slide-in-from-bottom-4 duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-white">Editar Caixa Base</h3>
                    <button
                        onClick={onClose}
                        className="text-[#808080] hover:text-white p-2 hover:bg-[#2A2A2A] rounded-xl transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="text-[10px] font-black uppercase text-[#808080] mb-2 block tracking-widest">
                            Escopo
                        </label>
                        <p className="text-lg font-black text-white">
                            {selectedLedger?.type || 'N/A'} - {selectedLedger?.name || ''}
                        </p>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-[#808080] mb-2 block tracking-widest">
                            Mês de Referência
                        </label>
                        <p className="text-lg font-black text-white">
                            {formatMonthDisplay(filterMonth)}
                        </p>
                        <p className="text-[10px] text-[#606060] mt-1">
                            O cálculo em cadeia iniciará a partir deste mês
                        </p>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-[#808080] mb-2 block tracking-widest">
                            Valor em Caixa (R$)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            className="w-full bg-[#2A2A2A] border-2 border-white/10 rounded-xl p-4 font-black text-xl text-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                            value={editValue}
                            onChange={e => onEditValueChange(parseFloat(e.target.value) || 0)}
                            autoFocus
                        />
                    </div>

                    <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/20">
                        <p className="text-[11px] font-bold text-amber-400">
                            💡 Este valor será o caixa inicial de {formatMonthDisplay(filterMonth)}. Os meses seguintes calcularão automaticamente com base no saldo projetado.
                        </p>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-brand-600 text-white py-5 rounded-xl font-black shadow-xl shadow-brand-500/30 uppercase text-[11px] tracking-widest hover:bg-brand-700 transition-all"
                    >
                        Salvar Caixa
                    </button>
                </form>
            </div>
        </div>
    );
};
