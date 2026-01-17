import React from 'react';
import { ArrowLeft, ShoppingBag, Edit2, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../../../constants';
import { CreditCard, Transaction } from '../../../types';
import { FinanceTab, formatMonthDisplay } from '../constants';

interface CardDetailsTabProps {
    selectedCard: CreditCard;
    cardTransactions: Transaction[];
    filterMonth: string;
    showAllCardPending: boolean;
    onSetActiveTab: (tab: FinanceTab) => void;
    onOpenTransaction: (t: Transaction) => void;
    onDeleteTransaction: (t: Transaction) => void;
}

export const CardDetailsTab: React.FC<CardDetailsTabProps> = ({
    selectedCard,
    cardTransactions,
    filterMonth,
    showAllCardPending,
    onSetActiveTab,
    onOpenTransaction,
    onDeleteTransaction,
}) => {
    const total = cardTransactions.reduce((acc, t) => acc + t.amount, 0);

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <button
                    onClick={() => onSetActiveTab('CARDS')}
                    className="flex items-center gap-2 text-[#808080] hover:text-brand-500 font-black text-[10px] uppercase tracking-widest"
                >
                    <ArrowLeft size={16} /> Voltar para Cartões
                </button>
            </div>

            <div className="bg-[#1F1F1F] p-8 rounded-2xl border border-white/5">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-brand-600 text-white rounded-2xl shadow-xl shadow-brand-500/20">
                            <ShoppingBag size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white">
                                {showAllCardPending ? 'Auditoria de Saldo Devedor' : 'Lançamentos no Mês'}: {selectedCard.name}
                            </h3>
                            <p className="text-[10px] font-black text-[#808080] uppercase tracking-widest">
                                {showAllCardPending ? 'Exibindo cada centavo que bloqueia seu limite total' : `Referência: ${filterMonth}`}
                            </p>
                        </div>
                    </div>
                    <div className="bg-[#2A2A2A] px-6 py-4 rounded-2xl border border-white/5">
                        <p className="text-[9px] font-black text-[#808080] uppercase mb-1">
                            {showAllCardPending ? 'Dívida Acumulada Listada' : 'Total no Mês'}
                        </p>
                        <p className="text-2xl font-black text-brand-500">{formatCurrency(total)}</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] font-black uppercase text-[#808080] border-b border-white/5">
                                <th className="p-6">Mês Ref.</th>
                                <th className="p-6">Descrição</th>
                                <th className="p-6">Categoria</th>
                                <th className="p-6">Natureza</th>
                                <th className="p-6 text-right">Valor Parcela</th>
                                <th className="p-6 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {cardTransactions.map(t => (
                                <tr
                                    key={t.id}
                                    className={`hover:bg-[#2A2A2A] transition-colors group ${t.referenceMonth < filterMonth ? 'bg-red-500/5' : ''
                                        }`}
                                >
                                    <td className="p-6 text-xs font-black text-[#A0A0A0]">
                                        {t.referenceMonth}
                                        {t.referenceMonth < filterMonth && (
                                            <span className="ml-2 text-[8px] bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded font-black uppercase">
                                                Atrasado
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-6 font-black text-white text-sm">{t.description}</td>
                                    <td className="p-6">
                                        <span className="text-[8px] font-black uppercase px-2 py-1 rounded-full bg-[#2A2A2A] text-[#A0A0A0] border border-white/10">
                                            {t.category || 'Outros'}
                                        </span>
                                    </td>
                                    <td className="p-6">
                                        <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full border ${t.nature === 'recorrente'
                                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                            : t.nature === 'parcela'
                                                ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                                                : 'bg-[#2A2A2A] text-[#808080] border-white/10'
                                            }`}>
                                            {t.nature === 'recorrente' ? 'Recorrente' : t.nature === 'parcela' ? 'Parcela' : 'Avulso'}
                                        </span>
                                    </td>
                                    <td className="p-6 text-right font-black text-brand-500">
                                        {formatCurrency(t.amount)}
                                    </td>
                                    <td className="p-6 text-center">
                                        <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => onOpenTransaction(t)}
                                                className="p-2 text-[#606060] hover:text-brand-500"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => onDeleteTransaction(t)}
                                                className="p-2 text-[#606060] hover:text-red-500"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {cardTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-20 text-center text-[#606060] font-bold italic">
                                        Nenhum lançamento pendente encontrado para este filtro.
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
