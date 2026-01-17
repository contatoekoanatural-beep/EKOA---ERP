import React from 'react';
import { Landmark, Edit2, Trash2, User, Building2 } from 'lucide-react';
import { formatCurrency } from '../../../constants';
import { DebtContract, Ledger } from '../../../types';

interface DebtsTabProps {
    filteredDebtContracts: DebtContract[];
    ledgers: Ledger[];
    onOpenDebtModal: (debt: DebtContract) => void;
    onDeleteDebtContract: (id: string) => Promise<void>;
    onHandleDebtLedgerChange: (debt: DebtContract, newLedgerId: string) => void;
}

export const DebtsTab: React.FC<DebtsTabProps> = ({
    filteredDebtContracts,
    ledgers,
    onOpenDebtModal,
    onDeleteDebtContract,
    onHandleDebtLedgerChange,
}) => {
    if (filteredDebtContracts.length === 0) {
        return (
            <div className="animate-in slide-in-from-bottom-2 duration-300">
                <div className="bg-[#1F1F1F] p-20 rounded-2xl border border-white/5 text-center">
                    <p className="text-[#606060] font-bold italic">
                        Nenhuma dívida cadastrada para este escopo. Crie uma dívida ou classifique uma existente.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDebtContracts.map(debt => {
                    const pct = debt.totalInstallments > 0
                        ? ((debt.totalInstallments - debt.installmentsRemaining) / debt.totalInstallments) * 100
                        : 0;

                    return (
                        <div key={debt.id} className="bg-[#1F1F1F] p-6 rounded-2xl border border-white/5 group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-red-500/20 text-red-500 rounded-xl">
                                        <Landmark size={20} />
                                    </div>
                                    <div>
                                        <p className="font-black text-white">{debt.creditor}</p>
                                        <p className="text-[9px] font-black text-[#808080] uppercase truncate max-w-[120px]">
                                            {debt.description}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => onOpenDebtModal(debt)}
                                        className="p-2 text-[#606060] hover:text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button
                                        onClick={() => onDeleteDebtContract(debt.id)}
                                        className="p-2 text-[#606060] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Classificador PF/PJ */}
                            <div className="flex gap-2 mb-4">
                                {ledgers.map(l => (
                                    <button
                                        key={l.id}
                                        onClick={() => onHandleDebtLedgerChange(debt, l.id)}
                                        className={`flex-1 py-2 rounded-xl text-[8px] font-black uppercase flex items-center justify-center gap-1 transition-all border-2 ${debt.ledgerId === l.id
                                            ? l.type === 'PF'
                                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                                : 'bg-emerald-600 border-emerald-500 text-white'
                                            : 'bg-[#2A2A2A] border-white/10 text-[#808080] hover:bg-[#333]'
                                            }`}
                                    >
                                        {l.type === 'PF' ? <User size={10} /> : <Building2 size={10} />}
                                        {l.type}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[9px] font-black text-[#808080] uppercase">Saldo Devedor</p>
                                        <p className="text-lg font-black text-red-500">
                                            {formatCurrency(debt.totalDebtRemaining)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black text-[#808080] uppercase">Parcela</p>
                                        <p className="text-sm font-black text-white">
                                            {formatCurrency(debt.installmentAmount)}
                                        </p>
                                    </div>
                                </div>
                                <div className="w-full bg-[#2A2A2A] h-1.5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-red-500 transition-all"
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[9px] font-black uppercase text-[#808080]">
                                    <span>Original: {formatCurrency(debt.totalLoanValue)}</span>
                                    <span>{debt.installmentsRemaining} parc. rest.</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
