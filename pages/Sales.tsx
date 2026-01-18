
import React, { useContext, useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOperations } from '../contexts/OperationsContext';
import { useMarketing } from '../contexts/MarketingContext';
import { useFinance } from '../contexts/FinanceContext';
import { useAuth } from '../contexts/AuthContext';

import { Sale, SaleStatus } from '../types';
import { formatCurrency, formatDate, getCurrentLocalDate, getLast30DaysDate } from '../constants';
import { Search, Plus, Edit2, Filter, Trash2, Calendar, CheckCircle, XCircle, DollarSign, ShoppingBag, ArrowRight, ChevronDown, Package, TrendingDown, Wallet, Clock, CalendarCheck, Truck, Eye } from 'lucide-react';
import { ConfirmationModal } from '../components/ConfirmationModal';

import { getPeriodRange } from '../utils/dateUtils';

type PeriodOption = 'hoje' | 'amanha' | 'ontem' | '7d_futuro' | '7d_passado' | 'personalizado';
type ViewByOption = 'scheduledDate' | 'schedulingDate' | 'deliveryDate';

export const Sales = () => {
  const { sales, addSale, updateSale, deleteSale, users, frustrationReasons, products } = useOperations();
  const { campaigns, adSets, creatives } = useMarketing();
  const { transactions } = useFinance();
  const { currentUser } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { status?: string, openModal?: boolean } | null;

  const todayStr = getCurrentLocalDate();

  // --- FILTER STATE ---
  const [filterStatus, setFilterStatus] = useState<string>(state?.status || 'all');
  const [searchText, setSearchText] = useState('');

  // Period Selection (Matching Dashboard logic)
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('hoje');
  const [dateFrom, setDateFrom] = useState<string>(getCurrentLocalDate());
  const [dateTo, setDateTo] = useState<string>(getCurrentLocalDate());
  const [dateError, setDateError] = useState<string>('');
  const [viewBy, setViewBy] = useState<ViewByOption>('scheduledDate');

  // Lógica para atualizar as datas baseado no período selecionado
  useEffect(() => {
    if (selectedPeriod === 'personalizado') return;

    const { startDateTime, endDateTime } = getPeriodRange(selectedPeriod);

    // The inputs expect YYYY-MM-DD
    if (startDateTime && endDateTime) {
      setDateFrom(startDateTime.split('T')[0]);
      setDateTo(endDateTime.split('T')[0]);
    } else if (selectedPeriod === 'tudo') {
      setDateFrom('');
      setDateTo('');
    }
  }, [selectedPeriod]);


  useEffect(() => {
    if (state?.openModal) {
      handleOpenModal();
      // Limpa o state para não reabrir ao navegar (opcional, mas boa prática, embora react-router location state persista)
      // Na verdade, como é effect de mount (ou dependente de state), se o user der refresh, pode abrir de novo.
      // O ideal seria limpar o history state, mas vamos manter simples por enquanto. 
      // Para evitar loop ou comportamento estranho, só chamamos se `isModalOpen` for false.
    }
  }, [state]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Sale>>({
    productId: '',
    quantity: 1,
    value: 0,
    deliveryType: 'Logzz',
    status: 'AGENDADO',
    deliveryFee: 0,
    logzzFee: 0
  });

  // Track the base price of the selected option (unit or kit) to allow auto-calc when quantity changes
  const [selectedOptionPrice, setSelectedOptionPrice] = useState<number>(0);

  // --- CASCADING DROPDOWN OPTIONS ---
  const filteredAdSets = useMemo(() => {
    return adSets.filter(a => !formData.campaignId || a.campaignId === formData.campaignId);
  }, [adSets, formData.campaignId]);

  const filteredCreatives = useMemo(() => {
    return creatives.filter(c => !formData.adSetId || c.adSetId === formData.adSetId);
  }, [creatives, formData.adSetId]);


  // --- FILTER LOGIC ---
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      // 1. Text Search
      if (searchText) {
        const term = searchText.toLowerCase();
        const matchName = s.customerName.toLowerCase().includes(term);
        const matchPhone = s.customerPhone.includes(term);
        if (!matchName && !matchPhone) return false;
      }

      // 2. Status Filter
      if (filterStatus !== 'all' && s.status !== filterStatus) return false;

      // 3. Date Filter based on 'viewBy' selection (affects table only)
      if (dateFrom || dateTo) {
        let dateToCompare = '';

        // Use the selected viewBy field
        switch (viewBy) {
          case 'scheduledDate':
            dateToCompare = s.scheduledDate || '';
            break;
          case 'schedulingDate':
            dateToCompare = s.schedulingDate || '';
            break;
          case 'deliveryDate':
            dateToCompare = s.deliveryDate || '';
            break;
        }

        if (!dateToCompare) return false;

        if (dateFrom && dateToCompare < dateFrom) return false;
        if (dateTo && dateToCompare > dateTo) return false;
      }

      return true;
    }).sort((a, b) => {
      // Sort based on viewBy field
      switch (viewBy) {
        case 'deliveryDate':
          return (b.deliveryDate || '').localeCompare(a.deliveryDate || '');
        case 'schedulingDate':
          return (b.schedulingDate || '').localeCompare(a.schedulingDate || '');
        default:
          return (a.scheduledDate || '9999-99-99').localeCompare(b.scheduledDate || '9999-99-99');
      }
    });
  }, [sales, searchText, filterStatus, dateFrom, dateTo, viewBy]);

  const listSummary = useMemo(() => {
    // Exclude FRUSTRADO from value calculations (only count valid sales)
    const validSales = filteredSales.filter(s => s.status !== 'FRUSTRADO');
    const count = filteredSales.length;
    const totalValue = validSales.reduce((acc, curr) => acc + curr.value, 0);
    const totalFees = validSales.reduce((acc, curr) => acc + (curr.deliveryFee || 0) + (curr.logzzFee || 0), 0);
    const netValue = totalValue - totalFees;
    return { count, totalValue, totalFees, netValue };
  }, [filteredSales]);

  // Entregas pendentes no período: status em {AGENDADO, REAGENDADO} com entregaAgendadaDate no período
  const pendingDeliveries = useMemo(() => {
    const allowedStatuses = ['AGENDADO', 'REAGENDADO'];
    return sales.filter(s => {
      // Only include AGENDADO/REAGENDADO
      if (!allowedStatuses.includes(s.status)) return false;

      // Filter by scheduledDate (entregaAgendadaDate) within the period
      const scheduled = s.scheduledDate || '';
      if (!scheduled) return false;

      if (dateFrom && scheduled < dateFrom) return false;
      if (dateTo && scheduled > dateTo) return false;

      return true;
    }).length;
  }, [sales, dateFrom, dateTo]);

  // Agendamentos realizados no período: status em {AGENDADO, REAGENDADO, ENTREGUE} com negociacaoWppDate no período (exclui FRUSTRADO)
  const scheduledAppointments = useMemo(() => {
    const allowedStatuses = ['AGENDADO', 'REAGENDADO', 'ENTREGUE'];
    return sales.filter(s => {
      // Only include valid statuses (excludes FRUSTRADO)
      if (!allowedStatuses.includes(s.status)) return false;

      // Filter by schedulingDate (negociacaoWppDate) within the period
      const scheduling = s.schedulingDate || '';
      if (!scheduling) return false;

      if (dateFrom && scheduling < dateFrom) return false;
      if (dateTo && scheduling > dateTo) return false;

      return true;
    }).length;
  }, [sales, dateFrom, dateTo]);

  // Vendas entregues no período (baseado em deliveryDate/entregaRealizadaDate, apenas ENTREGUE)
  const deliveredSales = useMemo(() => {
    return sales.filter(s => {
      // Only count ENTREGUE status
      if (s.status !== 'ENTREGUE') return false;

      // Filter by deliveryDate within the period
      const delivery = s.deliveryDate || '';
      if (!delivery) return false;

      if (dateFrom && delivery < dateFrom) return false;
      if (dateTo && delivery > dateTo) return false;

      return true;
    }).length;
  }, [sales, dateFrom, dateTo]);

  // --- HANDLERS ---
  const handleOpenModal = (sale?: Sale) => {
    if (sale) {
      setEditingSale(sale);
      setFormData({
        ...sale,
        quantity: sale.quantity || 1,
        schedulingDate: sale.schedulingDate,
        scheduledDate: sale.scheduledDate
      });
      // Try to infer base price (heuristic: value / quantity)
      setSelectedOptionPrice((sale.value || 0) / (sale.quantity || 1));
    } else {
      setEditingSale(null);
      setFormData({
        productId: '',
        quantity: 1,
        value: 0,
        deliveryType: 'Logzz',
        status: 'AGENDADO',
        createdAt: new Date().toISOString(),
        agentId: currentUser?.id,
        schedulingDate: todayStr,
        scheduledDate: todayStr,
        deliveryFee: 0,
        logzzFee: 0
      });
      setSelectedOptionPrice(0);
    }
    setIsModalOpen(true);
  };

  const handleDelete = (saleId: string) => {
    setSaleToDelete(saleId);
  };

  const confirmDelete = () => {
    if (saleToDelete) {
      deleteSale(saleToDelete);
      setSaleToDelete(null);
    }
  };

  const handleMarkDeliveredToday = (sale: Sale) => {
    updateSale({
      ...sale,
      status: 'ENTREGUE',
      deliveryDate: todayStr
    });
  };

  const handleMarkFrustrated = (sale: Sale) => {
    updateSale({
      ...sale,
      status: 'FRUSTRADO'
    });
  };

  const handleQuickStatusChange = (sale: Sale, newStatus: SaleStatus) => {
    let updates: Partial<Sale> = { status: newStatus };
    if (newStatus === 'ENTREGUE' && !sale.deliveryDate) {
      updates.deliveryDate = todayStr;
    }
    updateSale({ ...sale, ...updates });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.customerPhone) {
      alert("Preencha nome e telefone");
      return;
    }

    let finalData = { ...formData };

    // Validation for Logzz: Batch is required
    if (finalData.deliveryType === 'Logzz' && !finalData.batchId) {
      alert("Selecione o lote para vendas via Logzz");
      return;
    }

    // Validation: AGENDADO/REAGENDADO requires scheduledDate (entregaAgendadaDate)
    if ((finalData.status === 'AGENDADO' || finalData.status === 'REAGENDADO') && !finalData.scheduledDate) {
      alert("Para status AGENDADO ou REAGENDADO, a data de entrega agendada é obrigatória.");
      return;
    }

    // Force clear batch for Correios to avoid dirty data
    if (finalData.deliveryType === 'Correios') {
      finalData.batchId = null;
    }

    // Auto-fill deliveryDate (entregaRealizadaDate) when status is ENTREGUE
    if (finalData.status === 'ENTREGUE' && !finalData.deliveryDate) {
      finalData.deliveryDate = todayStr;
    }
    if (finalData.status !== 'ENTREGUE') {
      finalData.deliveryDate = null;
    }

    // Auto-change to REAGENDADO if scheduledDate changed
    if (editingSale) {
      if (editingSale.status === 'AGENDADO' && finalData.scheduledDate !== editingSale.scheduledDate) {
        if (finalData.status === 'AGENDADO') {
          finalData.status = 'REAGENDADO';
        }
      }
    }

    if (editingSale) {
      updateSale({ ...editingSale, ...finalData } as Sale);
    } else {
      addSale({ ...finalData, id: Date.now().toString(), createdAt: new Date().toISOString() } as Sale);
    }
    setIsModalOpen(false);
  };

  const getDateLabel = () => {
    if (filterStatus === 'ENTREGUE') return "Período (Realizado)";
    return "Período (Previsto)";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-white">Gestão de Vendas</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/vendas/produtos')}
            className="bg-[#1F1F1F] border border-white/10 text-white px-4 py-2 rounded-lg hover:bg-[#252525] flex items-center gap-2 font-bold shadow-sm transition-colors"
          >
            <Package size={18} /> Produtos
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="bg-[#5D7F38] text-white px-4 py-2 rounded-lg hover:bg-[#4a662c] flex items-center gap-2 font-bold shadow-lg shadow-[#5D7F38]/20"
          >
            <Plus size={18} /> Nova Venda
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-[#1F1F1F] p-4 rounded-xl shadow-sm border border-white/5 flex flex-col lg:flex-row gap-4 items-center">

        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 text-[#808080]" size={20} />
          <input
            type="text"
            placeholder="Buscar por cliente, telefone..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#252525] border border-white/5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5D7F38] text-sm font-medium text-white placeholder:text-[#606060]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">

          {/* Status Filter */}
          <div className="flex items-center gap-2 border border-white/5 rounded-lg p-1.5 bg-[#252525] flex-1 lg:flex-none">
            <Filter size={16} className="text-[#808080] ml-2" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-xs font-black uppercase tracking-widest focus:outline-none text-white w-full lg:w-32 cursor-pointer"
            >
              <option value="all" className="bg-[#252525]">Todos Status</option>
              <option value="AGENDADO" className="bg-[#252525]">Agendado</option>
              <option value="REAGENDADO" className="bg-[#252525]">Reagendado</option>
              <option value="ENTREGUE" className="bg-[#252525]">Entregue</option>
              <option value="FRUSTRADO" className="bg-[#252525]">Frustrado</option>
            </select>
          </div>

          {/* View By Filter */}
          <div className="flex items-center gap-2 border border-white/5 rounded-lg p-1.5 bg-[#252525] flex-1 lg:flex-none">
            <Eye size={16} className="text-[#808080] ml-2" />
            <select
              value={viewBy}
              onChange={(e) => setViewBy(e.target.value as ViewByOption)}
              className="bg-transparent text-xs font-black uppercase tracking-widest focus:outline-none text-white w-full lg:w-40 cursor-pointer"
            >
              <option value="scheduledDate" className="bg-[#252525]">Entrega Agendada</option>
              <option value="schedulingDate" className="bg-[#252525]">Agendamento (WPP)</option>
              <option value="deliveryDate" className="bg-[#252525]">Entrega Realizada</option>
            </select>
          </div>

          {/* FRUSTRATED MANAGEMENT BUTTON */}
          {filterStatus === 'FRUSTRADO' && (
            <button
              onClick={() => navigate('/vendas/frustradas')}
              className="bg-red-500/10 text-red-500 border border-red-500/20 px-4 py-2 rounded-lg hover:bg-red-500/20 flex items-center gap-2 font-bold shadow-sm transition-colors animate-in fade-in slide-in-from-right-2"
            >
              <TrendingDown size={18} />
              Gerenciar Motivos
            </button>
          )}

          {/* NEW DROPDOWN PERIOD FILTER */}
          <div className="relative flex-1 lg:flex-none">
            <div className="absolute -top-2.5 left-2 bg-[#1F1F1F] px-1 text-[9px] font-black uppercase text-[#808080] z-10">
              {getDateLabel()}
            </div>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as PeriodOption)}
              className="appearance-none bg-[#1F1F1F] border border-white/5 rounded-lg pl-4 pr-10 py-2.5 text-xs font-black uppercase tracking-widest text-[#E5E5E5] shadow-sm focus:outline-none focus:ring-1 focus:ring-[#5D7F38] cursor-pointer w-full"
            >
              <option value="hoje">Hoje</option>
              <option value="amanha">Amanhã</option>
              <option value="ontem">Ontem</option>
              <option value="7d_futuro">Próximos 7 dias</option>
              <option value="7d_passado">Últimos 7 dias</option>
              <option value="personalizado">Personalizado</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#808080]">
              <ChevronDown size={14} />
            </div>
          </div>

          {/* CUSTOM DATE INPUTS */}
          {selectedPeriod === 'personalizado' && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 bg-[#1F1F1F] border border-white/5 rounded-lg p-1.5 shadow-sm animate-in fade-in slide-in-from-right-2 duration-200">
                <Calendar size={16} className="text-[#808080] ml-1" />
                <input
                  type="date"
                  className="text-[11px] font-bold border-none focus:ring-0 text-[#E5E5E5] bg-transparent outline-none cursor-pointer p-0 w-24 [color-scheme:dark]"
                  value={dateFrom}
                  onChange={(e) => {
                    const newFrom = e.target.value;
                    setDateFrom(newFrom);
                    if (dateTo && newFrom > dateTo) {
                      setDateError('Data inicial não pode ser maior que a data final.');
                    } else {
                      setDateError('');
                    }
                  }}
                />
                <span className="text-[#606060] text-[9px] font-bold">até</span>
                <input
                  type="date"
                  className="text-[11px] font-bold border-none focus:ring-0 text-[#E5E5E5] bg-transparent outline-none cursor-pointer p-0 w-24 [color-scheme:dark]"
                  value={dateTo}
                  onChange={(e) => {
                    const newTo = e.target.value;
                    if (dateFrom && newTo < dateFrom) {
                      setDateError('Data final não pode ser menor que a data inicial.');
                    } else {
                      setDateError('');
                      setDateTo(newTo);
                    }
                  }}
                />
              </div>
              {dateError && (
                <span className="text-[10px] text-red-400 font-bold ml-1 animate-in fade-in">
                  {dateError}
                </span>
              )}
            </div>
          )}

        </div>
      </div>

      {/* CONTEXTUAL SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1F1F1F] p-4 rounded-xl border border-white/5 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-full bg-[#252525] text-[#808080]">
            <ShoppingBag size={20} />
          </div>
          <div>
            <p className="text-[10px] text-[#606060] font-black uppercase tracking-widest leading-none mb-1">Vendas Listadas</p>
            <p className="text-xl font-black text-white">{listSummary.count}</p>
          </div>
        </div>

        <div className="bg-[#1F1F1F] p-4 rounded-xl border border-white/5 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-500">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-[10px] text-[#606060] font-black uppercase tracking-widest leading-none mb-1">Valor Total</p>
            <p className="text-xl font-black text-emerald-500">{formatCurrency(listSummary.totalValue)}</p>
          </div>
        </div>

        <div className="bg-[#1F1F1F] p-4 rounded-xl border border-white/5 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-full bg-[#5D7F38]/10 text-[#5D7F38]">
            <Wallet size={20} />
          </div>
          <div>
            <p className="text-[10px] text-[#606060] font-black uppercase tracking-widest leading-none mb-1">Valor Líquido</p>
            <p className="text-xl font-black text-[#5D7F38]">{formatCurrency(listSummary.netValue)}</p>
          </div>
        </div>

        <div className="bg-[#1F1F1F] p-4 rounded-xl border border-white/5 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-full bg-amber-500/10 text-amber-500">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-[10px] text-[#606060] font-black uppercase tracking-widest leading-none mb-1">Entregas Pendentes</p>
            <p className="text-xl font-black text-amber-500">{pendingDeliveries}</p>
          </div>
        </div>

        <div className="bg-[#1F1F1F] p-4 rounded-xl border border-white/5 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-full bg-blue-500/10 text-blue-500">
            <CalendarCheck size={20} />
          </div>
          <div>
            <p className="text-[10px] text-[#606060] font-black uppercase tracking-widest leading-none mb-1">Agendamentos Realizados</p>
            <p className="text-xl font-black text-blue-500">{scheduledAppointments}</p>
          </div>
        </div>

        <div className="bg-[#1F1F1F] p-4 rounded-xl border border-white/5 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-full bg-[#5D7F38]/10 text-[#5D7F38]">
            <Truck size={20} />
          </div>
          <div>
            <p className="text-[10px] text-[#606060] font-black uppercase tracking-widest leading-none mb-1">Vendas Entregues</p>
            <p className="text-xl font-black text-[#5D7F38]">{deliveredSales}</p>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-[#1F1F1F] rounded-xl shadow-sm border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#252525] border-b border-white/5">
              <tr>
                <th className="p-4 font-black uppercase text-[10px] text-[#808080] tracking-widest">Cliente</th>
                <th className="p-4 font-black uppercase text-[10px] text-[#808080] tracking-widest">Status</th>
                <th className="p-4 font-black uppercase text-[10px] text-[#808080] tracking-widest">Agendado (WPP)</th>
                <th className="p-4 font-black uppercase text-[10px] text-[#808080] tracking-widest">Entrega Agendada</th>
                <th className="p-4 font-black uppercase text-[10px] text-[#808080] tracking-widest">Entrega Realizada</th>
                <th className="p-4 font-black uppercase text-[10px] text-[#808080] tracking-widest">Valor</th>
                <th className="p-4 font-black uppercase text-[10px] text-[#808080] tracking-widest hidden md:table-cell">Atendente</th>
                <th className="p-4 font-black uppercase text-[10px] text-[#808080] tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-white">{sale.customerName}</div>
                    <div className="text-[10px] font-black text-[#808080]">{sale.customerPhone}</div>
                  </td>
                  <td className="p-4">
                    <select
                      value={sale.status}
                      onChange={(e) => handleQuickStatusChange(sale, e.target.value as SaleStatus)}
                      className={`px-3 py-1 rounded-full text-[10px] font-black cursor-pointer border-0 ring-1 ring-inset bg-[#252525] focus:ring-2 focus:ring-inset ${sale.status === 'AGENDADO' ? 'text-blue-400 ring-blue-500/30' :
                        sale.status === 'REAGENDADO' ? 'text-amber-400 ring-amber-500/30' :
                          sale.status === 'ENTREGUE' ? 'text-[#5D7F38] ring-[#5D7F38]/30' :
                            'text-red-400 ring-red-500/30'
                        }`}
                    >
                      <option value="AGENDADO">AGENDADO</option>
                      <option value="REAGENDADO">REAGENDADO</option>
                      <option value="ENTREGUE">ENTREGUE</option>
                      <option value="FRUSTRADO">FRUSTRADO</option>
                    </select>
                  </td>
                  <td className="p-4 text-xs font-bold text-[#A0A0A0]">
                    {formatDate(sale.schedulingDate || '')}
                  </td>
                  <td className="p-4 text-xs font-black text-blue-400 bg-blue-500/10 rounded-lg px-2">
                    {formatDate(sale.scheduledDate || '')}
                  </td>
                  <td className="p-4 text-xs font-black text-emerald-500 bg-emerald-500/10 rounded-lg px-2">
                    {sale.deliveryDate ? formatDate(sale.deliveryDate) : '-'}
                  </td>
                  <td className="p-4 font-black text-[#E5E5E5]">{formatCurrency(sale.value)}</td>
                  <td className="p-4 text-[11px] font-bold text-[#808080] hidden md:table-cell">
                    {users.find(u => u.id === sale.agentId)?.name || 'N/A'}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {(sale.status === 'AGENDADO' || sale.status === 'REAGENDADO') && (
                        <>
                          <button
                            onClick={() => handleMarkDeliveredToday(sale)}
                            className="p-1.5 bg-[#5D7F38]/20 text-[#5D7F38] rounded-lg hover:bg-[#5D7F38]/30 transition-colors"
                            title="Confirmar Entrega (Hoje)"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => handleMarkFrustrated(sale)}
                            className="p-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                            title="Marcar como Frustrado"
                          >
                            <XCircle size={16} />
                          </button>
                          <div className="w-px h-4 bg-white/10 mx-1"></div>
                        </>
                      )}
                      <button
                        onClick={() => handleOpenModal(sale)}
                        className="p-2 hover:bg-white/10 rounded-lg text-[#808080] hover:text-white transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(sale.id)}
                        className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-16 text-center text-[#606060] font-bold italic">
                    Nenhuma venda encontrada para {
                      viewBy === 'scheduledDate' ? 'Entrega agendada' :
                        viewBy === 'schedulingDate' ? 'Agendamento (WPP)' :
                          'Entrega realizada'
                    } no período {
                      selectedPeriod === 'hoje' ? 'HOJE' :
                        selectedPeriod === 'amanha' ? 'AMANHÃ' :
                          selectedPeriod === 'ontem' ? 'ONTEM' :
                            selectedPeriod === '7d_futuro' ? 'PRÓXIMOS 7 DIAS' :
                              selectedPeriod === '7d_passado' ? 'ÚLTIMOS 7 DIAS' :
                                `PERSONALIZADO (${dateFrom} a ${dateTo})`
                    }.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1F1F1F] rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in duration-200 border border-white/5">
            <div className="p-8 border-b border-white/5 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-white">{editingSale ? 'Editar Venda' : 'Nova Venda'}</h3>
                <p className="text-xs font-bold text-[#808080] uppercase tracking-widest mt-1">Lançamento Operacional</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-[#808080] hover:text-red-500 bg-[#252525] p-2 rounded-xl transition-all"><Plus size={28} className="rotate-45" /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-6">
              {/* PRODUCT SELECTION SECTION */}
              <div className="bg-[#252525] p-6 rounded-3xl border border-white/5 mb-6">
                <div className="grid grid-cols-1 gap-5">
                  <div>
                    <label className="block text-[10px] font-black text-[#808080] uppercase mb-1.5 tracking-widest">Produto</label>
                    <select
                      required
                      className="w-full bg-[#1F1F1F] border border-white/5 rounded-xl p-3.5 text-sm font-bold shadow-sm focus:border-[#5D7F38] outline-none transition-all text-white"
                      value={formData.productId || ''}
                      onChange={e => setFormData({ ...formData, productId: e.target.value, value: 0 })}
                    >
                      <option value="" className="bg-[#1F1F1F]">Selecione o produto...</option>
                      {products.filter(p => p.active).map(p => (
                        <option key={p.id} value={p.id} className="bg-[#1F1F1F]">{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* KITS SELECTION */}
                  {formData.productId && (
                    <div className="animate-in slide-in-from-top-2">
                      <label className="block text-[10px] font-black text-[#808080] uppercase mb-1.5 tracking-widest">Selecione a Oferta (Kit)</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                        {(() => {
                          const selectedProduct = products.find(p => p.id === formData.productId);
                          if (!selectedProduct) return null;

                          return (
                            <>
                              {/* Option: Unity */}
                              {selectedProduct.unitPrice > 0 && (
                                <div
                                  onClick={() => {
                                    const price = selectedProduct.unitPrice;
                                    setSelectedOptionPrice(price);
                                    setFormData({ ...formData, quantity: 1, value: price });
                                  }}
                                  className={`cursor-pointer p-3 rounded-xl border flex justify-between items-center transition-all ${selectedOptionPrice === selectedProduct.unitPrice ? 'border-[#5D7F38] bg-[#5D7F38]/10' : 'border-white/5 bg-[#1F1F1F] hover:bg-[#252525]'}`}
                                >
                                  <div>
                                    <p className="font-bold text-white text-xs">1 Unidade (Avulso)</p>
                                  </div>
                                  <p className="font-black text-[#5D7F38]">{formatCurrency(selectedProduct.unitPrice)}</p>
                                </div>
                              )}

                              {/* Option: Kits */}
                              {selectedProduct.kits?.map(kit => (
                                <div
                                  key={kit.kitId}
                                  onClick={() => {
                                    const price = kit.price;
                                    const units = kit.units;
                                    setSelectedOptionPrice(price);
                                    setFormData({ ...formData, quantity: units, value: price });
                                  }}
                                  className={`cursor-pointer p-3 rounded-xl border flex justify-between items-center transition-all ${selectedOptionPrice === kit.price ? 'border-[#5D7F38] bg-[#5D7F38]/10' : 'border-white/5 bg-[#1F1F1F] hover:bg-[#252525]'}`}
                                >
                                  <div>
                                    <p className="font-bold text-white text-xs">{kit.name}</p>
                                    <p className="text-[10px] text-[#808080]">{kit.units} unidades</p>
                                  </div>
                                  <p className="font-black text-[#5D7F38]">{formatCurrency(kit.price)}</p>
                                </div>
                              ))}
                            </>
                          );
                        })()}
                      </div>

                      {/* QUANTITY DISPLAY (ReadOnly) */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-black uppercase text-[#808080] tracking-widest">Quantidade Vendida</label>
                          {formData.productId && (
                            <div className="text-[10px] bg-[#1F1F1F] px-2 py-0.5 rounded text-[#808080] font-bold">
                              Estoque Total: {products.find(p => p.id === formData.productId)?.stock || 0}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 items-center">
                          <div className="w-20 bg-[#1F1F1F] border border-white/5 rounded-2xl p-4 font-black text-center text-[#808080] select-none">
                            {formData.quantity || 1}
                          </div>
                          <span className="text-xs font-bold text-[#808080]">
                            Total calculado: <span className="text-[#5D7F38]">{formatCurrency(formData.value || 0)}</span>
                          </span>
                        </div>

                        {/* Batch Selection - Only for Logzz */}
                        {formData.productId && formData.deliveryType === 'Logzz' && (
                          <div className="mt-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2">
                            <label className="text-[10px] font-black uppercase text-[#5D7F38] mb-2 block tracking-widest flex items-center gap-1.5">
                              <Package size={12} />
                              Selecione o Lote da Venda
                            </label>
                            <div className="relative">
                              <select
                                required
                                className="w-full bg-[#5D7F38]/10 border border-[#5D7F38]/30 rounded-2xl p-4 pr-10 font-black outline-none focus:border-[#5D7F38] text-[#5D7F38] appearance-none cursor-pointer"
                                value={formData.batchId || ''}
                                onChange={e => setFormData({ ...formData, batchId: e.target.value })}
                              >
                                <option value="" className="bg-[#1F1F1F] text-white">Selecione um lote...</option>
                                {transactions
                                  .filter(t => t.category === 'Estoque' && t.productId === formData.productId)
                                  .map(t => {
                                    // Calculate remaining stock for this batch
                                    const batchInitialQty = t.productQuantity || 0;
                                    const batchSalesQty = sales
                                      .filter(s => s.batchId === t.id && s.id !== editingSale?.id) // Exclude current sale if editing
                                      .reduce((sum, s) => sum + (s.quantity || 0), 0);
                                    const remaining = batchInitialQty - batchSalesQty;

                                    if (remaining <= 0) return null; // Hide exhausted batches

                                    return {
                                      id: t.id,
                                      name: t.batchName,
                                      remaining,
                                      date: t.date
                                    };
                                  })
                                  .filter(Boolean)
                                  .sort((a, b) => new Date(a!.date).getTime() - new Date(b!.date).getTime()) // FIFO order
                                  .map(batch => (
                                    <option key={batch!.id} value={batch!.id} className="bg-[#1F1F1F] text-white">
                                      {batch!.name || 'Sem Nome'} — Restam: {batch!.remaining} un. ({new Date(batch!.date).toLocaleDateString('pt-BR')})
                                    </option>
                                  ))
                                }
                              </select>
                              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5D7F38] pointer-events-none" size={16} />
                            </div>
                            <p className="text-[9px] text-[#5D7F38]/70 mt-1.5 font-medium ml-1">
                              Selecione de qual lote este produto está saindo. Apenas lotes com estoque aparecem aqui.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4 pt-4 border-t border-white/5">
                    <div>
                      <label className="block text-[10px] font-black text-[#808080] uppercase mb-1.5 tracking-widest">Nome do Cliente</label>
                      <input required className="w-full border border-white/5 rounded-2xl p-3.5 text-sm font-bold bg-[#1F1F1F] focus:border-[#5D7F38] outline-none transition-all text-white placeholder:text-[#606060]" value={formData.customerName || ''} onChange={e => setFormData({ ...formData, customerName: e.target.value })} placeholder="Ex: João Silva" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[#808080] uppercase mb-1.5 tracking-widest">WhatsApp / Telefone</label>
                    <input required className="w-full border border-white/5 rounded-2xl p-3.5 text-sm font-bold bg-[#1F1F1F] focus:border-[#5D7F38] outline-none transition-all text-white placeholder:text-[#606060]" value={formData.customerPhone || ''} onChange={e => setFormData({ ...formData, customerPhone: e.target.value })} placeholder="Ex: 11999999999" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[#808080] uppercase mb-1.5 tracking-widest">Valor da Venda (R$)</label>
                    <input type="number" step="0.01" required className="w-full border border-white/5 rounded-2xl p-3.5 text-sm font-black bg-[#1F1F1F] focus:border-[#5D7F38] outline-none transition-all text-white" value={formData.value} onChange={e => setFormData({ ...formData, value: parseFloat(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[#808080] uppercase mb-1.5 tracking-widest">Logística / Entrega</label>
                    <select className="w-full border border-white/5 rounded-2xl p-3.5 text-sm font-black bg-[#1F1F1F] focus:border-[#5D7F38] outline-none transition-all cursor-pointer text-white" value={formData.deliveryType} onChange={e => {
                      const newType = e.target.value as any;
                      setFormData({
                        ...formData,
                        deliveryType: newType,
                        batchId: newType === 'Correios' ? null : formData.batchId
                      });
                    }}>
                      <option value="Logzz">Logzz (Pagto na Entrega)</option>
                      <option value="Correios">Correios (Antecipado)</option>
                    </select>
                  </div>

                  {formData.deliveryType === 'Logzz' && (
                    <div className="grid grid-cols-2 gap-4 bg-[#5D7F38]/5 p-4 rounded-2xl border border-[#5D7F38]/10 animate-in slide-in-from-top-2">
                      <div>
                        <label className="block text-[10px] font-black text-[#5D7F38] uppercase mb-1.5 tracking-widest">Taxa de Entrega (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full border border-[#5D7F38]/20 rounded-xl p-3 text-sm font-bold bg-[#1F1F1F] focus:border-[#5D7F38] outline-none transition-all text-white"
                          value={formData.deliveryFee || 0}
                          onChange={e => setFormData({ ...formData, deliveryFee: parseFloat(e.target.value) || 0 })}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-[#5D7F38] uppercase mb-1.5 tracking-widest">Taxa Logzz (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full border border-[#5D7F38]/20 rounded-xl p-3 text-sm font-bold bg-[#1F1F1F] focus:border-[#5D7F38] outline-none transition-all text-white"
                          value={formData.logzzFee || 0}
                          onChange={e => setFormData({ ...formData, logzzFee: parseFloat(e.target.value) || 0 })}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  )}

                </div>

                {/* Campaigns Context */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#252525] p-6 rounded-3xl border border-white/5 mt-6">
                  <div className="md:col-span-3 mb-2">
                    <p className="text-[10px] font-black text-[#808080] uppercase tracking-widest flex items-center gap-2"><Filter size={12} /> Origem do Tráfego</p>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-[#808080] mb-1 uppercase">Campanha</label>
                    <select
                      required
                      className="w-full bg-[#1F1F1F] border border-white/5 rounded-xl p-2.5 text-[11px] font-bold shadow-sm focus:border-[#5D7F38] outline-none text-white"
                      value={formData.campaignId || ''}
                      onChange={e => setFormData({
                        ...formData,
                        campaignId: e.target.value,
                        adSetId: '',
                        creativeId: ''
                      })}
                    >
                      <option value="">Selecione...</option>
                      {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-[#808080] mb-1 uppercase">Conjunto</label>
                    <select
                      required
                      className="w-full bg-[#1F1F1F] border border-white/5 rounded-xl p-2.5 text-[11px] font-bold shadow-sm focus:border-[#5D7F38] outline-none disabled:opacity-50 text-white"
                      value={formData.adSetId || ''}
                      onChange={e => setFormData({
                        ...formData,
                        adSetId: e.target.value,
                        creativeId: ''
                      })}
                      disabled={!formData.campaignId}
                    >
                      <option value="">Selecione...</option>
                      {filteredAdSets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-[#808080] mb-1 uppercase">Criativo</label>
                    <select
                      required
                      className="w-full bg-[#1F1F1F] border border-white/5 rounded-xl p-2.5 text-[11px] font-bold shadow-sm focus:border-[#5D7F38] outline-none disabled:opacity-50 text-white"
                      value={formData.creativeId || ''}
                      onChange={e => setFormData({ ...formData, creativeId: e.target.value })}
                      disabled={!formData.adSetId}
                    >
                      <option value="">Selecione...</option>
                      {filteredCreatives.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-[10px] font-black text-[#808080] uppercase mb-1.5 tracking-widest">Status Atual</label>
                  <select className="w-full border border-white/5 rounded-2xl p-3.5 text-sm font-black bg-[#1F1F1F] focus:border-[#5D7F38] outline-none transition-all cursor-pointer text-white" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as SaleStatus })}>
                    <option value="AGENDADO">Agendado</option>
                    <option value="REAGENDADO">Reagendado</option>
                    <option value="ENTREGUE">Entregue</option>
                    <option value="FRUSTRADO">Frustrado</option>
                  </select>
                </div>

                <div className="mt-6">
                  <label className="block text-[10px] font-black text-[#808080] uppercase mb-1.5 tracking-widest">Atendente Responsável</label>
                  <select required className="w-full border border-white/5 rounded-2xl p-3.5 text-sm font-black bg-[#1F1F1F] focus:border-[#5D7F38] outline-none transition-all cursor-pointer text-white" value={formData.agentId || ''} onChange={e => setFormData({ ...formData, agentId: e.target.value })}>
                    <option value="">Selecione...</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>

                {/* --- DATE FIELDS --- */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/5 mt-6">
                  <div>
                    <label className="block text-[10px] font-black text-[#808080] uppercase mb-1 tracking-widest leading-none">Negociação (WPP)</label>
                    <input type="date" className="w-full border border-white/5 rounded-xl p-2.5 text-xs font-bold bg-[#1F1F1F] outline-none text-white [color-scheme:dark]" value={formData.schedulingDate || ''} onChange={e => setFormData({ ...formData, schedulingDate: e.target.value })} />
                    <p className="text-[9px] text-[#606060] mt-1 font-bold">Dia do contato</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-blue-400 uppercase mb-1 tracking-widest leading-none">Entrega Agendada</label>
                    <input type="date" className="w-full border border-blue-500/20 rounded-xl p-2.5 text-xs font-black bg-blue-500/10 text-blue-400 outline-none [color-scheme:dark]" value={formData.scheduledDate || ''} onChange={e => setFormData({ ...formData, scheduledDate: e.target.value })} required={formData.status === 'AGENDADO' || formData.status === 'REAGENDADO'} />
                    <p className="text-[9px] text-blue-500/50 mt-1 font-bold">Data prevista</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-emerald-400 uppercase mb-1 tracking-widest leading-none">Entrega Realizada</label>
                    <input type="date" className="w-full border border-emerald-500/20 rounded-xl p-2.5 text-xs font-black bg-emerald-500/10 text-emerald-400 outline-none disabled:opacity-30 [color-scheme:dark]" value={formData.deliveryDate || ''} onChange={e => setFormData({ ...formData, deliveryDate: e.target.value })} disabled={formData.status !== 'ENTREGUE'} />
                    <p className="text-[9px] text-emerald-500/50 mt-1 font-bold">Confirmação final</p>
                  </div>
                </div>

                {formData.status === 'FRUSTRADO' && (
                  <div className="md:col-span-2 animate-in slide-in-from-top-2 mt-6">
                    <label className="block text-[10px] font-black text-red-500 uppercase mb-1.5 tracking-widest">Motivo da Frustração</label>
                    <select required className="w-full border border-red-500/20 rounded-2xl p-3.5 text-sm font-black bg-red-500/10 focus:border-red-500 outline-none transition-all cursor-pointer text-white" value={formData.frustrationReasonId || ''} onChange={e => setFormData({ ...formData, frustrationReasonId: e.target.value })}>
                      <option value="" className="bg-[#1F1F1F]">Selecione o motivo...</option>
                      {frustrationReasons.map(f => <option key={f.id} value={f.id} className="bg-[#1F1F1F]">{f.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-6 border-t border-white/5">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-4 text-xs font-black border border-white/5 rounded-2xl text-[#808080] hover:bg-white/5 transition-all uppercase tracking-widest">CANCELAR</button>
                <button type="submit" className="flex-[2] px-6 py-4 text-xs font-black bg-[#5D7F38] text-white rounded-2xl shadow-xl shadow-[#5D7F38]/30 hover:bg-[#4a662c] transition-all uppercase tracking-widest flex items-center justify-center gap-2">
                  SALVAR VENDA <ArrowRight size={18} />
                </button>
              </div>
            </form>
          </div>
        </div >
      )}

      <ConfirmationModal
        isOpen={!!saleToDelete}
        onClose={() => setSaleToDelete(null)}
        onConfirm={confirmDelete}
        title="Excluir Venda"
        description="Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita."
        confirmText="Excluir Venda"
        cancelText="Cancelar"
        variant="danger"
      />
    </div >
  );
};
