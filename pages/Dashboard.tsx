
import React, { useContext, useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOperations } from '../contexts/OperationsContext';
import { useFinance } from '../contexts/FinanceContext';
import { useMarketing } from '../contexts/MarketingContext';

import { formatCurrency, getCurrentLocalDate, getLast30DaysDate } from '../constants';
import { getPeriodRange } from '../utils/dateUtils';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Area, AreaChart
} from 'recharts';
import {
  TrendingUp, DollarSign, Megaphone, Calendar, Trophy,
  BarChart3, ChevronDown, UserCheck, CalendarClock, Tag, Wallet, Package, Info, Plus,
  Landmark, Building2, Filter, MousePointerClick
} from 'lucide-react';

// Helper for Lucide imports if some are missing, I'll stick to safe ones or imports I know exist.
// 'Landmark' exists in newer lucide. 

const DashboardCard = ({
  title,
  value,
  subtext,
  tooltip,
  icon: Icon,
  iconClassName,
  onClick,
  isKpi = false,
  showArrow = false
}: any) => {
  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden
        bg-[#1F1F1F] rounded-2xl border border-white/5 
        flex flex-col justify-between 
        ${isKpi ? 'p-6 min-h-[140px]' : 'p-5 min-h-[120px]'}
        ${onClick ? 'cursor-pointer hover:border-white/10 hover:bg-[#252525] transition-all' : ''}
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#808080]">{title}</p>
          {tooltip && (
            <div className="group relative">
              <Info size={12} className="text-[#505050] hover:text-[#808080] cursor-help" />
              <div className="absolute left-0 top-full mt-2 w-max px-3 py-2 bg-[#333] text-white text-[11px] font-medium rounded-lg shadow-xl border border-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none whitespace-nowrap">
                {tooltip}
                <div className="absolute left-2 bottom-full border-4 border-transparent border-b-[#333]"></div>
              </div>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${iconClassName || 'bg-[#2A2A2A] text-[#808080]'}`}>
            <Icon size={isKpi ? 20 : 18} />
          </div>
        )}
      </div>

      <div className="flex items-end justify-between">
        <h3 className={`font-bold text-white tracking-tight ${isKpi ? 'text-3xl' : 'text-2xl'}`}>
          {value}
        </h3>
        {showArrow && (
          <div className="bg-[#2A2A2A] p-1.5 rounded-lg">
            <TrendingUp size={14} className="text-emerald-500" />
          </div>
        )}
      </div>

      {subtext && <p className="text-[10px] font-medium text-[#606060] mt-1">{subtext}</p>}
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1F1F1F] border border-white/10 p-3 rounded-xl shadow-xl">
        <p className="text-[#808080] text-[10px] font-bold uppercase tracking-wider mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-xs font-bold mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-white">{entry.name}:</span>
            <span className="text-white">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

type PeriodOption = 'hoje' | 'amanha' | 'ontem' | '7d_futuro' | '7d_passado' | 'personalizado';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { sales } = useOperations();
  const { dailyMetrics } = useMarketing();
  const { transactions, ledgers } = useFinance();


  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('7d_passado');
  const [dateFrom, setDateFrom] = useState<string>(getCurrentLocalDate());
  const [dateTo, setDateTo] = useState<string>(getCurrentLocalDate());
  const [dateError, setDateError] = useState<string>('');

  // Lógica para atualizar as datas baseado no período selecionado
  useEffect(() => {
    if (selectedPeriod === 'personalizado') return;

    const { startDateTime, endDateTime } = getPeriodRange(selectedPeriod);

    // The inputs expect YYYY-MM-DD
    if (startDateTime && endDateTime) {
      setDateFrom(startDateTime.split('T')[0]);
      setDateTo(endDateTime.split('T')[0]);
    }
  }, [selectedPeriod]);

  const isFiltered = !!(dateFrom || dateTo);

  const isWithinRange = (dateStr?: string | null) => {
    if (!dateFrom && !dateTo) return true;
    if (!dateStr) return false;
    const d = dateStr.split('T')[0];
    const start = dateFrom || '0000-01-01';
    const end = dateTo || '9999-12-31';
    return d >= start && d <= end;
  };

  const kpis = useMemo(() => {
    const revenueRealized = sales
      .filter(s => s.status === 'ENTREGUE' && isWithinRange(s.deliveryDate))
      .reduce((acc, curr) => acc + curr.value, 0);

    const filteredMetrics = dailyMetrics.filter(m => isWithinRange(m.date));
    const totalInvestment = filteredMetrics.reduce((acc, curr) => acc + curr.investment, 0);
    const roas = totalInvestment > 0 ? revenueRealized / totalInvestment : 0;

    const deliveredCount = sales.filter(s => s.status === 'ENTREGUE' && isWithinRange(s.deliveryDate)).length;
    const frustratedCount = sales.filter(s => s.status === 'FRUSTRADO' && isWithinRange(s.scheduledDate)).length;
    const scheduledCount = sales.filter(s => s.status === 'AGENDADO' && isWithinRange(s.scheduledDate)).length;
    const rescheduledCount = sales.filter(s => s.status === 'REAGENDADO' && isWithinRange(s.scheduledDate)).length;
    const scheduledTotal = scheduledCount + rescheduledCount;

    // CPA Logic - Includes ALL confirmed appointments (Delivered, Frustrated, Scheduled, Rescheduled)
    // Filtered by scheduledDate to match the investment period for generating the appointment
    const totalAppointments = sales.filter(s =>
      ['AGENDADO', 'REAGENDADO', 'ENTREGUE', 'FRUSTRADO'].includes(s.status) &&
      isWithinRange(s.scheduledDate)
    ).length;

    const totalResolved = deliveredCount + frustratedCount;

    // CMV Calculation logic
    const deliveredSales = sales.filter(s => s.status === 'ENTREGUE' && isWithinRange(s.deliveryDate));
    let totalCMV = 0;

    deliveredSales.forEach(sale => {
      if (sale.batchId) {
        const batchTx = transactions.find(t => t.id === sale.batchId);
        if (batchTx && batchTx.amount && batchTx.productQuantity) {
          const unitCost = batchTx.amount / batchTx.productQuantity;
          totalCMV += unitCost * (sale.quantity || 1);
        }
      }
    });

    // Calculate Logzz Fees (from both Finance module and per-sale fields)
    const financialLogzzFees = transactions
      .filter(t => {
        const ledger = ledgers.find(l => l.id === t.ledgerId);
        return ledger && ledger.type === 'PJ';
      })
      .filter(t => t.description === 'taxas Logzz' || t.category === 'taxas Logzz')
      .filter(t => isWithinRange(t.date))
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);

    const perSaleLogzzFees = sales
      .filter(s => s.status === 'ENTREGUE' && isWithinRange(s.deliveryDate))
      .reduce((acc, curr) => acc + (curr.deliveryFee || 0) + (curr.logzzFee || 0), 0);

    const totalLogzzFees = financialLogzzFees + perSaleLogzzFees;

    const totalRevenue = revenueRealized;
    const averageUnitCost = deliveredCount > 0 ? totalCMV / deliveredSales.reduce((acc, s) => acc + (s.quantity || 1), 0) : 0;

    // Gross Profit = Revenue - (Ads + CMV + Fees)
    const totalProfit = revenueRealized - (totalInvestment + totalCMV + totalLogzzFees);

    return {
      revenueRealized, totalInvestment, roas, totalProfit,
      deliveryRate: totalResolved > 0 ? (deliveredCount / totalResolved) * 100 : 0,
      deliveredCount, frustratedCount, scheduledCount, rescheduledCount,
      custoPorVenda: deliveredCount > 0 ? totalInvestment / deliveredCount : 0,
      custoPorAgendamento: totalAppointments > 0 ? totalInvestment / totalAppointments : 0,
      ticketMedio: deliveredCount > 0 ? revenueRealized / deliveredCount : 0,
      lucroPorVenda: deliveredCount > 0 ? totalProfit / deliveredCount : 0,
      filteredMetrics,
      totalCMV,
      averageUnitCost,
      totalLogzzFees
    };
  }, [sales, dailyMetrics, dateFrom, dateTo, transactions, ledgers]);

  const chartData = useMemo(() => {
    if (!dateFrom || !dateTo) {
      const dataMap: Record<string, any> = {};
      sales.forEach(s => {
        let date = '';
        if (s.status === 'ENTREGUE') date = s.deliveryDate || '';
        else if (s.status === 'FRUSTRADO') date = s.scheduledDate || '';

        if (date) {
          if (!dataMap[date]) dataMap[date] = { date, Entregues: 0, Frustrados: 0 };
          if (s.status === 'ENTREGUE') dataMap[date].Entregues += 1;
          else if (s.status === 'FRUSTRADO') dataMap[date].Frustrados += 1;
        }
      });
      return Object.values(dataMap)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((d: any) => ({ ...d, date: d.date.split('-').reverse().slice(0, 2).join('/') }));
    }

    const start = new Date(dateFrom + 'T12:00:00');
    const end = new Date(dateTo + 'T12:00:00');
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 90) {
      const dataMap: Record<string, any> = {};
      sales.forEach(s => {
        let date = '';
        if (s.status === 'ENTREGUE') date = s.deliveryDate || '';
        else if (s.status === 'FRUSTRADO') date = s.scheduledDate || '';

        if (date && date >= dateFrom && date <= dateTo) {
          if (!dataMap[date]) dataMap[date] = { date, Entregues: 0, Frustrados: 0 };
          if (s.status === 'ENTREGUE') dataMap[date].Entregues += 1;
          else if (s.status === 'FRUSTRADO') dataMap[date].Frustrados += 1;
        }
      });
      return Object.values(dataMap)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((d: any) => ({ ...d, date: d.date.split('-').reverse().slice(0, 2).join('/') }));
    }

    const data: any[] = [];
    const counts: Record<string, { e: number, f: number }> = {};

    sales.forEach(s => {
      let date = '';
      if (s.status === 'ENTREGUE') date = s.deliveryDate || '';
      else if (s.status === 'FRUSTRADO') date = s.scheduledDate || '';
      if (date && date >= dateFrom && date <= dateTo) {
        if (!counts[date]) counts[date] = { e: 0, f: 0 };
        if (s.status === 'ENTREGUE') counts[date].e += 1;
        else if (s.status === 'FRUSTRADO') counts[date].f += 1;
      }
    });

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      data.push({
        date: dateStr.split('-').reverse().slice(0, 2).join('/'),
        Entregues: counts[dateStr]?.e || 0,
        Frustrados: counts[dateStr]?.f || 0
      });
    }

    return data;
  }, [sales, dateFrom, dateTo]);

  return (
    <div className="bg-[#141414] min-h-full rounded-[30px] p-8 -m-8 md:-m-8 md:p-10 space-y-10 border border-[#222]">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Dashboard Operacional</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-[#A3E635] bg-[#A3E635]/10 px-2.5 py-1 rounded-md border border-[#A3E635]/20">
              Período Ativo
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-[#808080]">
              <ChevronDown size={14} />
            </div>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as PeriodOption)}
              className="appearance-none bg-[#1F1F1F] border border-white/10 rounded-xl pl-4 pr-10 py-3 text-[10px] font-bold uppercase tracking-widest text-[#E5E5E5] focus:outline-none focus:border-white/30 cursor-pointer hover:bg-[#252525] transition-colors"
            >
              <option value="hoje">Hoje</option>
              <option value="amanha">Amanhã</option>
              <option value="ontem">Ontem</option>
              <option value="7d_futuro">Próximos 7 dias</option>
              <option value="7d_passado">Últimos 7 dias</option>
              <option value="personalizado">Personalizado</option>
            </select>
          </div>

          {selectedPeriod === 'personalizado' && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 bg-[#1F1F1F] border border-white/10 rounded-xl p-2 px-3">
                <Calendar size={14} className="text-[#808080]" />
                <input
                  type="date"
                  className="bg-transparent border-none text-[10px] text-white font-bold p-0 focus:ring-0 [color-scheme:dark] w-24"
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
                <span className="text-[#606060] text-[9px]">até</span>
                <input
                  type="date"
                  className="bg-transparent border-none text-[10px] text-white font-bold p-0 focus:ring-0 [color-scheme:dark] w-24"
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
                <span className="text-[10px] text-red-400 font-bold ml-1">
                  {dateError}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashboardCard
          isKpi
          title="Faturamento"
          value={formatCurrency(kpis.revenueRealized)}
          icon={DollarSign}
          iconClassName="bg-[#1A2E22] text-[#22C55E]" // Dark Green bg, Bright Green text
          showArrow
        />
        <DashboardCard
          isKpi
          title="Lucro Bruto"
          value={formatCurrency(kpis.totalProfit)}
          tooltip="Rec. - (Ads + CMV + Taxas)"
          icon={BarChart3}
          iconClassName="bg-[#1A2E22] text-[#22C55E]"
        />
        <DashboardCard
          isKpi
          title="ROAS Geral"
          value={`${kpis.roas.toFixed(2)}x`}
          tooltip="Receita / Investimento"
          icon={TrendingUp}
          iconClassName="bg-[#2E201A] text-[#F97316]" // Dark Orange/Brown
        />
      </div>

      {/* Detail Sections */}
      <div className="space-y-10">

        {/* Marketing */}
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#606060] mb-5 ml-1">Marketing</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <DashboardCard
              title="Investimento Ads"
              value={formatCurrency(kpis.totalInvestment)}
              icon={Megaphone}
              iconClassName="bg-[#2E1A1A] text-[#EF4444]" // Redish
            />
            <DashboardCard
              title="Custo por Agendamento"
              value={formatCurrency(kpis.custoPorAgendamento)}
              icon={Calendar}
              iconClassName="bg-[#262626] text-[#A3A3A3]" // Grey/Neutral
            />
            <DashboardCard
              title="Custo por Venda"
              value={formatCurrency(kpis.custoPorVenda)}
              icon={UserCheck}
              iconClassName="bg-[#1A2E1F] text-[#4ADE80]" // Green
            />
          </div>
        </div>

        {/* Margem / Produto */}
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#606060] mb-5 ml-1">Margem / Produto</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <DashboardCard
              title="Ticket Médio"
              value={formatCurrency(kpis.ticketMedio)}
              icon={Tag}
              iconClassName="bg-[#2E241A] text-[#FB923C]" // Orange
            />
            <DashboardCard
              title="CMV (Produtos)"
              value={formatCurrency(kpis.totalCMV)}
              icon={Package}
              iconClassName="bg-[#2E1A1A] text-[#F87171]" // Red
            />
            <DashboardCard
              title="Taxas (Logzz)"
              value={formatCurrency(kpis.totalLogzzFees)}
              icon={Wallet} // Using Wallet as generic bank/money icon
              iconClassName="bg-[#1A2E22] text-[#22C55E]"
              onClick={() => navigate('/financeiro/taxas')}
            />
            <DashboardCard
              title="Lucro por Venda"
              value={formatCurrency(kpis.lucroPorVenda)}
              icon={Wallet}
              iconClassName="bg-[#1A2E22] text-[#22C55E]"
            />
          </div>
        </div>

        {/* Bottom Section: Funnel & Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Funnel - 1 Column */}
          <div className="lg:col-span-1 bg-[#1F1F1F] p-6 rounded-3xl border border-white/5 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Filter size={18} className="text-[#A16207]" /> {/* Funnel icon */}
                Funil de Vendas
              </h3>
              <span className="text-[9px] font-black uppercase text-[#A3E635] tracking-wider px-2 py-1 rounded bg-[#A3E635]/10 border border-[#A3E635]/20">
                Taxa de Entrega: {kpis.deliveryRate.toFixed(1)}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 flex-1">
              <div
                onClick={() => navigate('/vendas', { state: { status: 'AGENDADO' } })}
                className="bg-[#2A2A2A] rounded-2xl p-5 flex flex-col justify-center border border-white/5 cursor-pointer hover:bg-[#333] transition-colors"
              >
                <span className="text-3xl font-black text-[#3B82F6]">{kpis.scheduledCount}</span>
                <span className="text-[9px] font-bold uppercase text-[#606060] tracking-widest mt-1">Agendados</span>
              </div>
              <div
                onClick={() => navigate('/vendas', { state: { status: 'REAGENDADO' } })}
                className="bg-[#2A2A2A] rounded-2xl p-5 flex flex-col justify-center border border-white/5 cursor-pointer hover:bg-[#333] transition-colors"
              >
                <span className="text-3xl font-black text-[#F59E0B]">{kpis.rescheduledCount}</span>
                <span className="text-[9px] font-bold uppercase text-[#606060] tracking-widest mt-1">Reagendados</span>
              </div>
              <div
                onClick={() => navigate('/vendas', { state: { status: 'ENTREGUE' } })}
                className="bg-[#2A2A2A] rounded-2xl p-5 flex flex-col justify-center border border-white/5 cursor-pointer hover:bg-[#333] transition-colors"
              >
                <span className="text-3xl font-black text-[#10B981]">{kpis.deliveredCount}</span>
                <span className="text-[9px] font-bold uppercase text-[#606060] tracking-widest mt-1">Entregues</span>
              </div>
              <div
                onClick={() => navigate('/vendas', { state: { status: 'FRUSTRADO' } })}
                className="bg-[#2A2A2A] rounded-2xl p-5 flex flex-col justify-center border border-white/5 cursor-pointer hover:bg-[#333] transition-colors"
              >
                <span className="text-3xl font-black text-[#EF4444]">{kpis.frustratedCount}</span>
                <span className="text-[9px] font-bold uppercase text-[#606060] tracking-widest mt-1">Frustrados</span>
              </div>
            </div>
          </div>

          {/* Chart - 2 Columns */}
          <div className="lg:col-span-2 bg-[#1F1F1F] p-6 rounded-3xl border border-white/5 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-bold flex items-center gap-2">
                <TrendingUp size={18} className="text-[#22C55E]" />
                Desempenho Diário
              </h3>
            </div>
            <div className="flex-1 w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fontWeight: 'bold', fill: '#606060' }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fontWeight: 'bold', fill: '#606060' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#ffffff20', strokeWidth: 2 }} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Entregues"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: '#10B981', stroke: '#1F1F1F', strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Frustrados"
                    stroke="#EF4444"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: '#EF4444', stroke: '#1F1F1F', strokeWidth: 2 }}
                  />
                  {/* Creating a baseline/area effect like the mockup? Mockup has lines. Sticking to lines. */}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
