import React, { createContext, useState, useEffect, useContext } from 'react';
import { collection, onSnapshot, getDocs, addDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from '../services/firebase';
import { financeService } from '../services/financeService';
import { useAuth } from './AuthContext';
import {
    Ledger, Transaction, Recurrence, CreditCard, Debt, BankAccount,
    OpeningBalance, FeeType, DebtContract
} from '../types';

interface FinanceContextType {
    ledgers: Ledger[];
    transactions: Transaction[];
    recurrences: Recurrence[];
    cards: CreditCard[];
    debts: Debt[];
    bankAccounts: BankAccount[];
    openingBalances: OpeningBalance[];
    feeTypes: FeeType[];
    debtContracts: DebtContract[]; // Legacy

    // Actions
    addLedger: typeof financeService.addLedger;
    updateLedger: typeof financeService.updateLedger;
    addTransaction: typeof financeService.addTransaction;
    updateTransaction: typeof financeService.updateTransaction;
    updateFinanceStatus: typeof financeService.updateFinanceStatus;
    deleteTransaction: typeof financeService.deleteTransaction;
    addRecurrence: typeof financeService.addRecurrence;
    updateRecurrence: typeof financeService.updateRecurrence;
    deleteRecurrence: typeof financeService.deleteRecurrence;
    addCard: typeof financeService.addCard;
    updateCard: typeof financeService.updateCard;
    deleteCard: typeof financeService.deleteCard;
    addDebt: typeof financeService.addDebt;
    updateDebt: typeof financeService.updateDebt;
    deleteDebt: typeof financeService.deleteDebt;
    addDebtContract: typeof financeService.addDebtContract;
    updateDebtContract: typeof financeService.updateDebtContract;
    deleteDebtContract: typeof financeService.deleteDebtContract;
    addBankAccount: typeof financeService.addBankAccount;
    updateBankAccount: typeof financeService.updateBankAccount;
    deleteBankAccount: typeof financeService.deleteBankAccount;
    addOpeningBalance: typeof financeService.addOpeningBalance;
    updateOpeningBalance: typeof financeService.updateOpeningBalance;
    addTransfer: typeof financeService.addTransfer;
    addFeeType: typeof financeService.addFeeType;
    updateFeeType: typeof financeService.updateFeeType;
    deleteFeeType: typeof financeService.deleteFeeType;
}

const FinanceContext = createContext<FinanceContextType>({} as FinanceContextType);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { profileReady } = useAuth();
    const [ledgers, setLedgers] = useState<Ledger[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [recurrences, setRecurrences] = useState<Recurrence[]>([]);
    const [cards, setCards] = useState<CreditCard[]>([]);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [openingBalances, setOpeningBalances] = useState<OpeningBalance[]>([]);
    const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
    const [debtContracts, setDebtContracts] = useState<DebtContract[]>([]);

    useEffect(() => {
        if (!profileReady) return;

        // Subscribe only to finance-related collections
        const unsubscribers: (() => void)[] = [];
        const collections = [
            { name: "ledgers", setter: (d: any) => setLedgers(d) },
            { name: "transactions", setter: (d: any) => setTransactions(d) },
            { name: "recurrences", setter: (d: any) => setRecurrences(d) },
            { name: "cards", setter: (d: any) => setCards(d) },
            { name: "debts", setter: (d: any) => setDebts(d) },
            { name: "bankAccounts", setter: (d: any) => setBankAccounts(d) },
            { name: "openingBalances", setter: (d: any) => setOpeningBalances(d) },
            { name: "feeTypes", setter: (d: any) => setFeeTypes(d) },
            { name: "debtContracts", setter: (d: any) => setDebtContracts(d) }
        ];

        collections.forEach(col => {
            unsubscribers.push(onSnapshot(collection(db, col.name), s => {
                col.setter(s.docs.map(d => ({ ...d.data(), id: d.id })));
            }, err => console.error(`Sync error on ${col.name}:`, err.message)));
        });

        return () => unsubscribers.forEach(u => u());
    }, [profileReady]);

    // Auto-seed ledgers
    useEffect(() => {
        if (ledgers.length > 0 || !profileReady) return;
        const seedLedgers = async () => {
            // We can just rely on the service check or check internal state
            // Since the effect runs when ledgers changes, if it remains empty after load, we seed.
            // However, we need to be sure it's loaded. For simplicity, we can do a check.
            // Only run this if we are SURE it's empty (e.g. after a timeout or distinct check)
            // OR: keep logic simple: query once.
            const ledgersSnap = await getDocs(collection(db, "ledgers"));
            if (ledgersSnap.empty) {
                await financeService.addLedger({ name: "Pessoal (PF)", type: "PF", isDefault: true });
                await financeService.addLedger({ name: "Ekoa (PJ)", type: "PJ", isDefault: false });
            }
        };
        seedLedgers();
    }, [profileReady, ledgers.length]); // Dependencies slightly loose but acceptable for seed

    // Mapping service methods
    const value = {
        ledgers, transactions, recurrences, cards, debts, bankAccounts, openingBalances, feeTypes, debtContracts,
        ...financeService
    };

    return (
        <FinanceContext.Provider value={value}>
            {children}
        </FinanceContext.Provider>
    );
};

export const useFinance = () => useContext(FinanceContext);
