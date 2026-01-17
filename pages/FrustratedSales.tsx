import React, { useContext, useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOperations } from '../contexts/OperationsContext';

import { FrustrationReason, Sale } from '../types';
import { ArrowLeft, Plus, Trash2, Edit2, AlertCircle, PieChart, TrendingDown, Calendar, ChevronDown, Filter } from 'lucide-react';
import { formatCurrency, formatDate, getCurrentLocalDate, getLast30DaysDate } from '../constants';

type PeriodOption = 'hoje' | '7d_passado' | '7d_futuro' | '30d_passado' | '30d_futuro' | 'este_mes' | 'mes_passado' | 'personalizado' | 'tudo';

export const FrustratedSales = () => {
    const { sales, frustrationReasons, addFrustrationReason, updateFrustrationReason, deleteFrustrationReason, users } = useOperations();

    const navigate = useNavigate();

    // --- STATE ---
    const [newReason, setNewReason] = useState('');
    const [editingReason, setEditingReason] = useState<FrustrationReason | null>(null);
    const [isManagingReasons, setIsManagingReasons] = useState(false);

    // --- DATE FILTER STATE ---
    const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('30d_passado');
    const [dateFrom, setDateFrom] = useState<string>(getLast30DaysDate());
    const [dateTo, setDateTo] = useState<string>(getCurrentLocalDate());

    // Update dates based on selection
    useEffect(() => {
        const today = new Date();
        const format = (d: Date) => d.toISOString().split('T')[0];

        switch (selectedPeriod) {
            case 'hoje':
                setDateFrom(format(today));
                setDateTo(format(today));
                break;
            case '7d_passado': {
                const start = new Date();
                start.setDate(today.getDate() - 6);
                setDateFrom(format(start));
                setDateTo(format(today));
                break;
            }
            case '7d_futuro': {
                const end = new Date();
                end.setDate(today.getDate() + 6);
                setDateFrom(format(today));
                setDateTo(format(end));
                break;
            }
            case '30d_passado': {
                const start = new Date();
                start.setDate(today.getDate() - 29);
                setDateFrom(format(start));
                setDateTo(format(today));
                break;
            }
            case '30d_futuro': {
                const end = new Date();
                end.setDate(today.getDate() + 29);
                setDateFrom(format(today));
                setDateTo(format(end));
                break;
            }
            case 'este_mes': {
                const start = new Date(today.getFullYear(), today.getMonth(), 1);
                const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                setDateFrom(format(start));
                setDateTo(format(end));
                break;
            }
            case 'mes_passado': {
                const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const end = new Date(today.getFullYear(), today.getMonth(), 0);
                setDateFrom(format(start));
                setDateTo(format(end));
                break;
            }
            case 'tudo':
                setDateFrom('');
                setDateTo('');
                break;
        }
    }, [selectedPeriod]);

    // --- DERIVED DATA ---
    const frustratedSales = useMemo(() => {
        return sales
            .filter(s => {
                if (s.status !== 'FRUSTRADO') return false;

                // Date Filter
                if (dateFrom || dateTo) {
                    const dateToCompare = s.scheduledDate || '';
                    if (!dateToCompare) return false;

                    if (dateFrom && dateToCompare < dateFrom) return false;
                    if (dateTo && dateToCompare > dateTo) return false;
                }
                return true;
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [sales, dateFrom, dateTo]);

    const stats = useMemo(() => {
        const totalCount = frustratedSales.length;
        const totalValue = frustratedSales.reduce((acc, curr) => acc + curr.value, 0);

        // Group by reason
        const byReason: Record<string, number> = {};
        frustratedSales.forEach(s => {
            const reasonId = s.frustrationReasonId || 'unknown';
            byReason[reasonId] = (byReason[reasonId] || 0) + 1;
        });

        const reasonStats = Object.entries(byReason).map(([id, count]) => {
            const reason = frustrationReasons.find(r => r.id === id);
            return {
                id,
                name: reason ? reason.name : 'Não especificado',
                count,
                percentage: totalCount > 0 ? (count / totalCount) * 100 : 0
            };
        }).sort((a, b) => b.count - a.count);

        return { totalCount, totalValue, reasonStats };
    }, [frustratedSales, frustrationReasons]);

    // --- HANDLERS ---
    const handleAddReason = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newReason.trim()) return;
        await addFrustrationReason({ name: newReason });
        setNewReason('');
    };

    const handleUpdateReason = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingReason || !editingReason.name.trim()) return;
        await updateFrustrationReason(editingReason);
        setEditingReason(null);
    };

    const handleDeleteReason = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este motivo?')) {
            await deleteFrustrationReason(id);
        }
    };

    return (
        <div className="bg-[#141414] min-h-full rounded-[30px] p-8 -m-8 md:-m-8 md:p-10 space-y-8 border border-[#222] animate-in fade-in duration-300">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/vendas', { state: { status: 'FRUSTRADO' } })}
                        className="p-2 hover:bg-white/5 rounded-lg text-[#808080] transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-white">Gestão de Frustrações</h1>
                        <p className="text-sm font-medium text-[#808080]">Análise e controle de vendas não convertidas</p>
                    </div>
                </div>

                {/* FILTER BAR */}
                <div className="flex items-center gap-3 bg-[#1F1F1F] p-2 rounded-xl border border-white/5 shadow-sm">
                    <div className="relative">
                        <div className="absolute -top-2.5 left-2 bg-[#1F1F1F] px-1 text-[9px] font-black uppercase text-[#808080] z-10">
                            Período (Previsto)
                        </div>
                        <select
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value as PeriodOption)}
                            className="appearance-none bg-[#1F1F1F] border border-white/10 rounded-lg pl-4 pr-10 py-2 text-xs font-black uppercase tracking-widest text-[#E5E5E5] shadow-sm focus:outline-none focus:border-white/30 cursor-pointer min-w-[150px] hover:bg-[#252525] transition-colors"
                        >
                            <option value="hoje">Hoje</option>
                            <option value="7d_passado">Últimos 7 dias</option>
                            <option value="7d_futuro">Próximos 7 dias</option>
                            <option value="30d_passado">Últimos 30 dias</option>
                            <option value="30d_futuro">Próximos 30 dias</option>
                            <option value="este_mes">Este mês</option>
                            <option value="mes_passado">Mês passado</option>
                            <option value="tudo">Ver Tudo</option>
                            <option value="personalizado">Personalizado</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#808080]">
                            <ChevronDown size={14} />
                        </div>
                    </div>

                    {selectedPeriod === 'personalizado' && (
                        <div className="flex items-center gap-2 bg-[#252525] border border-white/10 rounded-lg p-1.5 animate-in fade-in slide-in-from-right-2 duration-200">
                            <Calendar size={16} className="text-[#808080] ml-1" />
                            <input
                                type="date"
                                className="text-[11px] font-bold border-none focus:ring-0 text-white bg-transparent outline-none cursor-pointer p-0 w-24 [color-scheme:dark]"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                            />
                            <span className="text-[#606060] text-[9px] font-bold">até</span>
                            <input
                                type="date"
                                className="text-[11px] font-bold border-none focus:ring-0 text-white bg-transparent outline-none cursor-pointer p-0 w-24 [color-scheme:dark]"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* DASHBOARD CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#1F1F1F] p-6 rounded-2xl shadow-sm border border-white/5 flex items-center gap-4">
                    <div className="p-4 bg-red-500/10 text-red-500 rounded-xl">
                        <AlertCircle size={32} />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase text-[#808080] tracking-widest">Total de Frustrações</p>
                        <p className="text-3xl font-black text-white">{stats.totalCount}</p>
                    </div>
                </div>

                <div className="bg-[#1F1F1F] p-6 rounded-2xl shadow-sm border border-white/5 flex items-center gap-4">
                    <div className="p-4 bg-orange-500/10 text-orange-500 rounded-xl">
                        <TrendingDown size={32} />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase text-[#808080] tracking-widest">Valor Perdido</p>
                        <p className="text-3xl font-black text-white">{formatCurrency(stats.totalValue)}</p>
                    </div>
                </div>

                <div className="bg-[#1F1F1F] p-6 rounded-2xl shadow-sm border border-white/5 flex items-center gap-4">
                    <div className="p-4 bg-blue-500/10 text-blue-500 rounded-xl">
                        <PieChart size={32} />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase text-[#808080] tracking-widest">Principal Motivo</p>
                        <p className="text-xl font-black text-white truncate max-w-[200px]" title={stats.reasonStats[0]?.name || '-'}>
                            {stats.reasonStats[0]?.name || '-'}
                        </p>
                        <p className="text-xs font-bold text-[#808080]">
                            {stats.reasonStats[0]?.count || 0} ocorrências ({stats.reasonStats[0]?.percentage.toFixed(1)}%)
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* REASONS CONFIGURATION */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-[#1F1F1F] p-6 rounded-2xl shadow-sm border border-white/5 h-full">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-white text-lg">Motivos de Frustração</h3>
                        </div>

                        <form onSubmit={handleAddReason} className="mb-6">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Novo motivo..."
                                    className="flex-1 bg-[#252525] border border-white/5 rounded-xl px-4 py-2 text-sm font-bold focus:border-[#5D7F38] outline-none transition-all text-white placeholder:text-[#606060]"
                                    value={newReason}
                                    onChange={e => setNewReason(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    disabled={!newReason.trim()}
                                    className="bg-[#5D7F38] text-white p-2.5 rounded-xl hover:bg-[#4a662c] disabled:opacity-50 transition-colors"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>
                        </form>

                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {frustrationReasons.map(reason => (
                                <div key={reason.id} className="group flex items-center justify-between p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all">
                                    {editingReason?.id === reason.id ? (
                                        <form onSubmit={handleUpdateReason} className="flex-1 flex gap-2">
                                            <input
                                                className="flex-1 bg-[#252525] border border-[#5D7F38]/50 rounded-lg px-2 py-1 text-sm font-bold outline-none text-white"
                                                value={editingReason.name}
                                                onChange={e => setEditingReason({ ...editingReason, name: e.target.value })}
                                                autoFocus
                                            />
                                            <button type="submit" className="text-[#5D7F38] hover:text-[#4a662c]"><Plus size={18} /></button>
                                        </form>
                                    ) : (
                                        <>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white">{reason.name}</span>
                                                <span className="text-[10px] font-bold text-[#808080]">
                                                    {stats.reasonStats.find(r => r.id === reason.id)?.percentage.toFixed(1)}% das frustrações
                                                </span>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => setEditingReason(reason)}
                                                    className="p-1.5 text-[#808080] hover:text-[#5D7F38] hover:bg-[#5D7F38]/10 rounded-lg transition-colors"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteReason(reason.id)}
                                                    className="p-1.5 text-[#808080] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                            {frustrationReasons.length === 0 && (
                                <p className="text-center text-[#808080] font-medium text-sm py-4">Nenhum motivo cadastrado.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* FRUSTRATED SALES LIST */}
                <div className="lg:col-span-2">
                    <div className="bg-[#1F1F1F] rounded-2xl shadow-sm border border-white/5 overflow-hidden">
                        <div className="p-6 border-b border-white/5">
                            <h3 className="font-black text-white text-lg">Vendas Frustradas Recentes</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-[#252525] border-b border-white/5">
                                    <tr>
                                        <th className="p-4 font-black uppercase text-[10px] text-[#808080] tracking-widest">Cliente</th>
                                        <th className="p-4 font-black uppercase text-[10px] text-[#808080] tracking-widest">Motivo</th>
                                        <th className="p-4 font-black uppercase text-[10px] text-[#808080] tracking-widest">Valor</th>
                                        <th className="p-4 font-black uppercase text-[10px] text-[#808080] tracking-widest">Data</th>
                                        <th className="p-4 font-black uppercase text-[10px] text-[#808080] tracking-widest">Atendente</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {frustratedSales.map((sale) => (
                                        <tr key={sale.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="p-4">
                                                <div className="font-bold text-white">{sale.customerName}</div>
                                                <div className="text-[10px] font-black text-[#808080]">{sale.customerPhone}</div>
                                            </td>
                                            <td className="p-4">
                                                {sale.frustrationReasonId ? (
                                                    <span className="bg-red-500/10 text-red-400 px-2 py-1 rounded-lg text-xs font-bold border border-red-500/20">
                                                        {frustrationReasons.find(r => r.id === sale.frustrationReasonId)?.name || 'Desconhecido'}
                                                    </span>
                                                ) : (
                                                    <span className="text-[#808080] text-xs italic">Não informado</span>
                                                )}
                                            </td>
                                            <td className="p-4 font-black text-white">{formatCurrency(sale.value)}</td>
                                            <td className="p-4 text-xs font-bold text-[#808080]">
                                                {formatDate(sale.scheduledDate || '')}
                                            </td>
                                            <td className="p-4 text-[11px] font-bold text-[#808080]">
                                                {users.find(u => u.id === sale.agentId)?.name || 'N/A'}
                                            </td>
                                        </tr>
                                    ))}
                                    {frustratedSales.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-12 text-center text-[#808080] font-bold italic">Nenhuma venda frustrada registrada.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
