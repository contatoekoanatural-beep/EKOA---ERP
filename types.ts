
export type Role = 'admin' | 'staff' | string;
export type AccessProfile = 'ADMIN' | 'COLABORADOR';

export interface UserAccess {
  dashboard: boolean;
  sales: boolean;
  marketing: boolean;
  finance: boolean;
  team: boolean;
  goals: boolean;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  role: Role;
  isActive: boolean;
  profile: AccessProfile | string;
  access: UserAccess;
  createdAt?: any;
  updatedAt?: any;
}

export interface KitConfig {
  kitId: string;
  name: string;
  units: number;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  active: boolean;
  unitPrice: number;
  stock?: number;
  stockByWarehouse?: Record<string, number>;
  kits: KitConfig[];
}

export interface Campaign {
  id: string;
  name: string;
  productId: string;
  objective?: string;
  status: 'Ativa' | 'Pausada' | 'Desativada';
}

export interface AdSet {
  id: string;
  campaignId: string;
  name: string;
  segmentationDesc?: string;
  status: 'Ativo' | 'Pausado';
}

export interface Creative {
  id: string;
  adSetId: string;
  name: string;
  format: 'Vídeo' | 'Imagem' | 'Carrossel';
  observations?: string;
}

export interface DailyMetric {
  id: string;
  date: string; // ISO YYYY-MM-DD
  campaignId: string;
  adSetId: string;
  creativeId: string;
  investment: number;
  impressions: number;
  clicks: number;
  leads: number;
  qualifiedLeads?: number;
}

export interface FrustrationReason {
  id: string;
  name: string;
  category?: string;
}

export type SaleStatus = 'AGENDADO' | 'REAGENDADO' | 'ENTREGUE' | 'FRUSTRADO';
export type DeliveryType = 'Logzz' | 'Correios';

export interface Sale {
  id: string;
  createdAt: string;
  status: SaleStatus;
  productId: string;
  customerName: string;
  customerPhone: string;
  campaignId: string;
  adSetId: string;
  creativeId: string;
  agentId: string;
  value: number;
  deliveryType: DeliveryType;
  schedulingDate?: string;
  scheduledDate?: string;
  deliveryDate?: string | null;
  frustrationReasonId?: string;
  observations?: string;
  quantity?: number; // Multiplier for the selected product/kit
  deliveryFee?: number;
  logzzFee?: number;
}

// --- CUSTOM FEE TYPES ---

export interface FeeType {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  createdAt?: any;
}

// --- UNIFIED FINANCE TYPES ---

// Ledger types (PF/PJ separation)
export type LedgerType = 'PF' | 'PJ';

export interface Ledger {
  id: string;
  name: string;
  type: LedgerType;
  isDefault: boolean;
  createdAt?: any;
}

// Bank Account (Caixa/Conta)
export interface BankAccount {
  id: string;
  ledgerId: string; // PF or PJ
  name: string; // "Nubank", "Caixa Físico", etc.
  currentBalance: number;
  isDefault?: boolean;
  createdAt?: any;
}

// Opening Balance (Saldo Inicial do Mês)
export interface OpeningBalance {
  id: string;
  ledgerId: string; // PF or PJ scope
  monthRef: string; // 'GLOBAL' for ledger-wide balance
  amount: number;
  baseMonth?: string; // YYYY-MM format - the month from which to start calculating
  createdAt?: any;
  updatedAt?: any;
}

// Transaction types
export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionOrigin = 'manual' | 'recurrence' | 'card' | 'debt' | 'transfer';
export type TransactionStatus = 'previsto' | 'pago' | 'atrasado' | 'cancelado';
export type PaymentMethod = 'pix' | 'cartao' | 'boleto' | 'dinheiro' | 'outro';

export interface Transaction {
  id: string;
  ledgerId: string; // Required - PF or PJ scope
  type: TransactionType;
  origin: TransactionOrigin;
  description: string;
  amount: number;
  method?: PaymentMethod;
  status: TransactionStatus;
  date: string; // YYYY-MM-DD (Payment date / Due date)
  paidDate?: string; // YYYY-MM-DD (Actual payment/receipt date, set when marked as paid)
  referenceMonth: string; // YYYY-MM (Accounting month)
  category: string;
  cardId?: string;
  debtId?: string; // Link to Debt
  contractId?: string; // Link to DebtContract
  recurrenceId?: string; // Format: "recurrence:{id}:{YYYY-MM}" for auto-generated
  transferGroupId?: string; // Links paired transfer transactions
  nature?: 'avulso' | 'recorrente' | 'parcela'; // Transaction nature
  productId?: string; // Link to Product (for Inventory/Estoque)
  productQuantity?: number; // Quantity of product purchased (for Inventory/Estoque)
  warehouseId?: string; // Target Warehouse for Inventory purchases
  batchName?: string; // e.g. "Lote 1"
  installmentsInfo?: {
    current: number;
    total: number;
  };
  createdAt?: any;
}

// Recurrence template
export interface Recurrence {
  id: string;
  ledgerId: string;
  description: string;
  type: 'income' | 'expense';
  method?: PaymentMethod;
  dayOfMonth: number; // 1-31
  amount: number;
  category: string;
  isActive: boolean;
  autoGenerate: boolean;
  cardId?: string;
  skippedMonths?: string[];
  createdAt?: any;
}

// Credit Card
export interface CreditCard {
  id: string;
  ledgerId: string; // Required - PF or PJ scope
  name: string;
  closingDay: number;
  dueDay: number;
  limit?: number;
  createdAt?: any;
}

// Debt
export interface Debt {
  id: string;
  ledgerId: string; // Required - PF or PJ scope
  name: string;
  description?: string;
  totalOpen: number; // Current balance
  installmentAmount: number;
  nextDueDate: string;
  installmentsRemaining?: number;
  cardId?: string; // If debt is on a credit card
  createdAt?: any;
}

// Legacy aliases for backward compatibility during migration
export type CardConfig = CreditCard;
export type DebtContract = Debt & {
  creditor?: string;
  totalLoanValue?: number;
  totalDebtRemaining?: number;
  totalInstallments?: number;
  status?: 'Ativo' | 'Quitado';
  startDate?: string;
  dueDay?: number;
};

// --- GOALS AND TASKS ---

export type GoalType =
  | 'Tráfego'
  | 'Atendimento'
  | 'ERP'
  | 'Desenvolv. operacional'
  | 'Estratégia/Gestão'
  | 'Financeiro'
  | 'Gerais/Diversos'
  | string;

export type PeriodType = 'Diário' | 'Semanal' | 'Mensal' | 'Personalizado';

export interface Goal {
  id: string;
  type: GoalType;
  description: string;
  period: PeriodType;
  startDate: string;
  endDate: string;
  targetValue: number;
  responsibleId: string;
  status: 'Em andamento' | 'Atingida' | 'Não atingida' | 'Atrasada';
}

export type TaskStatus = 'A fazer' | 'Em andamento' | 'Concluída';
export type Priority = 'Baixa' | 'Média' | 'Alta';

export type TaskType =
  | 'Tráfego'
  | 'Atendimento'
  | 'ERP'
  | 'Desenvolv. operacional'
  | 'Estratégia/Gestão'
  | 'Financeiro'
  | 'Gerais/Diversos';

export interface RecurrenceConfig {
  frequency: 'Diário' | 'Semanal' | 'Quinzenal' | 'Mensal';
  daysOfWeek: number[];
  endOption?: string;
  endDate?: string;
  maxOccurrences?: number;
  currentOccurrenceCount?: number;
}

export interface Task {
  id: string;
  description: string;
  goalId?: string;
  responsibleId: string;
  deadline: string;
  status: TaskStatus;
  priority: Priority;
  type?: TaskType;
  quantity?: number;
  isRecurring?: boolean;
  recurrence?: RecurrenceConfig;
  parentId?: string;
  createdAt?: any;
  updatedAt?: any;
  completedAt?: any;
}

export interface Warehouse {
  id: string;
  name: string;
  active: boolean;
}

export interface AppState {
  currentUser: User | null;
  users: User[];
  products: Product[]; // Now includes optional stockByWarehouse
  warehouses: Warehouse[]; // New collection
  campaigns: Campaign[];
  adSets: AdSet[];
  creatives: Creative[];
  dailyMetrics: DailyMetric[];
  sales: Sale[];
  frustrationReasons: FrustrationReason[];
  goals: Goal[];
  tasks: Task[];
  ledgers: Ledger[];
  transactions: Transaction[];
  recurrences: Recurrence[];
  cards: CreditCard[];
  debts: Debt[];
  bankAccounts: BankAccount[];
  openingBalances: OpeningBalance[];
  feeTypes: FeeType[];
  // Legacy aliases
  debtContracts: DebtContract[];
}

export interface AppContextType extends AppState {
  setCurrentUser: (user: User) => void;
  addSale: (sale: Sale) => void;
  updateSale: (sale: Sale) => void;
  deleteSale: (saleId: string) => void;
  addCampaign: (data: { name: string, productId: string }) => string;
  updateCampaign: (campaign: Campaign) => void;
  deleteCampaign: (campaignId: string) => void;
  addAdSet: (data: { name: string, campaignId: string }) => string;
  updateAdSet: (adSet: AdSet) => void;
  deleteAdSet: (adSetId: string) => void;
  addCreative: (data: { name: string, adSetId: string, format: string }) => string;
  updateCreative: (creative: Creative) => void;
  deleteCreative: (creativeId: string) => void;
  addMetric: (metric: DailyMetric) => void;
  updateMetric: (metric: DailyMetric) => void;
  deleteMetric: (metricId: string) => void;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  toggleTaskStatus: (taskId: string, status: TaskStatus) => void;
  addGoal: (goal: Omit<Goal, 'id'>) => void;
  updateGoal: (goal: Goal) => void;
  deleteGoal: (goalId: string) => void;
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  deleteUser: (userId: string | number) => Promise<void>;
  // Ledgers
  addLedger: (ledger: Omit<Ledger, 'id'>) => Promise<string>;
  updateLedger: (ledger: Ledger) => Promise<void>;
  // Transactions
  addTransaction: (data: Omit<Transaction, 'id'>) => Promise<string>;
  updateTransaction: (transaction: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  // Recurrences
  addRecurrence: (data: Omit<Recurrence, 'id'>) => Promise<string>;
  updateRecurrence: (recurrence: Recurrence) => Promise<void>;
  deleteRecurrence: (id: string) => Promise<void>;
  // Credit Cards
  addCard: (card: Omit<CreditCard, 'id'>) => Promise<string>;
  updateCard: (card: CreditCard) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  // Debts
  addDebt: (debt: Omit<Debt, 'id'>) => Promise<string>;
  updateDebt: (debt: Debt) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
  // Bank Accounts
  addBankAccount: (account: Omit<BankAccount, 'id'>) => Promise<string>;
  updateBankAccount: (account: BankAccount) => Promise<void>;
  deleteBankAccount: (id: string) => Promise<void>;
  // Opening Balances
  addOpeningBalance: (data: Omit<OpeningBalance, 'id'>) => Promise<string>;
  updateOpeningBalance: (data: OpeningBalance) => Promise<void>;
  // Legacy aliases
  addDebtContract: (contract: Omit<DebtContract, 'id'>) => Promise<string>;
  updateDebtContract: (contract: DebtContract) => Promise<void>;
  deleteDebtContract: (id: string) => Promise<void>;
  // Products
  addProduct: (product: Omit<Product, 'id'>) => Promise<string>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  // Frustration Reasons
  addFrustrationReason: (reason: Omit<FrustrationReason, 'id'>) => Promise<string>;
  updateFrustrationReason: (reason: FrustrationReason) => Promise<void>;
  deleteFrustrationReason: (id: string) => Promise<void>;
  // Fee Types
  addFeeType: (feeType: Omit<FeeType, 'id'>) => Promise<string>;
  updateFeeType: (feeType: FeeType) => Promise<void>;
  deleteFeeType: (id: string) => Promise<void>;
}
