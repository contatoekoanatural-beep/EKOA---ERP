import React, { useContext, useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../../contexts/FinanceContext';

import { formatCurrency, getCurrentLocalDate, formatDate } from '../../constants';
import {
    Plus, Edit2, Trash2, ArrowUpCircle, ArrowDownCircle,
    CreditCard, Landmark, ArrowLeft, Clock, Check, ShoppingBag,
    AlertTriangle, Eye, User, Building2, ArrowRightLeft, X, Filter, DollarSign
} from 'lucide-react';
import { Transaction, CreditCard as CreditCardType } from '../../types';

// Import modular components
import {
    StatCard,
    MonthNavigator,
    LedgerSelector,
    OverviewTab,
    FlowTab,
    RecurrencesTab,
    CardsTab,
    DebtsTab,
    CardDetailsTab,
    IncomeDetailsTab,
    ExpenseDetailsTab,
    FinanceCategoryList
} from './components';

import {
    TransactionModal,
    CardModal,
    DebtModal,
    DeleteConfirmModal
} from './modals';

import {
    FinanceTab,
    FlowStatusFilter,
    getCategoriesForTransaction,
    formatMonthDisplay,
    getMonthsInRange,
    MIN_ALLOWED_MONTH,
    prevMonth,
    nextMonth
} from './constants';

import { useRecurrenceGenerator } from './hooks/useRecurrenceGenerator';

import { FinanceStats, FlowEntry, DebtCalcState, ModalType } from './types';

export const Finance = ({ forcedScope }: { forcedScope: 'PF' | 'PJ' }) => {
    const navigate = useNavigate();
    const {
        ledgers, transactions, recurrences, cards, debts, debtContracts, openingBalances, feeTypes = [], bankAccounts,
        addTransaction, updateTransaction, updateFinanceStatus, deleteTransaction,
        addCard, updateCard, deleteCard,
        addRecurrence, updateRecurrence, deleteRecurrence,
        addDebt, updateDebt, deleteDebt,
        addDebtContract, updateDebtContract, deleteDebtContract,
        addOpeningBalance, updateOpeningBalance,
        addBankAccount, updateBankAccount, deleteBankAccount,
        addLedger, updateLedger, addTransfer
    } = useFinance();


    // ==================== STATE ====================

    // Ledger selection logic with Strict Scope enforcement
    const [selectedLedgerId, setSelectedLedgerId] = useState<string>('');

    // Effect: Enforce ledger selection based on forcedScope
    useEffect(() => {
        if (ledgers.length > 0) {
            // Find the correct ledger for the current scope
            // We assume there's one default ledger per Type, or we pick the first one matching the type.
            const targetLedger = ledgers.find(l => l.type === forcedScope && l.isDefault) ||
                ledgers.find(l => l.type === forcedScope);

            if (targetLedger) {
                setSelectedLedgerId(targetLedger.id);
            }
        }
    }, [ledgers, forcedScope]);

    const selectedLedger = useMemo(() => ledgers.find(l => l.id === selectedLedgerId), [ledgers, selectedLedgerId]);

    // Handle ledger change is NOT exposed in Strict Mode, but kept for internal logic if needed
    const handleLedgerChange = (ledgerId: string) => {
        setSelectedLedgerId(ledgerId);
    };

    const [activeTab, setActiveTab] = useState<FinanceTab>('OVERVIEW');

    // Month range filter state
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const [filterStartMonth, setFilterStartMonth] = useState(currentMonthStr);
    const [filterEndMonth, setFilterEndMonth] = useState(currentMonthStr);

    // Legacy compatibility
    const filterMonth = filterStartMonth;
    const setFilterMonth = (month: string) => {
        setFilterStartMonth(month);
        setFilterEndMonth(month);
    };

    // Month navigation - block navigation before January 2026 (base month)
    const MIN_ALLOWED_MONTH = '2026-01';

    const navigateMonth = (direction: 'prev' | 'next') => {
        let newMonth: string;
        if (direction === 'next') {
            newMonth = nextMonth(filterStartMonth);
        } else {
            newMonth = prevMonth(filterStartMonth);
        }

        // Block navigation to months before the minimum allowed
        if (newMonth < MIN_ALLOWED_MONTH) return;

        setFilterStartMonth(newMonth);
        setFilterEndMonth(newMonth);
    };

    const setMonthPreset = (preset: string) => {
        const now = new Date();
        const currentMonth = now.toISOString().slice(0, 7);

        switch (preset) {
            case 'current':
                setFilterStartMonth(currentMonth);
                setFilterEndMonth(currentMonth);
                break;
            case 'last':
                now.setMonth(now.getMonth() - 1);
                setFilterStartMonth(now.toISOString().slice(0, 7));
                setFilterEndMonth(now.toISOString().slice(0, 7));
                break;
            case 'last3': {
                const end = new Date();
                const start = new Date();
                start.setMonth(start.getMonth() - 2);
                setFilterStartMonth(start.toISOString().slice(0, 7));
                setFilterEndMonth(end.toISOString().slice(0, 7));
                break;
            }
            case 'last6': {
                const end = new Date();
                const start = new Date();
                start.setMonth(start.getMonth() - 5);
                setFilterStartMonth(start.toISOString().slice(0, 7));
                setFilterEndMonth(end.toISOString().slice(0, 7));
                break;
            }
            case 'year':
                setFilterStartMonth(`${now.getFullYear()}-01`);
                setFilterEndMonth(currentMonth);
                break;
        }
    };

    const isRangeFilter = filterStartMonth !== filterEndMonth;

    // Helper to check if a month is within the filter range
    const isMonthInRange = (refMonth: string | undefined) => {
        if (!refMonth) return false;
        return refMonth >= filterStartMonth && refMonth <= filterEndMonth;
    };

    const [showAllCardPending, setShowAllCardPending] = useState(false);
    const [expandedCardGroups, setExpandedCardGroups] = useState<Set<string>>(new Set());
    const [flowStatusFilter, setFlowStatusFilter] = useState<FlowStatusFilter>('ALL');

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<ModalType>(null);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [itemToDelete, setItemToDelete] = useState<Transaction | null>(null);
    const [debtCalc, setDebtCalc] = useState<DebtCalcState>({ total: 0, part: 0, count: 1 });

    // Auto-generate recurrences
    useRecurrenceGenerator({
        transactions,
        recurrences,
        cards,
        addTransaction
    });

    // ==================== COMPUTED DATA ====================

    // STRICT MODE: Consolidated is ALWAYS false.
    const isConsolidated = false;

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            if (t.method === 'cartao') {
                if (!t.cardId) return false;
                const cardExists = cards.find(c => c.id === t.cardId);
                if (!cardExists) return false;
            }

            if (isConsolidated) {
                if (t.contractId) {
                    const contract = debtContracts.find(c => c.id === t.contractId);
                    return !!contract;
                }
                if (t.method === 'cartao') return true;
                return !!t.ledgerId;
            }

            if (t.contractId) {
                const contract = debtContracts.find(c => c.id === t.contractId);
                if (contract) return contract.ledgerId === selectedLedgerId;
                return false;
            }

            if (t.method === 'cartao') {
                const card = cards.find(c => c.id === t.cardId);
                return card!.ledgerId === selectedLedgerId;
            }

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

    const currentMonthTransactions = useMemo(() => {
        return filteredTransactions.filter(t => isMonthInRange(t.referenceMonth));
    }, [filteredTransactions, filterStartMonth, filterEndMonth]);

    // Cash balance logic (NEW: Per-Month Opening Balance)
    const baseCashBalance = useMemo(() => {
        if (!selectedLedgerId || isConsolidated) return null;
        // Find explicit opening balance for THIS month
        return openingBalances.find(ob =>
            ob.ledgerId === selectedLedgerId &&
            ob.monthRef === filterMonth
        ) || null;
    }, [openingBalances, selectedLedgerId, isConsolidated, filterMonth]);

    // Auto-create Opening Balance for the month if missing (Rollover Logic)
    useEffect(() => {
        if (isConsolidated || !selectedLedgerId) return;
        if (filterMonth <= MIN_ALLOWED_MONTH) return; // Don't auto-create legacy or base month if missing (user sets base manually)

        // Check if we already have one
        const currentRef = openingBalances.find(ob => ob.ledgerId === selectedLedgerId && ob.monthRef === filterMonth);
        if (currentRef) return;

        // If missing, look for PREVIOUS month's data to rollover
        const prevMonthStr = prevMonth(filterMonth);
        const prevRef = openingBalances.find(ob => ob.ledgerId === selectedLedgerId && ob.monthRef === prevMonthStr);

        // Calculate Previous Month's Projected Balance
        // Projected = Opening (Prev) + All Incomings (Prev) - All Outgoings (Prev)
        // Note: usage of 'transactions' here scans all, we filter by prevMonthStr

        let rolloverAmount = 0;

        if (prevRef) {
            const prevMonthTxs = transactions.filter(t =>
                t.referenceMonth === prevMonthStr &&
                t.ledgerId === selectedLedgerId
                // We don't filter safely by card/etc here but simple ledger check is usually enough as filteredTransactions does more complex logic.
                // Better to use a simpler reduce on the raw transactions list for stability:
            );

            // Calculate totals for previous month
            const prevIn = prevMonthTxs
                .filter(t => t.type === 'income' && (t.status === 'pago' || t.status === 'previsto'))
                .reduce((acc, t) => acc + t.amount, 0);

            const prevOut = prevMonthTxs
                .filter(t => t.type === 'expense' && (t.status === 'pago' || t.status === 'previsto'))
                .reduce((acc, t) => acc + t.amount, 0);

            rolloverAmount = prevRef.amount + prevIn - prevOut;
        } else {
            // If previous month doesn't exist, we can't rollover. 
            // We could default to 0, but user might want to set it manually.
            // For now, let's create it as 0 to ensure stability, or maybe we wait?
            // User requested: "Se o mês atual não tiver... definir automaticamente".
            // If we are sequential, maybe we assume 0 if the chain is broken, 
            // BUT this creates 0s everywhere if user jumps ahead. 
            // Let's only do it if we have a prevRef OR if it's the month right after MIN_ALLOWED_MONTH (where base might look different if we didn't migrate).
            // Actually, safe bet: Create with 0 if no chain, user can edit. 
            // BETTER: Don't create if broken chain, let user fix chain? 
            // User said "Rollover automático... rodar UMA vez".
            // Let's default to finding the closest previous balance? No, simplest is direct prev.
            if (filterMonth > MIN_ALLOWED_MONTH) {
                // Try to find if there is ANY previous balance to carry over? 
                // No, strictly prev month for accurate accounting.
                // If prev is missing, we create with 0.
                rolloverAmount = 0;
            }
        }

        // Create the opening balance
        addOpeningBalance({
            ledgerId: selectedLedgerId,
            monthRef: filterMonth,
            amount: rolloverAmount
        } as any);

    }, [selectedLedgerId, openingBalances, isConsolidated, filterMonth, transactions, addOpeningBalance]);

    const today = getCurrentLocalDate();

    // Stats calculation
    const stats: FinanceStats = useMemo(() => {
        const pendingStatuses = ['previsto', 'atrasado'];

        // --- REALIZED (Current Month) ---
        // New: Only count things that are actually in this month's range

        const realizedIncomings = currentMonthTransactions
            .filter(t => t.type === 'income' && t.status === 'pago')
            .reduce((acc, t) => acc + t.amount, 0);

        const realizedNonCardOutgoings = currentMonthTransactions
            .filter(t => t.type === 'expense' && t.method !== 'cartao' && t.status === 'pago')
            .reduce((acc, t) => acc + t.amount, 0);

        const realizedCardOutgoings = currentMonthTransactions
            .filter(t => t.type === 'expense' && t.method === 'cartao' && t.status === 'pago')
            .reduce((acc, t) => acc + t.amount, 0);

        const realizedOutgoings = realizedNonCardOutgoings + realizedCardOutgoings;

        // --- PENDING (Current Month) ---
        // For projection, we sum Pending + Paid (Total Flow)

        const allIncomings = currentMonthTransactions
            .filter(t => t.type === 'income')
            .reduce((acc, t) => acc + t.amount, 0);

        const allOutgoings = currentMonthTransactions
            .filter(t => t.type === 'expense')
            .reduce((acc, t) => acc + t.amount, 0);

        // Stats for Cards (Unpaid Invoices)
        // ... (existing logic for card analysis kept for UI cards, but not for main projection math if we use 'expense' transactions directly)

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

        const unpaidCardInvoices = Object.values(cardInvoices)
            .filter(inv => !inv.isPaid)
            .reduce((acc, inv) => acc + inv.total, 0);

        // Stats Display Only
        const incomings = currentMonthTransactions
            .filter(t => t.type === 'income' && pendingStatuses.includes(t.status))
            .reduce((acc, t) => acc + t.amount, 0);

        const outgoings = currentMonthTransactions
            .filter(t => t.type === 'expense' && pendingStatuses.includes(t.status)) // This includes card expenses if they are transactions
            .reduce((acc, t) => acc + t.amount, 0);


        const totalOpenDebt = filteredDebtContracts.reduce((acc, d: any) => acc + (d.totalOpen || d.totalDebtRemaining || 0), 0);

        const atrasados = currentMonthTransactions.filter(t => {
            if (t.date >= today) return false;
            if (t.status !== 'previsto' && t.status !== 'atrasado') return false;
            if (t.type !== 'expense') return false;
            if (t.method === 'cartao' && t.cardId) {
                const cardExists = cards.find(c => c.id === t.cardId);
                if (!cardExists) return false;
            }
            return true;
        });

        const in7Days = new Date(today);
        in7Days.setDate(in7Days.getDate() + 7);
        const in7DaysStr = in7Days.toISOString().slice(0, 10);
        const venceEm7Dias = currentMonthTransactions.filter(t =>
            t.date >= today && t.date <= in7DaysStr && t.status === 'previsto' && t.type === 'expense'
        );

        const catTotals: Record<string, number> = {};
        currentMonthTransactions.filter(t => t.type === 'expense').forEach(t => {
            const cat = t.category || 'Outros';
            catTotals[cat] = (catTotals[cat] || 0) + t.amount;
        });
        const topCategories = Object.entries(catTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3) as [string, number][];

        // --- FINAL BALANCES ---
        const startOfMonthCash = baseCashBalance?.amount || 0;

        // 1. Current Cash (Caixa Atual) = Start + Realized Flows
        const currentCashBalance = startOfMonthCash + realizedIncomings - realizedOutgoings;

        // 2. Projected Balance (Saldo Projetado) = Start + All Flows (Realized + Pending)
        const projectedBalance = startOfMonthCash + allIncomings - allOutgoings;

        return {
            incomings, // Display "A receber/Previsto" on cards
            outgoings, // Display "A pagar/Previsto" on cards
            cashBalance: currentCashBalance,
            balance: projectedBalance,
            totalOpenDebt,
            monthlyDebtInstallments: currentMonthTransactions.filter(t => t.origin === 'debt' || t.debtId || t.contractId).reduce((acc, t) => acc + t.amount, 0),
            atrasados: { count: atrasados.length, total: atrasados.reduce((acc, t) => acc + t.amount, 0) },
            venceEm7Dias: { count: venceEm7Dias.length, total: venceEm7Dias.reduce((acc, t) => acc + t.amount, 0) },
            topCategories
        };
    }, [currentMonthTransactions, filteredDebtContracts, today, baseCashBalance, isConsolidated, cards]);


    // Flow entries
    const flowEntries: FlowEntry[] = useMemo(() => {
        const nonCardTx = currentMonthTransactions.filter(t => t.method !== 'cartao');
        const cardTx = currentMonthTransactions.filter(t => t.method === 'cartao');

        const cardGroups: Record<string, any> = {};

        cardTx.forEach(t => {
            if (!t.cardId) return;
            const cardExists = cards.find(c => c.id === t.cardId);
            if (!cardExists) return;

            const cId = t.cardId;

            if (!cardGroups[cId]) {
                const dueDay = cardExists.dueDay || 10;
                const [year, month] = t.referenceMonth.split('-').map(Number);
                const invoiceDate = new Date(year, month - 1, dueDay).toISOString().split('T')[0];

                cardGroups[cId] = {
                    id: `group-${cId}`,
                    description: `Fatura ${cardExists.name}`,
                    amount: 0,
                    method: 'cartao',
                    status: 'previsto',
                    type: 'expense',
                    date: invoiceDate,
                    referenceMonth: t.referenceMonth,
                    isGroup: true,
                    cardId: cId,
                    transactionIds: [] as string[],
                    allPaid: true
                };
            }
            cardGroups[cId].amount += t.amount;
            cardGroups[cId].transactionIds.push(t.id);

            if (t.status !== 'pago') {
                cardGroups[cId].allPaid = false;
                cardGroups[cId].status = 'previsto';
            }
        });

        Object.values(cardGroups).forEach((group: any) => {
            if (group.allPaid) {
                group.status = 'pago';
            }
        });

        const allEntries = [...nonCardTx, ...Object.values(cardGroups)].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

        if (flowStatusFilter === 'ALL') return allEntries;

        return allEntries.filter(entry => {
            const isOverdue = entry.date < today && (entry.status === 'previsto' || entry.status === 'atrasado') && !entry.isGroup;
            const effectiveStatus = isOverdue ? 'atrasado' : entry.status;
            return effectiveStatus === flowStatusFilter;
        });
    }, [currentMonthTransactions, cards, flowStatusFilter, today]);

    // Card usage calculation
    const getCardUsage = (cardId: string) => {
        const activeContracts = debtContracts.filter(d => d.cardId === cardId && d.status === 'Ativo');
        const contractDebt = activeContracts.reduce((acc, d) => acc + d.totalDebtRemaining, 0);

        const activeContractIds = new Set(activeContracts.map(d => d.id));
        const allExistingContractIds = new Set(debtContracts.map(d => d.id));

        const otherPending = transactions.filter(t =>
            t.cardId === cardId &&
            (t.status === 'previsto' || t.status === 'planned') &&
            t.type === 'expense' &&
            (!t.contractId || (allExistingContractIds.has(t.contractId) && !activeContractIds.has(t.contractId)))
        ).reduce((acc, t) => acc + t.amount, 0);

        return contractDebt + otherPending;
    };

    const selectedCard = useMemo(() => cards.find(c => c.id === selectedCardId), [cards, selectedCardId]);

    const cardTransactions = useMemo(() => {
        if (!selectedCardId) return [];
        return transactions
            .filter(t => {
                const isThisCard = t.cardId === selectedCardId;
                if (!isThisCard) return false;
                if (showAllCardPending) return (t.status === 'previsto' || t.status === 'planned') && t.type === 'expense';
                return t.referenceMonth === filterMonth;
            })
            .sort((a, b) => a.date.localeCompare(b.date));
    }, [transactions, selectedCardId, filterMonth, showAllCardPending]);

    // ==================== HANDLERS ====================

    const handleOpenTransaction = (t?: any) => {
        setModalType('TRANSACTION');
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
        if (!t) item.ledgerId = defaultLedgerId;
        setEditingItem(item);
        setDebtCalc({
            total: item.amount * (item.installmentsInfo?.total || 1) || 0,
            part: item.amount || 0,
            count: item.installmentsInfo?.total || 1
        });
        setIsModalOpen(true);
    };

    const handleSaveTransaction = async (e: React.FormEvent, updateScope?: 'ONLY_THIS' | 'ALL_RELATED' | 'FROM_HERE') => {
        e.preventDefault();
        const isNew = !editingItem.id;
        const isCardMethod = editingItem.method === 'cartao';
        const newTotalCount = Math.round(debtCalc.count);
        const isMulti = (isCardMethod || editingItem.nature === 'parcela') && newTotalCount > 1;
        const finalAmount = isCardMethod ? debtCalc.part : editingItem.amount;

        if (!isNew) {
            const currentInstallment = editingItem.installmentsInfo?.current || 1;
            const oldTotal = editingItem.installmentsInfo?.total || 1;

            const updatedItem = {
                ...editingItem,
                amount: finalAmount,
                installmentsInfo: isMulti ? { current: currentInstallment, total: newTotalCount } : undefined
            };

            // Update the current item first
            await updateTransaction(updatedItem);

            // Logic for updating all recurrences or from here onwards
            if ((updateScope === 'ALL_RELATED' || updateScope === 'FROM_HERE') && (editingItem.nature === 'recorrente' || editingItem.recurrenceId)) {
                // Find original transaction to get reliable matching criteria (original description, recurrenceId)
                const originalTx = transactions.find(t => t.id === editingItem.id);
                const searchDesc = originalTx ? originalTx.description : editingItem.description;
                const searchRecurrenceId = originalTx ? (originalTx.recurrenceId || originalTx.id) : (editingItem.recurrenceId || editingItem.id);

                let related = transactions.filter(t => {
                    if (t.id === editingItem.id) return false;

                    // 1. Match by recurrenceId
                    if (searchRecurrenceId && (t.recurrenceId === searchRecurrenceId || t.id === searchRecurrenceId)) return true;

                    // 2. Fallback: strict description match + same ledger + nature='recorrente'
                    return t.description === searchDesc && t.nature === 'recorrente' && t.ledgerId === editingItem.ledgerId;
                });

                if (updateScope === 'FROM_HERE') {
                    // Filter only transactions with date >= current editing item date
                    const currentDate = editingItem.date;
                    related = related.filter(t => t.date >= currentDate);
                }

                for (const t of related) {
                    await updateTransaction({
                        ...t,
                        category: editingItem.category,
                        description: editingItem.description, // Propagate description changes too if desired
                        amount: finalAmount,
                        method: editingItem.method,
                        cardId: editingItem.cardId,
                        ledgerId: editingItem.ledgerId,
                    });
                }
            }

            if (isMulti && newTotalCount > oldTotal) {
                const recurrenceId = editingItem.recurrenceId || editingItem.id;
                const existingInstallments = transactions.filter(t =>
                    t.id === recurrenceId || t.recurrenceId === recurrenceId
                );
                const maxExistingInstallment = Math.max(
                    ...existingInstallments.map(t => t.installmentsInfo?.current || 1)
                );

                for (const t of existingInstallments) {
                    if (t.installmentsInfo) {
                        await updateTransaction({
                            ...t,
                            amount: finalAmount,
                            installmentsInfo: { ...t.installmentsInfo, total: newTotalCount }
                        });
                    }
                }

                const baseDate = new Date(editingItem.date + 'T12:00:00');
                baseDate.setMonth(baseDate.getMonth() - (currentInstallment - 1));

                for (let i = maxExistingInstallment; i < newTotalCount; i++) {
                    const d = new Date(baseDate);
                    d.setMonth(d.getMonth() + i);
                    const ds = d.toISOString().split('T')[0];
                    const baseDesc = editingItem.description.replace(/\s*\(\d+\/\d+\)$/, '');

                    await addTransaction({
                        ...editingItem,
                        id: undefined,
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
        } else {
            const firstTx = {
                ...editingItem,
                amount: isMulti ? debtCalc.part : finalAmount,
                installmentsInfo: isMulti ? { current: 1, total: newTotalCount } : undefined
            };
            const mainId = await addTransaction(firstTx);

            if (isMulti) {
                for (let i = 1; i < newTotalCount; i++) {
                    const d = new Date(editingItem.date + 'T12:00:00');
                    d.setMonth(d.getMonth() + i);
                    const ds = d.toISOString().split('T')[0];
                    await addTransaction({
                        ...editingItem,
                        description: `${editingItem.description} (${i + 1}/${newTotalCount})`,
                        amount: debtCalc.part,
                        date: ds,
                        referenceMonth: ds.slice(0, 7),
                        installmentsInfo: { current: i + 1, total: newTotalCount },
                        recurrenceId: mainId
                    });
                }
                await updateTransaction({ ...firstTx, id: mainId, description: `${firstTx.description} (1/${newTotalCount})` });
            }

            // Handle Recurrence Creation
            let recurrenceId = mainId;
            if (editingItem.nature === 'recorrente') {
                const dayOfMonth = parseInt(editingItem.date.split('-')[2]);
                const newRecurrenceId = await addRecurrence({
                    ledgerId: editingItem.ledgerId,
                    description: editingItem.description,
                    type: editingItem.type,
                    amount: finalAmount,
                    category: editingItem.category,
                    method: editingItem.method,
                    dayOfMonth: isNaN(dayOfMonth) ? 1 : dayOfMonth,
                    isActive: true,
                    autoGenerate: true,
                    cardId: isCardMethod ? editingItem.cardId : undefined
                });

                // Update the main transaction to link to this new recurrence
                recurrenceId = newRecurrenceId;
                await updateTransaction({ ...firstTx, id: mainId, recurrenceId: newRecurrenceId });
            }

            // Legacy Card Loop REMOVED - utilize useRecurrenceGenerator instead.

        }
        setIsModalOpen(false);
    };

    const confirmDelete = async (mode: 'ONLY_THIS' | 'ALL_RELATED') => {
        if (!itemToDelete) return;
        if (mode === 'ONLY_THIS') {
            if (itemToDelete.nature === 'recorrente' && itemToDelete.recurrenceId) {
                // 1. Update Recurrence to skip this month
                const recurrence = recurrences.find(r => r.id === itemToDelete.recurrenceId);
                if (recurrence) {
                    const currentSkipped = recurrence.skippedMonths || [];
                    if (!currentSkipped.includes(itemToDelete.referenceMonth)) {
                        await updateRecurrence({
                            ...recurrence,
                            skippedMonths: [...currentSkipped, itemToDelete.referenceMonth]
                        });
                    }
                }
            }
            await deleteTransaction(itemToDelete.id);
        } else {
            if (itemToDelete.nature === 'recorrente') {
                const recurrenceId = itemToDelete.recurrenceId;
                if (recurrenceId) {
                    // Delete the main recurrence rule so it stops generating
                    await deleteRecurrence(recurrenceId);

                    // Also delete all generated transactions linked to it
                    const related = transactions.filter(t =>
                        t.recurrenceId === recurrenceId || t.id === recurrenceId
                    );
                    for (const t of related) await deleteTransaction(t.id);
                } else {
                    // Fallback check if it's a legacy or manual recurrence without ID link
                    const related = transactions.filter(t =>
                        t.description === itemToDelete.description &&
                        t.nature === 'recorrente' &&
                        t.ledgerId === itemToDelete.ledgerId
                    );
                    for (const t of related) await deleteTransaction(t.id);
                }
            } else {
                const rootId = itemToDelete.recurrenceId || itemToDelete.contractId || itemToDelete.id;
                const related = transactions.filter(t => t.recurrenceId === rootId || t.contractId === rootId || t.id === rootId);
                for (const t of related) await deleteTransaction(t.id);
            }
        }
        setIsModalOpen(false);
        setItemToDelete(null);
    };

    const toggleStatus = async (entry: FlowEntry) => {
        if (entry.isGroup) {
            const newStatus = entry.status === 'pago' ? 'previsto' : 'pago';
            if (entry.transactionIds && entry.transactionIds.length > 0) {
                const promises = entry.transactionIds.map(async (txId: string) => {
                    // Start Update: Use updateFinanceStatus to avoid stock logic
                    await updateFinanceStatus(txId, newStatus);
                });
                await Promise.all(promises);
            }
            return;
        }

        const newStatus = entry.status === 'pago' ? 'previsto' : 'pago';

        // Start Update: Use updateFinanceStatus to avoid stock logic
        if (entry.id) {
            await updateFinanceStatus(entry.id, newStatus);
        }

        if (entry.contractId) {
            const contract = debtContracts.find(c => c.id === entry.contractId);
            if (contract) {
                const installmentAmount = entry.amount || 0;

                if (newStatus === 'pago') {
                    const newInstallmentsRemaining = Math.max(0, (contract.installmentsRemaining || 0) - 1);
                    const newTotalDebtRemaining = Math.max(0, (contract.totalDebtRemaining || 0) - installmentAmount);
                    await updateDebtContract({
                        ...contract,
                        installmentsRemaining: newInstallmentsRemaining,
                        totalDebtRemaining: newTotalDebtRemaining,
                        status: newInstallmentsRemaining === 0 ? 'Quitado' : contract.status
                    });
                } else {
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

    const handleOpenDeleteModal = (t: Transaction) => {
        setItemToDelete(t);
        setModalType('DELETE_CONFIRM');
        setIsModalOpen(true);
    };

    // ==================== RENDER ====================

    return (
        <div className="bg-[#141414] min-h-full rounded-[30px] p-8 -m-8 md:-m-8 md:p-10 space-y-8 border border-[#222]">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                        {forcedScope === 'PJ' ? 'Financeiro PJ' : 'Financeiro Pessoal (PF)'}
                    </h2>
                    <div className="flex items-center gap-4 mt-3 flex-wrap">
                        {/* LedgerSelector Removed - Scope is STRICT */}

                        {/* Tabs */}
                        <div className="flex bg-[#1F1F1F] rounded-xl p-1 border border-white/5 overflow-x-auto max-w-[100vw]">
                            {(['OVERVIEW', 'FLOW', 'RECURRENCES', 'CARDS', 'DEBTS'] as FinanceTab[]).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase whitespace-nowrap transition-all ${activeTab === tab
                                        ? 'bg-brand-600 text-white shadow-md'
                                        : 'text-[#808080] hover:bg-[#2A2A2A] hover:text-white'
                                        }`}
                                >
                                    {tab === 'OVERVIEW' ? 'Visão Geral' :
                                        tab === 'FLOW' ? 'Fluxo' :
                                            tab === 'RECURRENCES' ? 'Recorrências' :
                                                tab === 'CARDS' ? 'Cartões' : 'Dívidas'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 w-full lg:w-auto flex-wrap">
                    <MonthNavigator
                        filterStartMonth={filterStartMonth}
                        filterEndMonth={filterEndMonth}
                        onNavigate={navigateMonth}
                        onSetPreset={setMonthPreset}
                        onSetStartMonth={setFilterStartMonth}
                        onSetEndMonth={setFilterEndMonth}
                    />
                    <div className="flex flex-col items-end gap-2">
                        <button
                            onClick={() => navigate(forcedScope === 'PJ' ? '/financeiro-pessoal' : '/financeiro')}
                            className="text-[#808080] hover:text-white text-[10px] font-black uppercase flex items-center gap-2 mb-1"
                        >
                            <DollarSign size={14} />
                            {forcedScope === 'PJ' ? ' Ir para Meu Caixa (PF)' : ' Ir para Financeiro (PJ)'}
                        </button>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setModalType('TRANSFER');
                                    setIsModalOpen(true);
                                }}
                                className="bg-[#2A2A2A] text-white px-4 py-3 rounded-2xl font-bold text-[10px] uppercase hover:bg-[#333] flex items-center gap-2 transition-all border border-white/5"
                            >
                                <ArrowRightLeft size={16} /> Transferir
                            </button>
                            <button
                                onClick={() => handleOpenTransaction()}
                                className="bg-brand-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-xl shadow-brand-500/20 hover:bg-brand-700 flex items-center gap-2 transition-all"
                            >
                                <Plus size={18} /> Novo Lançamento
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'OVERVIEW' && (
                <OverviewTab
                    stats={stats}
                    isConsolidated={isConsolidated}
                    baseCashBalance={baseCashBalance}
                    filteredCards={filteredCards}
                    getCardUsage={getCardUsage}
                    onSetActiveTab={setActiveTab}
                    onEditOpeningBalance={() => {
                        setModalType('OPENING_BALANCE');
                        setEditingItem(baseCashBalance || { amount: 0, monthRef: filterMonth, ledgerId: selectedLedgerId });
                        setIsModalOpen(true);
                    }}
                />
            )}

            {activeTab === 'FLOW' && (
                <FlowTab
                    flowEntries={flowEntries}
                    today={today}
                    flowStatusFilter={flowStatusFilter}
                    transactions={transactions}
                    debtContracts={debtContracts}
                    onSetFlowStatusFilter={setFlowStatusFilter}
                    onToggleStatus={toggleStatus}
                    onOpenTransaction={handleOpenTransaction}
                    onDeleteTransaction={handleOpenDeleteModal}
                    onSetActiveTab={setActiveTab}
                    onSetSelectedCardId={setSelectedCardId}
                />
            )}

            {/* Other tabs - keeping original inline for now, can be extracted later */}
            {activeTab === 'RECURRENCES' && (() => {
                // Prepare Recurrence List
                const recurrenceMasterList: any[] = []; // Using any temporarily, should use RecurrenceMasterItem type
                const processedRecurrenceIds = new Set<string>();

                // 1. Get all transactions marked as 'recorrente'
                const allRecurrentTransactions = transactions.filter(t =>
                    t.nature === 'recorrente' &&
                    t.ledgerId === selectedLedgerId
                );

                // Group by recurrence ID or Description (series)
                // Using a map to find the "Master" or representative item for the series
                const seriesMap = new Map<string, Transaction[]>();

                allRecurrentTransactions.forEach(t => {
                    const key = t.recurrenceId || t.description; // Fallback to description if no recurrenceId
                    if (!seriesMap.has(key)) {
                        seriesMap.set(key, []);
                    }
                    seriesMap.get(key)!.push(t);
                });

                seriesMap.forEach((txs, key) => {
                    // Find if there is an entry for the CURRENT month
                    const currentMonthTx = txs.find(t => t.referenceMonth === filterMonth);

                    // If no current month tx, use the last one available to get details
                    const baseTx = currentMonthTx || txs.sort((a, b) => b.date.localeCompare(a.date))[0];

                    if (baseTx) {
                        recurrenceMasterList.push({
                            id: baseTx.recurrenceId || baseTx.id,
                            description: baseTx.description,
                            type: baseTx.type,
                            amount: baseTx.amount,
                            category: baseTx.category,
                            method: baseTx.method,
                            date: baseTx.date,
                            currentMonthStatus: currentMonthTx ? currentMonthTx.status : 'Não Lançado',
                            ledgerId: baseTx.ledgerId,
                            nature: 'recorrente',
                            // If it's not launched this month, we need to pass enough info to create it
                            referenceMonth: currentMonthTx ? currentMonthTx.referenceMonth : filterMonth,
                            recurrenceId: baseTx.recurrenceId
                        });
                    }
                });

                return (
                    <RecurrencesTab
                        recurrenceMasterList={recurrenceMasterList}
                        filterMonth={filterMonth}
                        onOpenTransaction={(item) => {
                            // Ensure nature is set to 'recorrente' so modal shows the options
                            handleOpenTransaction({ ...item, nature: 'recorrente' });
                        }}
                        onDeleteTransaction={handleOpenDeleteModal}
                    />
                );
            })()}

            {activeTab === 'CARDS' && (
                <CardsTab
                    filteredCards={filteredCards}
                    allCards={cards}
                    ledgers={ledgers}
                    currentMonthTransactions={currentMonthTransactions}
                    filterMonth={filterMonth}
                    selectedLedgerId={selectedLedgerId}
                    getCardUsage={getCardUsage}
                    onOpenCardModal={(card) => {
                        setModalType('CARD');
                        setEditingItem(card || { name: '', closingDay: 1, dueDay: 10, limit: 0 });
                        setIsModalOpen(true);
                    }}
                    onUpdateCard={updateCard}
                    onDeleteCard={deleteCard}
                    onSetSelectedCardId={setSelectedCardId}
                    onSetActiveTab={setActiveTab}
                    onUpdateTransaction={updateTransaction}
                />
            )}

            {activeTab === 'CARD_DETAILS' && selectedCard && (
                <CardDetailsTab
                    selectedCard={selectedCard}
                    cardTransactions={cardTransactions}
                    filterMonth={filterMonth}
                    showAllCardPending={showAllCardPending}
                    onSetActiveTab={setActiveTab}
                    onOpenTransaction={handleOpenTransaction}
                    onDeleteTransaction={handleOpenDeleteModal}
                />
            )}

            {activeTab === 'DEBTS' && (
                <DebtsTab
                    filteredDebtContracts={filteredDebtContracts}
                    ledgers={ledgers}
                    onOpenDebtModal={(debt) => {
                        setModalType('DEBT');
                        setEditingItem(debt);
                        setIsModalOpen(true);
                    }}
                    onDeleteDebtContract={deleteDebtContract}
                    onHandleDebtLedgerChange={async (debt, newLedgerId) => {
                        await updateDebtContract({ ...debt, ledgerId: newLedgerId });
                    }}
                />
            )}

            {activeTab === 'INCOME_DETAILS' && (
                <IncomeDetailsTab
                    currentMonthTransactions={currentMonthTransactions}
                    filterMonth={filterMonth}
                    stats={stats}
                    onSetActiveTab={setActiveTab}
                    onOpenTransaction={handleOpenTransaction}
                    onDeleteTransaction={handleOpenDeleteModal}
                />
            )}

            {activeTab === 'EXPENSE_DETAILS' && (
                <ExpenseDetailsTab
                    currentMonthTransactions={currentMonthTransactions}
                    cards={cards}
                    filterMonth={filterMonth}
                    stats={stats}
                    onSetActiveTab={setActiveTab}
                    onSetSelectedCardId={setSelectedCardId}
                    onOpenTransaction={handleOpenTransaction}
                    onDeleteTransaction={handleOpenDeleteModal}
                />
            )}

            {/* Modals */}
            <TransactionModal
                isOpen={isModalOpen && modalType === 'TRANSACTION'}
                editingItem={editingItem}
                ledgers={ledgers}
                cards={cards}
                filterMonth={filterMonth}
                debtCalc={debtCalc}
                feeTypes={feeTypes}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveTransaction}
                onEditingItemChange={setEditingItem}
                onDebtCalcChange={setDebtCalc}
            />


            {/* Cash Balance Modal (Inline for now or use existing CashBalanceModal if imported) */}
            {/* Assuming CashBalanceModal exists and is imported or we can add a simple inline form */}
            {isModalOpen && modalType === 'OPENING_BALANCE' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#1F1F1F] rounded-3xl w-full max-w-md border border-white/10 shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white">Ajustar Saldo Inicial</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-[#808080] hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="p-4 bg-amber-900/20 rounded-xl border border-amber-500/20 text-amber-200 text-xs">
                                Defina o saldo inicial para este caixa. Isso ajustará o cálculo do saldo atual.
                            </div>

                            <div>
                                <label className="block text-[#808080] text-[10px] font-bold uppercase mb-1">Saldo Inicial (R$)</label>
                                <input
                                    type="number"
                                    className="w-full bg-[#141414] border border-white/5 rounded-xl px-4 py-3 text-white focus:border-brand-500 outline-none"
                                    placeholder="0,00"
                                    defaultValue={editingItem?.amount || 0}
                                    id="openingBalanceAmount"
                                />
                            </div>

                            <button
                                onClick={async () => {
                                    const amount = Number((document.getElementById('openingBalanceAmount') as HTMLInputElement).value);

                                    if (isNaN(amount)) return;

                                    const balanceData = {
                                        ...editingItem,
                                        amount,
                                        ledgerId: selectedLedgerId, // Enforce current ledger
                                        monthRef: filterMonth, // Use current month
                                        baseMonth: MIN_ALLOWED_MONTH // Use constant
                                    };

                                    if (balanceData.id) {
                                        await updateOpeningBalance(balanceData);
                                    } else {
                                        await addOpeningBalance(balanceData);
                                    }

                                    setIsModalOpen(false);
                                }}
                                className="w-full bg-brand-600 text-white py-4 rounded-xl font-bold uppercase hover:bg-brand-700 transition-all mt-4"
                            >
                                Salvar Saldo Inicial
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <CardModal
                isOpen={isModalOpen && modalType === 'CARD'}
                editingItem={editingItem}
                onClose={() => setIsModalOpen(false)}
                onSave={async (card) => {
                    if (card.id) {
                        await updateCard(card);
                    } else {
                        await addCard(card);
                    }
                }}
                onEditingItemChange={setEditingItem}
            />

            <DebtModal
                isOpen={isModalOpen && modalType === 'DEBT'}
                editingItem={editingItem}
                ledgers={ledgers}
                transactions={transactions}
                onClose={() => setIsModalOpen(false)}
                onSave={async (debt) => {
                    await updateDebtContract(debt);
                }}
                onUpdateTransaction={updateTransaction}
                onEditingItemChange={setEditingItem}
            />

            <DeleteConfirmModal
                isOpen={isModalOpen && modalType === 'DELETE_CONFIRM'}
                item={itemToDelete}
                onClose={() => setIsModalOpen(false)}
                onConfirmDelete={confirmDelete}
            />
            {/* Transfer Modal - Inline for simplicity */}
            {isModalOpen && modalType === 'TRANSFER' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#1F1F1F] rounded-3xl w-full max-w-md border border-white/10 shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white">Nova Transferência</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-[#808080] hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="p-4 bg-brand-900/20 rounded-xl border border-brand-500/20 text-brand-200 text-xs">
                                Transferência entre {forcedScope === 'PJ' ? 'PJ' : 'PF'} e {forcedScope === 'PJ' ? 'PF' : 'PJ'}.
                            </div>

                            <div>
                                <label className="block text-[#808080] text-[10px] font-bold uppercase mb-1">Valor</label>
                                <input
                                    type="number"
                                    className="w-full bg-[#141414] border border-white/5 rounded-xl px-4 py-3 text-white focus:border-brand-500 outline-none"
                                    placeholder="0,00"
                                    id="transferAmount"
                                />
                            </div>

                            <div>
                                <label className="block text-[#808080] text-[10px] font-bold uppercase mb-1">Data</label>
                                <input
                                    type="date"
                                    defaultValue={new Date().toISOString().split('T')[0]}
                                    className="w-full bg-[#141414] border border-white/5 rounded-xl px-4 py-3 text-white focus:border-brand-500 outline-none"
                                    id="transferDate"
                                />
                            </div>

                            <div>
                                <label className="block text-[#808080] text-[10px] font-bold uppercase mb-1">Descrição</label>
                                <input
                                    type="text"
                                    className="w-full bg-[#141414] border border-white/5 rounded-xl px-4 py-3 text-white focus:border-brand-500 outline-none"
                                    placeholder="Ex: Retirada de Lucro"
                                    id="transferDesc"
                                />
                            </div>

                            <button
                                onClick={async () => {
                                    const amount = Number((document.getElementById('transferAmount') as HTMLInputElement).value);
                                    const date = (document.getElementById('transferDate') as HTMLInputElement).value;
                                    const description = (document.getElementById('transferDesc') as HTMLInputElement).value;

                                    if (!amount || !date) return;

                                    // Determine FROM and TO based on current scope
                                    // If we are in PJ, we are Transferring TO PF (Withdrawal) or FROM PF (Injection)?
                                    // Let's assume the button context implies "Send Money TO the other scope" 
                                    // OR we should give a direction switch.
                                    // For simplicity: "Transferir PARA [Outro Escopo]"

                                    // Better: Select Destination Ledger
                                    // But we only have types.
                                    // Let's find the OTHER ledger.
                                    const otherScope = forcedScope === 'PJ' ? 'PF' : 'PJ';
                                    const otherLedger = ledgers.find(l => l.type === otherScope && l.isDefault) || ledgers.find(l => l.type === otherScope);

                                    if (!selectedLedgerId || !otherLedger) {
                                        alert("Ledger de destino não encontrado.");
                                        return;
                                    }

                                    await addTransfer({
                                        fromLedgerId: selectedLedgerId,
                                        toLedgerId: otherLedger.id,
                                        amount,
                                        date,
                                        description
                                    });

                                    setIsModalOpen(false);
                                }}
                                className="w-full bg-brand-600 text-white py-4 rounded-xl font-bold uppercase hover:bg-brand-700 transition-all mt-4"
                            >
                                Confirmar Transferência
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
