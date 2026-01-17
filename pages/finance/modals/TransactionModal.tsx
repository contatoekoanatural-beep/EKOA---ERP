import React, { useState, useEffect } from 'react';
import { X, CreditCard, AlertTriangle, User, Building2 } from 'lucide-react';
import { Transaction, Ledger, CreditCard as CreditCardType, PaymentMethod, FeeType } from '../../../types';
import { getCategoriesForTransaction } from '../constants';
import { DebtCalcState } from '../types';
import { formatCurrency } from '../../../constants';

interface TransactionModalProps {
    isOpen: boolean;
    editingItem: any;
    ledgers: Ledger[];
    cards: CreditCardType[];
    filterMonth: string;
    debtCalc: DebtCalcState;
    feeTypes?: FeeType[];
    onClose: () => void;
    onSave: (e: React.FormEvent, updateScope?: 'ONLY_THIS' | 'ALL_RELATED' | 'FROM_HERE') => void;
    onEditingItemChange: (item: any) => void;
    onDebtCalcChange: (calc: DebtCalcState) => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
    isOpen,
    editingItem,
    ledgers,
    cards,
    filterMonth,
    debtCalc,
    feeTypes = [],
    onClose,
    onSave,
    onEditingItemChange,
    onDebtCalcChange,
}) => {
    const [showRecurrenceOptions, setShowRecurrenceOptions] = useState(false);

    // Helper to calculate minimum allowed reference month
    const getMinReferenceMonth = () => {
        if (!editingItem) return undefined;
        if (editingItem.method === 'cartao' && editingItem.cardId) {
            const card = cards.find(c => c.id === editingItem.cardId);
            if (card && card.closingDay) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const dueDay = card.dueDay || 1;
                const isPreviousMonthScheme = card.closingDay > dueDay;

                let checkDate = new Date(today.getFullYear(), today.getMonth(), 1);

                for (let i = 0; i < 12; i++) {
                    const checkYear = checkDate.getFullYear();
                    const checkMonth = checkDate.getMonth();

                    let closingDateYear = checkYear;
                    let closingDateMonth = checkMonth;

                    if (isPreviousMonthScheme) {
                        closingDateMonth = checkMonth - 1;
                    } else {
                        closingDateMonth = checkMonth;
                    }

                    const closingDate = new Date(closingDateYear, closingDateMonth, card.closingDay);
                    closingDate.setHours(23, 59, 59, 999);

                    if (today <= closingDate) {
                        return `${checkYear}-${String(checkMonth + 1).padStart(2, '0')}`;
                    }

                    checkDate.setMonth(checkDate.getMonth() + 1);
                }
            }
        }
        return undefined;
    };

    const minReferenceMonth = getMinReferenceMonth();

    // useEffect must be called BEFORE any early returns
    useEffect(() => {
        if (minReferenceMonth && editingItem?.referenceMonth && editingItem.referenceMonth < minReferenceMonth) {
            onEditingItemChange({ ...editingItem, referenceMonth: minReferenceMonth });
        }
    }, [minReferenceMonth, editingItem?.referenceMonth, onEditingItemChange]);

    // Early return AFTER all hooks
    if (!isOpen || !editingItem) return null;

    const ledgerType = ledgers.find(l => l.id === editingItem.ledgerId)?.type || 'PF';
    const categories = getCategoriesForTransaction(ledgerType, editingItem.type, feeTypes);

    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-[#1F1F1F] rounded-2xl p-10 w-full max-w-lg shadow-2xl border border-white/10 overflow-y-auto max-h-[95vh] animate-in zoom-in duration-200 relative">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-black text-white">
                        {editingItem.id ? 'Editar Lançamento' : 'Novo Lançamento'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="bg-[#2A2A2A] p-2 rounded-xl text-[#808080] hover:text-red-500 transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={(e) => {
                    e.preventDefault();
                    const isRecurrent = editingItem.id && (editingItem.nature === 'recorrente' || editingItem.recurrenceId);
                    if (isRecurrent) {
                        setShowRecurrenceOptions(true);
                    } else {
                        onSave(e, 'ONLY_THIS');
                    }
                }} className="space-y-6">
                    {/* Tipo: Entrada/Saída */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => onEditingItemChange({ ...editingItem, type: 'income' })}
                            className={`py-4 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${editingItem.type === 'income'
                                ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                : 'bg-[#2A2A2A] border-white/10 text-[#808080] hover:border-white/20'
                                }`}
                        >
                            Entrada
                        </button>
                        <button
                            type="button"
                            onClick={() => onEditingItemChange({ ...editingItem, type: 'expense' })}
                            className={`py-4 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${editingItem.type === 'expense'
                                ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-500/30'
                                : 'bg-[#2A2A2A] border-white/10 text-[#808080] hover:border-white/20'
                                }`}
                        >
                            Saída
                        </button>
                    </div>

                    {/* Seletor PF/PJ - oculto para parcelas de dívidas e lançamentos de cartão */}
                    {!editingItem.contractId && editingItem.method !== 'cartao' && (
                        <div>
                            <label className="text-[10px] font-black uppercase text-[#808080] mb-2 block tracking-widest">
                                Escopo Financeiro
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {ledgers.map(l => (
                                    <button
                                        key={l.id}
                                        type="button"
                                        onClick={() => onEditingItemChange({ ...editingItem, ledgerId: l.id })}
                                        className={`py-3 rounded-xl text-[10px] font-black uppercase border-2 transition-all flex items-center justify-center gap-2 ${editingItem.ledgerId === l.id
                                            ? l.type === 'PF'
                                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg'
                                                : 'bg-emerald-600 border-emerald-500 text-white shadow-lg'
                                            : 'bg-[#2A2A2A] border-white/10 text-[#808080] hover:border-white/20'
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
                    {editingItem.method === 'cartao' && !editingItem.contractId && (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                            <p className="text-[10px] font-black uppercase text-blue-400 flex items-center gap-2">
                                <CreditCard size={14} />
                                O escopo PF/PJ será herdado do cartão selecionado
                            </p>
                        </div>
                    )}

                    {/* Aviso para parcelas de dívidas */}
                    {editingItem.contractId && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                            <p className="text-[10px] font-black uppercase text-amber-400 flex items-center gap-2">
                                <AlertTriangle size={14} />
                                Parcela vinculada a dívida - Classifique PF/PJ na aba Dívidas
                            </p>
                        </div>
                    )}

                    {/* Descrição */}
                    <div>
                        <label className="text-[10px] font-black uppercase text-[#808080] mb-2 block tracking-widest">
                            Descrição
                        </label>
                        <input
                            required
                            className="w-full bg-[#2A2A2A] border-2 border-white/10 rounded-xl p-4 font-black text-white outline-none focus:border-brand-500 transition-colors"
                            value={editingItem.description}
                            onChange={e => onEditingItemChange({ ...editingItem, description: e.target.value })}
                        />
                    </div>

                    {/* Categoria */}
                    <div>
                        <label className="text-[10px] font-black uppercase text-[#808080] mb-2 block tracking-widest">
                            Categoria
                        </label>
                        <select
                            className="w-full bg-[#2A2A2A] border-2 border-white/10 rounded-xl p-4 font-black text-white outline-none focus:border-brand-500 transition-colors"
                            value={editingItem.category}
                            onChange={e => onEditingItemChange({ ...editingItem, category: e.target.value })}
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    {/* Natureza */}
                    <div>
                        <label className="text-[10px] font-black uppercase text-[#808080] mb-2 block tracking-widest">
                            Natureza
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={() => onEditingItemChange({ ...editingItem, nature: 'avulso' })}
                                className={`py-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${editingItem.nature === 'avulso'
                                    ? 'bg-brand-600 border-brand-500 text-white shadow-lg'
                                    : 'bg-[#2A2A2A] border-white/10 text-[#808080] hover:border-white/20'
                                    }`}
                            >
                                Avulso
                            </button>
                            <button
                                type="button"
                                onClick={() => onEditingItemChange({ ...editingItem, nature: 'recorrente' })}
                                className={`py-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${editingItem.nature === 'recorrente'
                                    ? 'bg-amber-600 border-amber-500 text-white shadow-lg'
                                    : 'bg-[#2A2A2A] border-white/10 text-[#808080] hover:border-white/20'
                                    }`}
                            >
                                Recorrente
                            </button>
                            <button
                                type="button"
                                onClick={() => onEditingItemChange({ ...editingItem, nature: 'parcela' })}
                                className={`py-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${editingItem.nature === 'parcela'
                                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg'
                                    : 'bg-[#2A2A2A] border-white/10 text-[#808080] hover:border-white/20'
                                    }`}
                            >
                                Parcela/Dívida
                            </button>
                        </div>
                    </div>

                    {/* Método e Valor */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-[#808080] mb-2 block tracking-widest">
                                Método
                            </label>
                            <select
                                className="w-full bg-[#2A2A2A] border-2 border-white/10 rounded-xl p-4 font-black text-white outline-none focus:border-brand-500 transition-colors"
                                value={editingItem.method}
                                onChange={e => {
                                    const newMethod = e.target.value as PaymentMethod;
                                    onEditingItemChange({
                                        ...editingItem,
                                        method: newMethod,
                                        status: newMethod === 'cartao' ? 'previsto' : editingItem.status
                                    });
                                }}
                            >
                                <option value="pix">Pix</option>
                                <option value="cartao">Cartão</option>
                                <option value="boleto">Boleto</option>
                            </select>
                        </div>
                        {editingItem.method !== 'cartao' && (
                            <div>
                                <label className="text-[10px] font-black uppercase text-[#808080] mb-2 block tracking-widest">
                                    Valor
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    className="w-full bg-[#2A2A2A] border-2 border-white/10 rounded-xl p-4 font-black text-white outline-none focus:border-brand-500 transition-colors"
                                    value={editingItem.amount}
                                    onChange={e => onEditingItemChange({ ...editingItem, amount: parseFloat(e.target.value) })}
                                />
                            </div>
                        )}
                    </div>

                    {/* Seção Cartão */}
                    {editingItem.method === 'cartao' && (
                        <div className="bg-[#2A2A2A] p-6 rounded-xl border-2 border-white/10 space-y-4">
                            <p className="text-[10px] font-black uppercase text-brand-500 tracking-widest">
                                {editingItem.nature === 'recorrente' ? 'Assinatura no Cartão' : 'Parcelas do Cartão'}
                            </p>

                            {editingItem.nature === 'recorrente' ? (
                                <div>
                                    <label className="text-[9px] uppercase text-[#808080]">Valor Mensal (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full bg-[#1F1F1F] border-2 border-white/10 rounded-xl p-3 text-sm font-black text-white focus:border-brand-500 transition-colors"
                                        value={debtCalc.part}
                                        onChange={e => {
                                            const val = parseFloat(e.target.value) || 0;
                                            onDebtCalcChange({ ...debtCalc, part: val, total: val, count: 1 });
                                        }}
                                    />
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[9px] uppercase text-[#808080]">Valor Parcela (R$)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="w-full bg-[#1F1F1F] border-2 border-white/10 rounded-xl p-3 text-sm font-black text-white focus:border-brand-500 transition-colors"
                                                value={debtCalc.part}
                                                onChange={e => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    onDebtCalcChange({ ...debtCalc, part: val, total: val * debtCalc.count });
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] uppercase text-[#808080]">Qtd Parc.</label>
                                            <input
                                                type="number"
                                                step="1"
                                                className="w-full bg-[#1F1F1F] border-2 border-white/10 rounded-xl p-3 text-sm font-black text-white focus:border-brand-500 transition-colors"
                                                value={debtCalc.count}
                                                onChange={e => {
                                                    const val = Math.max(1, parseInt(e.target.value) || 1);
                                                    onDebtCalcChange({ ...debtCalc, count: val, total: debtCalc.part * val });
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="text-right text-[10px] font-black uppercase text-[#808080]">
                                        Total Calculado: {formatCurrency(debtCalc.total)}
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="text-[9px] uppercase text-[#808080]">Escolha o Cartão</label>
                                <select
                                    required
                                    className="w-full bg-[#1F1F1F] border-2 border-white/10 rounded-xl p-3 text-sm font-black text-white focus:border-brand-500 transition-colors"
                                    value={editingItem.cardId}
                                    onChange={e => {
                                        const selectedCard = cards.find(c => c.id === e.target.value);
                                        if (selectedCard) {
                                            const [year, month] = (editingItem.referenceMonth || filterMonth).split('-').map(Number);
                                            const dueDay = selectedCard.dueDay || 1;
                                            const lastDayOfMonth = new Date(year, month, 0).getDate();
                                            const validDay = Math.min(dueDay, lastDayOfMonth);
                                            const newDueDate = `${year}-${String(month).padStart(2, '0')}-${String(validDay).padStart(2, '0')}`;
                                            onEditingItemChange({
                                                ...editingItem,
                                                cardId: e.target.value,
                                                ledgerId: selectedCard.ledgerId || editingItem.ledgerId,
                                                date: newDueDate
                                            });
                                        } else {
                                            onEditingItemChange({ ...editingItem, cardId: e.target.value });
                                        }
                                    }}
                                >
                                    <option value="">Escolha...</option>
                                    {cards.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} {c.ledgerId ? `(${ledgers.find(l => l.id === c.ledgerId)?.type || ''})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Mês e Data */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-[#808080] mb-2 block">Mês Ref.</label>
                            <input
                                type="month"
                                required
                                className="w-full bg-[#2A2A2A] border-2 border-white/10 rounded-xl p-4 font-black text-white focus:border-brand-500 transition-colors"
                                value={editingItem.referenceMonth}
                                min={minReferenceMonth}
                                onChange={e => onEditingItemChange({ ...editingItem, referenceMonth: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-[#808080] mb-2 block">Vencimento</label>
                            <input
                                type="date"
                                required
                                className="w-full bg-[#2A2A2A] border-2 border-white/10 rounded-xl p-4 font-black text-white focus:border-brand-500 transition-colors"
                                value={editingItem.date}
                                onChange={e => onEditingItemChange({ ...editingItem, date: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Checkbox: Já está pago? - Apenas se não for cartão */}
                    {editingItem.method !== 'cartao' && (
                        <label className="flex items-center gap-3 p-4 bg-[#2A2A2A] rounded-xl border-2 border-white/10 cursor-pointer hover:bg-[#333] transition-all">
                            <input
                                type="checkbox"
                                checked={editingItem.status === 'pago'}
                                onChange={e => onEditingItemChange({
                                    ...editingItem,
                                    status: e.target.checked ? 'pago' : 'previsto',
                                    paidDate: e.target.checked
                                        ? (editingItem.paidDate || new Date().toISOString().split('T')[0])
                                        : undefined
                                })}
                                className="w-5 h-5 rounded border-2 border-white/30 text-brand-600 focus:ring-brand-500 bg-[#1F1F1F]"
                            />
                            <div>
                                <span className="font-black text-white text-sm">
                                    Já está {editingItem.type === 'income' ? 'recebido' : 'pago'}?
                                </span>
                                <p className="text-[9px] font-bold text-[#606060]">
                                    Marque se o {editingItem.type === 'income' ? 'recebimento' : 'pagamento'} já foi realizado
                                </p>
                            </div>
                        </label>
                    )}

                    {/* Data de Pagamento/Recebimento - Aparece quando marcado como pago */}
                    {editingItem.status === 'pago' && editingItem.method !== 'cartao' && (
                        <div>
                            <label className="text-[10px] font-black uppercase text-[#808080] mb-2 block tracking-widest">
                                Data do {editingItem.type === 'income' ? 'Recebimento' : 'Pagamento'}
                            </label>
                            <input
                                type="date"
                                className="w-full bg-[#2A2A2A] border-2 border-white/10 rounded-xl p-4 font-black text-white outline-none focus:border-brand-500 transition-colors"
                                value={editingItem.paidDate || ''}
                                onChange={e => onEditingItemChange({ ...editingItem, paidDate: e.target.value })}
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-brand-600 text-white py-5 rounded-xl font-black shadow-xl shadow-brand-500/30 uppercase text-[11px] tracking-widest hover:bg-brand-700 transition-all"
                    >
                        Salvar Lançamento
                    </button>
                </form>

                {/* Recurrence Options Overlay */}
                {showRecurrenceOptions && (
                    <div className="absolute inset-0 z-[70] bg-[#1F1F1F]/98 flex items-center justify-center rounded-2xl animate-in fade-in duration-200">
                        <div className="text-center p-8 max-w-sm">
                            <div className="bg-amber-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-500">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-xl font-black text-white mb-2">Editar Recorrência</h3>
                            <p className="text-sm text-[#808080] mb-8 font-medium">
                                Você está editando um lançamento recorrente. Como deseja aplicar as alterações?
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={(e) => {
                                        onSave(e, 'ONLY_THIS');
                                        setShowRecurrenceOptions(false);
                                    }}
                                    className="w-full bg-[#2A2A2A] border-2 border-white/10 p-4 rounded-xl text-white font-black text-sm hover:border-brand-500 hover:text-brand-500 transition-all flex items-center justify-between group"
                                >
                                    <span>Apenas este</span>
                                    <span className="text-[10px] uppercase bg-[#333] px-2 py-1 rounded text-[#808080] group-hover:bg-brand-500/20 group-hover:text-brand-500 transition-colors">Este mês</span>
                                </button>

                                <button
                                    onClick={(e) => {
                                        onSave(e, 'FROM_HERE');
                                        setShowRecurrenceOptions(false);
                                    }}
                                    className="w-full bg-emerald-600 border-2 border-emerald-500 p-4 rounded-xl text-white font-black text-sm hover:bg-emerald-700 hover:border-emerald-600 transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-between"
                                >
                                    <span>Daqui em diante</span>
                                    <span className="text-[10px] uppercase bg-white/20 px-2 py-1 rounded text-white">Futuros</span>
                                </button>

                                <button
                                    onClick={(e) => {
                                        onSave(e, 'ALL_RELATED');
                                        setShowRecurrenceOptions(false);
                                    }}
                                    className="w-full bg-brand-600 border-2 border-brand-500 p-4 rounded-xl text-white font-black text-sm hover:bg-brand-700 hover:border-brand-600 transition-all shadow-lg shadow-brand-500/30 flex items-center justify-between"
                                >
                                    <span>Toda a série</span>
                                    <span className="text-[10px] uppercase bg-white/20 px-2 py-1 rounded text-white">Todas</span>
                                </button>

                                <button
                                    onClick={() => setShowRecurrenceOptions(false)}
                                    className="mt-4 text-[#606060] font-bold text-xs uppercase tracking-widest hover:text-red-500 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
