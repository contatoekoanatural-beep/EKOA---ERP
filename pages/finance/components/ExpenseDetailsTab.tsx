import React, { useState } from 'react';
import { ArrowLeft, ArrowDownCircle, CreditCard, ChevronDown, Edit2, Trash2, Eye } from 'lucide-react';
import { formatCurrency, formatDate } from '../../../constants';
import { Transaction, CreditCard as CreditCardType } from '../../../types';
import { FinanceStats } from '../types';
import { FinanceTab } from '../constants';

interface ExpenseDetailsTabProps {
    currentMonthTransactions: Transaction[];
    cards: CreditCardType[];
    filterMonth: string;
    stats: FinanceStats;
    onSetActiveTab: (tab: FinanceTab) => void;
    onSetSelectedCardId: (id: string) => void;
    onOpenTransaction: (t: Transaction) => void;
    onDeleteTransaction: (t: Transaction) => void;
}

export const ExpenseDetailsTab: React.FC<ExpenseDetailsTabProps> = ({
    currentMonthTransactions,
    cards,
    filterMonth,
    stats,
    onSetActiveTab,
    onSetSelectedCardId,
    onOpenTransaction,
    onDeleteTransaction,
}) => {
    const [expandedCardGroups, setExpandedCardGroups] = useState<Set<string>>(new Set());

    // Separate card and non-card transactions
    const allExpenses = currentMonthTransactions
        .filter(t => t.type === 'expense')
        .sort((a, b) => a.date.localeCompare(b.date));
    const nonCardExpenses = allExpenses.filter(t => t.method !== 'cartao');
    const cardExpenses = allExpenses.filter(t => t.method === 'cartao');

    // Group card expenses by cardId
    const cardGroups: Record<string, { card: CreditCardType | undefined; transactions: Transaction[]; total: number }> = {};
    cardExpenses.forEach(t => {
        const cId = t.cardId || 'unknown';
        if (!cardGroups[cId]) {
            const card = cards.find(c => c.id === cId);
            cardGroups[cId] = { card, transactions: [], total: 0 };
        }
        cardGroups[cId].transactions.push(t);
        cardGroups[cId].total += t.amount;
    });

    const toggleCardExpand = (cardId: string) => {
        setExpandedCardGroups(prev => {
            const next = new Set(prev);
            if (next.has(cardId)) next.delete(cardId);
            else next.add(cardId);
            return next;
        });
    };

    const getMethodLabel = (method: string) => {
        switch (method) {
            case 'pix': return 'PIX';
            case 'boleto': return 'Boleto';
            case 'cartao': return 'Cartão';
            default: return method || 'Outro';
        }
    };

    const getNatureLabel = (nature: string) => {
        switch (nature) {
            case 'recorrente': return 'Recorrente';
            case 'parcela': return 'Parcela';
            default: return 'Avulso';
        }
    };

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
                        <div className="p-4 bg-red-600 text-white rounded-2xl shadow-xl shadow-red-500/20">
                            <ArrowDownCircle size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white">Detalhamento de Saídas</h3>
                            <p className="text-[10px] font-black text-[#808080] uppercase tracking-widest">
                                Referência: {filterMonth}
                            </p>
                        </div>
                    </div>
                    <div className="bg-[#2A2A2A] px-6 py-4 rounded-2xl border border-white/5">
                        <p className="text-[9px] font-black text-[#808080] uppercase mb-1">Total de Saídas</p>
                        <p className="text-2xl font-black text-red-500">{formatCurrency(stats.outgoings)}</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-xs font-bold uppercase text-[#606060] border-b border-white/10">
                                <th className="py-4 px-4">Data</th>
                                <th className="py-4 px-4">Descrição</th>
                                <th className="py-4 px-4">Categoria</th>
                                <th className="py-4 px-4 text-right">Valor</th>
                                <th className="py-4 px-4 text-center">Status</th>
                                <th className="py-4 px-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {/* Card Groups - Expandable */}
                            {Object.entries(cardGroups).map(([cardId, group]) => {
                                const isExpanded = expandedCardGroups.has(cardId);
                                const cardName = group.card?.name || 'Cartão';
                                const txCount = group.transactions.length;

                                return (
                                    <React.Fragment key={`card-group-${cardId}`}>
                                        {/* Card Summary Row */}
                                        <tr
                                            onClick={() => toggleCardExpand(cardId)}
                                            className="bg-purple-500/10 hover:bg-purple-500/15 cursor-pointer transition-colors"
                                        >
                                            <td className="py-5 px-4">
                                                <div className="flex items-center gap-3">
                                                    <ChevronDown
                                                        size={16}
                                                        className={`text-purple-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                    />
                                                    <span className="text-sm text-[#A0A0A0]">{filterMonth}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-4">
                                                <div className="flex items-center gap-3">
                                                    <CreditCard size={18} className="text-purple-400" />
                                                    <span className="font-bold text-purple-400">{cardName}</span>
                                                    <span className="text-xs bg-purple-500/30 text-purple-300 px-2 py-1 rounded-lg">
                                                        {txCount} itens
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-4 text-sm text-[#808080]">Fatura</td>
                                            <td className="py-5 px-4 text-right font-bold text-purple-400">
                                                {formatCurrency(group.total)}
                                            </td>
                                            <td className="py-5 px-4 text-center">
                                                <span className="text-xs font-semibold uppercase px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                                    Previsto
                                                </span>
                                            </td>
                                            <td className="py-5 px-4 text-center">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onSetSelectedCardId(cardId);
                                                        onSetActiveTab('CARD_DETAILS');
                                                    }}
                                                    className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 rounded-lg transition-colors"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            </td>
                                        </tr>

                                        {/* Expanded Card Transactions */}
                                        {isExpanded && group.transactions.map(t => (
                                            <tr key={t.id} className="hover:bg-[#252525] transition-colors group bg-purple-500/5">
                                                <td className="py-4 px-4 pl-12 text-sm text-[#808080]">{formatDate(t.date)}</td>
                                                <td className="py-4 px-4">
                                                    <span className="text-sm text-[#C0C0C0]">{t.description}</span>
                                                    <span className="ml-2 text-xs text-[#606060]">({getNatureLabel(t.nature || '')})</span>
                                                </td>
                                                <td className="py-4 px-4 text-sm text-[#808080]">{t.category || 'Outros'}</td>
                                                <td className="py-4 px-4 text-right font-bold text-red-400">{formatCurrency(t.amount)}</td>
                                                <td className="py-4 px-4 text-center">
                                                    <span className={`text-xs font-semibold uppercase px-3 py-1.5 rounded-lg ${t.status === 'pago'
                                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                                        }`}>
                                                        {t.status === 'pago' ? 'Pago' : 'Pendente'}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 text-center">
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
                                    </React.Fragment>
                                );
                            })}

                            {/* Non-Card Transactions */}
                            {nonCardExpenses.map(t => (
                                <tr key={t.id} className="hover:bg-[#252525] transition-colors group">
                                    <td className="py-5 px-4 text-sm text-[#A0A0A0]">{formatDate(t.date)}</td>
                                    <td className="py-5 px-4">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-white">{t.description}</span>
                                            <span className="text-xs text-[#606060]">
                                                {getMethodLabel(t.method || '')} • {getNatureLabel(t.nature || '')}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-4 text-sm text-[#808080]">{t.category || 'Outros'}</td>
                                    <td className="py-5 px-4 text-right font-bold text-red-400">{formatCurrency(t.amount)}</td>
                                    <td className="py-5 px-4 text-center">
                                        <span className={`text-xs font-semibold uppercase px-3 py-1.5 rounded-lg ${t.status === 'pago'
                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                            }`}>
                                            {t.status === 'pago' ? 'Pago' : 'Pendente'}
                                        </span>
                                    </td>
                                    <td className="py-5 px-4 text-center">
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

                            {allExpenses.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-[#606060] font-medium italic">
                                        Nenhuma saída registrada para este mês.
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
