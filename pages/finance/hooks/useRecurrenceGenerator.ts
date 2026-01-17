import { useEffect, useRef } from 'react';
import { Transaction, Recurrence, CreditCard } from '../../../types';

interface UseRecurrenceGeneratorProps {
    transactions: Transaction[];
    recurrences: Recurrence[];
    cards: CreditCard[];
    addTransaction: (t: any) => Promise<string>;
}

export const useRecurrenceGenerator = ({
    transactions,
    recurrences,
    cards,
    addTransaction
}: UseRecurrenceGeneratorProps) => {
    // Keep track of what we've processed in this session to prevent race-condition loops
    const processedRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!recurrences.length || !cards.length) return;

        const generateRecurrences = async () => {
            const today = new Date();

            for (const recurrence of recurrences) {
                if (!recurrence.isActive || !recurrence.autoGenerate) continue;
                if (recurrence.method !== 'cartao' || !recurrence.ledgerId) continue;

                const cardId = (recurrence as any).cardId;
                if (!cardId) continue;

                const card = cards.find(c => c.id === cardId);
                if (!card) continue;

                // Changed Strategy: Only generate for Current and Next Month to prevent "credit limit consumption"
                const HORIZON_MONTHS = 2; // Current + Next

                for (let i = 0; i < HORIZON_MONTHS; i++) {
                    const targetDate = new Date();
                    targetDate.setMonth(targetDate.getMonth() + i);

                    const recDay = recurrence.dayOfMonth || 1;
                    const txDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), recDay);

                    if (txDate.getMonth() !== targetDate.getMonth()) {
                        txDate.setDate(0);
                    }

                    const closingDay = card.closingDay || 1;

                    // Logic: If txDate >= closingDate, it goes to NEXT month.
                    const closingDateThisMonth = new Date(txDate.getFullYear(), txDate.getMonth(), closingDay);
                    closingDateThisMonth.setHours(23, 59, 59, 999);

                    let checkDate = new Date(txDate);
                    let invoiceMonthRaw = checkDate.getMonth();
                    let invoiceYearRaw = checkDate.getFullYear();

                    if (txDate.getDate() >= closingDay) {
                        // After closing, moves to next invoice
                        if (invoiceMonthRaw === 11) {
                            invoiceMonthRaw = 0;
                            invoiceYearRaw++;
                        } else {
                            invoiceMonthRaw++;
                        }
                    }

                    const refMonthStr = `${invoiceYearRaw}-${String(invoiceMonthRaw + 1).padStart(2, '0')}`;
                    const uniqueKey = `${recurrence.id}-${refMonthStr}`;

                    // Check skippedMonths
                    if (recurrence.skippedMonths?.includes(refMonthStr)) {
                        console.log(`Skipping recurrence ${recurrence.description} for ${refMonthStr} (User Deleted)`);
                        continue;
                    }

                    // Check local cache first to prevent rapid-fire duplication
                    if (processedRef.current.has(uniqueKey)) continue;

                    // Check if exists in transactions
                    const exists = transactions.some(t =>
                        t.recurrenceId === recurrence.id &&
                        t.referenceMonth === refMonthStr
                    );

                    if (!exists) {
                        // Mark as processed immediately to block subsequent runs
                        processedRef.current.add(uniqueKey);

                        const txDateStr = txDate.toISOString().split('T')[0];

                        await addTransaction({
                            ledgerId: recurrence.ledgerId,
                            type: recurrence.type,
                            origin: 'recurrence',
                            description: recurrence.description,
                            amount: recurrence.amount,
                            method: 'cartao',
                            status: 'previsto',
                            date: txDateStr,
                            referenceMonth: refMonthStr,
                            category: recurrence.category,
                            cardId: cardId,
                            recurrenceId: recurrence.id,
                            nature: 'recorrente'
                        });
                        console.log(`Auto-generated recurrence: ${recurrence.description} for ${refMonthStr}`);
                    }
                }
            }
        };

        generateRecurrences();
    }, [recurrences, cards, transactions.length]);
};
