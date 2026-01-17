// Finance module specific types
import { Transaction, CreditCard, Debt, Ledger, Recurrence, DebtContract, OpeningBalance } from '../../types';

// Stats calculated for the overview
export interface FinanceStats {
    incomings: number;
    outgoings: number;
    cashBalance: number;
    balance: number;
    totalOpenDebt: number;
    monthlyDebtInstallments: number;
    atrasados: { count: number; total: number };
    venceEm7Dias: { count: number; total: number };
    topCategories: [string, number][];
}

// Flow entry - can be a transaction or a grouped card invoice
export interface FlowEntry {
    id: string;
    description: string;
    amount: number;
    method?: string;
    status: string;
    type: string;
    date: string;
    referenceMonth: string;
    category?: string;
    isGroup?: boolean;
    cardId?: string;
    transactionIds?: string[];
    allPaid?: boolean;
    nature?: string;
    contractId?: string;
    debtId?: string;
    recurrenceId?: string;
    installmentsInfo?: {
        current: number;
        total: number;
    };
    ledgerId?: string;
}

// Card usage info
export interface CardUsage {
    card: CreditCard;
    usage: number;
    percentage: number;
}

// Recurrence master list item
export interface RecurrenceMasterItem {
    id: string;
    description: string;
    type: 'income' | 'expense';
    amount: number;
    category: string;
    method?: string;
    date: string;
    currentMonthStatus: string;
    ledgerId: string;
    nature?: string;
}

// Debt calculator state
export interface DebtCalcState {
    total: number;
    part: number;
    count: number;
}

// Modal types
export type ModalType = 'TRANSACTION' | 'CARD' | 'DEBT' | 'RECURRENCE' | 'DELETE_CONFIRM' | null;

// Finance context for sub-components
export interface FinanceContextData {
    // Filtered data
    filteredTransactions: Transaction[];
    filteredCards: CreditCard[];
    filteredDebts: Debt[];
    filteredRecurrences: Recurrence[];
    filteredDebtContracts: DebtContract[];
    currentMonthTransactions: Transaction[];

    // Selected ledger
    selectedLedgerId: string;
    selectedLedger: Ledger | undefined;
    isConsolidated: boolean;
    ledgers: Ledger[];

    // Filters
    filterMonth: string;
    filterStartMonth: string;
    filterEndMonth: string;
    isRangeFilter: boolean;

    // Stats
    stats: FinanceStats;

    // Cash balance
    baseCashBalance: OpeningBalance | null;
    calculateRollingCash: number;

    // Cards
    cards: CreditCard[];

    // Transactions (unfiltered for lookups)
    transactions: Transaction[];

    // Debt contracts
    debtContracts: DebtContract[];

    // Opening balances
    openingBalances: OpeningBalance[];

    // Today's date
    today: string;

    // Actions
    handleLedgerChange: (ledgerId: string) => void;
    navigateMonth: (direction: 'prev' | 'next') => void;
    setFilterMonth: (month: string) => void;
    setFilterStartMonth: (month: string) => void;
    setFilterEndMonth: (month: string) => void;
    handleOpenTransaction: (t?: any) => void;
    getCardUsage: (cardId: string) => number;

    // CRUD operations
    addTransaction: (t: any) => Promise<string>;
    updateTransaction: (t: any) => Promise<void>;
    deleteTransaction: (id: string) => Promise<void>;
    addCard: (c: any) => Promise<string>;
    updateCard: (c: any) => Promise<void>;
    deleteCard: (id: string) => Promise<void>;
    addDebtContract: (d: any) => Promise<string>;
    updateDebtContract: (d: any) => Promise<void>;
    deleteDebtContract: (id: string) => Promise<void>;
    addOpeningBalance: (d: any) => Promise<string>;
    updateOpeningBalance: (d: any) => Promise<void>;
}
