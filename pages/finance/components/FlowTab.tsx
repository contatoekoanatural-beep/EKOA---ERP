import React from 'react';
import {
    ArrowUpCircle, ArrowDownCircle, CreditCard,
    Edit2, Trash2, Eye, Filter
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../../constants';
import { FlowEntry } from '../types';
import { FlowStatusFilter, FinanceTab } from '../constants';
import { Transaction, DebtContract } from '../../../types';

interface FlowTabProps {
    flowEntries: FlowEntry[];
    today: string;
    flowStatusFilter: FlowStatusFilter;
    transactions: Transaction[];
    debtContracts: DebtContract[];
    onSetFlowStatusFilter: (filter: FlowStatusFilter) => void;
    onToggleStatus: (entry: FlowEntry) => Promise<void>;
    onOpenTransaction: (t: any) => void;
    onDeleteTransaction: (t: Transaction) => void;
    onSetActiveTab: (tab: FinanceTab) => void;
    onSetSelectedCardId: (id: string) => void;
}

export const FlowTab: React.FC<FlowTabProps> = ({
    flowEntries,
    today,
    flowStatusFilter,
    transactions,
    debtContracts,
    onSetFlowStatusFilter,
    onToggleStatus,
    onOpenTransaction,
    onDeleteTransaction,
    onSetActiveTab,
    onSetSelectedCardId,
}) => {
    const getStatusLabel = (status: string) => {
        if (status === 'pago') return 'PAGO';
        if (status === 'atrasado') return 'ATRASADO';
        if (status === 'previsto') return 'EM ABERTO';
        if (status === 'cancelado') return 'CANCELADO';
        return status;
    };

    return (
        <div className="bg-[#1F1F1F] rounded-2xl border border-white/5 overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
            <div className="p-6 border-b border-white/5 bg-[#1A1A1A] flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h3 className="font-black text-white uppercase text-[11px] tracking-widest">
                        Fluxo Mensal
                    </h3>
                    <div className="relative group">
                        <select
                            value={flowStatusFilter}
                            onChange={(e) => onSetFlowStatusFilter(e.target.value as FlowStatusFilter)}
                            className="bg-[#2A2A2A] border border-white/10 text-[#E5E5E5] text-[10px] uppercase font-black rounded-lg py-1 px-3 pr-8 focus:outline-none focus:border-white/30 appearance-none cursor-pointer hover:bg-[#333]"
                        >
                            <option value="ALL">Todos</option>
                            <option value="previsto">Previsto</option>
                            <option value="pago">Pago</option>
                            <option value="atrasado">Atrasado</option>
                        </select>
                        <Filter size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#808080] pointer-events-none" />
                    </div>
                </div>
                <span className="text-[10px] font-black text-[#808080] uppercase">
                    Clique no status para alternar
                </span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-[10px] font-black uppercase text-[#808080] border-b border-white/5">
                            <th className="p-4">Data</th>
                            <th className="p-4">Descrição</th>
                            <th className="p-4 text-right">Valor</th>
                            <th className="p-4 text-center">Categoria</th>
                            <th className="p-4 text-center">Status</th>
                            <th className="p-4 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {flowEntries.map(entry => {
                            // Determine display status (auto ATRASADO for past due items)
                            const isOverdue = entry.date < today && (entry.status === 'previsto' || entry.status === 'atrasado');
                            const displayStatus = isOverdue ? 'atrasado' : entry.status;

                            return (
                                <tr key={entry.id} className="hover:bg-[#2A2A2A] group">
                                    <td className="p-4 text-xs font-black text-[#A0A0A0]">
                                        {formatDate(entry.date)}
                                    </td>
                                    <td className="p-4 flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${entry.isGroup
                                            ? 'bg-purple-500/20 text-purple-400'
                                            : entry.type === 'income'
                                                ? 'bg-emerald-500/20 text-emerald-500'
                                                : 'bg-red-500/20 text-red-500'
                                            }`}>
                                            {entry.isGroup
                                                ? <CreditCard size={14} />
                                                : entry.type === 'income'
                                                    ? <ArrowUpCircle size={14} />
                                                    : <ArrowDownCircle size={14} />}
                                        </div>
                                        <span className={`font-black text-sm ${entry.isGroup ? 'text-purple-400' : 'text-white'
                                            }`}>
                                            {entry.description}
                                        </span>
                                        {entry.isGroup && (
                                            <span className="text-[8px] font-black text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full">
                                                {entry.transactionIds?.length || 0} itens
                                            </span>
                                        )}
                                    </td>
                                    <td className={`p-4 text-right font-black ${entry.isGroup
                                        ? 'text-purple-400'
                                        : entry.type === 'income'
                                            ? 'text-emerald-500'
                                            : 'text-red-500'
                                        }`}>
                                        {formatCurrency(entry.amount)}
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border ${entry.isGroup
                                            ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                                            : 'bg-[#2A2A2A] text-[#A0A0A0] border-white/10'
                                            }`}>
                                            {entry.isGroup ? 'FATURA' : entry.category || 'Outros'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button
                                            onClick={() => onToggleStatus(entry)}
                                            className={`text-[8px] font-black uppercase px-3 py-1 rounded-full border cursor-pointer transition-all hover:scale-105 ${displayStatus === 'pago'
                                                ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/30'
                                                : displayStatus === 'atrasado'
                                                    ? 'bg-red-500/20 text-red-500 border-red-500/30 hover:bg-red-500/30'
                                                    : displayStatus === 'cancelado'
                                                        ? 'bg-[#333] text-[#606060] border-white/10 line-through'
                                                        : 'bg-amber-500/20 text-amber-500 border-amber-500/30 hover:bg-amber-500/30'
                                                }`}
                                        >
                                            {getStatusLabel(displayStatus)}
                                        </button>
                                    </td>
                                    <td className="p-4 text-center">
                                        {entry.isGroup ? (
                                            <button
                                                onClick={() => {
                                                    onSetSelectedCardId(entry.cardId!);
                                                    onSetActiveTab('CARD_DETAILS');
                                                }}
                                                className="p-2 text-purple-400 hover:text-purple-300 transition-colors"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        ) : (
                                            <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => onOpenTransaction(entry)}
                                                    className="p-2 text-[#606060] hover:text-brand-500"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => onDeleteTransaction(entry as Transaction)}
                                                    className="p-2 text-[#606060] hover:text-red-500"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {flowEntries.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-20 text-center text-[#606060] font-bold italic">
                                    Nenhum lançamento encontrado para este período.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
