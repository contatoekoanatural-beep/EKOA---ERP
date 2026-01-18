
import React, { useContext, useState, useEffect, useMemo, useRef } from 'react';
import { useMarketing } from '../contexts/MarketingContext';
import { useOperations } from '../contexts/OperationsContext';
import { useAuth } from '../contexts/AuthContext';

import { formatCurrency, getCurrentLocalDate, getLast30DaysDate } from '../constants';
import { Plus, Edit2, Check, X, Trash2, Folder, Layers, Image as ImageIcon, ChevronRight, Filter, Target, ArrowRight, Trophy, Calendar, ChevronDown, Globe, MousePointer2, Eye, Play, Pause, Archive } from 'lucide-react';
import { DailyMetric, Campaign, AdSet, Creative } from '../types';

interface EditableItemProps {
    initialValue: string;
    onSave: (val: string) => void;
    onDelete: () => void;
    isSelected?: boolean;
    onClick?: () => void;
}

const EditableItem: React.FC<EditableItemProps> = ({ initialValue, onSave, onDelete, isSelected, onClick }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(initialValue);

    useEffect(() => setValue(initialValue), [initialValue]);

    const handleSave = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (value.trim() && value !== initialValue) onSave(value);
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="flex items-center gap-1 mb-2 p-2 bg-[#252525] border border-[#5D7F38] rounded-xl shadow-sm animate-in fade-in zoom-in duration-150">
                <input
                    autoFocus
                    className="flex-1 border-none bg-transparent px-1 py-1 text-sm outline-none font-bold text-[#5D7F38]"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onBlur={() => handleSave()}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                />
                <button onClick={() => handleSave()} className="text-emerald-500 p-1 hover:bg-emerald-500/10 rounded-lg"><Check size={16} /></button>
            </div>
        );
    }

    return (
        <div
            onClick={onClick}
            className={`flex items-center justify-between group mb-2 p-4 rounded-2xl border cursor-pointer transition-all relative ${isSelected ? 'bg-[#5D7F38] border-[#5D7F38] shadow-lg translate-x-1' : 'bg-[#1F1F1F] border-white/5 hover:border-[#5D7F38]/30 hover:bg-[#252525]'}`}
        >
            <div className="flex-1 flex items-center gap-3 overflow-hidden">
                <span className={`text-sm font-black truncate ${isSelected ? 'text-white' : 'text-[#E5E5E5]'}`}>{value}</span>
            </div>
            <div className={`flex items-center gap-1 transition-all ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className={`p-1.5 rounded-lg ${isSelected ? 'text-white/70 hover:text-white hover:bg-white/10' : 'text-[#808080] hover:text-[#5D7F38] hover:bg-[#5D7F38]/10'}`}><Edit2 size={12} /></button>
                <button onClick={(e) => { e.stopPropagation(); if (window.confirm("Deseja excluir este item permanentemente?")) onDelete(); }} className={`p-1.5 rounded-lg ${isSelected ? 'text-white/70 hover:text-white hover:bg-white/10' : 'text-[#808080] hover:text-red-500 hover:bg-red-500/10'}`}><Trash2 size={12} /></button>
            </div>
        </div>
    );
};

type PeriodOption = 'hoje' | '7d_passado' | '7d_futuro' | '30d_passado' | '30d_futuro' | 'este_mes' | 'mes_passado' | 'personalizado' | 'tudo';

export const Marketing = () => {
    const {
        campaigns, adSets, creatives, dailyMetrics,
        addCampaign, updateCampaign, deleteCampaign,
        addAdSet, updateAdSet, deleteAdSet,
        addCreative, updateCreative, deleteCreative,
        addMetric, updateMetric, deleteMetric
    } = useMarketing();

    // We need 'products' to link campaigns to products? Or sales? 
    // Marketing page usually uses campaigns only. 
    // Checking previous imports: yes, it used AppContext which had everything. 
    // Let's check usage. 
    // If it uses products, add useOperations.
    const { products, sales } = useOperations();


    const [activeTab, setActiveTab] = useState<'PERFORMANCE' | 'STRUCTURE'>('STRUCTURE');
    const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

    const [selectedAdSetId, setSelectedAdSetId] = useState<string | null>(null);

    // Tree View Expansion State
    const [expandedCampaigns, setExpandedCampaigns] = useState<string[]>([]);
    const [expandedAdSets, setExpandedAdSets] = useState<string[]>([]);

    const toggleCampaign = (id: string) => {
        setExpandedCampaigns(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleAdSet = (id: string) => {
        setExpandedAdSets(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    // State for Inactive Campaigns Card
    const [showInactiveCampaigns, setShowInactiveCampaigns] = useState(false);

    // Campaign Sorting: 'Ativa' vs others
    const activeCampaigns = useMemo(() => campaigns.filter(c => c.status === 'Ativa' || !c.status), [campaigns]);
    const inactiveCampaigns = useMemo(() => campaigns.filter(c => c.status === 'Pausada' || c.status === 'Desativada'), [campaigns]);

    // Handle Status Change
    const handleStatusChange = (campaign: Campaign, newStatus: 'Ativa' | 'Pausada' | 'Desativada') => {
        updateCampaign({ ...campaign, status: newStatus });
    };


    // Filtros de Métricas
    const [metricCampaignFilter, setMetricCampaignFilter] = useState<string>('');
    const [metricCreativesFilter, setMetricCreativesFilter] = useState<string[]>([]);
    const [isCreativeDropdownOpen, setIsCreativeDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Filter de Data para Métricas
    const [metricsPeriod, setMetricsPeriod] = useState<PeriodOption>('este_mes');
    const [metricsDateFrom, setMetricsDateFrom] = useState<string>('');
    const [metricsDateTo, setMetricsDateTo] = useState<string>('');

    // Atualização de datas baseada no período para Métricas
    useEffect(() => {
        const today = new Date();
        const formatDate = (d: Date) => d.toISOString().split('T')[0];

        switch (metricsPeriod) {
            case 'hoje':
                setMetricsDateFrom(formatDate(today));
                setMetricsDateTo(formatDate(today));
                break;
            case '7d_passado': {
                const start = new Date();
                start.setDate(today.getDate() - 6);
                setMetricsDateFrom(formatDate(start));
                setMetricsDateTo(formatDate(today));
                break;
            }
            case '7d_futuro': {
                const end = new Date();
                end.setDate(today.getDate() + 6);
                setMetricsDateFrom(formatDate(today));
                setMetricsDateTo(formatDate(end));
                break;
            }
            case '30d_passado': {
                const start = new Date();
                start.setDate(today.getDate() - 29);
                setMetricsDateFrom(formatDate(start));
                setMetricsDateTo(formatDate(today));
                break;
            }
            case 'este_mes': {
                const start = new Date(today.getFullYear(), today.getMonth(), 1);
                const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                setMetricsDateFrom(formatDate(start));
                setMetricsDateTo(formatDate(end));
                break;
            }
            case 'mes_passado': {
                const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const end = new Date(today.getFullYear(), today.getMonth(), 0);
                setMetricsDateFrom(formatDate(start));
                setMetricsDateTo(formatDate(end));
                break;
            }
            case 'tudo':
                setMetricsDateFrom('');
                setMetricsDateTo('');
                break;
            case 'personalizado':
                // Mantém as datas atuais para o usuário editar
                break;
        }
    }, [metricsPeriod]);

    // Períodos para o Ranking
    const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('30d_passado');
    const [dateFrom, setDateFrom] = useState<string>(getLast30DaysDate());
    const [dateTo, setDateTo] = useState<string>(getCurrentLocalDate());
    const [rankingMode, setRankingMode] = useState<'CREATIVE' | 'CAMPAIGN'>('CREATIVE');
    const [performanceView, setPerformanceView] = useState<'RANKING' | 'DIARIO'>('RANKING');

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsCreativeDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Atualização de datas baseada no período
    useEffect(() => {
        const today = new Date();
        const formatDate = (d: Date) => d.toISOString().split('T')[0];

        switch (selectedPeriod) {
            case 'hoje':
                setDateFrom(formatDate(today)); setDateTo(formatDate(today)); break;
            case '7d_passado': {
                const start = new Date(); start.setDate(today.getDate() - 6);
                setDateFrom(formatDate(start)); setDateTo(formatDate(today)); break;
            }
            case '30d_passado': {
                const start = new Date(); start.setDate(today.getDate() - 29);
                setDateFrom(formatDate(start)); setDateTo(formatDate(today)); break;
            }
            case 'este_mes': {
                const start = new Date(today.getFullYear(), today.getMonth(), 1);
                const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                setDateFrom(formatDate(start)); setDateTo(formatDate(end)); break;
            }
            case 'mes_passado': {
                const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const end = new Date(today.getFullYear(), today.getMonth(), 0);
                setDateFrom(formatDate(start)); setDateTo(formatDate(end)); break;
            }
            case 'tudo': setDateFrom(''); setDateTo(''); break;
        }
    }, [selectedPeriod]);

    const isWithinRange = (dateStr?: string | null) => {
        if (!metricsDateFrom && !metricsDateTo) return true;
        if (!dateStr) return false;
        const d = dateStr.split('T')[0];
        const start = metricsDateFrom || '0000-01-01';
        const end = metricsDateTo || '9999-12-31';
        return d >= start && d <= end;
    };

    // Ranking de Criativos
    const creativeRanking = useMemo(() => {
        const stats: Record<string, { id: string, name: string, investment: number, revenue: number, leads: number, qualifiedLeads: number }> = {};
        const filteredMetrics = dailyMetrics.filter(m => isWithinRange(m.date));
        filteredMetrics.forEach(m => {
            if (!stats[m.creativeId]) stats[m.creativeId] = { id: m.creativeId, name: creatives.find(c => c.id === m.creativeId)?.name || 'Desconhecido', investment: 0, revenue: 0, leads: 0, qualifiedLeads: 0 };
            stats[m.creativeId].investment += m.investment;
            stats[m.creativeId].leads += m.leads;
            stats[m.creativeId].qualifiedLeads += (m.qualifiedLeads || 0);
        });
        sales.forEach(s => {
            if (s.status === 'ENTREGUE' && isWithinRange(s.deliveryDate) && s.creativeId) {
                if (!stats[s.creativeId]) stats[s.creativeId] = { id: s.creativeId, name: creatives.find(c => c.id === s.creativeId)?.name || 'Desconhecido', investment: 0, revenue: 0, leads: 0, qualifiedLeads: 0 };
                stats[s.creativeId].revenue += s.value;
            }
        });
        return Object.values(stats).map(item => {
            let roi = 0;
            if (item.investment > 0) {
                roi = item.revenue / item.investment;
            } else if (item.revenue > 0) {
                roi = Infinity;
            }

            return {
                ...item,
                roi,
                profit: item.revenue - item.investment,
                cpl: item.leads > 0 ? item.investment / item.leads : 0
            };
        }).sort((a, b) => {
            if (a.roi === b.roi) return b.profit - a.profit; // Tie-break with profit
            return b.roi - a.roi;
        });
    }, [dailyMetrics, sales, creatives, metricsDateFrom, metricsDateTo]);

    // Ranking de Campanhas
    const campaignRanking = useMemo(() => {
        const stats: Record<string, { id: string, name: string, investment: number, revenue: number, leads: number, qualifiedLeads: number }> = {};
        const filteredMetrics = dailyMetrics.filter(m => isWithinRange(m.date));

        filteredMetrics.forEach(m => {
            if (!m.campaignId) return;
            if (!stats[m.campaignId]) stats[m.campaignId] = { id: m.campaignId, name: campaigns.find(c => c.id === m.campaignId)?.name || 'Desconhecida', investment: 0, revenue: 0, leads: 0, qualifiedLeads: 0 };
            stats[m.campaignId].investment += m.investment;
            stats[m.campaignId].leads += m.leads;
            stats[m.campaignId].qualifiedLeads += (m.qualifiedLeads || 0);
        });

        sales.forEach(s => {
            // Find campaign via creative -> adset -> campaign
            if (s.status === 'ENTREGUE' && isWithinRange(s.deliveryDate) && s.creativeId) {
                const creative = creatives.find(c => c.id === s.creativeId);
                const adSet = creative ? adSets.find(a => a.id === creative.adSetId) : null;
                const campaignId = adSet ? adSet.campaignId : null;

                if (campaignId) {
                    if (!stats[campaignId]) stats[campaignId] = { id: campaignId, name: campaigns.find(c => c.id === campaignId)?.name || 'Desconhecida', investment: 0, revenue: 0, leads: 0, qualifiedLeads: 0 };
                    stats[campaignId].revenue += s.value;
                }
            }
        });

        return Object.values(stats).map(item => {
            let roi = 0;
            if (item.investment > 0) {
                roi = item.revenue / item.investment;
            } else if (item.revenue > 0) {
                roi = Infinity;
            }

            return {
                ...item,
                roi,
                profit: item.revenue - item.investment,
                cpl: item.leads > 0 ? item.investment / item.leads : 0
            };
        }).sort((a, b) => {
            if (a.roi === b.roi) return b.profit - a.profit;
            return b.roi - a.roi;
        });
    }, [dailyMetrics, sales, creatives, adSets, campaigns, metricsDateFrom, metricsDateTo]);

    // Modais
    const [modalType, setModalType] = useState<'CAMPAIGN' | 'ADSET' | 'CREATIVE' | 'EDIT_CAMPAIGN' | 'EDIT_ADSET' | 'EDIT_CREATIVE' | null>(null);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [newItemName, setNewItemName] = useState('');
    const [isMetricModalOpen, setIsMetricModalOpen] = useState(false);
    const [editingMetric, setEditingMetric] = useState<DailyMetric | null>(null);
    const [metricForm, setMetricForm] = useState({
        date: new Date().toISOString().split('T')[0],
        campaignId: '',
        creativeData: {} as Record<string, { investment: number, impressions: number, clicks: number, leads: number, qualifiedLeads: number, adSetId: string }>
    });

    const handleOpenCreateModal = (type: 'CAMPAIGN' | 'ADSET' | 'CREATIVE') => {
        setNewItemName('');
        setEditingItemId(null);
        setModalType(type);
    };

    const handleOpenEditModal = (type: 'EDIT_CAMPAIGN' | 'EDIT_ADSET' | 'EDIT_CREATIVE', item: { id: string, name: string }) => {
        setNewItemName(item.name);
        setEditingItemId(item.id);
        setModalType(type);
    };

    const handleCreateOrUpdateItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemName.trim()) return;
        try {
            // CRIAÇÃO
            if (modalType === 'CAMPAIGN') {
                const id = await addCampaign({ name: newItemName, productId: 'p1' });
                setSelectedCampaignId(id);
            } else if (modalType === 'ADSET' && selectedCampaignId) {
                const id = await addAdSet({ name: newItemName, campaignId: selectedCampaignId });
                setSelectedAdSetId(id);
            } else if (modalType === 'CREATIVE' && selectedAdSetId) {
                await addCreative({ name: newItemName, adSetId: selectedAdSetId, format: 'Vídeo' });
            }
            // EDIÇÃO
            else if (modalType === 'EDIT_CAMPAIGN' && editingItemId) {
                const campaign = campaigns.find(c => c.id === editingItemId);
                if (campaign) updateCampaign({ ...campaign, name: newItemName });
            } else if (modalType === 'EDIT_ADSET' && editingItemId) {
                const adSet = adSets.find(a => a.id === editingItemId);
                if (adSet) updateAdSet({ ...adSet, name: newItemName });
            } else if (modalType === 'EDIT_CREATIVE' && editingItemId) {
                const creative = creatives.find(c => c.id === editingItemId);
                if (creative) updateCreative({ ...creative, name: newItemName });
            }

            setModalType(null);
            setEditingItemId(null);
        } catch (err) { console.error(err); }
    };

    const openMetricModal = (metric?: DailyMetric) => {
        if (metric) {
            setEditingMetric(metric);
            setMetricForm({
                date: metric.date,
                campaignId: metric.campaignId,
                creativeData: {
                    [metric.creativeId]: {
                        investment: metric.investment,
                        impressions: metric.impressions || 0,
                        clicks: metric.clicks || 0,
                        leads: metric.leads,
                        qualifiedLeads: metric.qualifiedLeads || 0,
                        adSetId: metric.adSetId
                    }
                }
            });
        } else {
            setEditingMetric(null);
            setMetricForm({
                date: new Date().toISOString().split('T')[0],
                campaignId: '',
                creativeData: {}
            });
        }
        setIsMetricModalOpen(true);
    };

    const handleSaveMetrics = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!metricForm.campaignId) return;

        // Explicitly casting Object.entries result to any[] to avoid 'unknown' type property access errors during iteration
        const entries = Object.entries(metricForm.creativeData) as [string, any][];
        for (const [cId, data] of entries) {
            if (data.investment > 0 || data.leads > 0) {
                const payload = {
                    date: metricForm.date,
                    campaignId: metricForm.campaignId,
                    adSetId: data.adSetId,
                    creativeId: cId,
                    investment: data.investment,
                    impressions: data.impressions,
                    clicks: data.clicks,
                    leads: data.leads,
                    qualifiedLeads: data.qualifiedLeads
                };
                if (editingMetric && cId === editingMetric.creativeId) {
                    await updateMetric({ ...editingMetric, ...payload } as DailyMetric);
                } else {
                    await addMetric(payload as any);
                }
            }
        }
        setIsMetricModalOpen(false);
    };

    // Lógica de Filtros Cascateados
    const creativesOfCampaign = useMemo(() => {
        if (!metricCampaignFilter) return [];
        const adsOfCampaign = adSets.filter(a => a.campaignId === metricCampaignFilter).map(a => a.id);
        return creatives.filter(c => adsOfCampaign.includes(c.adSetId));
    }, [metricCampaignFilter, adSets, creatives]);

    // Helper para checar se a data está no range de métricas
    const isMetricsWithinRange = (dateStr?: string | null) => {
        if (!metricsDateFrom && !metricsDateTo) return true;
        if (!dateStr) return false;
        const d = dateStr.split('T')[0];
        const start = metricsDateFrom || '0000-01-01';
        const end = metricsDateTo || '9999-12-31';
        return d >= start && d <= end;
    };

    const calculatedMetrics = dailyMetrics
        .filter(m => {
            const matchesCampaign = !metricCampaignFilter || m.campaignId === metricCampaignFilter;
            const matchesCreative = metricCreativesFilter.length === 0 || metricCreativesFilter.includes(m.creativeId);
            const matchesDate = isMetricsWithinRange(m.date);
            return matchesCampaign && matchesCreative && matchesDate;
        })
        .sort((a, b) => b.date.localeCompare(a.date));

    // Aggregated Summary Metrics
    const summaryMetrics = useMemo(() => {
        const totalInvestment = calculatedMetrics.reduce((sum, m) => sum + m.investment, 0);
        const totalLeads = calculatedMetrics.reduce((sum, m) => sum + m.leads, 0);
        const totalQualifiedLeads = calculatedMetrics.reduce((sum, m) => sum + (m.qualifiedLeads || 0), 0);
        const totalImpressions = calculatedMetrics.reduce((sum, m) => sum + (m.impressions || 0), 0);
        const totalClicks = calculatedMetrics.reduce((sum, m) => sum + (m.clicks || 0), 0);

        // Calculate revenue from delivered sales based on filter
        let totalRevenue = 0;
        const filteredCreativeIds = metricCreativesFilter.length > 0
            ? metricCreativesFilter
            : (metricCampaignFilter
                ? creatives.filter(c => {
                    const adSet = adSets.find(a => a.id === c.adSetId);
                    return adSet && adSet.campaignId === metricCampaignFilter;
                }).map(c => c.id)
                : creatives.map(c => c.id));

        sales.forEach(s => {
            if (s.status === 'ENTREGUE' && s.creativeId && filteredCreativeIds.includes(s.creativeId) && isMetricsWithinRange(s.deliveryDate)) {
                totalRevenue += s.value;
            }
        });

        const profit = totalRevenue - totalInvestment;
        const roi = totalInvestment > 0 ? totalRevenue / totalInvestment : (totalRevenue > 0 ? Infinity : 0);
        const cpl = totalLeads > 0 ? totalInvestment / totalLeads : 0;
        const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

        return {
            investment: totalInvestment,
            leads: totalLeads,
            qualifiedLeads: totalQualifiedLeads,
            revenue: totalRevenue,
            profit,
            roi,
            cpl,
            ctr,
            impressions: totalImpressions,
            clicks: totalClicks
        };
    }, [calculatedMetrics, sales, creatives, adSets, metricCampaignFilter, metricCreativesFilter]);

    const filteredAdSets = adSets.filter(a => a.campaignId === selectedCampaignId);
    const filteredCreatives = creatives.filter(c => c.adSetId === selectedAdSetId);

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-white">Marketing & Tráfego</h2>
                    <p className="text-sm text-[#808080] font-medium tracking-tight">Gestão de Criativos e Performance de Canais</p>
                </div>
                <div className="flex bg-[#1F1F1F] rounded-2xl p-1.5 border border-white/5 shadow-sm">
                    <button onClick={() => setActiveTab('STRUCTURE')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'STRUCTURE' ? 'bg-[#5D7F38] text-white shadow-lg' : 'text-[#808080] hover:bg-white/5 hover:text-white'}`}>ESTRUTURA</button>
                    <button onClick={() => setActiveTab('PERFORMANCE')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'PERFORMANCE' ? 'bg-[#5D7F38] text-white shadow-lg' : 'text-[#808080] hover:bg-white/5 hover:text-white'}`}>PERFORMANCE</button>
                </div>
            </div>

            {activeTab === 'STRUCTURE' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="flex justify-between items-center bg-[#1F1F1F] p-4 rounded-2xl border border-white/5 shadow-sm relative z-20">
                        <div className="flex items-center gap-2 text-[#E5E5E5] font-black text-xs tracking-widest uppercase">
                            <Layers size={18} className="text-[#5D7F38]" /> ESTRUTURA HIERÁRQUICA
                        </div>
                        <div className="flex items-center gap-2">
                            {/* INACTIVE CAMPAIGNS MINI-CARD/BUTTON */}
                            {inactiveCampaigns.length > 0 && (
                                <button
                                    onClick={() => setShowInactiveCampaigns(!showInactiveCampaigns)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 border ${showInactiveCampaigns ? 'bg-[#252525] text-[#A0A0A0] border-white/10' : 'bg-[#1F1F1F] text-[#808080] border-white/5 hover:bg-[#252525]'}`}
                                >
                                    <Archive size={16} />
                                    <span>{inactiveCampaigns.length} Arquivadas</span>
                                    <ChevronDown size={14} className={`transition-transform duration-200 ${showInactiveCampaigns ? 'rotate-180' : ''}`} />
                                </button>
                            )}
                            <button onClick={() => handleOpenCreateModal('CAMPAIGN')} className="bg-[#5D7F38] text-white hover:bg-[#4a662c] px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-[#5D7F38]/30 flex items-center gap-2">
                                <Plus size={16} /> Nova Campanha
                            </button>
                        </div>
                    </div>

                    {/* Inactive Campaigns List Dropdown - Rendered outside header but visually connected */}
                    {showInactiveCampaigns && inactiveCampaigns.length > 0 && (
                        <div className="bg-[#252525] rounded-3xl border border-white/10 overflow-hidden animate-in slide-in-from-top-2 duration-200 -mt-4 pt-4">
                            <div className="p-2 space-y-1">
                                {inactiveCampaigns.map(campaign => (
                                    <div key={campaign.id} className="ml-4 md:ml-10 flex items-center justify-between p-3 bg-[#1F1F1F] rounded-2xl border border-white/5 shadow-sm hover:border-[#5D7F38]/30 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-1.5 rounded-md ${campaign.status === 'Pausada' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
                                                {campaign.status === 'Pausada' ? <Pause size={14} /> : <X size={14} />}
                                            </div>
                                            <span className="font-black text-[#808080] text-xs strike-through decoration-[#606060]">{campaign.name}</span>
                                            <span className="text-[9px] font-bold text-[#606060] uppercase tracking-wide bg-[#252525] px-2 py-0.5 rounded-lg border border-white/5">{campaign.status}</span>
                                        </div>
                                        <button
                                            onClick={() => handleStatusChange(campaign, 'Ativa')}
                                            className="p-2 text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl transition-all text-[10px] font-black uppercase tracking-wide flex items-center gap-1"
                                            title="Reativar Campanha"
                                        >
                                            <Play size={14} /> Ativar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        {/* ACTIVE CAMPAIGNS LIST */}
                        {activeCampaigns.map(campaign => {
                            const isExpandedVal = expandedCampaigns.includes(campaign.id);
                            const sets = adSets.filter(a => a.campaignId === campaign.id);

                            return (
                                <div key={campaign.id} className="bg-[#1F1F1F] rounded-3xl border border-white/5 shadow-sm overflow-hidden transition-all">
                                    {/* Campaign Header */}
                                    <div
                                        onClick={() => toggleCampaign(campaign.id)}
                                        className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${isExpandedVal ? 'bg-[#252525]' : 'hover:bg-[#252525]'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <button className={`p-1 rounded-lg transition-transform ${isExpandedVal ? 'rotate-90 text-[#E5E5E5]' : 'text-[#808080]'}`}>
                                                <ChevronRight size={18} />
                                            </button>
                                            <div className="p-2 bg-[#5D7F38]/10 text-[#5D7F38] rounded-lg">
                                                <Folder size={18} />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-white text-sm">{campaign.name}</h4>
                                                <p className="text-[10px] font-bold text-[#808080] uppercase tracking-wide">
                                                    {sets.length} Conjuntos • {creatives.filter(c => sets.some(s => s.id === c.adSetId)).length} Criativos
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleStatusChange(campaign, 'Pausada'); }}
                                                className="p-2 text-amber-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-xl transition-all"
                                                title="Pausar Campanha"
                                            >
                                                <Pause size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleStatusChange(campaign, 'Desativada'); }}
                                                className="p-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                                title="Desativar Campanha"
                                            >
                                                <Archive size={16} />
                                            </button>
                                            <div className="w-px h-6 bg-white/10 mx-1" />
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSelectedCampaignId(campaign.id); handleOpenCreateModal('ADSET'); }}
                                                className="p-2 text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-xl transition-all text-[10px] font-black uppercase tracking-wide flex items-center gap-1"
                                            >
                                                <Plus size={14} /> Conjunto
                                            </button>
                                            <div className="w-px h-8 bg-white/10 mx-2" />
                                            <button onClick={(e) => { e.stopPropagation(); handleOpenEditModal('EDIT_CAMPAIGN', campaign); }} className="p-2 text-[#808080] hover:text-[#5D7F38] hover:bg-[#5D7F38]/10 rounded-xl"><Edit2 size={16} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); if (confirm('Excluir campanha?')) deleteCampaign(campaign.id); }} className="p-2 text-[#808080] hover:text-red-500 hover:bg-red-500/10 rounded-xl"><Trash2 size={16} /></button>
                                        </div>
                                    </div>

                                    {/* AdSets List */}
                                    {isExpandedVal && (
                                        <div className="bg-[#252525]/50 border-t border-white/5">
                                            {sets.length === 0 ? (
                                                <div className="p-8 text-center text-[#606060] text-xs font-medium italic">Nenhum conjunto nesta campanha.</div>
                                            ) : (
                                                <div className="space-y-1 p-2">
                                                    {sets.map(adSet => {
                                                        const isSetExpanded = expandedAdSets.includes(adSet.id);
                                                        const adCreatives = creatives.filter(c => c.adSetId === adSet.id);

                                                        return (
                                                            <div key={adSet.id} className="ml-4 md:ml-10 bg-[#1F1F1F] rounded-2xl border border-white/5 overflow-hidden">
                                                                <div
                                                                    onClick={() => toggleAdSet(adSet.id)}
                                                                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-[#252525] transition-colors"
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <button className={`p-1 transition-transform ${isSetExpanded ? 'rotate-90 text-[#E5E5E5]' : 'text-[#808080]'}`}>
                                                                            <ChevronRight size={16} />
                                                                        </button>
                                                                        <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-md">
                                                                            <Layers size={16} />
                                                                        </div>
                                                                        <span className="font-bold text-[#E5E5E5] text-xs">{adSet.name}</span>
                                                                        <span className="text-[9px] font-bold text-[#808080] bg-[#252525] px-1.5 py-0.5 rounded-md">{adCreatives.length} Criativos</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); setSelectedAdSetId(adSet.id); handleOpenCreateModal('CREATIVE'); }}
                                                                            className="p-1.5 text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition-all text-[9px] font-black uppercase tracking-wide flex items-center gap-1"
                                                                        >
                                                                            <Plus size={12} /> Criativo
                                                                        </button>
                                                                        <button onClick={(e) => { e.stopPropagation(); handleOpenEditModal('EDIT_ADSET', adSet); }} className="p-1.5 text-[#808080] hover:text-[#5D7F38] hover:bg-[#5D7F38]/10 rounded-lg"><Edit2 size={14} /></button>
                                                                        <button onClick={(e) => { e.stopPropagation(); if (confirm('Excluir conjunto?')) deleteAdSet(adSet.id); }} className="p-1.5 text-[#808080] hover:text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 size={14} /></button>
                                                                    </div>
                                                                </div>

                                                                {/* Creatives List */}
                                                                {isSetExpanded && (
                                                                    <div className="border-t border-white/5 bg-[#252525] p-2 space-y-1">
                                                                        {adCreatives.length === 0 ? (
                                                                            <div className="p-4 text-center text-[#606060] text-[10px] font-medium italic">Nenhum criativo neste conjunto.</div>
                                                                        ) : (
                                                                            adCreatives.map(creative => (
                                                                                <div key={creative.id} className="ml-8 flex items-center justify-between p-2 bg-[#1F1F1F] rounded-xl border border-white/5 shadow-sm hover:border-[#5D7F38]/30 transition-colors">
                                                                                    <div className="flex items-center gap-3">
                                                                                        <div className="w-1 h-8 bg-purple-500/30 rounded-full" />
                                                                                        <div className="p-1 bg-purple-500/10 text-purple-400 rounded-md">
                                                                                            <ImageIcon size={14} />
                                                                                        </div>
                                                                                        <span className="font-bold text-[#E5E5E5] text-xs">{creative.name}</span>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-1">
                                                                                        <button onClick={() => handleOpenEditModal('EDIT_CREATIVE', creative)} className="p-1.5 text-[#808080] hover:text-[#5D7F38] hover:bg-[#5D7F38]/10 rounded-lg"><Edit2 size={12} /></button>
                                                                                        <button onClick={() => { if (confirm('Excluir criativo?')) deleteCreative(creative.id); }} className="p-1.5 text-[#808080] hover:text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 size={12} /></button>
                                                                                    </div>
                                                                                </div>
                                                                            ))
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {activeTab === 'PERFORMANCE' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                            {/* Filtro de Campanha */}
                            <div className="flex items-center gap-2 bg-[#1F1F1F] p-2 rounded-2xl border border-white/5 shadow-sm min-w-[200px]">
                                <Filter size={16} className="text-[#808080] ml-3" />
                                <select
                                    className="bg-transparent text-sm focus:outline-none text-white font-bold p-1 w-full"
                                    value={metricCampaignFilter}
                                    onChange={(e) => {
                                        setMetricCampaignFilter(e.target.value);
                                        setMetricCreativesFilter([]); // Reseta criativos ao trocar campanha
                                    }}
                                >
                                    <option value="" className="bg-[#1F1F1F]">Todas Campanhas...</option>
                                    {campaigns.map(c => <option key={c.id} value={c.id} className="bg-[#1F1F1F]">{c.name}</option>)}
                                </select>
                            </div>

                            {/* Multi-Filtro de Criativos (Só aparece se campanha selecionada) */}
                            {metricCampaignFilter && (
                                <div className="relative" ref={dropdownRef}>
                                    <button
                                        onClick={() => setIsCreativeDropdownOpen(!isCreativeDropdownOpen)}
                                        className="bg-[#1F1F1F] px-4 py-3.5 rounded-2xl border border-white/5 shadow-sm flex items-center gap-3 text-sm font-bold text-white hover:bg-[#252525] transition-all min-w-[220px]"
                                    >
                                        <ImageIcon size={16} className="text-[#5D7F38]" />
                                        <span className="flex-1 text-left truncate">
                                            {metricCreativesFilter.length === 0 ? 'Todos os Criativos' : `${metricCreativesFilter.length} Selecionado(s)`}
                                        </span>
                                        <ChevronDown size={14} className={`transition-transform ${isCreativeDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isCreativeDropdownOpen && (
                                        <div className="absolute top-full left-0 mt-2 w-72 bg-[#1F1F1F] border border-white/10 rounded-2xl shadow-2xl z-50 p-4 animate-in fade-in zoom-in duration-150">
                                            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                                <label className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded text-[#5D7F38] focus:ring-[#5D7F38] bg-[#252525] border-white/10"
                                                        checked={metricCreativesFilter.length === 0}
                                                        onChange={() => setMetricCreativesFilter([])}
                                                    />
                                                    <span className="text-xs font-black text-[#E5E5E5] uppercase tracking-widest">Todos</span>
                                                </label>
                                                <div className="h-px bg-white/10 my-2" />
                                                {creativesOfCampaign.map(c => (
                                                    <label key={c.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl cursor-pointer group">
                                                        <input
                                                            type="checkbox"
                                                            className="w-4 h-4 rounded text-[#5D7F38] focus:ring-[#5D7F38] bg-[#252525] border-white/10"
                                                            checked={metricCreativesFilter.includes(c.id)}
                                                            onChange={() => {
                                                                if (metricCreativesFilter.includes(c.id)) {
                                                                    setMetricCreativesFilter(prev => prev.filter(id => id !== c.id));
                                                                } else {
                                                                    setMetricCreativesFilter(prev => [...prev, c.id]);
                                                                }
                                                            }}
                                                        />
                                                        <span className="text-xs font-bold text-[#E5E5E5] truncate">{c.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Filtro de Data */}
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-[#808080]">
                                        <ChevronDown size={14} />
                                    </div>
                                    <select
                                        value={metricsPeriod}
                                        onChange={(e) => setMetricsPeriod(e.target.value as PeriodOption)}
                                        className="appearance-none bg-[#1F1F1F] border border-white/5 rounded-xl pl-4 pr-10 py-3 text-[10px] font-bold uppercase tracking-widest text-[#E5E5E5] focus:outline-none focus:border-[#5D7F38] cursor-pointer hover:bg-[#252525] transition-colors"
                                    >
                                        <option value="hoje">Hoje</option>
                                        <option value="7d_passado">Últimos 7 dias</option>
                                        <option value="30d_passado">Últimos 30 dias</option>
                                        <option value="este_mes">Este mês</option>
                                        <option value="mes_passado">Mês passado</option>
                                        <option value="tudo">Ver Tudo</option>
                                        <option value="personalizado">Personalizado</option>
                                    </select>
                                </div>

                                {metricsPeriod === 'personalizado' && (
                                    <div className="flex items-center gap-2 bg-[#1F1F1F] border border-white/5 rounded-xl p-2 px-3">
                                        <input
                                            type="date"
                                            className="bg-transparent border-none text-[10px] text-white font-bold p-0 focus:ring-0 focus:outline-none"
                                            value={metricsDateFrom}
                                            onChange={(e) => setMetricsDateFrom(e.target.value)}
                                        />
                                        <span className="text-[#606060]">-</span>
                                        <input
                                            type="date"
                                            className="bg-transparent border-none text-[10px] text-white font-bold p-0 focus:ring-0 focus:outline-none"
                                            value={metricsDateTo}
                                            onChange={(e) => setMetricsDateTo(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <button onClick={() => openMetricModal()} className="bg-[#5D7F38] text-white px-8 py-3.5 rounded-2xl hover:bg-[#4a662c] flex items-center gap-2 shadow-xl shadow-[#5D7F38]/30 font-black text-xs uppercase tracking-widest transition-all w-full md:w-auto justify-center">
                            <Plus size={18} /> LANÇAR MÉTRICA DIÁRIA
                        </button>
                    </div>

                    {/* Summary Cards Section */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                        {/* Investimento */}
                        <div className="bg-[#1F1F1F] rounded-2xl border border-white/5 p-4 shadow-sm hover:border-[#5D7F38]/30 transition-all">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 bg-red-500/10 text-red-400 rounded-lg">
                                    <Target size={14} />
                                </div>
                                <span className="text-[10px] font-black text-[#808080] uppercase tracking-widest">Investimento</span>
                            </div>
                            <p className="text-lg font-black text-white">{formatCurrency(summaryMetrics.investment)}</p>
                        </div>

                        {/* Leads */}
                        <div className="bg-[#1F1F1F] rounded-2xl border border-white/5 p-4 shadow-sm hover:border-[#5D7F38]/30 transition-all">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
                                    <MousePointer2 size={14} />
                                </div>
                                <span className="text-[10px] font-black text-[#808080] uppercase tracking-widest">Leads</span>
                            </div>
                            <p className="text-lg font-black text-white">{summaryMetrics.leads}</p>
                        </div>

                        {/* Leads Qualificados */}
                        <div className="bg-[#1F1F1F] rounded-2xl border border-white/5 p-4 shadow-sm hover:border-[#5D7F38]/30 transition-all">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 bg-purple-500/10 text-purple-400 rounded-lg">
                                    <Check size={14} />
                                </div>
                                <span className="text-[10px] font-black text-[#808080] uppercase tracking-widest">Leads Qual.</span>
                            </div>
                            <p className="text-lg font-black text-white">{summaryMetrics.qualifiedLeads}</p>
                        </div>

                        {/* ROI */}
                        <div className="bg-[#1F1F1F] rounded-2xl border border-white/5 p-4 shadow-sm hover:border-[#5D7F38]/30 transition-all">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                                    <Trophy size={14} />
                                </div>
                                <span className="text-[10px] font-black text-[#808080] uppercase tracking-widest">ROI</span>
                            </div>
                            <p className={`text-lg font-black ${summaryMetrics.roi >= 2 ? 'text-emerald-400' : summaryMetrics.roi >= 1 ? 'text-blue-400' : 'text-red-400'}`}>
                                {summaryMetrics.roi === Infinity ? '∞' : summaryMetrics.roi.toFixed(1)}x
                            </p>
                        </div>

                        {/* Lucro */}
                        <div className="bg-[#1F1F1F] rounded-2xl border border-white/5 p-4 shadow-sm hover:border-[#5D7F38]/30 transition-all">
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`p-1.5 rounded-lg ${summaryMetrics.profit > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                    <ArrowRight size={14} />
                                </div>
                                <span className="text-[10px] font-black text-[#808080] uppercase tracking-widest">Lucro</span>
                            </div>
                            <p className={`text-lg font-black ${summaryMetrics.profit > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {formatCurrency(summaryMetrics.profit)}
                            </p>
                        </div>

                        {/* Receita */}
                        <div className="bg-[#1F1F1F] rounded-2xl border border-white/5 p-4 shadow-sm hover:border-[#5D7F38]/30 transition-all">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 bg-[#5D7F38]/10 text-[#5D7F38] rounded-lg">
                                    <Globe size={14} />
                                </div>
                                <span className="text-[10px] font-black text-[#808080] uppercase tracking-widest">Receita</span>
                            </div>
                            <p className="text-lg font-black text-[#5D7F38]">{formatCurrency(summaryMetrics.revenue)}</p>
                        </div>

                        {/* CPL */}
                        <div className="bg-[#1F1F1F] rounded-2xl border border-white/5 p-4 shadow-sm hover:border-[#5D7F38]/30 transition-all">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg">
                                    <Target size={14} />
                                </div>
                                <span className="text-[10px] font-black text-[#808080] uppercase tracking-widest">CPL</span>
                            </div>
                            <p className="text-lg font-black text-amber-400">{formatCurrency(summaryMetrics.cpl)}</p>
                        </div>

                        {/* CTR */}
                        <div className="bg-[#1F1F1F] rounded-2xl border border-white/5 p-4 shadow-sm hover:border-[#5D7F38]/30 transition-all">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
                                    <Eye size={14} />
                                </div>
                                <span className="text-[10px] font-black text-[#808080] uppercase tracking-widest">CTR</span>
                            </div>
                            <p className="text-lg font-black text-blue-400">{summaryMetrics.ctr.toFixed(2)}%</p>
                        </div>
                    </div>

                    {/* Toggle de Visualização: Ranking / Diário */}
                    <div className="flex items-center justify-between bg-[#1F1F1F] p-2 rounded-2xl border border-white/5 shadow-sm">
                        <div className="flex bg-[#252525] p-1 rounded-xl">
                            <button
                                onClick={() => setPerformanceView('RANKING')}
                                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all flex items-center gap-2 ${performanceView === 'RANKING' ? 'bg-[#5D7F38] text-white shadow-lg' : 'text-[#808080] hover:text-white hover:bg-white/5'}`}
                            >
                                <Trophy size={14} /> Ranking
                            </button>
                            <button
                                onClick={() => setPerformanceView('DIARIO')}
                                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all flex items-center gap-2 ${performanceView === 'DIARIO' ? 'bg-[#5D7F38] text-white shadow-lg' : 'text-[#808080] hover:text-white hover:bg-white/5'}`}
                            >
                                <Calendar size={14} /> Diário
                            </button>
                        </div>
                    </div>

                    {performanceView === 'RANKING' && (
                        <>
                            <div className="bg-[#1F1F1F] rounded-3xl border border-white/5 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                                <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                                            <Trophy size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-white text-sm uppercase tracking-wide">Ranking de Performance</h3>
                                            <p className="text-[10px] font-bold text-[#808080]">Melhores campanhas e criativos</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="flex bg-[#252525] p-1 rounded-xl">
                                            <button
                                                onClick={() => setRankingMode('CAMPAIGN')}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${rankingMode === 'CAMPAIGN' ? 'bg-[#1F1F1F] text-[#5D7F38] shadow-sm' : 'text-[#808080] hover:text-white'}`}
                                            >
                                                Campanhas
                                            </button>
                                            <button
                                                onClick={() => setRankingMode('CREATIVE')}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${rankingMode === 'CREATIVE' ? 'bg-[#1F1F1F] text-[#5D7F38] shadow-sm' : 'text-[#808080] hover:text-white'}`}
                                            >
                                                Criativos
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-[#252525]/50">
                                            <tr className="text-[10px] font-black uppercase text-[#808080] tracking-widest">
                                                <th className="p-4 w-16 text-center">#</th>
                                                <th className="p-4">Nome</th>
                                                <th className="p-4 text-right">Leads</th>
                                                <th className="p-4 text-right">Leads Qual.</th>
                                                <th className="p-4 text-right">ROI</th>
                                                <th className="p-4 text-right">Lucro</th>
                                                <th className="p-4 text-right">Investimento</th>
                                                <th className="p-4 text-right">Receita</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {(rankingMode === 'CAMPAIGN' ? campaignRanking : creativeRanking).slice(0, 5).map((item, index) => (
                                                <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                                                    <td className="p-4 text-center">
                                                        <span className={`
                                                inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black
                                                ${index === 0 ? 'bg-amber-500/20 text-amber-400' :
                                                                index === 1 ? 'bg-[#252525] text-[#A0A0A0]' :
                                                                    index === 2 ? 'bg-orange-500/20 text-orange-400' :
                                                                        'bg-[#252525] text-[#606060]'}
                                            `}>
                                                            {index + 1}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <p className="text-xs font-black text-[#E5E5E5] truncate max-w-[200px] md:max-w-xs">{item.name}</p>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <span className="text-xs font-bold text-[#808080]">{item.leads}</span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <span className="text-xs font-bold text-[#808080]">{item.qualifiedLeads}</span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <span className={`text-xs font-black ${item.roi >= 2 ? 'text-emerald-400' : item.roi >= 1 ? 'text-blue-400' : 'text-red-400'}`}>
                                                            {item.roi === Infinity ? '∞' : item.roi.toFixed(1)}x
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <span className={`text-xs font-black ${item.profit > 0 ? 'text-emerald-500' : 'text-[#808080]'}`}>
                                                            {formatCurrency(item.profit)}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <span className="text-xs font-bold text-[#606060]">{formatCurrency(item.investment)}</span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <span className="text-xs font-bold text-[#606060]">{formatCurrency(item.revenue)}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {(rankingMode === 'CAMPAIGN' ? campaignRanking : creativeRanking).length === 0 && (
                                                <tr>
                                                    <td colSpan={8} className="p-8 text-center text-[#606060] text-xs font-medium italic">
                                                        Sem dados para o período selecionado.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                    {performanceView === 'DIARIO' && (
                        <div className="bg-[#1F1F1F] rounded-3xl shadow-sm border border-white/5 overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-[#252525] text-[#808080] border-b border-white/5">
                                    <tr>
                                        <th className="p-4 font-black uppercase text-[10px] tracking-widest">Data</th>
                                        <th className="p-4 font-black uppercase text-[10px] tracking-widest">Criativo</th>
                                        <th className="p-4 text-right font-black uppercase text-[10px] tracking-widest">Investimento</th>
                                        <th className="p-4 text-right font-black uppercase text-[10px] tracking-widest">Leads</th>
                                        <th className="p-4 text-right font-black uppercase text-[10px] tracking-widest">Leads Qual.</th>
                                        <th className="p-4 text-right font-black uppercase text-[10px] tracking-widest">CPL</th>
                                        <th className="p-4 text-right font-black uppercase text-[10px] tracking-widest">CTR</th>
                                        <th className="p-4 text-right font-black uppercase text-[10px] tracking-widest">Receita</th>
                                        <th className="p-4 text-right font-black uppercase text-[10px] tracking-widest">Lucro</th>
                                        <th className="p-4 text-right font-black uppercase text-[10px] tracking-widest">ROI</th>
                                        <th className="p-4 text-center font-black uppercase text-[10px] tracking-widest">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {calculatedMetrics.map(m => {
                                        const cpl = m.leads > 0 ? m.investment / m.leads : 0;
                                        const ctr = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0;
                                        // Calculate revenue from delivered sales for this creative on this date
                                        const dayRevenue = sales
                                            .filter(s => s.status === 'ENTREGUE' && s.creativeId === m.creativeId && s.deliveryDate?.split('T')[0] === m.date.split('T')[0])
                                            .reduce((sum, s) => sum + s.value, 0);
                                        const profit = dayRevenue - m.investment;
                                        const roi = m.investment > 0 ? dayRevenue / m.investment : (dayRevenue > 0 ? Infinity : 0);
                                        const creativeName = creatives.find(c => c.id === m.creativeId)?.name || 'Removido';
                                        const campaignName = campaigns.find(c => c.id === m.campaignId)?.name || '?';
                                        const adSetName = adSets.find(a => a.id === m.adSetId)?.name || '?';

                                        return (
                                            <tr key={m.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                <td className="p-4 font-bold text-white text-xs">{new Date(m.date).toLocaleDateString('pt-BR')}</td>
                                                <td className="p-4">
                                                    <button
                                                        onClick={() => {
                                                            setMetricCampaignFilter(m.campaignId);
                                                            setMetricCreativesFilter([m.creativeId]);
                                                        }}
                                                        className="text-left hover:opacity-80 transition-opacity"
                                                        title="Clique para filtrar por este criativo"
                                                    >
                                                        <div className="font-black text-[#5D7F38] text-[11px] truncate max-w-[180px] hover:underline">{creativeName}</div>
                                                        <div className="text-[9px] text-[#606060] font-medium truncate max-w-[180px]">{campaignName} › {adSetName}</div>
                                                    </button>
                                                </td>
                                                <td className="p-4 text-right font-black text-white text-xs">{formatCurrency(m.investment)}</td>
                                                <td className="p-4 text-right font-bold text-[#808080] text-xs">{m.leads}</td>
                                                <td className="p-4 text-right font-bold text-purple-400 text-xs">{m.qualifiedLeads || 0}</td>
                                                <td className="p-4 text-right font-black text-amber-400 text-xs">{formatCurrency(cpl)}</td>
                                                <td className="p-4 text-right font-black text-blue-400 text-xs">{ctr.toFixed(2)}%</td>
                                                <td className="p-4 text-right font-black text-[#5D7F38] text-xs">{formatCurrency(dayRevenue)}</td>
                                                <td className="p-4 text-right">
                                                    <span className={`font-black text-xs ${profit > 0 ? 'text-emerald-400' : profit < 0 ? 'text-red-400' : 'text-[#606060]'}`}>
                                                        {formatCurrency(profit)}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <span className={`font-black text-xs ${roi >= 2 ? 'text-emerald-400' : roi >= 1 ? 'text-blue-400' : 'text-red-400'}`}>
                                                        {roi === Infinity ? '∞' : roi.toFixed(1)}x
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button onClick={() => openMetricModal(m)} className="text-[#808080] hover:text-[#5D7F38] p-1.5 hover:bg-[#5D7F38]/10 rounded-lg transition-all"><Edit2 size={14} /></button>
                                                        <button onClick={() => { if (window.confirm("Excluir esta métrica?")) deleteMetric(m.id); }} className="text-[#808080] hover:text-red-500 p-1.5 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {calculatedMetrics.length === 0 && (
                                        <tr>
                                            <td colSpan={11} className="p-8 text-center text-[#606060] text-xs font-medium italic">
                                                Sem métricas para o período selecionado.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL DE MÉTRICA DIÁRIA (Lote por Campanha) */}
            {isMetricModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-[#1F1F1F] rounded-3xl shadow-2xl w-full max-w-5xl p-8 animate-in zoom-in duration-200 overflow-y-auto max-h-[95vh] border border-white/5">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-white">Lançamento por Campanha</h3>
                                <p className="text-xs text-[#808080] font-bold tracking-tight mt-1">Atualize CPM, CTR e Investimento de múltiplos criativos.</p>
                            </div>
                            <button onClick={() => setIsMetricModalOpen(false)} className="text-[#808080] hover:text-red-500 bg-[#252525] p-2 rounded-xl transition-all"><X size={28} /></button>
                        </div>

                        <form onSubmit={handleSaveMetrics} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="bg-[#252525] p-6 rounded-3xl border border-white/5">
                                    <label className="block text-[10px] font-black text-[#808080] uppercase mb-2 tracking-widest">Data dos Dados</label>
                                    <input type="date" required className="w-full bg-[#1F1F1F] border border-white/5 rounded-2xl p-4 font-black outline-none focus:border-[#5D7F38] text-white [color-scheme:dark]" value={metricForm.date} onChange={e => setMetricForm({ ...metricForm, date: e.target.value })} />
                                </div>
                                <div className="bg-[#252525] p-6 rounded-3xl border border-white/5">
                                    <label className="block text-[10px] font-black text-[#808080] uppercase mb-2 tracking-widest">Campanha Alvo</label>
                                    <select required className="w-full bg-[#1F1F1F] border border-white/5 rounded-2xl p-4 font-black outline-none focus:border-[#5D7F38] disabled:opacity-50 text-white" value={metricForm.campaignId} disabled={!!editingMetric}
                                        onChange={e => {
                                            const cId = e.target.value;
                                            // Popula os criativos daquela campanha no form
                                            const adsOfCampaign = adSets.filter(a => a.campaignId === cId);
                                            const campaignCreatives = creatives.filter(c => adsOfCampaign.some(a => a.id === c.adSetId));
                                            const initialData: any = {};
                                            campaignCreatives.forEach(c => {
                                                initialData[c.id] = { investment: 0, impressions: 0, clicks: 0, leads: 0, qualifiedLeads: 0, adSetId: c.adSetId };
                                            });
                                            setMetricForm({ ...metricForm, campaignId: cId, creativeData: initialData });
                                        }}>
                                        <option value="" className="bg-[#1F1F1F]">Escolha a campanha...</option>
                                        {campaigns.map(c => <option key={c.id} value={c.id} className="bg-[#1F1F1F]">{c.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            {metricForm.campaignId && (
                                <div className="overflow-hidden border border-white/5 rounded-[32px] bg-[#1F1F1F] shadow-sm">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-[#252525] border-b border-white/5">
                                            <tr className="text-[10px] font-black uppercase text-[#808080]">
                                                <th className="p-4 w-1/4">Criativo</th>
                                                <th className="p-4">Investimento</th>
                                                <th className="p-4">Leads</th>
                                                <th className="p-4">Qual. Leads</th>
                                                <th className="p-4">Impressões / Cliques</th>
                                                <th className="p-4 text-center">Resultados Estimados</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {/* Cast Object.entries result to any[] to avoid 'unknown' property access errors during map */}
                                            {(Object.entries(metricForm.creativeData) as [string, any][]).map(([cId, data]) => {
                                                const cName = creatives.find(c => c.id === cId)?.name || 'Criativo';
                                                const cpm = data.impressions > 0 ? (data.investment / data.impressions) * 1000 : 0;
                                                const ctr = data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0;

                                                return (
                                                    <tr key={cId} className="hover:bg-white/5 transition-colors">
                                                        <td className="p-4">
                                                            <p className="font-black text-white text-xs truncate max-w-[200px]">{cName}</p>
                                                            <p className="text-[9px] text-[#808080] font-bold uppercase">{adSets.find(a => a.id === data.adSetId)?.name || 'Conjunto'}</p>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="relative">
                                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-[#808080]">R$</span>
                                                                <input
                                                                    type="number" step="0.01" className="w-24 bg-[#252525] border border-white/5 rounded-xl p-2 pl-7 text-xs font-black outline-none focus:border-[#5D7F38] text-white"
                                                                    value={data.investment}
                                                                    onChange={e => setMetricForm({
                                                                        ...metricForm,
                                                                        creativeData: { ...metricForm.creativeData, [cId]: { ...data, investment: parseFloat(e.target.value) || 0 } }
                                                                    })}
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <input
                                                                type="number" className="w-16 bg-[#252525] border border-white/5 rounded-xl p-2 text-xs font-black outline-none focus:border-[#5D7F38] text-white"
                                                                value={data.leads}
                                                                onChange={e => setMetricForm({
                                                                    ...metricForm,
                                                                    creativeData: { ...metricForm.creativeData, [cId]: { ...data, leads: parseInt(e.target.value) || 0 } }
                                                                })}
                                                            />
                                                        </td>
                                                        <td className="p-4">
                                                            <input
                                                                type="number" className="w-16 bg-[#252525] border border-white/5 rounded-xl p-2 text-xs font-black outline-none focus:border-[#5D7F38] text-white"
                                                                value={data.qualifiedLeads}
                                                                onChange={e => setMetricForm({
                                                                    ...metricForm,
                                                                    creativeData: { ...metricForm.creativeData, [cId]: { ...data, qualifiedLeads: parseInt(e.target.value) || 0 } }
                                                                })}
                                                            />
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex gap-2">
                                                                <div className="relative" title="Impressões">
                                                                    <Eye size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#808080]" />
                                                                    <input
                                                                        type="number" className="w-24 bg-[#252525] border border-white/5 rounded-xl p-2 pl-6 text-xs font-black outline-none focus:border-[#5D7F38] text-white" placeholder="Imp"
                                                                        value={data.impressions}
                                                                        onChange={e => setMetricForm({
                                                                            ...metricForm,
                                                                            creativeData: { ...metricForm.creativeData, [cId]: { ...data, impressions: parseInt(e.target.value) || 0 } }
                                                                        })}
                                                                    />
                                                                </div>
                                                                <div className="relative" title="Cliques">
                                                                    <MousePointer2 size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#808080]" />
                                                                    <input
                                                                        type="number" className="w-20 bg-[#252525] border border-white/5 rounded-xl p-2 pl-6 text-xs font-black outline-none focus:border-[#5D7F38] text-white" placeholder="Cliq"
                                                                        value={data.clicks}
                                                                        onChange={e => setMetricForm({
                                                                            ...metricForm,
                                                                            creativeData: { ...metricForm.creativeData, [cId]: { ...data, clicks: parseInt(e.target.value) || 0 } }
                                                                        })}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex flex-col items-center">
                                                                <span className={`text-[10px] font-black ${cpm > 50 ? 'text-orange-400' : 'text-[#808080]'}`}>CPM: {formatCurrency(cpm)}</span>
                                                                <span className={`text-[10px] font-black ${ctr < 1 ? 'text-red-400' : 'text-emerald-400'}`}>CTR: {ctr.toFixed(2)}%</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-6 border-t border-white/5 mt-4">
                                <button type="button" onClick={() => setIsMetricModalOpen(false)} className="px-8 py-4 text-xs font-black border border-white/5 rounded-2xl text-[#808080] hover:bg-white/5 transition-all uppercase tracking-widest">CANCELAR</button>
                                <button type="submit" className="px-12 py-4 text-xs font-black bg-[#5D7F38] text-white rounded-2xl shadow-xl shadow-[#5D7F38]/30 hover:bg-[#4a662c] transition-all uppercase tracking-widest">SALVAR DADOS EM LOTE</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Outros Modais (Criação) */}
            {modalType && (
                <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-[#1F1F1F] rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in duration-200 border border-white/5">
                        <div className="flex justify-between items-center mb-8">
                            <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-2xl ${modalType === 'CAMPAIGN' ? 'bg-[#5D7F38]/10 text-[#5D7F38]' : modalType === 'ADSET' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-purple-500/10 text-purple-400'}`}>
                                    {modalType === 'CAMPAIGN' ? <Folder size={24} /> : modalType === 'ADSET' ? <Layers size={24} /> : <ImageIcon size={24} />}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white">
                                        {modalType === 'CAMPAIGN' ? 'Nova Campanha' :
                                            modalType === 'ADSET' ? 'Novo Conjunto' :
                                                modalType === 'CREATIVE' ? 'Novo Criativo' :
                                                    'Editar Nome'}
                                    </h3>
                                    <p className="text-[10px] text-[#808080] font-black uppercase tracking-widest mt-1">
                                        {modalType?.startsWith('EDIT') ? 'Atualize o nome do item' : 'Defina o nome do seu item'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setModalType(null)} className="text-[#808080] hover:text-red-500 bg-[#252525] p-2 rounded-xl transition-all"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleCreateOrUpdateItem} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-[#808080] uppercase mb-2 tracking-widest">
                                    {modalType?.includes('CAMPAIGN') ? 'Nome da Campanha' :
                                        modalType?.includes('ADSET') ? 'Nome do Conjunto' :
                                            'Nome do Criativo'}
                                </label>
                                <input autoFocus required className="w-full border border-white/5 rounded-2xl p-4 text-sm outline-none focus:border-[#5D7F38] transition-all font-black text-white bg-[#252525] placeholder:text-[#606060]" value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Ex: [Vendas] Perfume Arabe 01" />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setModalType(null)} className="flex-1 px-6 py-4 text-xs font-black border border-white/5 rounded-2xl text-[#808080] hover:bg-white/5 transition-all uppercase tracking-widest">CANCELAR</button>
                                <button type="submit" className={`flex-[2] px-6 py-4 text-xs font-black text-white rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest ${modalType?.includes('CAMPAIGN') ? 'bg-[#5D7F38] shadow-[#5D7F38]/30' : modalType?.includes('ADSET') ? 'bg-indigo-600 shadow-indigo-500/30' : 'bg-purple-600 shadow-purple-500/30'}`}>
                                    {modalType?.startsWith('EDIT') ? 'SALVAR ALTERAÇÃO' : 'CRIAR ITEM'} <ArrowRight size={18} />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
