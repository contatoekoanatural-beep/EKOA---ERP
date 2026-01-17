import React from 'react';
import {
    Clock, ArrowUpCircle, ArrowDownCircle, Edit2, Trash2
} from 'lucide-react';
import { formatCurrency } from '../../../constants';
import { RecurrenceMasterItem } from '../types';

interface RecurrencesTabProps {
    recurrenceMasterList: RecurrenceMasterItem[];
    filterMonth: string;
    onOpenTransaction: (item: any) => void;
    onDeleteTransaction: (item: any) => void;
}

export const RecurrencesTab: React.FC<RecurrencesTabProps> = ({
    recurrenceMasterList,
    filterMonth,
    onOpenTransaction,
    onDeleteTransaction,
}) => {
    // Calculate recurrence stats
    const recurrenceIncome = recurrenceMasterList
        .filter(r => r.type === 'income')
        .reduce((acc, r) => acc + r.amount, 0);
    const recurrenceExpense = recurrenceMasterList
        .filter(r => r.type === 'expense')
        .reduce((acc, r) => acc + r.amount, 0);
    const recurrenceBalance = recurrenceIncome - recurrenceExpense;

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
            {/* Summary Card */}
            <div className="bg-gradient-to-r from-[#1F1F1F] to-[#2A2A2A] p-6 rounded-2xl shadow-xl border border-white/5">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#808080]">
                            Saldo Mensal Recorrente
                        </p>
                        <p className={`text-3xl font-black mt-1 ${recurrenceBalance >= 0 ? 'text-emerald-500' : 'text-red-500'
                            }`}>
                            {formatCurrency(recurrenceBalance)}
                        </p>
                        <div className="flex gap-6 mt-2">
                            <p className="text-[9px] font-bold text-emerald-400">
                                <ArrowUpCircle size={12} className="inline mr-1" />
                                Receitas: {formatCurrency(recurrenceIncome)}
                            </p>
                            <p className="text-[9px] font-bold text-red-400">
                                <ArrowDownCircle size={12} className="inline mr-1" />
                                Despesas: {formatCurrency(recurrenceExpense)}
                            </p>
                        </div>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl">
                        <Clock size={32} className="text-[#808080]" />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-[#1F1F1F] rounded-2xl border border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-[#1A1A1A] flex justify-between items-center">
                    <h3 className="font-black text-white uppercase text-[11px] tracking-widest">
                        Contas Fixas / Recorrências
                    </h3>
                    <p className="text-[10px] font-black text-[#808080] uppercase">
                        Referência: {filterMonth}
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] font-black uppercase text-[#808080] border-b border-white/5">
                                <th className="p-6">Conta Fixa</th>
                                <th className="p-6 text-center">Tipo</th>
                                <th className="p-6 text-right">Valor Padrão</th>
                                <th className="p-6 text-center">Categoria</th>
                                <th className="p-6 text-center">Método</th>
                                <th className="p-6 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {recurrenceMasterList.map(item => (
                                <tr key={item.description} className="hover:bg-[#2A2A2A] group">
                                    <td className="p-6 font-black text-white text-sm flex items-center gap-3">
                                        <Clock size={14} className="text-brand-500" /> {item.description}
                                    </td>
                                    <td className="p-6 text-center">
                                        <span className={`inline-flex items-center gap-1 text-[8px] font-black uppercase px-3 py-1 rounded-full border ${item.type === 'income'
                                            ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
                                            : 'bg-red-500/20 text-red-500 border-red-500/30'
                                            }`}>
                                            {item.type === 'income' ? <ArrowUpCircle size={10} /> : <ArrowDownCircle size={10} />}
                                            {item.type === 'income' ? 'Receita' : 'Despesa'}
                                        </span>
                                    </td>
                                    <td className={`p-6 text-right font-black ${item.type === 'income' ? 'text-emerald-500' : 'text-red-500'
                                        }`}>
                                        {formatCurrency(item.amount)}
                                    </td>
                                    <td className="p-6 text-center">
                                        <span className="text-[8px] font-black uppercase px-3 py-1 rounded-full bg-[#2A2A2A] text-[#A0A0A0] border border-white/10">
                                            {item.category || 'Outros'}
                                        </span>
                                    </td>
                                    <td className="p-6 text-center">
                                        <span className={`text-[8px] font-black uppercase px-3 py-1 rounded-full border ${item.method === 'cartao'
                                            ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                                            : item.method === 'pix'
                                                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                                                : 'bg-[#2A2A2A] text-[#808080] border-white/10'
                                            }`}>
                                            {item.method === 'cartao' ? 'Cartão' : item.method === 'pix' ? 'PIX' : item.method === 'boleto' ? 'Boleto' : item.method || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="p-6 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button
                                                onClick={() => onOpenTransaction(
                                                    item.currentMonthStatus !== 'Não Lançado'
                                                        ? item
                                                        : { ...item, id: null, referenceMonth: filterMonth }
                                                )}
                                                className="p-2 text-[#606060] hover:text-brand-500"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => onDeleteTransaction(item)}
                                                className="p-2 text-[#606060] hover:text-red-500"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {recurrenceMasterList.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-20 text-center text-[#606060] font-bold italic">
                                        Nenhuma recorrência cadastrada. Crie um lançamento com natureza "Recorrente" para ele aparecer aqui.
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
