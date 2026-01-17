
import { AppState, CardConfig, RecurrenceConfig } from './types';

export const getCurrentLocalDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getLast30DaysDate = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getNext30DaysDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getNextOccurrenceDate = (currentDeadline: string, config: RecurrenceConfig): string => {
  let baseDateStr = currentDeadline || getCurrentLocalDate();
  const parts = baseDateStr.split('T')[0].split('-');
  const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
  
  const freq = config.frequency || 'Mensal';

  switch (freq) {
    case 'Diário': date.setDate(date.getDate() + 1); break;
    case 'Semanal': date.setDate(date.getDate() + 7); break;
    case 'Quinzenal': date.setDate(date.getDate() + 14); break;
    case 'Mensal': date.setMonth(date.getMonth() + 1); break;
    default: date.setMonth(date.getMonth() + 1);
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const calculateInvoiceMonth = (dateStr: string, card: CardConfig) => {
  const date = new Date(dateStr + 'T12:00:00');
  let month = date.getMonth();
  let year = date.getFullYear();
  const day = date.getDate();

  if (day > card.closingDay) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  return `${year}-${String(month + 1).padStart(2, '0')}`;
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

export const INITIAL_STATE: AppState = {
  currentUser: null,
  users: [],
  products: [{ id: 'p1', name: 'Perfume Atração Árabe', active: true }],
  campaigns: [],
  adSets: [],
  creatives: [],
  dailyMetrics: [],
  frustrationReasons: [
    { id: 'fr1', name: 'Cliente desistiu' },
    { id: 'fr2', name: 'Não atendeu no dia' },
    { id: 'fr3', name: 'Endereço incorreto' },
    { id: 'fr4', name: 'Achou caro' },
  ],
  sales: [],
  goals: [],
  tasks: [],
  transactions: [],
  cards: [],
  debtContracts: []
};
