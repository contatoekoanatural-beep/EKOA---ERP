
import React, { useContext, useState, useMemo, useEffect, useRef } from 'react';
import { AppContext } from '../App';
import { formatCurrency, getCurrentLocalDate, formatDate } from '../constants';
import { useToast } from '../components/Toast';
import {
  Plus, Edit2, Trash2, X, Calculator, ArrowUpCircle, ArrowDownCircle,
  TrendingUp, CreditCard, Landmark, ReceiptText, ArrowLeft, Clock, ArrowRight, ChevronDown, ChevronLeft, ChevronRight, Check, ShoppingBag, AlertTriangle, Eye, Calendar, CheckCircle2, Eraser, Filter, ShieldAlert, Building2, User, AlertCircle
} from 'lucide-react';
import { Transaction, CreditCard as CreditCardType, Debt, Ledger, Recurrence, TransactionStatus, PaymentMethod } from '../types';
import { FinanceCategoryList } from './finance/components/FinanceCategoryList';
import { useFinanceCalculations } from '../hooks/useFinanceCalculations';

// Categories per ledger type - separated by transaction type (income/expense)
const INCOME_CATEGORIES: Record<string, string[]> = {
  PF: ['Salário', 'Freelance', 'Investimentos', 'Vendas', 'Outros'],
  PJ: ['Assinaturas Saas', 'Implementação Saas', 'Gestão de tráfego', 'Empréstimos', 'TikTok Shop', 'Vendas COD', 'Outros']
};

const EXPENSE_CATEGORIES: Record<string, string[]> = {
  PF: ['Empréstimos', 'Mercado', 'Lazer', 'Imagem', 'Moradia', 'Carro', 'Outros'],
  PJ: ['Marketing', 'Ferramentas', 'Assinaturas', 'Empréstimos', 'Estoque', 'taxas Logzz', 'Equipamentos', 'Contadora', 'Outros']
};

// Helper to get categories based on transaction type and ledger
const getCategoriesForTransaction = (ledgerType: string, transactionType: string): string[] => {
  if (transactionType === 'income') {
    return INCOME_CATEGORIES[ledgerType] || INCOME_CATEGORIES.PF;
  }
  return EXPENSE_CATEGORIES[ledgerType] || EXPENSE_CATEGORIES.PF;
};

const StatCard = ({ title, value, subtext, icon: Icon, colorClass, highlight = false, onClick }: any) => (
  <div onClick={onClick} className={`p-6 rounded-2xl border ${highlight ? 'bg-[#5D7F38] border-[#5D7F38]/50 text-white' : 'bg-[#1F1F1F] border-white/5'} flex flex-col justify-between h-full transition-all hover:border-white/10 ${onClick ? 'cursor-pointer hover:bg-[#252525] active:scale-[0.98]' : ''}`}>
    <div className="flex items-start justify-between">
      <div>
        <p className={`text-[10px] font-black uppercase tracking-widest ${highlight ? 'text-white/70' : 'text-[#808080]'}`}>{title}</p>
        <h3 className={`text-2xl font-black mt-1 ${highlight ? 'text-white' : 'text-white'}`}>{value}</h3>
        {subtext && <p className={`text-[10px] font-bold mt-1 ${highlight ? 'text-white/60' : 'text-[#606060]'}`}>{subtext}</p>}
      </div>
      <div className={`p-3 rounded-2xl ${highlight ? 'bg-white/20 text-white' : colorClass}`}>
        <Icon size={24} />
      </div>
    </div>
  </div>
);

export const Finance = () => {
  const {
    ledgers, transactions, recurrences, cards, debts, debtContracts, openingBalances, products, warehouses,
    addTransaction, updateTransaction, deleteTransaction,
    addCard, updateCard, deleteCard,
    addRecurrence, updateRecurrence, deleteRecurrence,
    addDebt, updateDebt, deleteDebt,
    addDebtContract, updateDebtContract, deleteDebtContract,
    addOpeningBalance, updateOpeningBalance
  } = useContext(AppContext);

  const toast = useToast();
  const { getFinancialStats } = useFinanceCalculations();

  // Ledger selection with localStorage persistence
  const [selectedLedgerId, setSelectedLedgerId] = useState<string>(() =>
    localStorage.getItem('finance_ledger') || ''
  );
  const selectedLedger = useMemo(() => ledgers.find(l => l.id === selectedLedgerId), [ledgers, selectedLedgerId]);

  // Auto-select first ledger if none selected
  useEffect(() => {
    if (!selectedLedgerId && ledgers.length > 0) {
      const defaultLedger = ledgers.find(l => l.isDefault) || ledgers[0];
      setSelectedLedgerId(defaultLedger.id);
      localStorage.setItem('finance_ledger', defaultLedger.id);
    }
  }, [ledgers, selectedLedgerId]);

  const handleLedgerChange = (ledgerId: string) => {
    setSelectedLedgerId(ledgerId);
    localStorage.setItem('finance_ledger', ledgerId);
  };

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'FLOW' | 'RECURRENCES' | 'CARDS' | 'DEBTS' | 'CARD_DETAILS' | 'INCOME_DETAILS' | 'EXPENSE_DETAILS' | 'TRIAGE'>('OVERVIEW');

  // Month range filter state
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [filterStartMonth, setFilterStartMonth] = useState(currentMonthStr);
  const [filterEndMonth, setFilterEndMonth] = useState(currentMonthStr);
  const [showMonthPresets, setShowMonthPresets] = useState(false);
  const monthPresetRef = useRef<HTMLDivElement>(null);

  // Close month presets dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (monthPresetRef.current && !monthPresetRef.current.contains(event.target as Node)) {
        setShowMonthPresets(false);
      }
    };

    if (showMonthPresets) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMonthPresets]);

  // Legacy compatibility: filterMonth points to start month for single-month operations
  const filterMonth = filterStartMonth;
  const setFilterMonth = (month: string) => {
    setFilterStartMonth(month);
    setFilterEndMonth(month);
  };

  // Month navigation helpers - navigates both start and end together for single month
  const navigateMonth = (direction: 'prev' | 'next') => {
    const [year, month] = filterStartMonth.split('-').map(Number);
    const d = new Date(year, month - 1 + (direction === 'next' ? 1 : -1), 1);
    const newMonth = d.toISOString().slice(0, 7);

    // RESTRICTION: Do not allow navigation before 2026-01
    if (newMonth < '2026-01') return;

    // When navigating, reset to single month mode
    setFilterStartMonth(newMonth);
    setFilterEndMonth(newMonth);
  };

  const setMonthPreset = (preset: string) => {
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const minMonth = '2026-01';

    switch (preset) {
      case 'current':
        if (currentMonth >= minMonth) {
          setFilterStartMonth(currentMonth);
          setFilterEndMonth(currentMonth);
        } else {
          setFilterStartMonth(minMonth);
          setFilterEndMonth(minMonth);
        }
        break;
      case 'last':
        now.setMonth(now.getMonth() - 1);
        const lastMonth = now.toISOString().slice(0, 7);
        if (lastMonth >= minMonth) {
          setFilterStartMonth(lastMonth);
          setFilterEndMonth(lastMonth);
        } else {
          setFilterStartMonth(minMonth);
          setFilterEndMonth(minMonth);
        }
        break;
      case 'last3': {
        const end = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - 2);

        // Clamp start to minMonth
        let startStr = start.toISOString().slice(0, 7);
        if (startStr < minMonth) startStr = minMonth;

        setFilterStartMonth(startStr);
        setFilterEndMonth(end.toISOString().slice(0, 7));
        break;
      }
      case 'last6': {
        const end = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - 5);

        // Clamp start to minMonth
        let startStr = start.toISOString().slice(0, 7);
        if (startStr < minMonth) startStr = minMonth;

        setFilterStartMonth(startStr);
        setFilterEndMonth(end.toISOString().slice(0, 7));
        break;
      }
      case 'year':
        setFilterStartMonth(`${now.getFullYear()}-01` < minMonth ? minMonth : `${now.getFullYear()}-01`);
        setFilterEndMonth(currentMonth);
        break;
    }
    setShowMonthPresets(false);
  };

  const formatMonthDisplay = (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[month - 1]} ${year}`;
  };

  // Check if filtering by range (more than one month)
  const isRangeFilter = filterStartMonth !== filterEndMonth;

  // Display text for the filter
  const filterDisplayText = isRangeFilter
    ? `${formatMonthDisplay(filterStartMonth)} - ${formatMonthDisplay(filterEndMonth)}`
    : formatMonthDisplay(filterStartMonth);

  // Helper to check if a month is within the filter range
  const isMonthInRange = (refMonth: string | undefined) => {
    if (!refMonth) return false;
    return refMonth >= filterStartMonth && refMonth <= filterEndMonth;
  };

  const [showAllCardPending, setShowAllCardPending] = useState(false);
  const [expandedCardGroups, setExpandedCardGroups] = useState<Set<string>>(new Set());
  const [flowStatusFilter, setFlowStatusFilter] = useState<'ALL' | 'previsto' | 'pago' | 'atrasado'>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'TRANSACTION' | 'CARD' | 'DEBT' | 'RECURRENCE' | 'DELETE_CONFIRM' | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<Transaction | null>(null);
  const [showRecurrenceOptions, setShowRecurrenceOptions] = useState(false);

  const [debtCalc, setDebtCalc] = useState({ total: 0, part: 0, count: 1 });

  // Opening Balance edit modal state
  const [showOpeningBalanceModal, setShowOpeningBalanceModal] = useState(false);
  const [openingBalanceEditValue, setOpeningBalanceEditValue] = useState<number>(0);

  // --- FILTERED DATA by ledgerId ---
  // For transactions linked to a debt contract, inherit the ledgerId from the contract
  // For card transactions, inherit the ledgerId from the card
  // Transactions without ledgerId are NOT included (they go to triage)
  const isConsolidated = selectedLedgerId === 'consolidated';

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // GLOBAL RULE: Any card transaction MUST have a valid card linked.
      // This excludes ghost/orphan card transactions from ALL views.
      if (t.method === 'cartao') {
        if (!t.cardId) return false; // No cardId = orphan card transaction
        const cardExists = cards.find(c => c.id === t.cardId);
        if (!cardExists) return false; // Card deleted = ghost transaction
        // Card exists - now apply ledger logic below
      }

      // If consolidated, we still need strict checks to avoid "ghost" items
      if (isConsolidated) {
        // 1. Debt Contract Logic: If linked to a contract, the contract MUST exist.
        if (t.contractId) {
          const contract = debtContracts.find(c => c.id === t.contractId);
          return !!contract; // Filter out if contract is missing (deleted)
        }
        // 2. Card transactions already validated above, just check ledgerId presence
        if (t.method === 'cartao') {
          return true; // Card exists (validated above)
        }
        // 3. Standard Transaction
        return !!t.ledgerId;
      }

      // --- NON-CONSOLIDATED (PF or PJ specific) ---

      // If transaction is linked to a debt contract, use the contract's ledgerId
      if (t.contractId) {
        const contract = debtContracts.find(c => c.id === t.contractId);
        if (contract) {
          // Only include if contract has the selected ledgerId
          return contract.ledgerId === selectedLedgerId;
        }
        // Contract not found - don't include
        return false;
      }

      // For card transactions, use the card's ledgerId
      if (t.method === 'cartao') {
        const card = cards.find(c => c.id === t.cardId);
        // Card existence already validated above
        return card!.ledgerId === selectedLedgerId;
      }

      // For regular transactions, only include if has matching ledgerId
      // Transactions without ledgerId go to triage, not to PF/PJ views
      return t.ledgerId === selectedLedgerId;
    });
  }, [transactions, debtContracts, cards, selectedLedgerId, isConsolidated]);

  const filteredCards = useMemo(() =>
    isConsolidated ? cards : cards.filter(c => c.ledgerId === selectedLedgerId),
    [cards, selectedLedgerId, isConsolidated]);

  const filteredDebts = useMemo(() =>
    isConsolidated ? debts : debts.filter(d => d.ledgerId === selectedLedgerId),
    [debts, selectedLedgerId, isConsolidated]);

  const filteredRecurrences = useMemo(() =>
    isConsolidated ? recurrences : recurrences.filter(r => r.ledgerId === selectedLedgerId),
    [recurrences, selectedLedgerId, isConsolidated]);

  const filteredDebtContracts = useMemo(() =>
    isConsolidated ? debtContracts : debtContracts.filter(d => d.ledgerId === selectedLedgerId),
    [debtContracts, selectedLedgerId, isConsolidated]);

  // Orphan items (without ledgerId) for triage
  const orphanItems = useMemo(() => ({
    transactions: transactions.filter(t => !t.ledgerId),
    cards: cards.filter(c => !c.ledgerId),
    debts: [...debts.filter(d => !d.ledgerId), ...debtContracts.filter(d => !d.ledgerId)]
  }), [transactions, cards, debts, debtContracts]);

  const hasOrphans = orphanItems.transactions.length + orphanItems.cards.length + orphanItems.debts.length > 0;

  // Auto-generate recurrence transactions for ALL months in the selected range (idempotent)
  // Uses templates derived from existing transactions with nature='recorrente'
  useEffect(() => {
    if (!filterStartMonth || !filterEndMonth) return;

    // Helper to get all months in range
    const getMonthsInRange = (start: string, end: string): string[] => {
      const months: string[] = [];
      const [sy, sm] = start.split('-').map(Number);
      const [ey, em] = end.split('-').map(Number);

      let current = new Date(sy, sm - 1, 1);
      const endDate = new Date(ey, em - 1, 1);

      while (current <= endDate) {
        months.push(current.toISOString().slice(0, 7));
        current.setMonth(current.getMonth() + 1);
      }
      return months;
    };

    const generateRecurrences = async () => {
      // Get all unique recurrence descriptions from existing transactions
      const recurrentTxs = filteredTransactions.filter(t => t.nature === 'recorrente');
      const uniqueByDesc: Record<string, any> = {};

      recurrentTxs.forEach(t => {
        // Keep the most recent one as template (has latest amount, category, etc)
        if (!uniqueByDesc[t.description] || t.date > uniqueByDesc[t.description].date) {
          uniqueByDesc[t.description] = t;
        }
      });

      const templates = Object.values(uniqueByDesc);
      const monthsToProcess = getMonthsInRange(filterStartMonth, filterEndMonth);

      for (const targetMonth of monthsToProcess) {
        for (const template of templates) {
          // Check if already exists for this month (by description + month)
          const alreadyExists = transactions.some(t =>
            t.description === template.description &&
            t.nature === 'recorrente' &&
            t.referenceMonth === targetMonth &&
            (isConsolidated ? true : t.ledgerId === selectedLedgerId)
          );

          if (!alreadyExists) {
            // Build the due date using the original day or day 1
            const originalDay = template.date ? parseInt(template.date.split('-')[2]) : 1;
            const year = parseInt(targetMonth.split('-')[0]);
            const month = parseInt(targetMonth.split('-')[1]);
            const lastDay = new Date(year, month, 0).getDate();
            const day = Math.min(originalDay, lastDay);
            const dueDate = `${targetMonth}-${String(day).padStart(2, '0')}`;

            // Create the transaction for this month based on template
            await addTransaction({
              ledgerId: template.ledgerId,
              type: template.type,
              origin: template.origin || 'manual',
              nature: 'recorrente',
              description: template.description,
              amount: template.amount,
              method: template.method,
              status: 'previsto',
              date: dueDate,
              referenceMonth: targetMonth,
              category: template.category
            });
          }
        }
      }
    };

    // Small delay to avoid race conditions on initial load
    const timer = setTimeout(generateRecurrences, 500);
    return () => clearTimeout(timer);
  }, [filterStartMonth, filterEndMonth, selectedLedgerId, filteredTransactions.length, isConsolidated]); // Re-run when range changes

  const currentMonthTransactions = useMemo(() => {
    return filteredTransactions.filter(t => isMonthInRange(t.referenceMonth));
  }, [filteredTransactions, filterStartMonth, filterEndMonth]);

  // --- CASH BALANCE LOGIC (Caixa) ---
  // Base cash balance per ledger - this is the user-editable seed value
  const baseCashBalance = useMemo(() => {
    if (!selectedLedgerId || isConsolidated) return null;
    return openingBalances.find(ob => ob.ledgerId === selectedLedgerId && ob.monthRef === 'GLOBAL') || null;
  }, [openingBalances, selectedLedgerId, isConsolidated]);

  // Code removed: calculateRollingCash and consolidatedCashBalance replaced by getFinancialStats hook

  // Auto-create cash balance if missing (only when not in consolidated view)
  useEffect(() => {
    if (isConsolidated || !selectedLedgerId) return;

    // Check if cash balance exists for this ledger
    const exists = openingBalances.some(ob => ob.ledgerId === selectedLedgerId && ob.monthRef === 'GLOBAL');

    if (!exists) {
      // Create with 0 value and set current month as base
      addOpeningBalance({
        ledgerId: selectedLedgerId,
        monthRef: 'GLOBAL',
        amount: 0,
        baseMonth: filterMonth // Store the month where the base was set
      } as any);
    }
  }, [selectedLedgerId, openingBalances, isConsolidated, addOpeningBalance, filterMonth]);

  // Get today's date for comparisons
  const today = getCurrentLocalDate();

  const stats = useMemo(() => {
    // Only count 'previsto' and 'atrasado' as "Previstas" - exclude 'pago' and 'cancelado'
    const pendingStatuses = ['previsto', 'atrasado'];
    const incomings = currentMonthTransactions
      .filter(t => t.type === 'income' && pendingStatuses.includes(t.status))
      .reduce((acc, t) => acc + t.amount, 0);

    // Calculate non-card outgoings normally
    const nonCardOutgoings = currentMonthTransactions
      .filter(t => t.type === 'expense' && t.method !== 'cartao' && pendingStatuses.includes(t.status))
      .reduce((acc, t) => acc + t.amount, 0);

    // Calculate unpaid card invoices: sum all card transactions where the invoice is NOT fully paid
    // An invoice is considered unpaid if ANY transaction in that card for this month is not 'pago'
    const cardInvoices: Record<string, { total: number; isPaid: boolean }> = {};
    currentMonthTransactions
      .filter(t => t.method === 'cartao' && t.cardId)
      .forEach(t => {
        if (!cardInvoices[t.cardId!]) {
          cardInvoices[t.cardId!] = { total: 0, isPaid: true };
        }
        cardInvoices[t.cardId!].total += t.amount;
        if (t.status !== 'pago') {
          cardInvoices[t.cardId!].isPaid = false;
        }
      });

    // Sum unpaid card invoices
    const unpaidCardInvoices = Object.values(cardInvoices)
      .filter(inv => !inv.isPaid)
      .reduce((acc, inv) => acc + inv.total, 0);

    const outgoings = nonCardOutgoings + unpaidCardInvoices;
    const totalOpenDebt = filteredDebtContracts.reduce((acc, d: any) => acc + (d.totalOpen || d.totalDebtRemaining || 0), 0);

    // Quick Actions: Atrasados (vencidos e não pagos)
    // Extra filter: Exclude card transactions where card is missing (ghost cards)
    const atrasados = currentMonthTransactions.filter(t => {
      if (t.date >= today) return false; // Not overdue yet
      if (t.status !== 'previsto' && t.status !== 'atrasado') return false; // Already paid or cancelled
      if (t.type !== 'expense') return false; // Only expenses
      // Extra ghost check for card transactions
      if (t.method === 'cartao' && t.cardId) {
        const cardExists = cards.find(c => c.id === t.cardId);
        if (!cardExists) return false;
      }
      return true;
    });

    // Quick Actions: Vence em 7 dias
    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);
    const in7DaysStr = in7Days.toISOString().slice(0, 10);
    const venceEm7Dias = currentMonthTransactions.filter(t =>
      t.date >= today && t.date <= in7DaysStr && t.status === 'previsto' && t.type === 'expense'
    );

    // Quick Actions: Top categories
    const catTotals: Record<string, number> = {};
    currentMonthTransactions.filter(t => t.type === 'expense').forEach(t => {
      const cat = t.category || 'Outros';
      catTotals[cat] = (catTotals[cat] || 0) + t.amount;
    });
    const topCategories = Object.entries(catTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    // Get cash balance amount (rolling for single ledger, sum for consolidated)
    // Get cash balance amount (rolling for single ledger, sum for consolidated)
    // Using new centralized hook
    const { currentBalance: cashBalanceAmount } = getFinancialStats(filterMonth, isConsolidated ? 'consolidated' : selectedLedgerId);

    return {
      incomings,
      outgoings,
      cashBalance: cashBalanceAmount,
      balance: cashBalanceAmount + incomings - outgoings,
      totalOpenDebt,
      monthlyDebtInstallments: currentMonthTransactions.filter(t => t.origin === 'debt' || t.debtId || t.contractId).reduce((acc, t) => acc + t.amount, 0),
      // Quick Actions
      atrasados: { count: atrasados.length, total: atrasados.reduce((acc, t) => acc + t.amount, 0) },
      venceEm7Dias: { count: venceEm7Dias.length, total: venceEm7Dias.reduce((acc, t) => acc + t.amount, 0) },
      topCategories
    };
  }, [currentMonthTransactions, filteredDebtContracts, today, isConsolidated, getFinancialStats, filterMonth, selectedLedgerId]);

  const flowEntries = useMemo(() => {
    // Use all cards (not just filteredCards) since currentMonthTransactions is already filtered by ledgerId
    // This ensures card transactions show up even if the card's ledgerId differs from the transaction's
    const allCardIds = new Set(cards.map(c => c.id));

    // Transações que NÃO são de cartão
    const nonCardTx = currentMonthTransactions.filter(t => t.method !== 'cartao');

    // Transações de cartão - group by cardId
    const cardTx = currentMonthTransactions.filter(t => t.method === 'cartao');

    const cardGroups: Record<string, any> = {};

    cardTx.forEach(t => {
      // Ignore transactions without a valid cardId or if card is not found
      if (!t.cardId) return;

      const cardExists = cards.find(c => c.id === t.cardId);
      if (!cardExists) return;

      const cId = t.cardId;

      if (!cardGroups[cId]) {
        // Calculate the specific due date for this invoice based on reference month
        // Default to day 10 if not specified (legacy fallback)
        const dueDay = cardExists.dueDay || 10;
        const [year, month] = t.referenceMonth.split('-').map(Number);
        const invoiceDate = new Date(year, month - 1, dueDay).toISOString().split('T')[0];

        cardGroups[cId] = {
          id: `group-${cId}`,
          description: `Fatura ${cardExists.name}`,
          amount: 0,
          method: 'cartao',
          status: 'previsto', // Initial assumption
          type: 'expense',
          date: invoiceDate, // Use the correct Due Date
          referenceMonth: t.referenceMonth,
          isGroup: true,
          cardId: cId,
          transactionIds: [] as string[],
          allPaid: true // Helper to track if all are paid
        };
      }
      cardGroups[cId].amount += t.amount;
      cardGroups[cId].transactionIds.push(t.id);

      // If ANY item is NOT paid, the group is not fully paid
      if (t.status !== 'pago') {
        cardGroups[cId].allPaid = false;
        cardGroups[cId].status = 'previsto';
      }
    });

    // Finalize status for groups
    Object.values(cardGroups).forEach((group: any) => {
      if (group.allPaid) {
        group.status = 'pago';
      }
    });

    // Flatten and Sort
    const allEntries = [...nonCardTx, ...Object.values(cardGroups)].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    // Apply Status Filter
    if (flowStatusFilter === 'ALL') return allEntries;

    return allEntries.filter(entry => {
      // Re-calculate display status logic for filtering
      const isOverdue = entry.date < today && (entry.status === 'previsto' || entry.status === 'atrasado') && !entry.isGroup;
      const effectiveStatus = isOverdue ? 'atrasado' : entry.status;
      return effectiveStatus === flowStatusFilter;
    });
  }, [currentMonthTransactions, cards, flowStatusFilter, today]);

  // Inteligência de Recorrências: Identifica series fixas mesmo que não lançadas no mês
  // Usa filteredTransactions para respeitar o filtro PF/PJ selecionado
  const recurrenceMasterList = useMemo(() => {
    const allRecurrences = filteredTransactions.filter(t => t.nature === 'recorrente');
    const uniqueSeries: Record<string, any> = {};

    // Agrupa por descrição, mantendo SEMPRE a transação mais recente como template
    allRecurrences.forEach(t => {
      if (!uniqueSeries[t.description] || t.date > uniqueSeries[t.description].date) {
        uniqueSeries[t.description] = { ...t, currentMonthStatus: 'Não Lançado' };
      }
    });

    // Verifica status no mês atual selecionado e atualiza com dados do mês
    Object.keys(uniqueSeries).forEach(desc => {
      const thisMonth = currentMonthTransactions.find(t => t.description === desc && t.nature === 'recorrente');
      if (thisMonth) {
        uniqueSeries[desc].currentMonthStatus = thisMonth.status;
        uniqueSeries[desc].amount = thisMonth.amount;
        uniqueSeries[desc].id = thisMonth.id; // Usa o ID do mês para edição
        uniqueSeries[desc].category = thisMonth.category; // Atualiza a categoria
      }
    });

    return Object.values(uniqueSeries);
  }, [filteredTransactions, currentMonthTransactions]);

  const selectedCard = useMemo(() => cards.find(c => c.id === selectedCardId), [cards, selectedCardId]);

  // Lógica de cálculo de limite por cartão (Corrigida para evitar duplicidade e considerar excluídos)
  const getCardUsage = (cardId: string) => {
    // 1. Dívidas Ativas vinculadas ao cartão
    const activeContracts = debtContracts.filter(d => d.cardId === cardId && d.status === 'Ativo');
    const contractDebt = activeContracts.reduce((acc, d) => acc + d.totalDebtRemaining, 0);

    // IDs de contratos ATIVOS e de TODOS os contratos existentes (para filtrar excluídos)
    const activeContractIds = new Set(activeContracts.map(d => d.id));
    const allExistingContractIds = new Set(debtContracts.map(d => d.id));

    // 2. Transações avulsas ou parceladas que NÃO pertençam a contratos ativos
    const otherPending = transactions.filter(t =>
      t.cardId === cardId &&
      (t.status === 'previsto' || t.status === 'planned') &&
      t.type === 'expense' &&
      (
        // Caso 1: Transação sem vínculo nenhum com contrato (compra avulsa parcelada ou não)
        !t.contractId
        ||
        // Caso 2: Transação tem vínculo, mas o contrato NÃO é ativo E o contrato existe em debtContracts (não foi excluído)
        (allExistingContractIds.has(t.contractId) && !activeContractIds.has(t.contractId))
      )
    ).reduce((acc, t) => acc + t.amount, 0);

    return contractDebt + otherPending;
  };

  const cardTransactions = useMemo(() => {
    if (!selectedCardId) return [];
    return transactions
      .filter(t => {
        const isThisCard = t.cardId === selectedCardId;
        if (!isThisCard) return false;
        // Se showAll estiver ativo, mostramos TUDO que está com status previsto ocupando o limite
        if (showAllCardPending) return (t.status === 'previsto' || t.status === 'planned') && t.type === 'expense';
        // Caso contrário, apenas transações do mês selecionado
        return t.referenceMonth === filterMonth;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions, selectedCardId, filterMonth, showAllCardPending]);

  // --- HANDLERS ---

  const handleOpenTransaction = (t?: any) => {
    setModalType('TRANSACTION');

    // Default ledger for new transaction:
    // If filtered, use selectedLedgerId.
    // If consolidated, use the FIRST ledger from the list as default (safe fallback).
    const defaultLedgerId = isConsolidated ? (ledgers[0]?.id || '') : selectedLedgerId;

    const item = t || {
      ledgerId: defaultLedgerId,
      type: 'expense',
      origin: 'manual',
      status: 'previsto',
      method: 'pix',
      date: getCurrentLocalDate(),
      referenceMonth: filterMonth,
      amount: 0,
      description: '',
      category: 'Outros'
    };
    // Ensure ledgerId is always set to current scope for new items
    if (!t) item.ledgerId = defaultLedgerId;
    setEditingItem(item);
    setDebtCalc({
      total: item.amount * (item.installmentsInfo?.total || 1) || 0,
      part: item.amount || 0,
      count: item.installmentsInfo?.total || 1
    });
    setIsModalOpen(true);
  };

  const handleQuickCleanup = async () => {
    if (!selectedCardId) return;
    const overdue = transactions.filter(t =>
      t.cardId === selectedCardId &&
      t.status === 'previsto' &&
      t.referenceMonth < filterMonth
    );

    if (overdue.length === 0) {
      alert("Nenhuma pendência de meses passados encontrada.");
      return;
    }

    if (window.confirm(`Deseja marcar ${overdue.length} lançamentos de meses ANTERIORES como PAGOS? Isso liberará o limite usado por itens esquecidos.`)) {
      for (const t of overdue) {
        await updateTransaction({ ...t, status: 'pago' });
      }
    }
  };

  const confirmDelete = async (mode: 'ONLY_THIS' | 'ALL_RELATED') => {
    if (!itemToDelete) return;
    try {
      if (mode === 'ONLY_THIS') {
        await deleteTransaction(itemToDelete.id);
        toast.success('Lançamento excluído com sucesso!');
      } else {
        // Para recorrências, busca por description + nature
        if (itemToDelete.nature === 'recorrente') {
          const related = transactions.filter(t =>
            t.description === itemToDelete.description &&
            t.nature === 'recorrente' &&
            t.ledgerId === itemToDelete.ledgerId
          );
          for (const t of related) await deleteTransaction(t.id);
          toast.success(`${related.length} lançamentos recorrentes excluídos!`);
        } else {
          // Para parcelas/contratos, usa o recurrenceId ou contractId
          const rootId = itemToDelete.recurrenceId || itemToDelete.contractId || itemToDelete.id;
          const related = transactions.filter(t => t.recurrenceId === rootId || t.contractId === rootId || t.id === rootId);
          for (const t of related) await deleteTransaction(t.id);
          toast.success(`${related.length} parcelas excluídas!`);
        }
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir lançamento. Tente novamente.');
    }
    setIsModalOpen(false);
    setItemToDelete(null);
  };

  // Sincroniza ledgerId da dívida com todas as parcelas vinculadas
  const handleDebtLedgerChange = async (debt: any, newLedgerId: string) => {
    // Atualiza o contrato de dívida
    await updateDebtContract({ ...debt, ledgerId: newLedgerId });

    // Busca todas as transações vinculadas a esta dívida e atualiza o ledgerId
    const relatedTransactions = transactions.filter(t => t.contractId === debt.id);
    for (const t of relatedTransactions) {
      await updateTransaction({ ...t, ledgerId: newLedgerId });
    }
  };

  const handleSaveTransaction = async (e: React.FormEvent, updateScope?: 'ONLY_THIS' | 'ALL_RELATED' | 'FROM_HERE') => {
    e.preventDefault();
    try {
      const isNew = !editingItem.id;
      const isCardMethod = editingItem.method === 'cartao';
      const newTotalCount = Math.round(debtCalc.count);
      const isMulti = (isCardMethod || editingItem.nature === 'parcela') && newTotalCount > 1;

      // Determine the correct amount based on input source:
      // - Card transactions: use debtCalc.part (the card parcelas section updates this)
      // - Non-card transactions: use editingItem.amount (the regular value input updates this)
      const finalAmount = isCardMethod ? debtCalc.part : editingItem.amount;
      console.log('Final Amount Debug:', {
        isCardMethod,
        nature: editingItem.nature,
        debtCalcPart: debtCalc.part,
        editingItemAmount: editingItem.amount,
        finalAmount
      });

      if (!isNew) {
        // EDIÇÃO: Atualiza o lançamento atual
        const currentInstallment = editingItem.installmentsInfo?.current || 1;
        const oldTotal = editingItem.installmentsInfo?.total || 1;

        // Atualiza o item atual com novo valor e novas informações de parcelas
        const updatedItem = {
          ...editingItem,
          amount: finalAmount,
          installmentsInfo: isMulti ? { current: currentInstallment, total: newTotalCount } : undefined
        };
        await updateTransaction(updatedItem);

        // Logic for updating all recurrences or from here onwards
        if ((updateScope === 'ALL_RELATED' || updateScope === 'FROM_HERE') && (editingItem.nature === 'recorrente' || editingItem.recurrenceId)) {
          // Find original transaction to get reliable matching criteria (original description, recurrenceId)
          const originalTx = transactions.find(t => t.id === editingItem.id);
          const searchDesc = originalTx ? originalTx.description : editingItem.description;
          const searchRecurrenceId = originalTx ? (originalTx.recurrenceId || originalTx.id) : (editingItem.recurrenceId || editingItem.id);

          console.log('Recurrence Update Debug:', {
            updateScope,
            editingItemId: editingItem.id,
            editingItemNature: editingItem.nature,
            editingItemRecurrenceId: editingItem.recurrenceId,
            searchDesc,
            searchRecurrenceId,
            editingItemLedgerId: editingItem.ledgerId,
            editingItemRefMonth: editingItem.referenceMonth,
            totalTransactions: transactions.length
          });

          let related = transactions.filter(t => {
            if (t.id === editingItem.id) return false;

            // 1. Match by recurrenceId
            const matchByRecurrenceId = searchRecurrenceId && (t.recurrenceId === searchRecurrenceId || t.id === searchRecurrenceId);

            // 2. Fallback: strict description match + same ledger + nature='recorrente'
            const matchByDescription = t.description === searchDesc && t.nature === 'recorrente' && t.ledgerId === editingItem.ledgerId;

            const isMatch = matchByRecurrenceId || matchByDescription;

            if (isMatch) {
              console.log('Matched transaction:', { id: t.id, desc: t.description, nature: t.nature, refMonth: t.referenceMonth, recurrenceId: t.recurrenceId, matchByRecurrenceId, matchByDescription });
            }

            return isMatch;
          });

          console.log('Related transactions found BEFORE filter:', related.length);

          if (updateScope === 'FROM_HERE') {
            // Filter only transactions with referenceMonth >= current editing item referenceMonth
            const currentMonth = editingItem.referenceMonth;
            related = related.filter(t => t.referenceMonth >= currentMonth);
            console.log('Related transactions found AFTER FROM_HERE filter:', related.length, 'currentMonth:', currentMonth);
          }

          let successCount = 0;
          let failCount = 0;
          for (const t of related) {
            const updatePayload = {
              ...t,
              category: editingItem.category,
              description: editingItem.description,
              amount: finalAmount,
              method: editingItem.method,
              cardId: editingItem.cardId,
              ledgerId: editingItem.ledgerId,
            };
            console.log('Updating related transaction:', { id: t.id, oldAmount: t.amount, newAmount: finalAmount });
            try {
              await updateTransaction(updatePayload);
              console.log('SUCCESS: Updated transaction', t.id);
              successCount++;
            } catch (err) {
              console.error('FAILED: Error updating transaction', t.id, err);
              failCount++;
            }
          }

          console.log(`Update complete: ${successCount} succeeded, ${failCount} failed out of ${related.length}`);
          toast.success(`${successCount + 1} recorrências atualizadas com sucesso!`);
        } else {
          // Se aumentou a quantidade de parcelas, cria as adicionais
          if (isMulti && newTotalCount > oldTotal) {
            // Encontra todas as parcelas relacionadas para descobrir o recurrenceId
            const recurrenceId = editingItem.recurrenceId || editingItem.id;

            // Busca todas as parcelas existentes desta série
            const existingInstallments = transactions.filter(t =>
              t.id === recurrenceId || t.recurrenceId === recurrenceId
            );

            // Descobre qual é o maior número de parcela existente
            const maxExistingInstallment = Math.max(
              ...existingInstallments.map(t => t.installmentsInfo?.current || 1)
            );

            // Atualiza o total em todas as parcelas existentes
            for (const t of existingInstallments) {
              if (t.installmentsInfo) {
                await updateTransaction({
                  ...t,
                  amount: finalAmount,
                  installmentsInfo: { ...t.installmentsInfo, total: newTotalCount }
                });
              }
            }

            // Cria apenas as parcelas faltantes (a partir da maior existente)
            const baseDate = new Date(editingItem.date + 'T12:00:00');
            // Volta para a data da primeira parcela
            baseDate.setMonth(baseDate.getMonth() - (currentInstallment - 1));

            for (let i = maxExistingInstallment; i < newTotalCount; i++) {
              const d = new Date(baseDate);
              d.setMonth(d.getMonth() + i);
              const ds = d.toISOString().split('T')[0];

              // Extrai descrição base sem o sufixo de parcela
              const baseDesc = editingItem.description.replace(/\s*\(\d+\/\d+\)$/, '');

              await addTransaction({
                ...editingItem,
                id: undefined, // Força criação de novo ID
                description: `${baseDesc} (${i + 1}/${newTotalCount})`,
                amount: finalAmount,
                date: ds,
                referenceMonth: ds.slice(0, 7),
                status: 'previsto',
                installmentsInfo: { current: i + 1, total: newTotalCount },
                recurrenceId: recurrenceId
              });
            }
          }
          toast.success('Lançamento atualizado com sucesso!');
        }
      } else {
        // CRIAÇÃO: Lógica original para novos lançamentos
        const firstTx = {
          ...editingItem,
          amount: isMulti ? debtCalc.part : finalAmount,
          installmentsInfo: isMulti ? { current: 1, total: newTotalCount } : undefined
        };
        const mainId = await addTransaction(firstTx);

        if (isMulti) {
          for (let i = 1; i < newTotalCount; i++) {
            const d = new Date(editingItem.date + 'T12:00:00'); d.setMonth(d.getMonth() + i);
            const ds = d.toISOString().split('T')[0];
            await addTransaction({
              ...editingItem,
              description: `${editingItem.description} (${i + 1}/${newTotalCount})`,
              amount: debtCalc.part,
              date: ds, referenceMonth: ds.slice(0, 7),
              installmentsInfo: { current: i + 1, total: newTotalCount },
              recurrenceId: mainId
            });
          }
          await updateTransaction({ ...firstTx, id: mainId, description: `${firstTx.description} (1/${newTotalCount})` });
          toast.success(`${newTotalCount} parcelas criadas com sucesso!`);
        } else {
          toast.success('Lançamento criado com sucesso!');
        }
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Erro ao salvar lançamento:', error);
      toast.error('Erro ao salvar lançamento. Verifique os dados e tente novamente.');
    }
  };

  return (
    <div className="bg-[#141414] min-h-full rounded-[30px] p-8 -m-8 md:-m-8 md:p-10 space-y-10 border border-[#222]">

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Gestão Financeira</h2>
          <div className="flex items-center gap-4 mt-3">
            {/* PF/PJ Toggle */}
            <div className="flex bg-[#1F1F1F] rounded-xl p-1 border border-white/5">
              {ledgers.map(l => (
                <button
                  key={l.id}
                  onClick={() => handleLedgerChange(l.id)}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 transition-all ${selectedLedgerId === l.id
                    ? l.type === 'PF' ? 'bg-indigo-600 text-white shadow-md' : 'bg-emerald-600 text-white shadow-md'
                    : 'text-[#808080] hover:bg-white/5'
                    }`}
                >
                  {l.type === 'PF' ? <User size={14} /> : <Building2 size={14} />}
                  {l.type}
                </button>
              ))}
              <div className="w-[1px] bg-white/10 mx-1"></div>
              <button
                onClick={() => handleLedgerChange('consolidated')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 transition-all ${selectedLedgerId === 'consolidated'
                  ? 'bg-gradient-to-r from-indigo-600 to-emerald-600 text-white shadow-md'
                  : 'text-[#808080] hover:bg-white/5'
                  }`}
              >
                <div className="flex -space-x-1">
                  <div className="w-2 h-3 bg-indigo-400 rounded-sm"></div>
                  <div className="w-2 h-3 bg-emerald-400 rounded-sm"></div>
                </div>
                Consolidado
              </button>
            </div>
            {/* Tabs */}
            <div className="flex bg-[#1F1F1F] rounded-xl p-1 border border-white/5 overflow-x-auto max-w-[100vw]">
              {['OVERVIEW', 'FLOW', 'RECURRENCES', 'CARDS', 'DEBTS'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase whitespace-nowrap transition-all ${activeTab === tab ? 'bg-[#5D7F38] text-white shadow-md' : 'text-[#808080] hover:bg-white/5'}`}>
                  {tab === 'OVERVIEW' ? 'Visão Geral' : tab === 'FLOW' ? 'Fluxo' : tab === 'RECURRENCES' ? 'Recorrências' : tab === 'CARDS' ? 'Cartões' : 'Dívidas'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 w-full lg:w-auto flex-wrap">
          {/* Month Navigation */}
          <div className="flex items-center bg-[#1F1F1F] border border-white/5 rounded-xl">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2.5 hover:bg-white/5 transition-colors border-r border-white/5 rounded-l-xl"
              title="Mês anterior"
            >
              <ChevronLeft size={18} className="text-[#808080]" />
            </button>
            <div ref={monthPresetRef} className="relative">
              <button
                onClick={() => setShowMonthPresets(!showMonthPresets)}
                className="px-4 py-2 text-sm font-black text-white flex items-center gap-2 hover:bg-white/5 transition-colors min-w-[140px] justify-center"
              >
                {filterDisplayText}
                <ChevronDown size={14} className={`text-[#808080] transition-transform ${showMonthPresets ? 'rotate-180' : ''}`} />
              </button>
              {showMonthPresets && (
                <div className="absolute top-full left-0 mt-1 bg-[#1F1F1F] border border-white/10 rounded-xl shadow-lg z-50 min-w-[240px] py-2 animate-in fade-in slide-in-from-top-2 duration-150">
                  <p className="px-4 py-1 text-[10px] font-black text-[#808080] uppercase tracking-wider">Atalhos</p>
                  <button onClick={() => setMonthPreset('current')} className="w-full px-4 py-2 text-left text-sm font-bold text-white hover:bg-white/5 transition-colors">Este mês</button>
                  <button onClick={() => setMonthPreset('last')} className="w-full px-4 py-2 text-left text-sm font-bold text-white hover:bg-white/5 transition-colors">Mês anterior</button>
                  <button onClick={() => setMonthPreset('last3')} className="w-full px-4 py-2 text-left text-sm font-bold text-white hover:bg-white/5 transition-colors">Últimos 3 meses</button>
                  <button onClick={() => setMonthPreset('last6')} className="w-full px-4 py-2 text-left text-sm font-bold text-white hover:bg-white/5 transition-colors">Últimos 6 meses</button>
                  <button onClick={() => setMonthPreset('year')} className="w-full px-4 py-2 text-left text-sm font-bold text-white hover:bg-white/5 transition-colors">Ano inteiro ({new Date().getFullYear()})</button>
                  <hr className="my-2 border-white/10" />
                  <p className="px-4 py-1 text-[10px] font-black text-[#808080] uppercase tracking-wider">Período Personalizado</p>
                  <div className="px-4 py-2 space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-[#808080] mb-1">Mês Início</label>
                      <input
                        type="month"
                        className="w-full bg-[#252525] border border-white/10 rounded-lg px-3 py-1.5 text-sm font-bold text-white outline-none focus:ring-1 focus:ring-[#5D7F38] [color-scheme:dark]"
                        value={filterStartMonth}
                        onChange={e => setFilterStartMonth(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#808080] mb-1">Mês Final</label>
                      <input
                        type="month"
                        className="w-full bg-[#252525] border border-white/10 rounded-lg px-3 py-1.5 text-sm font-bold text-white outline-none focus:ring-1 focus:ring-[#5D7F38] [color-scheme:dark]"
                        value={filterEndMonth}
                        min={filterStartMonth}
                        onChange={e => setFilterEndMonth(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={() => setShowMonthPresets(false)}
                      className="w-full bg-[#5D7F38] text-white py-2 rounded-lg text-xs font-black uppercase hover:bg-[#4a662c] transition-colors"
                    >
                      Aplicar Filtro
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2.5 hover:bg-white/5 transition-colors border-l border-white/5 rounded-r-xl"
              title="Próximo mês"
            >
              <ChevronRight size={18} className="text-[#808080]" />
            </button>
          </div>

          <button onClick={() => handleOpenTransaction()} className="bg-[#5D7F38] text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-[#5D7F38]/20 hover:bg-[#4a662c] flex items-center gap-2 transition-all"><Plus size={18} /> Novo Lançamento</button>
        </div>
      </div>

      {
        activeTab === 'OVERVIEW' && (() => {
          // Find most critical card (highest usage %)
          const cardUsages = filteredCards.map(c => {
            const usage = getCardUsage(c.id);
            return { card: c, usage, percentage: c.limit ? (usage / c.limit) * 100 : 0 };
          }).sort((a, b) => b.percentage - a.percentage);
          const criticalCard = cardUsages[0];

          return (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Main Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
                {/* Cash Balance Card - Editable (or read-only in consolidated) */}
                <div className="p-6 rounded-2xl border bg-gradient-to-br from-amber-500/20 to-orange-500/10 border-amber-500/20 flex flex-col justify-between h-full transition-all hover:border-amber-500/30">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Caixa {isConsolidated ? '(Total)' : ''}</p>
                      <h3 className="text-2xl font-black mt-1 text-amber-400">{formatCurrency(stats.cashBalance)}</h3>
                      <p className="text-[10px] font-bold mt-1 text-amber-500/70">
                        {isConsolidated ? 'Soma PF + PJ' : 'Saldo atual em conta'}
                      </p>
                    </div>
                    {!isConsolidated && (
                      <button
                        onClick={() => {
                          setOpeningBalanceEditValue(baseCashBalance?.amount || 0);
                          setShowOpeningBalanceModal(true);
                        }}
                        className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors"
                        title="Editar Caixa"
                      >
                        <Edit2 size={20} />
                      </button>
                    )}
                  </div>
                </div>
                <StatCard title="Saídas Previstas" value={formatCurrency(stats.outgoings)} icon={ArrowDownCircle} colorClass="bg-red-500/10 text-red-500" onClick={() => setActiveTab('EXPENSE_DETAILS')} />
                <StatCard title="Entradas Previstas" value={formatCurrency(stats.incomings)} icon={ArrowUpCircle} colorClass="bg-emerald-500/10 text-emerald-500" onClick={() => setActiveTab('INCOME_DETAILS')} />
                <StatCard title="Saldo Projetado" value={formatCurrency(stats.balance)} highlight={true} icon={Calculator} />
                <StatCard title="Dívida Total Aberta" value={formatCurrency(stats.totalOpenDebt)} subtext={`Parcela mensal: ${formatCurrency(stats.monthlyDebtInstallments)}`} icon={Landmark} colorClass="bg-indigo-500/10 text-indigo-500" />
              </div>

              {/* Quick Actions Section */}
              <div className="bg-[#1F1F1F] rounded-2xl border border-white/5 p-6">
                <h3 className="font-black text-[#808080] uppercase text-[11px] tracking-widest mb-5">Ações Rápidas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Atrasados */}
                  <div
                    onClick={() => stats.atrasados.count > 0 && setActiveTab('FLOW')}
                    className={`p-5 rounded-2xl border transition-all ${stats.atrasados.count > 0 ? 'bg-red-500/10 border-red-500/20 cursor-pointer hover:border-red-500/40' : 'bg-[#252525] border-white/5'}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-xl ${stats.atrasados.count > 0 ? 'bg-red-500/20 text-red-500' : 'bg-[#333] text-[#606060]'}`}>
                        <AlertCircle size={20} />
                      </div>
                      <span className="font-black text-white text-sm">Atrasados</span>
                    </div>
                    <p className={`text-2xl font-black ${stats.atrasados.count > 0 ? 'text-red-500' : 'text-[#606060]'}`}>
                      {stats.atrasados.count} {stats.atrasados.count === 1 ? 'item' : 'itens'}
                    </p>
                    {stats.atrasados.count > 0 && (
                      <p className="text-xs font-black text-red-400 mt-1">{formatCurrency(stats.atrasados.total)}</p>
                    )}
                  </div>

                  {/* Vence em 7 dias */}
                  <div
                    onClick={() => stats.venceEm7Dias.count > 0 && setActiveTab('FLOW')}
                    className={`p-5 rounded-2xl border transition-all ${stats.venceEm7Dias.count > 0 ? 'bg-amber-500/10 border-amber-500/20 cursor-pointer hover:border-amber-500/40' : 'bg-[#252525] border-white/5'}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-xl ${stats.venceEm7Dias.count > 0 ? 'bg-amber-500/20 text-amber-500' : 'bg-[#333] text-[#606060]'}`}>
                        <Clock size={20} />
                      </div>
                      <span className="font-black text-white text-sm">Vence em 7 dias</span>
                    </div>
                    <p className={`text-2xl font-black ${stats.venceEm7Dias.count > 0 ? 'text-amber-500' : 'text-[#606060]'}`}>
                      {stats.venceEm7Dias.count} {stats.venceEm7Dias.count === 1 ? 'item' : 'itens'}
                    </p>
                    {stats.venceEm7Dias.count > 0 && (
                      <p className="text-xs font-black text-amber-400 mt-1">{formatCurrency(stats.venceEm7Dias.total)}</p>
                    )}
                  </div>

                  {/* Cartão Crítico */}
                  <div
                    onClick={() => criticalCard && setActiveTab('CARDS')}
                    className={`p-5 rounded-2xl border transition-all ${criticalCard && criticalCard.percentage > 70 ? 'bg-purple-500/10 border-purple-500/20 cursor-pointer hover:border-purple-500/40' : 'bg-[#252525] border-white/5'}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-xl ${criticalCard && criticalCard.percentage > 70 ? 'bg-purple-500/20 text-purple-500' : 'bg-[#333] text-[#606060]'}`}>
                        <CreditCard size={20} />
                      </div>
                      <span className="font-black text-white text-sm">Cartão Crítico</span>
                    </div>
                    {criticalCard ? (
                      <>
                        <p className={`text-lg font-black ${criticalCard.percentage > 70 ? 'text-purple-500' : 'text-[#808080]'}`}>
                          {criticalCard.card.name}
                        </p>
                        <p className="text-xs font-black text-[#606060] mt-1">
                          {criticalCard.percentage.toFixed(0)}% do limite
                        </p>
                      </>
                    ) : (
                      <p className="text-[#606060] text-sm">Nenhum cartão</p>
                    )}
                  </div>

                  {/* Top Categorias */}
                  <div className="p-5 rounded-2xl border bg-[#252525] border-white/5">
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

              <FinanceCategoryList transactions={currentMonthTransactions} isConsolidated={isConsolidated} />
            </div>
          );
        })()
      }

      {
        activeTab === 'FLOW' && (() => {
          // 1-click status toggle function - syncs with debt contract and cash balance
          const toggleStatus = async (entry: any) => {
            // HANDLE CARD GROUP TOGGLE
            if (entry.isGroup) {
              const newStatus = entry.status === 'pago' ? 'previsto' : 'pago';
              const newPaidDate = newStatus === 'pago' ? new Date().toISOString().split('T')[0] : undefined;
              // Calculate total group amount for cash balance update
              let totalGroupAmount = 0;
              // Update ALL transactions in this group
              if (entry.transactionIds && entry.transactionIds.length > 0) {
                const promises = entry.transactionIds.map(async (txId: string) => {
                  const tx = transactions.find(t => t.id === txId);
                  if (tx) {
                    totalGroupAmount += tx.amount || 0;
                    await updateTransaction({ ...tx, status: newStatus, paidDate: newPaidDate });
                  }
                });
                await Promise.all(promises);
              }

              // Note: Cash balance is calculated automatically via rolling projection
              // based on transaction status, so no manual update needed here
              return;
            }

            // NORMAL TRANSACTION TOGGLE
            const newStatus = entry.status === 'pago' ? 'previsto' : 'pago';
            const newPaidDate = newStatus === 'pago' ? new Date().toISOString().split('T')[0] : undefined;

            // Update the transaction status
            await updateTransaction({ ...entry, status: newStatus, paidDate: newPaidDate });

            // Note: Cash balance is calculated automatically via rolling projection
            // based on transaction status, so no manual update needed here

            // If this is a debt installment, sync the debt contract totals
            if (entry.contractId) {
              const contract = debtContracts.find(c => c.id === entry.contractId);
              if (contract) {
                const installmentAmount = entry.amount || 0;

                if (newStatus === 'pago') {
                  // Marking as paid: decrease remaining installments and debt
                  const newInstallmentsRemaining = Math.max(0, (contract.installmentsRemaining || 0) - 1);
                  const newTotalDebtRemaining = Math.max(0, (contract.totalDebtRemaining || 0) - installmentAmount);

                  await updateDebtContract({
                    ...contract,
                    installmentsRemaining: newInstallmentsRemaining,
                    totalDebtRemaining: newTotalDebtRemaining,
                    status: newInstallmentsRemaining === 0 ? 'Quitado' : contract.status
                  });
                } else {
                  // Unmarking as paid: restore remaining installments and debt
                  const newInstallmentsRemaining = (contract.installmentsRemaining || 0) + 1;
                  const newTotalDebtRemaining = (contract.totalDebtRemaining || 0) + installmentAmount;

                  await updateDebtContract({
                    ...contract,
                    installmentsRemaining: newInstallmentsRemaining,
                    totalDebtRemaining: newTotalDebtRemaining,
                    status: 'Ativo'
                  });
                }
              }
            }
          };

          return (
            <div className="bg-[#1F1F1F] rounded-2xl border border-white/5 overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
              <div className="p-6 border-b border-white/5 bg-[#252525] flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <h3 className="font-black text-white uppercase text-[11px] tracking-widest">Fluxo Mensal</h3>
                  <div className="relative group">
                    <select
                      value={flowStatusFilter}
                      onChange={(e) => setFlowStatusFilter(e.target.value as any)}
                      className="bg-[#1F1F1F] border border-white/10 text-white text-[10px] uppercase font-black rounded-lg py-1 px-3 pr-8 focus:outline-none focus:border-[#5D7F38] appearance-none cursor-pointer hover:border-white/20"
                    >
                      <option value="ALL">Todos</option>
                      <option value="previsto">Previsto</option>
                      <option value="pago">Pago</option>
                      <option value="atrasado">Atrasado</option>
                    </select>
                    <Filter size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#808080] pointer-events-none" />
                  </div>
                </div>
                <span className="text-[10px] font-black text-[#808080] uppercase">Clique no status para alternar</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="text-[10px] font-black uppercase text-[#808080] border-b border-white/5 bg-[#252525]">
                    <th className="p-4">Data</th>
                    <th className="p-4">Descrição</th>
                    <th className="p-4 text-right">Valor</th>
                    <th className="p-4 text-center">Categoria</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Ações</th>
                  </tr></thead>
                  <tbody className="divide-y divide-white/5">
                    {flowEntries.map(entry => {
                      // Determine display status (auto ATRASADO for past due items)
                      // Determine display status (auto ATRASADO for past due items)
                      // For Groups, we use the calculated Date (Due Date)
                      const isOverdue = entry.date < today && (entry.status === 'previsto' || entry.status === 'atrasado');
                      const displayStatus = isOverdue ? 'atrasado' : entry.status;

                      // Display Text map
                      const getStatusLabel = (status: string) => {
                        if (status === 'pago') return 'PAGO';
                        if (status === 'atrasado') return 'ATRASADO';
                        if (status === 'previsto') return 'EM ABERTO';
                        if (status === 'cancelado') return 'CANCELADO';
                        return status;
                      };

                      return (
                        <tr key={entry.id} className="hover:bg-white/5 group">
                          <td className="p-4 text-xs font-black text-[#A0A0A0]">{formatDate(entry.date)}</td>
                          <td className="p-4 flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${entry.isGroup ? 'bg-purple-500/20 text-purple-500' : entry.type === 'income' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                              {entry.isGroup ? <CreditCard size={14} /> : entry.type === 'income' ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
                            </div>
                            <span className={`font-black text-sm ${entry.isGroup ? 'text-purple-400' : 'text-white'}`}>{entry.description}</span>
                            {entry.isGroup && <span className="text-[8px] font-black text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded-full">{entry.transactionIds?.length || 0} itens</span>}
                          </td>
                          <td className={`p-4 text-right font-black ${entry.isGroup ? 'text-purple-500' : entry.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>{formatCurrency(entry.amount)}</td>
                          <td className="p-4 text-center">
                            <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border ${entry.isGroup ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-[#333] text-[#808080] border-white/10'}`}>
                              {entry.isGroup ? 'FATURA' : entry.category || 'Outros'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            {entry.isGroup ? (
                              <button
                                onClick={() => toggleStatus(entry)}
                                className={`text-[8px] font-black uppercase px-3 py-1 rounded-full border cursor-pointer transition-all hover:scale-105 ${displayStatus === 'pago' ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/30' :
                                  displayStatus === 'atrasado' ? 'bg-red-500/20 text-red-500 border-red-500/30 hover:bg-red-500/30' :
                                    'bg-amber-500/20 text-amber-500 border-amber-500/30 hover:bg-amber-500/30'
                                  }`}
                              >
                                {getStatusLabel(displayStatus)}
                              </button>
                            ) : (
                              <button
                                onClick={() => toggleStatus(entry)}
                                className={`text-[8px] font-black uppercase px-3 py-1 rounded-full border cursor-pointer transition-all hover:scale-105 ${displayStatus === 'pago' ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/30' :
                                  displayStatus === 'atrasado' ? 'bg-red-500/20 text-red-500 border-red-500/30 hover:bg-red-500/30' :
                                    displayStatus === 'cancelado' ? 'bg-[#333] text-[#606060] border-white/10 line-through' :
                                      'bg-amber-500/20 text-amber-500 border-amber-500/30 hover:bg-amber-500/30'
                                  }`}
                              >
                                {getStatusLabel(displayStatus)}
                              </button>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {entry.isGroup ? (
                              <button onClick={() => { setSelectedCardId(entry.cardId); setActiveTab('CARD_DETAILS'); }} className="p-2 text-purple-400 hover:text-purple-300 transition-colors">
                                <Eye size={16} />
                              </button>
                            ) : (
                              <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleOpenTransaction(entry)} className="p-2 text-[#606060] hover:text-[#5D7F38]"><Edit2 size={16} /></button>
                                <button onClick={() => { setItemToDelete(entry); setModalType('DELETE_CONFIRM'); setIsModalOpen(true); }} className="p-2 text-[#606060] hover:text-red-500"><Trash2 size={16} /></button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()
      }


      {
        activeTab === 'RECURRENCES' && (() => {
          // Calculate recurrence stats
          const recurrenceIncome = recurrenceMasterList.filter(r => r.type === 'income').reduce((acc, r) => acc + r.amount, 0);
          const recurrenceExpense = recurrenceMasterList.filter(r => r.type === 'expense').reduce((acc, r) => acc + r.amount, 0);
          const recurrenceBalance = recurrenceIncome - recurrenceExpense;

          return (
            <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
              {/* Summary Card */}
              <div className="bg-gradient-to-r from-[#1F1F1F] to-[#252525] p-6 rounded-2xl border border-white/5 text-white">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#808080]">Saldo Mensal Recorrente</p>
                    <p className={`text-3xl font-black mt-1 ${recurrenceBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
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
                  <div className="p-4 bg-white/10 rounded-2xl"><Clock size={32} /></div>
                </div>
              </div>

              {/* Table */}
              <div className="bg-[#1F1F1F] rounded-2xl border border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-[#252525] flex justify-between items-center">
                  <h3 className="font-black text-white uppercase text-[11px] tracking-widest">Contas Fixas / Recorrências</h3>
                  <p className="text-[10px] font-black text-[#808080] uppercase">Referência: {filterMonth}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead><tr className="text-[10px] font-black uppercase text-[#808080] border-b border-white/5 bg-[#252525]">
                      <th className="p-6">Conta Fixa</th>
                      <th className="p-6 text-center">Tipo</th>
                      <th className="p-6 text-right">Valor Padrão</th>
                      <th className="p-6 text-center">Categoria</th>
                      <th className="p-6 text-center">Método</th>
                      <th className="p-6 text-center">Ações</th>
                    </tr></thead>
                    <tbody className="divide-y divide-white/5">
                      {recurrenceMasterList.map(item => (
                        <tr key={item.description} className="hover:bg-white/5 group">
                          <td className="p-6 font-black text-white text-sm flex items-center gap-3">
                            <Clock size={14} className="text-[#5D7F38]" /> {item.description}
                          </td>
                          <td className="p-6 text-center">
                            <span className={`inline-flex items-center gap-1 text-[8px] font-black uppercase px-3 py-1 rounded-full border ${item.type === 'income'
                              ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
                              : 'bg-red-500/20 text-red-500 border-red-500/30'}`}>
                              {item.type === 'income' ? <ArrowUpCircle size={10} /> : <ArrowDownCircle size={10} />}
                              {item.type === 'income' ? 'Receita' : 'Despesa'}
                            </span>
                          </td>
                          <td className={`p-6 text-right font-black ${item.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                            {formatCurrency(item.amount)}
                          </td>
                          <td className="p-6 text-center">
                            <span className="text-[8px] font-black uppercase px-3 py-1 rounded-full bg-[#333] text-[#808080] border border-white/10">{item.category || 'Outros'}</span>
                          </td>
                          <td className="p-6 text-center">
                            <span className={`text-[8px] font-black uppercase px-3 py-1 rounded-full border ${item.method === 'cartao' ? 'bg-purple-500/20 text-purple-500 border-purple-500/30' : item.method === 'pix' ? 'bg-cyan-500/20 text-cyan-500 border-cyan-500/30' : 'bg-[#333] text-[#808080] border-white/10'}`}>
                              {item.method === 'cartao' ? 'Cartão' : item.method === 'pix' ? 'PIX' : item.method === 'boleto' ? 'Boleto' : item.method || 'N/A'}
                            </span>
                          </td>
                          <td className="p-6 text-center">
                            <div className="flex justify-center gap-2">
                              <button onClick={() => handleOpenTransaction(item.currentMonthStatus !== 'Não Lançado' ? item : { ...item, id: null, referenceMonth: filterMonth })} className="p-2 text-[#606060] hover:text-[#5D7F38]"><Edit2 size={16} /></button>
                              <button onClick={() => { setItemToDelete(item); setModalType('DELETE_CONFIRM'); setIsModalOpen(true); }} className="p-2 text-[#606060] hover:text-red-500"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {recurrenceMasterList.length === 0 && (
                        <tr><td colSpan={6} className="p-20 text-center text-[#606060] font-bold italic">Nenhuma recorrência cadastrada. Crie um lançamento com natureza "Recorrente" para ele aparecer aqui.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()
      }

      {
        activeTab === 'CARDS' && (
          <div className="animate-in slide-in-from-bottom-2 duration-300">
            {/* Header com botão de novo cartão */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-white uppercase text-[11px] tracking-widest">Meus Cartões</h3>
              <button
                onClick={() => {
                  setModalType('CARD');
                  setEditingItem({ name: '', closingDay: 1, dueDay: 10, limit: 0, ledgerId: selectedLedgerId });
                  setIsModalOpen(true);
                }}
                className="bg-[#5D7F38] text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-[#5D7F38]/20 hover:bg-[#4a662c] flex items-center gap-2 transition-all"
              >
                <Plus size={16} />
                Novo Cartão
              </button>
            </div>

            {/* Total Faturas Card */}
            {(() => {
              const getCardMonthlyInvoice = (cardId: string) => currentMonthTransactions.filter(t => t.cardId === cardId && t.method === 'cartao').reduce((acc, t) => acc + t.amount, 0);
              const totalCardsInvoice = filteredCards.reduce((acc, card) => acc + getCardMonthlyInvoice(card.id), 0);
              return filteredCards.length > 0 && (
                <div className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 p-6 rounded-2xl border border-purple-500/20 text-white mb-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-purple-400">Total Faturas do Mês</p>
                      <p className="text-3xl font-black mt-1 text-purple-300">{formatCurrency(totalCardsInvoice)}</p>
                      <p className="text-[9px] font-bold text-purple-400/70 mt-1">{filteredCards.length} {filteredCards.length === 1 ? 'cartão' : 'cartões'} • {filterMonth}</p>
                    </div>
                    <div className="p-4 bg-purple-500/20 rounded-2xl text-purple-400"><CreditCard size={32} /></div>
                  </div>
                </div>
              );
            })()}

            {/* Cards sem classificação */}
            {cards.filter(c => !c.ledgerId).length > 0 && (
              <div className="mb-6">
                <h4 className="text-[10px] font-black uppercase text-amber-600 mb-4 flex items-center gap-2">
                  <AlertTriangle size={14} />
                  Cartões sem classificação - Classifique como PF ou PJ
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {cards.filter(c => !c.ledgerId).map(card => {
                    const used = getCardUsage(card.id);
                    const pct = card.limit > 0 ? (used / card.limit) * 100 : 0;
                    const isOver = used > card.limit;

                    return (
                      <div key={card.id} className="bg-white p-6 rounded-[32px] border-2 border-amber-200 shadow-sm relative group">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-2xl transition-colors ${isOver ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-600'}`}><CreditCard size={20} /></div>
                            <div><p className="font-black text-slate-800">{card.name}</p><p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Fecha: {card.closingDay} • Vence: {card.dueDay}</p></div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => { e.stopPropagation(); setModalType('CARD'); setEditingItem(card); setIsModalOpen(true); }} className="p-2 text-slate-300 hover:text-brand-600"><Edit2 size={14} /></button><button onClick={(e) => { e.stopPropagation(); if (window.confirm("Excluir cartão?")) deleteCard(card.id); }} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={14} /></button></div>
                        </div>

                        {/* Classificador PF/PJ */}
                        <div className="flex gap-2 mb-4">
                          {ledgers.map(l => (
                            <button
                              key={l.id}
                              onClick={() => updateCard({ ...card, ledgerId: l.id })}
                              className={`flex-1 py-2 rounded-xl text-[8px] font-black uppercase flex items-center justify-center gap-1 transition-all border-2 ${card.ledgerId === l.id
                                ? l.type === 'PF'
                                  ? 'bg-indigo-600 border-indigo-700 text-white'
                                  : 'bg-emerald-600 border-emerald-700 text-white'
                                : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'
                                }`}
                            >
                              {l.type === 'PF' ? <User size={10} /> : <Building2 size={10} />}
                              {l.type}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-4">
                          <div className="flex justify-between items-end">
                            <div><p className="text-[9px] font-black text-slate-400 uppercase">Saldo Devedor Bloqueado</p><p className={`text-lg font-black ${isOver ? 'text-red-600' : 'text-brand-600'}`}>{formatCurrency(used)}</p></div>
                            <div className="text-right"><p className="text-[9px] font-black text-slate-400 uppercase">Disponível</p><p className={`text-sm font-black ${isOver ? 'text-red-600' : 'text-slate-800'}`}>{formatCurrency(card.limit - used)}</p></div>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden"><div className={`h-full transition-all ${pct > 90 ? 'bg-red-500' : 'bg-brand-500'}`} style={{ width: `${Math.min(100, pct)}%` }} /></div>
                          <div className="flex justify-between text-[9px] font-black uppercase text-slate-400"><span>Limite: {formatCurrency(card.limit)}</span><span>{pct.toFixed(0)}%</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cards classificados do escopo atual */}
            {filteredCards.length === 0 && cards.filter(c => !c.ledgerId).length === 0 && (
              <div className="bg-[#1F1F1F] p-20 rounded-2xl border border-white/5 text-center">
                <p className="text-[#606060] font-bold italic">Nenhum cartão cadastrado para este escopo.</p>
              </div>
            )}

            {filteredCards.length > 0 && (() => {
              // Helper functions for invoice
              const getCardMonthlyInvoice = (cardId: string) => currentMonthTransactions.filter(t => t.cardId === cardId && t.method === 'cartao').reduce((acc, t) => acc + t.amount, 0);
              const isCardInvoicePaid = (cardId: string) => {
                const txs = currentMonthTransactions.filter(t => t.cardId === cardId && t.method === 'cartao');
                return txs.length > 0 && txs.every(t => t.status === 'pago');
              };
              const markInvoicePaid = async (cardId: string, e: React.MouseEvent) => {
                e.stopPropagation();
                const txs = currentMonthTransactions.filter(t => t.cardId === cardId && t.method === 'cartao' && t.status !== 'pago');
                for (const tx of txs) await updateTransaction({ ...tx, status: 'pago' });
              };

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCards.map(card => {
                    const used = getCardUsage(card.id);
                    const pct = card.limit > 0 ? (used / card.limit) * 100 : 0;
                    const isOver = used > card.limit;
                    const monthlyInvoice = getCardMonthlyInvoice(card.id);
                    const invoicePaid = isCardInvoicePaid(card.id);

                    return (
                      <div key={card.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative group">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setSelectedCardId(card.id); setActiveTab('CARD_DETAILS'); }}>
                            <div className={`p-3 rounded-2xl transition-colors ${isOver ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-600'}`}><CreditCard size={20} /></div>
                            <div><p className="font-black text-slate-800">{card.name}</p><p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Fecha: {card.closingDay} • Vence: {card.dueDay}</p></div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => { e.stopPropagation(); setModalType('CARD'); setEditingItem(card); setIsModalOpen(true); }} className="p-2 text-slate-300 hover:text-brand-600"><Edit2 size={14} /></button><button onClick={(e) => { e.stopPropagation(); if (window.confirm("Excluir cartão?")) deleteCard(card.id); }} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={14} /></button></div>
                        </div>

                        {/* Fatura do Mês */}
                        <div className={`p-4 rounded-2xl mb-4 ${invoicePaid ? 'bg-emerald-50 border border-emerald-100' : 'bg-purple-50 border border-purple-100'}`}>
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-[9px] font-black uppercase text-slate-400">Fatura do Mês</p>
                              <p className={`text-xl font-black ${invoicePaid ? 'text-emerald-600' : 'text-purple-600'}`}>{formatCurrency(monthlyInvoice)}</p>
                            </div>
                            {monthlyInvoice > 0 && (
                              invoicePaid ? (
                                <span className="text-[9px] font-black uppercase px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-600 flex items-center gap-1"><Check size={12} /> Pago</span>
                              ) : (
                                <button onClick={(e) => markInvoicePaid(card.id, e)} className="text-[9px] font-black uppercase px-3 py-1.5 rounded-full bg-purple-600 text-white hover:bg-purple-700 transition-all flex items-center gap-1"><Check size={12} /> Pagar</button>
                              )
                            )}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-end">
                            <div><p className="text-[9px] font-black text-slate-400 uppercase">Saldo Bloqueado</p><p className={`text-lg font-black ${isOver ? 'text-red-600' : 'text-brand-600'}`}>{formatCurrency(used)}</p></div>
                            <div className="text-right"><p className="text-[9px] font-black text-slate-400 uppercase">Disponível</p><p className={`text-sm font-black ${isOver ? 'text-red-600' : 'text-slate-800'}`}>{formatCurrency(card.limit - used)}</p></div>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden"><div className={`h-full transition-all ${pct > 90 ? 'bg-red-500' : 'bg-brand-500'}`} style={{ width: `${Math.min(100, pct)}%` }} /></div>
                          <div className="flex justify-between text-[9px] font-black uppercase text-slate-400"><span>Limite: {formatCurrency(card.limit)}</span><span>{pct.toFixed(0)}%</span></div>
                        </div>

                        {/* Ver Lançamentos */}
                        <button onClick={() => { setSelectedCardId(card.id); setActiveTab('CARD_DETAILS'); }} className="w-full mt-4 py-2 text-[9px] font-black uppercase text-brand-600 bg-brand-50 rounded-xl hover:bg-brand-100 transition-all flex items-center justify-center gap-1"><Eye size={12} /> Ver Lançamentos</button>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )
      }

      {
        activeTab === 'CARD_DETAILS' && selectedCard && (
          <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <button onClick={() => setActiveTab('CARDS')} className="flex items-center gap-2 text-[#808080] hover:text-[#5D7F38] font-black text-[10px] uppercase tracking-widest"><ArrowLeft size={16} /> Voltar para Cartões</button>
            </div>

            <div className="bg-[#1F1F1F] p-8 rounded-2xl border border-white/5">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div className="flex items-center gap-4"><div className="p-4 bg-[#5D7F38] text-white rounded-2xl"><ShoppingBag size={24} /></div><div><h3 className="text-2xl font-black text-white">{showAllCardPending ? 'Auditoria de Saldo Devedor' : 'Lançamentos no Mês'}: {selectedCard.name}</h3><p className="text-[10px] font-black text-[#808080] uppercase tracking-widest">{showAllCardPending ? 'Exibindo cada centavo que bloqueia seu limite total' : `Referência: ${filterMonth}`}</p></div></div>
                <div className="bg-[#252525] px-6 py-4 rounded-2xl border border-white/5"><p className="text-[9px] font-black text-[#808080] uppercase mb-1">{showAllCardPending ? 'Dívida Acumulada Listada' : 'Total no Mês'}</p><p className="text-2xl font-black text-[#5D7F38]">{formatCurrency(cardTransactions.reduce((acc, t) => acc + t.amount, 0))}</p></div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="text-[10px] font-black uppercase text-[#808080] border-b border-white/5 bg-[#252525]"><th className="p-6">Mês Ref.</th><th className="p-6">Descrição</th><th className="p-6">Categoria</th><th className="p-6">Natureza</th><th className="p-6 text-right">Valor Parcela</th><th className="p-6 text-center">Ações</th></tr></thead>
                  <tbody className="divide-y divide-white/5">
                    {cardTransactions.map(t => (
                      <tr key={t.id} className={`hover:bg-white/5 transition-colors group ${t.referenceMonth < filterMonth ? 'bg-red-500/5' : ''}`}>
                        <td className="p-6 text-xs font-black text-[#A0A0A0]">{t.referenceMonth} {t.referenceMonth < filterMonth && <span className="ml-2 text-[8px] bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded font-black uppercase">Atrasado</span>}</td>
                        <td className="p-6 font-black text-white text-sm">{t.description}</td>
                        <td className="p-6"><span className="text-[8px] font-black uppercase px-2 py-1 rounded-full bg-[#333] text-[#808080] border border-white/10">{t.category || 'Outros'}</span></td>
                        <td className="p-6"><span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full border ${t.nature === 'recorrente' ? 'bg-blue-500/20 text-blue-500 border-blue-500/30' : t.nature === 'parcela' ? 'bg-orange-500/20 text-orange-500 border-orange-500/30' : 'bg-[#333] text-[#808080] border-white/10'}`}>{t.nature === 'recorrente' ? 'Recorrente' : t.nature === 'parcela' ? 'Parcela' : 'Avulso'}</span></td>
                        <td className="p-6 text-right font-black text-[#5D7F38]">{formatCurrency(t.amount)}</td>
                        <td className="p-6 text-center"><div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleOpenTransaction(t)} className="p-2 text-[#606060] hover:text-[#5D7F38]"><Edit2 size={16} /></button><button onClick={() => { setItemToDelete(t); setModalType('DELETE_CONFIRM'); setIsModalOpen(true); }} className="p-2 text-[#606060] hover:text-red-500"><Trash2 size={16} /></button></div></td>
                      </tr>
                    ))}
                    {cardTransactions.length === 0 && (<tr><td colSpan={6} className="p-20 text-center text-[#606060] font-bold italic">Nenhum lançamento pendente encontrado para este filtro.</td></tr>)}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      }

      {
        activeTab === 'INCOME_DETAILS' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <button onClick={() => setActiveTab('OVERVIEW')} className="flex items-center gap-2 text-[#808080] hover:text-[#5D7F38] font-black text-[10px] uppercase tracking-widest"><ArrowLeft size={16} /> Voltar para Visão Geral</button>
            </div>

            <div className="bg-[#1F1F1F] p-8 rounded-2xl border border-white/5">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div className="flex items-center gap-4"><div className="p-4 bg-emerald-600 text-white rounded-2xl"><ArrowUpCircle size={24} /></div><div><h3 className="text-2xl font-black text-white">Detalhamento de Entradas</h3><p className="text-[10px] font-black text-[#808080] uppercase tracking-widest">Referência: {filterMonth}</p></div></div>
                <div className="bg-[#252525] px-6 py-4 rounded-2xl border border-white/5"><p className="text-[9px] font-black text-[#808080] uppercase mb-1">Total de Entradas</p><p className="text-2xl font-black text-emerald-500">{formatCurrency(stats.incomings)}</p></div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="text-[10px] font-black uppercase text-[#808080] border-b border-white/5 bg-[#252525]"><th className="p-6">Data</th><th className="p-6">Descrição</th><th className="p-6">Categoria</th><th className="p-6 text-right">Valor</th><th className="p-6 text-center">Status</th><th className="p-6 text-center">Ações</th></tr></thead>
                  <tbody className="divide-y divide-white/5">
                    {currentMonthTransactions.filter(t => t.type === 'income').sort((a, b) => a.date.localeCompare(b.date)).map(t => (
                      <tr key={t.id} className="hover:bg-white/5 transition-colors group">
                        <td className="p-6 text-xs font-black text-[#A0A0A0]">{formatDate(t.date)}</td>
                        <td className="p-6 font-black text-white text-sm">{t.description}</td>
                        <td className="p-6 text-xs text-[#808080]">{t.category || 'Geral'}</td>
                        <td className="p-6 text-right font-black text-emerald-500">{formatCurrency(t.amount)}</td>
                        <td className="p-6 text-center"><span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full border ${t.status === 'pago' ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' : 'bg-amber-500/20 text-amber-500 border-amber-500/30'}`}>{t.status}</span></td>
                        <td className="p-6 text-center"><div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleOpenTransaction(t)} className="p-2 text-[#606060] hover:text-[#5D7F38]"><Edit2 size={16} /></button><button onClick={() => { setItemToDelete(t); setModalType('DELETE_CONFIRM'); setIsModalOpen(true); }} className="p-2 text-[#606060] hover:text-red-500"><Trash2 size={16} /></button></div></td>
                      </tr>
                    ))}
                    {currentMonthTransactions.filter(t => t.type === 'income').length === 0 && (<tr><td colSpan={6} className="p-20 text-center text-[#606060] font-bold italic">Nenhuma entrada registrada para este mês.</td></tr>)}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      }

      {
        activeTab === 'EXPENSE_DETAILS' && (() => {
          // Separate card and non-card transactions
          const allExpenses = currentMonthTransactions.filter(t => t.type === 'expense').sort((a, b) => a.date.localeCompare(b.date));
          const nonCardExpenses = allExpenses.filter(t => t.method !== 'cartao');
          const cardExpenses = allExpenses.filter(t => t.method === 'cartao');

          // Group card expenses by cardId
          const cardGroups: Record<string, { card: any; transactions: any[]; total: number }> = {};
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

          return (
            <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <button onClick={() => setActiveTab('OVERVIEW')} className="flex items-center gap-2 text-[#808080] hover:text-[#5D7F38] font-black text-[10px] uppercase tracking-widest"><ArrowLeft size={16} /> Voltar para Visão Geral</button>
              </div>

              <div className="bg-[#1F1F1F] p-8 rounded-2xl border border-white/5">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                  <div className="flex items-center gap-4"><div className="p-4 bg-red-600 text-white rounded-2xl"><ArrowDownCircle size={24} /></div><div><h3 className="text-2xl font-black text-white">Detalhamento de Saídas</h3><p className="text-[10px] font-black text-[#808080] uppercase tracking-widest">Referência: {filterMonth}</p></div></div>
                  <div className="bg-[#252525] px-6 py-4 rounded-2xl border border-white/5"><p className="text-[9px] font-black text-[#808080] uppercase mb-1">Total de Saídas</p><p className="text-2xl font-black text-red-500">{formatCurrency(stats.outgoings)}</p></div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead><tr className="text-[10px] font-black uppercase text-slate-400 border-b border-slate-100"><th className="p-4">Data</th><th className="p-4">Descrição</th><th className="p-4">Método</th><th className="p-4">Natureza</th><th className="p-4">Categoria</th><th className="p-4 text-right">Valor</th><th className="p-4 text-center">Status</th><th className="p-4 text-center">Ações</th></tr></thead>
                    <tbody className="divide-y divide-slate-50">
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
                              className="bg-purple-50/50 hover:bg-purple-100/50 cursor-pointer transition-colors"
                            >
                              <td className="p-4 text-xs font-black text-slate-700">
                                <div className="flex items-center gap-2">
                                  <ChevronDown size={14} className={`text-purple-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                  {filterMonth}
                                </div>
                              </td>
                              <td className="p-4 font-black text-purple-700 text-sm flex items-center gap-2">
                                <CreditCard size={16} className="text-purple-500" />
                                {cardName}
                                <span className="text-[9px] font-black text-purple-400 bg-purple-100 px-2 py-0.5 rounded-full">{txCount} itens</span>
                              </td>
                              <td className="p-4"><span className="text-[8px] font-black uppercase px-2 py-1 rounded-full border bg-purple-50 text-purple-600 border-purple-100">FATURA</span></td>
                              <td className="p-4"><span className="text-[8px] font-black uppercase px-2 py-1 rounded-full border bg-slate-50 text-slate-500 border-slate-200">Agrupado</span></td>
                              <td className="p-4"><span className="text-[8px] font-black uppercase px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">Várias</span></td>
                              <td className="p-4 text-right font-black text-purple-600">{formatCurrency(group.total)}</td>
                              <td className="p-4 text-center"><span className="text-[8px] font-black uppercase px-2 py-1 rounded-full border bg-amber-50 text-amber-600 border-amber-100">previsto</span></td>
                              <td className="p-4 text-center">
                                <button onClick={(e) => { e.stopPropagation(); setSelectedCardId(cardId); setActiveTab('CARD_DETAILS'); }} className="p-2 text-purple-400 hover:text-purple-600">
                                  <Eye size={16} />
                                </button>
                              </td>
                            </tr>

                            {/* Expanded Card Transactions */}
                            {isExpanded && group.transactions.map(t => (
                              <tr key={t.id} className="hover:bg-slate-50 transition-colors group bg-purple-50/20">
                                <td className="p-4 pl-10 text-xs font-black text-slate-500">{formatDate(t.date)}</td>
                                <td className="p-4 font-medium text-slate-600 text-sm">{t.description}</td>
                                <td className="p-4"><span className="text-[8px] font-black uppercase px-2 py-1 rounded-full border bg-purple-50 text-purple-600 border-purple-100">Cartão</span></td>
                                <td className="p-4"><span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full border ${t.nature === 'recorrente' ? 'bg-blue-50 text-blue-600 border-blue-100' : t.nature === 'parcela' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{t.nature === 'recorrente' ? 'Recorrente' : t.nature === 'parcela' ? 'Parcela' : 'Avulso'}</span></td>
                                <td className="p-4"><span className="text-[8px] font-black uppercase px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">{t.category || 'Outros'}</span></td>
                                <td className="p-4 text-right font-black text-red-600">{formatCurrency(t.amount)}</td>
                                <td className="p-4 text-center"><span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full border ${t.status === 'pago' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{t.status}</span></td>
                                <td className="p-4 text-center"><div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleOpenTransaction(t)} className="p-2 text-slate-300 hover:text-brand-600"><Edit2 size={16} /></button><button onClick={() => { setItemToDelete(t); setModalType('DELETE_CONFIRM'); setIsModalOpen(true); }} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={16} /></button></div></td>
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })}

                      {/* Non-Card Transactions */}
                      {nonCardExpenses.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="p-4 text-xs font-black text-slate-700">{formatDate(t.date)}</td>
                          <td className="p-4 font-black text-slate-800 text-sm">{t.description}</td>
                          <td className="p-4"><span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full border ${t.method === 'pix' ? 'bg-cyan-50 text-cyan-600 border-cyan-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{t.method === 'pix' ? 'PIX' : t.method === 'boleto' ? 'Boleto' : t.method || 'N/A'}</span></td>
                          <td className="p-4"><span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full border ${t.nature === 'recorrente' ? 'bg-blue-50 text-blue-600 border-blue-100' : t.nature === 'parcela' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{t.nature === 'recorrente' ? 'Recorrente' : t.nature === 'parcela' ? 'Parcela' : 'Avulso'}</span></td>
                          <td className="p-4"><span className="text-[8px] font-black uppercase px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">{t.category || 'Outros'}</span></td>
                          <td className="p-4 text-right font-black text-red-600">{formatCurrency(t.amount)}</td>
                          <td className="p-4 text-center"><span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full border ${t.status === 'pago' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{t.status}</span></td>
                          <td className="p-4 text-center"><div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleOpenTransaction(t)} className="p-2 text-slate-300 hover:text-brand-600"><Edit2 size={16} /></button><button onClick={() => { setItemToDelete(t); setModalType('DELETE_CONFIRM'); setIsModalOpen(true); }} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={16} /></button></div></td>
                        </tr>
                      ))}

                      {allExpenses.length === 0 && (<tr><td colSpan={8} className="p-20 text-center text-slate-400 font-bold italic">Nenhuma saída registrada para este mês.</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()
      }

      {
        activeTab === 'DEBTS' && (
          <div className="animate-in slide-in-from-bottom-2 duration-300">
            {filteredDebtContracts.length === 0 ? (
              <div className="bg-[#1F1F1F] p-20 rounded-2xl border border-white/5 text-center">
                <p className="text-[#606060] font-bold italic">Nenhuma dívida cadastrada para este escopo. Crie uma dívida ou classifique uma existente.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDebtContracts.map(debt => {
                  const pct = debt.totalInstallments > 0 ? ((debt.totalInstallments - debt.installmentsRemaining) / debt.totalInstallments) * 100 : 0;
                  const currentLedgerType = ledgers.find(l => l.id === debt.ledgerId)?.type;
                  return (
                    <div key={debt.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-red-50 text-red-600 rounded-2xl"><Landmark size={20} /></div>
                          <div><p className="font-black text-slate-800">{debt.creditor}</p><p className="text-[9px] font-black text-slate-400 uppercase truncate max-w-[120px]">{debt.description}</p></div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => { setModalType('DEBT'); setEditingItem({ ...debt }); setIsModalOpen(true); }} className="p-2 text-slate-300 hover:text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 size={14} /></button>
                          <button onClick={() => deleteDebtContract(debt.id)} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                        </div>
                      </div>

                      {/* Classificador PF/PJ */}
                      <div className="flex gap-2 mb-4">
                        {ledgers.map(l => (
                          <button
                            key={l.id}
                            onClick={() => handleDebtLedgerChange(debt, l.id)}
                            className={`flex-1 py-2 rounded-xl text-[8px] font-black uppercase flex items-center justify-center gap-1 transition-all border-2 ${debt.ledgerId === l.id
                              ? l.type === 'PF'
                                ? 'bg-indigo-600 border-indigo-700 text-white'
                                : 'bg-emerald-600 border-emerald-700 text-white'
                              : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'
                              }`}
                          >
                            {l.type === 'PF' ? <User size={10} /> : <Building2 size={10} />}
                            {l.type}
                          </button>
                        ))}
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-end"><div><p className="text-[9px] font-black text-slate-400 uppercase">Saldo Devedor</p><p className="text-lg font-black text-red-600">{formatCurrency(debt.totalDebtRemaining)}</p></div><div className="text-right"><p className="text-[9px] font-black text-slate-400 uppercase">Parcela</p><p className="text-sm font-black text-slate-800">{formatCurrency(debt.installmentAmount)}</p></div></div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden"><div className="h-full bg-red-500 transition-all" style={{ width: `${pct}%` }} /></div>
                        <div className="flex justify-between text-[9px] font-black uppercase text-slate-400"><span>Original: {formatCurrency(debt.totalLoanValue)}</span><span>{debt.installmentsRemaining} parc. rest.</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )
      }

      {/* MODALS */}
      {
        isModalOpen && modalType === 'DELETE_CONFIRM' && itemToDelete && (() => {
          const isRecurrent = itemToDelete.nature === 'recorrente';
          const isInstallment = itemToDelete.nature === 'parcela' && (itemToDelete.installmentsInfo?.total || 1) > 1;
          const hasRelated = isRecurrent || isInstallment;

          return (
            <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-md">
              <div className="bg-white rounded-[40px] p-10 w-full max-w-md shadow-2xl animate-in zoom-in duration-200 text-center">
                <div className="p-5 bg-red-50 text-red-500 rounded-full mb-6 inline-block"><AlertTriangle size={48} /></div>
                <h3 className="text-2xl font-black text-slate-800 mb-2">Excluir Lançamento</h3>

                {hasRelated ? (
                  <>
                    <p className="text-slate-500 font-bold text-sm mb-8 leading-relaxed">Este item possui vínculos. Como deseja proceder?</p>
                    <div className="grid grid-cols-1 gap-3 w-full">
                      <button onClick={() => confirmDelete('ALL_RELATED')} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black text-[11px] uppercase shadow-lg shadow-red-500/20 hover:bg-red-700 transition-all">Excluir TODAS as parcelas</button>
                      <button onClick={() => confirmDelete('ONLY_THIS')} className="w-full bg-slate-100 text-slate-700 py-4 rounded-2xl font-black text-[11px] uppercase hover:bg-slate-200 transition-all">Excluir apenas este mês</button>
                      <button onClick={() => setIsModalOpen(false)} className="w-full bg-white text-slate-400 py-4 rounded-2xl font-black text-[11px] uppercase">Cancelar</button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-slate-500 font-bold text-sm mb-8 leading-relaxed">Tem certeza que deseja excluir este lançamento?</p>
                    <div className="grid grid-cols-1 gap-3 w-full">
                      <button onClick={() => confirmDelete('ONLY_THIS')} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black text-[11px] uppercase shadow-lg shadow-red-500/20 hover:bg-red-700 transition-all">Excluir</button>
                      <button onClick={() => setIsModalOpen(false)} className="w-full bg-slate-100 text-slate-700 py-4 rounded-2xl font-black text-[11px] uppercase hover:bg-slate-200 transition-all">Cancelar</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })()
      }

      {/* TRANSACTION MODAL */}
      {
        isModalOpen && modalType === 'TRANSACTION' && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-white rounded-[40px] p-10 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[95vh] animate-in zoom-in duration-200 relative">
              <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black text-slate-800">{editingItem.id ? 'Editar Lançamento' : 'Novo Lançamento'}</h3><button onClick={() => { setIsModalOpen(false); setShowRecurrenceOptions(false); }} className="bg-slate-50 p-2 rounded-2xl text-slate-400 hover:text-red-500 transition-all"><X size={24} /></button></div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const isRecurrent = editingItem.id && (editingItem.nature === 'recorrente' || editingItem.recurrenceId);
                console.log('Form Submit Debug:', { id: editingItem.id, nature: editingItem.nature, recurrenceId: editingItem.recurrenceId, isRecurrent });
                if (isRecurrent) {
                  setShowRecurrenceOptions(true);
                } else {
                  handleSaveTransaction(e, 'ONLY_THIS');
                }
              }} className="space-y-6">
                <div className="grid grid-cols-2 gap-3"><button type="button" onClick={() => setEditingItem({ ...editingItem, type: 'income' })} className={`py-4 rounded-2xl text-[10px] font-black uppercase border-2 transition-all ${editingItem.type === 'income' ? 'bg-emerald-600 border-emerald-700 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>Entrada</button><button type="button" onClick={() => setEditingItem({ ...editingItem, type: 'expense' })} className={`py-4 rounded-2xl text-[10px] font-black uppercase border-2 transition-all ${editingItem.type === 'expense' ? 'bg-red-600 border-red-700 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>Saída</button></div>

                {/* Seletor PF/PJ - oculto para parcelas de dívidas e lançamentos de cartão */}
                {!editingItem.contractId && editingItem.method !== 'cartao' && (
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Escopo Financeiro</label>
                    <div className="grid grid-cols-2 gap-3">
                      {ledgers.map(l => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => setEditingItem({ ...editingItem, ledgerId: l.id })}
                          className={`py-3 rounded-xl text-[10px] font-black uppercase border-2 transition-all flex items-center justify-center gap-2 ${editingItem.ledgerId === l.id
                            ? l.type === 'PF'
                              ? 'bg-indigo-600 border-indigo-700 text-white shadow-lg'
                              : 'bg-emerald-600 border-emerald-700 text-white shadow-lg'
                            : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'
                            }`}
                        >
                          {l.type === 'PF' ? <User size={14} /> : <Building2 size={14} />}
                          {l.type === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Aviso para lançamentos de cartão */}


                {/* Aviso para parcelas de dívidas */}
                {editingItem.contractId && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <p className="text-[10px] font-black uppercase text-amber-700 flex items-center gap-2">
                      <AlertTriangle size={14} />
                      Parcela vinculada a dívida - Classifique PF/PJ na aba Dívidas
                    </p>
                  </div>
                )}

                <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Descrição</label><input required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black outline-none focus:border-brand-500" value={editingItem.description} onChange={e => setEditingItem({ ...editingItem, description: e.target.value })} /></div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Categoria</label>
                  <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black outline-none focus:border-brand-500" value={editingItem.category} onChange={e => setEditingItem({ ...editingItem, category: e.target.value })}>
                    {(() => {
                      const ledgerType = ledgers.find(l => l.id === editingItem.ledgerId)?.type || 'PF';
                      const cats = getCategoriesForTransaction(ledgerType, editingItem.type);
                      return cats.map(cat => <option key={cat} value={cat}>{cat}</option>);
                    })()}
                  </select>
                </div>

                {/* Seletor de Produto para Estoque */}
                {editingItem.category === 'Estoque' && (
                  <div className="animate-in slide-in-from-top-2">
                    <label className="text-[10px] font-black uppercase text-brand-600 mb-2 block tracking-widest">Produto Relacionado</label>
                    <select
                      required
                      className="w-full bg-brand-50 border-2 border-brand-100 rounded-2xl p-4 font-black outline-none focus:border-brand-500 text-brand-700"
                      value={editingItem.productId || ''}
                      onChange={e => {
                        const prodId = e.target.value;
                        const prod = products.find(p => p.id === prodId);
                        setEditingItem({
                          ...editingItem,
                          productId: prodId,
                          description: prod ? `Reposição: ${prod.name}` : editingItem.description
                        });
                      }}
                    >
                      <option value="">Selecione o produto comprado...</option>
                      {products.filter(p => p.active).map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>

                    <label className="text-[10px] font-black uppercase text-brand-600 mb-2 mt-4 block tracking-widest">Quantidade Comprada (Unidades)</label>
                    <input
                      type="number"
                      min="1"
                      required
                      className="w-full bg-brand-50 border-2 border-brand-100 rounded-2xl p-4 font-black outline-none focus:border-brand-500 text-brand-700"
                      value={editingItem.productQuantity || ''}
                      onChange={e => setEditingItem({ ...editingItem, productQuantity: parseInt(e.target.value) })}
                    />

                    <label className="text-[10px] font-black uppercase text-brand-600 mb-2 mt-4 block tracking-widest">Galpão de Destino</label>
                    <select
                      required
                      className="w-full bg-brand-50 border-2 border-brand-100 rounded-2xl p-4 font-black outline-none focus:border-brand-500 text-brand-700"
                      value={editingItem.warehouseId || ''}
                      onChange={e => setEditingItem({ ...editingItem, warehouseId: e.target.value })}
                    >
                      <option value="">Selecione o galpão...</option>
                      {warehouses.filter(w => w.active).map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>

                    <label className="text-[10px] font-black uppercase text-brand-600 mb-2 mt-4 block tracking-widest">Nome do Lote / Identificação</label>
                    <input
                      className="w-full bg-brand-50 border-2 border-brand-100 rounded-2xl p-4 font-black outline-none focus:border-brand-500 text-brand-700"
                      placeholder="Ex: Lote 1, Importação Jan/26..."
                      value={editingItem.batchName || ''}
                      onChange={e => setEditingItem({ ...editingItem, batchName: e.target.value })}
                    />
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Natureza</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button type="button" onClick={() => setEditingItem({ ...editingItem, nature: 'avulso' })} className={`py-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${editingItem.nature === 'avulso' ? 'bg-brand-600 border-brand-700 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}>Avulso</button>
                    <button type="button" onClick={() => setEditingItem({ ...editingItem, nature: 'recorrente' })} className={`py-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${editingItem.nature === 'recorrente' ? 'bg-amber-600 border-amber-700 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}>Recorrente</button>
                    <button type="button" onClick={() => setEditingItem({ ...editingItem, nature: 'parcela' })} className={`py-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${editingItem.nature === 'parcela' ? 'bg-indigo-600 border-indigo-700 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}>Parcela/Dívida</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Método</label><select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black outline-none focus:border-brand-500" value={editingItem.method} onChange={e => {
                    const newMethod = e.target.value as PaymentMethod;
                    setEditingItem({ ...editingItem, method: newMethod, status: newMethod === 'cartao' ? 'previsto' : editingItem.status });
                  }}><option value="pix">Pix</option><option value="cartao">Cartão</option><option value="boleto">Boleto</option></select></div>
                  {(editingItem.method !== 'cartao') && (<div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Valor</label><input type="number" step="0.01" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black outline-none focus:border-brand-500" value={editingItem.amount} onChange={e => setEditingItem({ ...editingItem, amount: parseFloat(e.target.value) })} /></div>)}
                </div>
                {editingItem.method === 'cartao' && (
                  <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100 space-y-4">
                    <p className="text-[10px] font-black uppercase text-brand-600 tracking-widest">
                      {editingItem.nature === 'recorrente' ? 'Assinatura no Cartão' : 'Parcelas do Cartão'}
                    </p>
                    {editingItem.nature === 'recorrente' ? (
                      // Para recorrente, apenas campo de valor
                      <div>
                        <label className="text-[9px] uppercase text-slate-400">Valor Mensal (R$)</label>
                        <input type="number" step="0.01" className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-sm font-black" value={debtCalc.part} onChange={e => { const val = parseFloat(e.target.value) || 0; setDebtCalc({ ...debtCalc, part: val, total: val, count: 1 }); }} />
                      </div>
                    ) : (
                      // Para outros, mostra parcelas
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div><label className="text-[9px] uppercase text-slate-400">Valor Parcela (R$)</label><input type="number" step="0.01" className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-sm font-black" value={debtCalc.part} onChange={e => { const val = parseFloat(e.target.value) || 0; setDebtCalc({ ...debtCalc, part: val, total: val * debtCalc.count }); }} /></div>
                          <div><label className="text-[9px] uppercase text-slate-400">Qtd Parc.</label><input type="number" step="1" className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-sm font-black" value={debtCalc.count} onChange={e => { const val = Math.max(1, parseInt(e.target.value) || 1); setDebtCalc({ ...debtCalc, count: val, total: debtCalc.part * val }); }} /></div>
                        </div>
                        <div className="text-right text-[10px] font-black uppercase text-slate-400">Total Calculado: {formatCurrency(debtCalc.total)}</div>
                      </>
                    )}
                    <div><label className="text-[9px] uppercase text-slate-400">Escolha o Cartão</label><select required className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-sm font-black" value={editingItem.cardId} onChange={e => {
                      const selectedCard = cards.find(c => c.id === e.target.value);
                      if (selectedCard) {
                        // Calcula a data de vencimento baseada no mês de referência e dueDay do cartão
                        const [year, month] = (editingItem.referenceMonth || filterMonth).split('-').map(Number);
                        const dueDay = selectedCard.dueDay || 1;
                        // Garante que o dia não ultrapasse o último dia do mês
                        const lastDayOfMonth = new Date(year, month, 0).getDate();
                        const validDay = Math.min(dueDay, lastDayOfMonth);
                        const newDueDate = `${year}-${String(month).padStart(2, '0')}-${String(validDay).padStart(2, '0')}`;
                        setEditingItem({ ...editingItem, cardId: e.target.value, ledgerId: selectedCard.ledgerId || editingItem.ledgerId, date: newDueDate });
                      } else {
                        setEditingItem({ ...editingItem, cardId: e.target.value });
                      }
                    }}><option value="">Escolha...</option>{cards.map(c => <option key={c.id} value={c.id}>{c.name} {c.ledgerId ? `(${ledgers.find(l => l.id === c.ledgerId)?.type || ''})` : ''}</option>)}</select></div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Mês Ref.</label><input type="month" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black" value={editingItem.referenceMonth} onChange={e => setEditingItem({ ...editingItem, referenceMonth: e.target.value })} /></div><div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Vencimento</label><input type="date" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black" value={editingItem.date} onChange={e => setEditingItem({ ...editingItem, date: e.target.value })} /></div></div>

                {/* Checkbox: Já está pago? */}
                {/* Checkbox: Já está pago? - Apenas se não for cartão */}
                {editingItem.method !== 'cartao' && (
                  <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 cursor-pointer hover:bg-slate-100 transition-all">
                    <input
                      type="checkbox"
                      checked={editingItem.status === 'pago'}
                      onChange={e => setEditingItem({
                        ...editingItem,
                        status: e.target.checked ? 'pago' : 'previsto',
                        paidDate: e.target.checked
                          ? (editingItem.paidDate || new Date().toISOString().split('T')[0])
                          : undefined
                      })}
                      className="w-5 h-5 rounded border-2 border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <div>
                      <span className="font-black text-slate-700 text-sm">Já está {editingItem.type === 'income' ? 'recebido' : 'pago'}?</span>
                      <p className="text-[9px] font-bold text-slate-400">Marque se o {editingItem.type === 'income' ? 'recebimento' : 'pagamento'} já foi realizado</p>
                    </div>
                  </label>
                )}

                {/* Data de Pagamento/Recebimento - Aparece quando marcado como pago */}
                {editingItem.status === 'pago' && editingItem.method !== 'cartao' && (
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">
                      Data do {editingItem.type === 'income' ? 'Recebimento' : 'Pagamento'}
                    </label>
                    <input
                      type="date"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black outline-none focus:border-brand-500"
                      value={editingItem.paidDate || ''}
                      onChange={e => setEditingItem({ ...editingItem, paidDate: e.target.value })}
                    />
                  </div>
                )}

                <button type="submit" className="w-full bg-brand-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-brand-500/30 uppercase text-[11px] tracking-widest hover:bg-brand-700 transition-all">Salvar Lançamento</button>
              </form>

              {/* Recurrence Options Overlay */}
              {showRecurrenceOptions && (
                <div className="absolute inset-0 z-[70] bg-white/95 flex items-center justify-center rounded-[40px] animate-in fade-in duration-200">
                  <div className="text-center p-8 max-w-sm">
                    <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
                      <AlertTriangle size={32} />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mb-2">Editar Recorrência</h3>
                    <p className="text-sm text-slate-500 mb-8 font-medium">
                      Você está editando um lançamento recorrente. Como deseja aplicar as alterações?
                    </p>

                    <div className="space-y-3">
                      <button
                        onClick={(e) => {
                          handleSaveTransaction(e, 'ONLY_THIS');
                          setShowRecurrenceOptions(false);
                        }}
                        className="w-full bg-white border-2 border-slate-200 p-4 rounded-2xl text-slate-700 font-black text-sm hover:border-brand-500 hover:text-brand-600 transition-all flex items-center justify-between group"
                      >
                        <span>Apenas este</span>
                        <span className="text-[10px] uppercase bg-slate-100 px-2 py-1 rounded text-slate-500 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">Este mês</span>
                      </button>

                      <button
                        onClick={(e) => {
                          handleSaveTransaction(e, 'FROM_HERE');
                          setShowRecurrenceOptions(false);
                        }}
                        className="w-full bg-emerald-600 border-2 border-emerald-600 p-4 rounded-2xl text-white font-black text-sm hover:bg-emerald-700 hover:border-emerald-700 transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-between"
                      >
                        <span>Daqui em diante</span>
                        <span className="text-[10px] uppercase bg-white/20 px-2 py-1 rounded text-white">Futuros</span>
                      </button>

                      <button
                        onClick={(e) => {
                          handleSaveTransaction(e, 'ALL_RELATED');
                          setShowRecurrenceOptions(false);
                        }}
                        className="w-full bg-brand-600 border-2 border-brand-600 p-4 rounded-2xl text-white font-black text-sm hover:bg-brand-700 hover:border-brand-700 transition-all shadow-lg shadow-brand-500/30 flex items-center justify-between"
                      >
                        <span>Toda a série</span>
                        <span className="text-[10px] uppercase bg-white/20 px-2 py-1 rounded text-white">Todas</span>
                      </button>

                      <button
                        onClick={() => setShowRecurrenceOptions(false)}
                        className="mt-4 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-red-500 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      }

      {
        isModalOpen && modalType === 'CARD' && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-md"><div className="bg-white rounded-[40px] p-10 w-full max-w-lg shadow-2xl animate-in zoom-in duration-200"><div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black text-slate-800">{editingItem.id ? 'Editar Cartão' : 'Novo Cartão'}</h3><button onClick={() => setIsModalOpen(false)} className="bg-slate-50 p-2 rounded-2xl text-slate-400 hover:text-red-500 transition-all"><X size={24} /></button></div><form onSubmit={async (e) => { e.preventDefault(); editingItem.id ? await updateCard(editingItem) : await addCard(editingItem); setIsModalOpen(false); }} className="space-y-6"><div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Nome</label><input required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black" value={editingItem.name} onChange={e => setEditingItem({ ...editingItem, name: e.target.value })} /></div><div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Fechamento</label><input type="number" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black" value={editingItem.closingDay} onChange={e => setEditingItem({ ...editingItem, closingDay: parseInt(e.target.value) })} /></div><div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Vencimento</label><input type="number" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black" value={editingItem.dueDay} onChange={e => setEditingItem({ ...editingItem, dueDay: parseInt(e.target.value) })} /></div></div><div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Limite Total</label><input type="number" step="0.01" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black" value={editingItem.limit} onChange={e => setEditingItem({ ...editingItem, limit: parseFloat(e.target.value) })} /></div><button type="submit" className="w-full bg-brand-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-brand-500/30 uppercase text-[11px] tracking-widest mt-4">Salvar Cartão</button></form></div></div>
        )
      }

      {
        isModalOpen && modalType === 'DEBT' && editingItem && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-white rounded-[40px] p-10 w-full max-w-lg shadow-2xl animate-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-800">Editar Dívida</h3>
                <button onClick={() => setIsModalOpen(false)} className="bg-slate-50 p-2 rounded-2xl text-slate-400 hover:text-red-500 transition-all"><X size={24} /></button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const oldDebt = debtContracts.find(d => d.id === editingItem.id);
                const oldInstallmentAmount = oldDebt?.installmentAmount || 0;
                const newInstallmentAmount = parseFloat(editingItem.installmentAmount) || 0;

                // Update the debt contract
                await updateDebtContract(editingItem);

                // If installment amount changed, propagate to all related transactions
                if (oldInstallmentAmount !== newInstallmentAmount) {
                  const relatedTxs = transactions.filter(t => t.contractId === editingItem.id);
                  for (const tx of relatedTxs) {
                    await updateTransaction({ ...tx, amount: newInstallmentAmount });
                  }
                }

                setIsModalOpen(false);
              }} className="space-y-6">
                <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Credor</label><input required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black" value={editingItem.creditor || ''} onChange={e => setEditingItem({ ...editingItem, creditor: e.target.value })} /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Descrição</label><input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black" value={editingItem.description || ''} onChange={e => setEditingItem({ ...editingItem, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Valor da Parcela</label>
                    <input type="number" step="0.01" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black" value={editingItem.installmentAmount || 0} onChange={e => {
                      const newVal = parseFloat(e.target.value) || 0;
                      const remaining = editingItem.installmentsRemaining || 0;
                      setEditingItem({ ...editingItem, installmentAmount: newVal, totalDebtRemaining: newVal * remaining });
                    }} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Parcelas Restantes</label>
                    <input type="number" step="1" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black" value={editingItem.installmentsRemaining || 0} onChange={e => {
                      const newVal = parseInt(e.target.value) || 0;
                      const installment = editingItem.installmentAmount || 0;
                      setEditingItem({ ...editingItem, installmentsRemaining: newVal, totalDebtRemaining: installment * newVal });
                    }} />
                  </div>
                </div>
                {/* Auto-calculated Saldo Devedor display */}
                <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400">Saldo Devedor (calculado)</p>
                      <p className="text-xl font-black text-red-600">{formatCurrency(editingItem.totalDebtRemaining || 0)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-slate-400">{editingItem.installmentsRemaining || 0} × {formatCurrency(editingItem.installmentAmount || 0)}</p>
                    </div>
                  </div>
                </div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Dia de Vencimento</label><input type="number" min="1" max="31" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black" value={editingItem.dueDay || 1} onChange={e => setEditingItem({ ...editingItem, dueDay: parseInt(e.target.value) || 1 })} /></div>
                <button type="submit" className="w-full bg-brand-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-brand-500/30 uppercase text-[11px] tracking-widest mt-4 hover:bg-brand-700 transition-all">Salvar Dívida</button>
              </form>
            </div>
          </div>
        )
      }

      {/* Cash Balance Edit Modal */}
      {
        showOpeningBalanceModal && baseCashBalance && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800">Editar Caixa Base</h3>
                <button onClick={() => setShowOpeningBalanceModal(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-all"><X size={20} /></button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                await updateOpeningBalance({
                  ...baseCashBalance,
                  amount: openingBalanceEditValue,
                  baseMonth: filterMonth // Save the current month as the starting point for calculations
                });
                setShowOpeningBalanceModal(false);
              }} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Escopo</label>
                  <p className="text-lg font-black text-slate-700">{selectedLedger?.type || 'N/A'} - {selectedLedger?.name || ''}</p>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Mês de Referência</label>
                  <p className="text-lg font-black text-slate-700">{formatMonthDisplay(filterMonth)}</p>
                  <p className="text-[10px] text-slate-400 mt-1">O cálculo em cadeia iniciará a partir deste mês</p>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Valor em Caixa (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black text-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                    value={openingBalanceEditValue}
                    onChange={e => setOpeningBalanceEditValue(parseFloat(e.target.value) || 0)}
                    autoFocus
                  />
                </div>
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                  <p className="text-[11px] font-bold text-amber-700">
                    💡 Este valor será o caixa inicial de {formatMonthDisplay(filterMonth)}. Os meses seguintes calcularão automaticamente com base no saldo projetado.
                  </p>
                </div>
                <button type="submit" className="w-full bg-brand-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-brand-500/30 uppercase text-[11px] tracking-widest hover:bg-brand-700 transition-all">
                  Salvar Caixa
                </button>
              </form>
            </div>
          </div>
        )
      }
    </div >
  );
};
