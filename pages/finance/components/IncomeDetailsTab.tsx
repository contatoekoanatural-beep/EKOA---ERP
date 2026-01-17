import React from 'react';
import { ArrowLeft, ArrowUpCircle, Edit2, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../../../constants';
import { Transaction } from '../../../types';
import { FinanceStats } from '../types';
import { FinanceTab } from '../constants';

interface IncomeDetailsTabProps {
    currentMonthTransactions: Transaction[];
    filterMonth: string;
    stats: FinanceStats;
    onSetActiveTab: (tab: FinanceTab) => void;
    onOpenTransaction: (t: Transaction) => void;
    onDeleteTransaction: (t: Transaction) => void;
}

export const IncomeDetailsTab: React.FC<IncomeDetailsTabProps> = ({
    currentMonthTransactions,
    filterMonth,
    stats,
    onSetActiveTab,
    onOpenTransaction,
    onDeleteTransaction,
}) => {
    const incomeTransactions = currentMonthTransactions
        .filter(t => t.type === 'income')
        .sort((a, b) => a.date.localeCompare(b.date));

    const totalFees = currentMonthTransactions
        .filter(t => t.type === 'expense' && t.category?.toLowerCase().includes('taxas'))
        .reduce((sum, t) => sum + t.amount, 0);

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <button
                    onClick={() => onSetActiveTab('OVERVIEW')}
                    className="flex items-center gap-2 text-[#808080] hover:text-brand-500 font-black text-[10px] uppercase tracking-widest"
                >
                    <ArrowLeft size={16} /> Voltar para Visão Geral
                </button>
            </div>

            <div className="bg-[#1F1F1F] p-8 rounded-2xl border border-white/5">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-500/20">
                            <ArrowUpCircle size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white">Detalhamento de Entradas</h3>
                            <p className="text-[10px] font-black text-[#808080] uppercase tracking-widest">
                                Referência: {filterMonth}
                            </p>
                        </div>
                    </div>
                    <div className="bg-[#2A2A2A] px-6 py-4 rounded-2xl border border-white/5">
                        <p className="text-[9px] font-black text-[#808080] uppercase mb-1">Total de Entradas</p>
                        <p className="text-2xl font-black text-emerald-500">{formatCurrency(stats.incomings)}</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[11px] font-black uppercase text-[#808080] border-b border-white/5">
                                <th className="p-4">Data</th>
                                <th className="p-4">Descrição</th>
                                <th className="p-4">Categoria</th>
                                <th className="p-4 text-right">Valor</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {incomeTransactions.map(t => (
                                <tr key={t.id} className="hover:bg-[#2A2A2A] transition-colors group">
                                    <td className="p-4 text-sm font-medium text-[#A0A0A0]">{formatDate(t.date)}</td>
                                    <td className="p-4 font-bold text-white text-sm">{t.description}</td>
                                    <td className="p-4">
                                        <span className="text-[10px] font-bold uppercase px-3 py-1.5 rounded-full bg-[#2A2A2A] text-[#A0A0A0] border border-white/10">
                                            {t.category || 'Geral'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right font-bold text-emerald-500 text-sm">{formatCurrency(t.amount)}</td>
                                    <td className="p-4 text-center">
                                        <span className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-full border ${t.status === 'pago'
                                            ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
                                            : 'bg-amber-500/20 text-amber-500 border-amber-500/30'
                                            }`}>
                                            {t.status === 'pago' ? 'Recebido' : 'Pendente'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => onOpenTransaction(t)}
                                                className="p-2 text-[#606060] hover:text-brand-500 hover:bg-white/5 rounded-lg transition-colors"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => onDeleteTransaction(t)}
                                                className="p-2 text-[#606060] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {incomeTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-20 text-center text-[#606060] font-bold italic">
                                        Nenhuma entrada registrada para este mês.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
