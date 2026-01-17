// Finance module constants

// Categories per ledger type - separated by transaction type (income/expense)
export const INCOME_CATEGORIES: Record<string, string[]> = {
    PF: ['Salário', 'Freelance', 'Investimentos', 'Vendas', 'Outros'],
    PJ: ['Assinaturas Saas', 'Implementação Saas', 'Gestão de tráfego', 'Empréstimos', 'TikTok Shop', 'Vendas COD', 'Outros']
};

export const EXPENSE_CATEGORIES: Record<string, string[]> = {
    PF: ['Empréstimos', 'Mercado', 'Lazer', 'Imagem', 'Moradia', 'Carro', 'Outros'],
    PJ: ['Marketing', 'Ferramentas', 'Assinaturas', 'Empréstimos', 'Estoque', 'taxas Logzz', 'Equipamentos', 'Contadora', 'Outros']
};

// Helper to get categories based on transaction type and ledger
// Optionally includes custom fee types for PJ expenses
export const getCategoriesForTransaction = (
    ledgerType: string,
    transactionType: string,
    feeTypes: Array<{ name: string }> = []
): string[] => {
    if (transactionType === 'income') {
        return INCOME_CATEGORIES[ledgerType] || INCOME_CATEGORIES.PF;
    }
    const baseCategories = EXPENSE_CATEGORIES[ledgerType] || EXPENSE_CATEGORIES.PF;

    // For PJ expenses, add custom fee types after "taxas Logzz"
    if (ledgerType === 'PJ' && feeTypes.length > 0) {
        const taxasIndex = baseCategories.indexOf('taxas Logzz');
        if (taxasIndex !== -1) {
            const customFees = feeTypes.map(ft => ft.name);
            const beforeTaxas = baseCategories.slice(0, taxasIndex + 1);
            const afterTaxas = baseCategories.slice(taxasIndex + 1);
            return [...beforeTaxas, ...customFees, ...afterTaxas];
        }
    }

    return baseCategories;
};

// Tab types
export type FinanceTab =
    | 'OVERVIEW'
    | 'FLOW'
    | 'RECURRENCES'
    | 'CARDS'
    | 'DEBTS'
    | 'CARD_DETAILS'
    | 'INCOME_DETAILS'
    | 'EXPENSE_DETAILS'
    | 'TRIAGE'; // Force refresh

export type FlowStatusFilter = 'ALL' | 'previsto' | 'pago' | 'atrasado';

// Month formatting helpers
export const formatMonthDisplay = (monthStr: string): string => {
    const [year, month] = monthStr.split('-').map(Number);
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[month - 1]} ${year}`;
};

// Get months between two dates
export const getMonthsBetween = (start: string, end: string): string[] => {
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

// Helper to get previous month
export const prevMonth = (monthStr: string): string => {
    const [year, month] = monthStr.split('-').map(Number);
    const d = new Date(year, month - 1 - 1, 1); // Subtract 1 month
    return d.toISOString().slice(0, 7);
};

// Helper to get next month
export const nextMonth = (monthStr: string): string => {
    const [year, month] = monthStr.split('-').map(Number);
    const d = new Date(year, month - 1 + 1, 1); // Add 1 month
    return d.toISOString().slice(0, 7);
};

export const MIN_ALLOWED_MONTH = '2026-01';

// Get all months in range (inclusive)
export const getMonthsInRange = (start: string, end: string): string[] => {
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
