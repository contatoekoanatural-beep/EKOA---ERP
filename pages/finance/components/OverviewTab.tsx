import React from 'react';
import {
    ArrowUpCircle, ArrowDownCircle, Calculator, Landmark,
    AlertCircle, Clock, CreditCard, TrendingUp, Edit2
} from 'lucide-react';
import { StatCard } from './StatCard';
import { formatCurrency } from '../../../constants';
import { FinanceStats, CardUsage } from '../types';
import { Ledger, OpeningBalance } from '../../../types';
import { FinanceTab } from '../constants';

interface OverviewTabProps {
    stats: FinanceStats;
    isConsolidated: boolean;
    baseCashBalance: OpeningBalance | null;
    filteredCards: any[];
    getCardUsage: (cardId: string) => number;
    onSetActiveTab: (tab: FinanceTab) => void;
    onEditOpeningBalance?: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
    stats,
    isConsolidated,
    baseCashBalance,
    filteredCards,
    getCardUsage,
    onSetActiveTab,
    onEditOpeningBalance
}) => {
    // Find most critical card (highest usage %)
    const cardUsages: CardUsage[] = filteredCards.map(c => {
        const usage = getCardUsage(c.id);
        return { card: c, usage, percentage: c.limit ? (usage / c.limit) * 100 : 0 };
    }).sort((a, b) => b.percentage - a.percentage);
    const criticalCard = cardUsages[0];

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Main Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">

                {/* NEW: Caixa Atual (Realized) - Highlighted */}
                <div className={`p-6 rounded-2xl border bg-gradient-to-br ${stats.cashBalance >= 0
                    ? 'from-emerald-900/30 to-teal-900/20 border-emerald-500/20'
                    : 'from-red-900/30 to-red-900/20 border-red-500/20'} flex flex-col justify-between h-full transition-all`}>
                    <div>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${stats.cashBalance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            Caixa Atual
                        </p>
                        <h3 className={`text-2xl font-black mt-1 ${stats.cashBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency(stats.cashBalance)}
                        </h3>
                        <p className={`text-[10px] font-bold mt-1 ${stats.cashBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            Saldo Realizado
                        </p>
                    </div>
                    <div className={`${stats.cashBalance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        <Landmark size={20} />
                    </div>
                </div>

                {/* MODIFIED: Opening Balance - Editable */}
                <div onClick={onEditOpeningBalance} className="p-6 rounded-2xl border bg-[#2A2A2A] border-white/5 flex flex-col justify-between h-full transition-all cursor-pointer hover:border-white/20 group">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors">
                                Saldo Início
                            </p>
                            <h3 className="text-2xl font-black mt-1 text-white">
                                {formatCurrency(baseCashBalance?.amount || 0)}
                            </h3>
                            <p className="text-[10px] font-bold mt-1 text-gray-500 group-hover:text-gray-300">
                                Clique para ajustar
                            </p>
                        </div>
                        <Edit2 size={16} className="text-gray-500 group-hover:text-white" />
                    </div>
                </div>

                <StatCard
                    title="Entradas Previstas"
                    value={formatCurrency(stats.incomings)}
                    icon={ArrowUpCircle}
                    colorClass="bg-emerald-500/20 text-emerald-500"
                    onClick={() => onSetActiveTab('INCOME_DETAILS')}
                />

                <StatCard
                    title="Saídas Previstas"
                    value={formatCurrency(stats.outgoings)}
                    icon={ArrowDownCircle}
                    colorClass="bg-red-500/20 text-red-500"
                    onClick={() => onSetActiveTab('EXPENSE_DETAILS')}
                />

                <StatCard
                    title="Saldo Projetado"
                    value={formatCurrency(stats.balance)}
                    highlight={true}
                    icon={Calculator}
                    colorClass=""
                />

                <StatCard
                    title="Dívida Total Aberta"
                    value={formatCurrency(stats.totalOpenDebt)}
                    subtext={`Parcela mensal: ${formatCurrency(stats.monthlyDebtInstallments)}`}
                    icon={Landmark}
                    colorClass="bg-indigo-500/20 text-indigo-500"
                />
            </div>

            {/* Quick Actions Section */}
            <div className="bg-[#1F1F1F] rounded-2xl border border-white/5 p-6">
                <h3 className="font-black text-white uppercase text-[11px] tracking-widest mb-5">
                    Ações Rápidas
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Atrasados */}
                    <div
                        onClick={() => stats.atrasados.count > 0 && onSetActiveTab('FLOW')}
                        className={`p-5 rounded-xl border transition-all ${stats.atrasados.count > 0
                            ? 'bg-red-500/10 border-red-500/20 cursor-pointer hover:border-red-500/40'
                            : 'bg-[#2A2A2A] border-white/5'
                            }`}
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2 rounded-xl ${stats.atrasados.count > 0
                                ? 'bg-red-500/20 text-red-500'
                                : 'bg-[#333] text-[#606060]'
                                }`}>
                                <AlertCircle size={20} />
                            </div>
                            <span className="font-black text-white text-sm">Atrasados</span>
                        </div>
                        <p className={`text-2xl font-black ${stats.atrasados.count > 0 ? 'text-red-500' : 'text-[#606060]'
                            }`}>
                            {stats.atrasados.count} {stats.atrasados.count === 1 ? 'item' : 'itens'}
                        </p>
                        {stats.atrasados.count > 0 && (
                            <p className="text-xs font-black text-red-400 mt-1">
                                {formatCurrency(stats.atrasados.total)}
                            </p>
                        )}
                    </div>

                    {/* Vence em 7 dias */}
                    <div
                        onClick={() => stats.venceEm7Dias.count > 0 && onSetActiveTab('FLOW')}
                        className={`p-5 rounded-xl border transition-all ${stats.venceEm7Dias.count > 0
                            ? 'bg-amber-500/10 border-amber-500/20 cursor-pointer hover:border-amber-500/40'
                            : 'bg-[#2A2A2A] border-white/5'
                            }`}
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2 rounded-xl ${stats.venceEm7Dias.count > 0
                                ? 'bg-amber-500/20 text-amber-500'
                                : 'bg-[#333] text-[#606060]'
                                }`}>
                                <Clock size={20} />
                            </div>
                            <span className="font-black text-white text-sm">Vence em 7 dias</span>
                        </div>
                        <p className={`text-2xl font-black ${stats.venceEm7Dias.count > 0 ? 'text-amber-500' : 'text-[#606060]'
                            }`}>
                            {stats.venceEm7Dias.count} {stats.venceEm7Dias.count === 1 ? 'item' : 'itens'}
                        </p>
                        {stats.venceEm7Dias.count > 0 && (
                            <p className="text-xs font-black text-amber-400 mt-1">
                                {formatCurrency(stats.venceEm7Dias.total)}
                            </p>
                        )}
                    </div>

                    {/* Cartão Crítico */}
                    <div
                        onClick={() => criticalCard && onSetActiveTab('CARDS')}
                        className={`p-5 rounded-xl border transition-all ${criticalCard && criticalCard.percentage > 70
                            ? 'bg-purple-500/10 border-purple-500/20 cursor-pointer hover:border-purple-500/40'
                            : 'bg-[#2A2A2A] border-white/5'
                            }`}
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2 rounded-xl ${criticalCard && criticalCard.percentage > 70
                                ? 'bg-purple-500/20 text-purple-500'
                                : 'bg-[#333] text-[#606060]'
                                }`}>
                                <CreditCard size={20} />
                            </div>
                            <span className="font-black text-white text-sm">Cartão Crítico</span>
                        </div>
                        {criticalCard ? (
                            <>
                                <p className={`text-lg font-black ${criticalCard.percentage > 70 ? 'text-purple-400' : 'text-white'
                                    }`}>
                                    {criticalCard.card.name}
                                </p>
                                <p className="text-xs font-black text-[#808080] mt-1">
                                    {criticalCard.percentage.toFixed(0)}% do limite
                                </p>
                            </>
                        ) : (
                            <p className="text-[#606060] text-sm">Nenhum cartão</p>
                        )}
                    </div>

                    {/* Top Categorias */}
                    <div className="p-5 rounded-xl border bg-[#2A2A2A] border-white/5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-xl bg-[#333] text-[#808080]">
                                <TrendingUp size={20} />
                            </div>
                            <span className="font-black text-white text-sm">Top Gastos</span>
                        </div>
                        <div className="space-y-2">
                            {stats.topCategories.length > 0 ? stats.topCategories.map(([cat, amount], i) => (
                                <div key={cat} className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-[#808080]">{i + 1}. {cat}</span>
                                    <span className="text-xs font-black text-white">{formatCurrency(amount)}</span>
                                </div>
                            )) : (
                                <p className="text-xs text-[#606060]">Sem gastos</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
