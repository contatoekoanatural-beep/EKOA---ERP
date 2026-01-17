import { useContext, useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';

import { Transaction } from '../types';

export const useFinanceCalculations = () => {
    const {
        transactions,
        cards,
        debtContracts,
        openingBalances
    } = useFinance();


    // Helper to get all months in range
    const getMonthsBetween = (start: string, end: string): string[] => {
        const months: string[] = [];
        const [sy, sm] = start.split('-').map(Number);
        const [ey, em] = end.split('-').map(Number);

        let current = new Date(sy, sm - 1, 1);
        current.setMonth(current.getMonth() + 1); // Start from month after base
        const endDate = new Date(ey, em - 1, 1);

        while (current < endDate) {
            months.push(current.toISOString().slice(0, 7));
            current.setMonth(current.getMonth() + 1);
        }
        return months;
    };

    const getFinancialStats = (targetMonth: string, ledgerId: string | 'consolidated'): { openingBalance: number, currentBalance: number, closingBalance: number } => {
        // Validation
        if (!targetMonth || !ledgerId) return { openingBalance: 0, currentBalance: 0, closingBalance: 0 };

        const isConsolidated = ledgerId === 'consolidated';

        // 1. Resolve Ledger IDs to process
        let ledgerIdsToProcess: string[] = [];
        if (isConsolidated) {
            // Get all ledger IDs that have opening balances or transactions
            const distinctLedgers = new Set<string>();
            openingBalances.forEach(ob => distinctLedgers.add(ob.ledgerId));
            transactions.forEach(t => { if (t.ledgerId) distinctLedgers.add(t.ledgerId); });
            ledgerIdsToProcess = Array.from(distinctLedgers);
        } else {
            ledgerIdsToProcess = [ledgerId];
        }

        // 2. Calculate balance for each ledger and sum
        let totalClosing = 0;
        let totalOpening = 0;
        let totalCurrent = 0;
        let totalPaid = 0;

        for (const currentLedgerId of ledgerIdsToProcess) {
            const ledgerBalance = openingBalances.find(ob => ob.ledgerId === currentLedgerId && ob.monthRef === 'GLOBAL');
            const baseCash = ledgerBalance?.amount || 0;
            const baseMonth = ledgerBalance?.baseMonth || targetMonth;

            // Helper to get Transaction subset for ledger
            const ledgerTransactions = transactions.filter(t => {
                if (t.ledgerId === currentLedgerId) return true;
                if (t.method === 'cartao' && t.cardId) {
                    const card = cards.find(c => c.id === t.cardId);
                    if (card?.ledgerId === currentLedgerId) return true;
                }
                if (t.contractId) {
                    const contract = debtContracts.find(c => c.id === t.contractId);
                    if (contract?.ledgerId === currentLedgerId) return true;
                }
                return false;
            });

            // Calculate Opening Balance for the Target Month
            // Logic: Base Cash + Sum of Realized (Paid) Cash Flow of all months PRIOR to targetMonth
            let runningCash = baseCash;

            // Helper to calculate realized cash flow for a specific month
            const getPaidImpact = (month: string): number => {
                const monthTxs = ledgerTransactions.filter(t => t.referenceMonth === month);

                const paidIncomeL = monthTxs
                    .filter(t => t.type === 'income' && t.status === 'pago')
                    .reduce((sum, t) => sum + t.amount, 0);

                const paidNonCardExpensesL = monthTxs
                    .filter(t => t.type === 'expense' && t.method !== 'cartao' && t.status === 'pago')
                    .reduce((sum, t) => sum + t.amount, 0);

                const cardInvoicesL: Record<string, { total: number; allPaid: boolean }> = {};

                monthTxs.filter(t => t.method === 'cartao' && t.cardId).forEach(t => {
                    if (!cardInvoicesL[t.cardId!]) {
                        cardInvoicesL[t.cardId!] = { total: 0, allPaid: true };
                    }
                    cardInvoicesL[t.cardId!].total += t.amount;
                    if (t.status !== 'pago') {
                        cardInvoicesL[t.cardId!].allPaid = false;
                    }
                });

                const paidCardInvoicesL = Object.values(cardInvoicesL)
                    .filter(inv => inv.allPaid)
                    .reduce((sum, inv) => sum + inv.total, 0);

                return paidIncomeL - paidNonCardExpensesL - paidCardInvoicesL;
            };

            // If target is after base, accumulate history
            if (targetMonth > baseMonth) {
                let currentIter = baseMonth;
                while (currentIter < targetMonth) {
                    runningCash += getPaidImpact(currentIter);

                    // Increment month
                    const [y, m] = currentIter.split('-').map(Number);
                    const d = new Date(y, m, 1); // Month is 0-indexed in JS? No, split gives 1-12. Date ctor takes 0-11.
                    // Actually clearer handling:
                    const nextDate = new Date(y, m, 1); // m is already 1-based, so this creates Next Month 1st.
                    // e.g. '2025-01' -> y=2025, m=1. new Date(2025, 1, 1) -> Feb 1st 2025. Correct.
                    currentIter = nextDate.toISOString().slice(0, 7);
                }
            } else if (targetMonth < baseMonth) {
                // Should not happen normally if base is set correctly, but handle gracefully?
                // For now, just return baseCash as we don't look backwards from base.
            }

            // `runningCash` is now the Actual Cash Position at the START of targetMonth
            totalOpening += runningCash;

            // Calculate Current Balance (Cash currently on hand)
            // Logic: Opening Balance + Realized (Paid) Impact of targetMonth
            const currentMonthPaidImpact = getPaidImpact(targetMonth);
            // totalPaid += currentMonthPaidImpact; 
            const ledgerCurrentBalance = runningCash + currentMonthPaidImpact;
            totalCurrent += ledgerCurrentBalance;

            // Calculate Closing
            const stats = (() => {
                const pendingStatuses = ['previsto', 'atrasado'];
                const monthTxs = ledgerTransactions.filter(t => t.referenceMonth === targetMonth);

                const incomings = monthTxs
                    .filter(t => t.type === 'income' && pendingStatuses.includes(t.status))
                    .reduce((acc, t) => acc + t.amount, 0);

                const nonCardOutgoings = monthTxs
                    .filter(t => t.type === 'expense' && t.method !== 'cartao' && pendingStatuses.includes(t.status))
                    .reduce((acc, t) => acc + t.amount, 0);

                const cardInvoices: Record<string, { total: number; isPaid: boolean }> = {};
                monthTxs.filter(t => t.method === 'cartao' && t.cardId).forEach(t => {
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

                const outgoings = nonCardOutgoings + unpaidCardInvoices;
                return { incomings, outgoings };
            })();

            const closingBalance = runningCash + currentMonthPaidImpact + stats.incomings - stats.outgoings;
            totalClosing += closingBalance;
        }

        return { openingBalance: totalOpening, currentBalance: totalCurrent, closingBalance: totalClosing };
    };

    return { getFinancialStats };
};
