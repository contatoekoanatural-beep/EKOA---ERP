
import React, { useContext, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit2, Search, Filter, Truck, DollarSign, Tag, ChevronDown, X, Check } from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';
import { useOperations } from '../contexts/OperationsContext';

import { TransactionModal } from './finance/modals/TransactionModal';
import { DeleteConfirmModal } from './finance/modals/DeleteConfirmModal';
import { formatCurrency, formatDate } from '../constants';
import { Transaction, FeeType } from '../types';

export const FeesManagement = () => {
    const navigate = useNavigate();
    const {
        transactions, addTransaction, updateTransaction, deleteTransaction,
        ledgers, cards,
        feeTypes = [], addFeeType, updateFeeType, deleteFeeType
    } = useFinance();
    const { sales } = useOperations();


    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [itemToDelete, setItemToDelete] = useState<Transaction | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Fee Type management state
    const [newFeeTypeName, setNewFeeTypeName] = useState('');
    const [editingFeeType, setEditingFeeType] = useState<FeeType | null>(null);
    const [editFeeTypeName, setEditFeeTypeName] = useState('');
    const [feeTypeToDelete, setFeeTypeToDelete] = useState<FeeType | null>(null);

    // Section: active tab for "Outras Taxas"
    const [activeOtherFeeCategory, setActiveOtherFeeCategory] = useState<string | 'all'>('all');

    // Calculate sale fees from delivered sales
    const saleFees = useMemo(() => {
        const deliveredSales = sales.filter(s => s.status === 'ENTREGUE');
        const totalDeliveryFee = deliveredSales.reduce((acc, s) => acc + (s.deliveryFee || 0), 0);
        const totalLogzzFee = deliveredSales.reduce((acc, s) => acc + (s.logzzFee || 0), 0);
        return { totalDeliveryFee, totalLogzzFee, deliveredSales };
    }, [sales]);

    // Filter for "Other Fees" from transactions (excluding sale fees)
    const otherFeesTransactions = useMemo(() => {
        return transactions
            .filter(t => {
                // Must be categorized as "taxas Logzz" or custom fee type
                const isFee = t.category === 'taxas Logzz' ||
                    feeTypes.some(ft => ft.name === t.category);
                if (!isFee) return false;

                // Apply category filter
                if (activeOtherFeeCategory !== 'all' && t.category !== activeOtherFeeCategory) return false;

                // Apply search filter
                if (searchTerm && !t.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;

                return true;
            })
            .sort((a, b) => b.date.localeCompare(a.date));
    }, [transactions, searchTerm, feeTypes, activeOtherFeeCategory]);

    const totalOtherFees = otherFeesTransactions.reduce((acc, t) => acc + t.amount, 0);
    const grandTotal = saleFees.totalDeliveryFee + saleFees.totalLogzzFee + totalOtherFees;

    const handleOpenTransaction = (t?: Transaction) => {
        const defaultLedger = ledgers.find(l => l.type === 'PJ' || l.isDefault) || ledgers[0];

        const item = t || {
            ledgerId: defaultLedger?.id,
            type: 'expense',
            origin: 'manual',
            status: 'pago',
            method: 'outro',
            date: new Date().toISOString().split('T')[0],
            referenceMonth: new Date().toISOString().slice(0, 7),
            amount: 0,
            description: '',
            category: activeOtherFeeCategory !== 'all' ? activeOtherFeeCategory : 'taxas Logzz'
        };

        setEditingItem(item);
        setIsModalOpen(true);
    };

    const handleSaveTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        const finalItem = { ...editingItem };

        if (finalItem.id) {
            await updateTransaction(finalItem);
        } else {
            await addTransaction(finalItem);
        }
        setIsModalOpen(false);
    };

    const handleDelete = async (mode: 'ONLY_THIS' | 'ALL_RELATED') => {
        if (!itemToDelete) return;
        await deleteTransaction(itemToDelete.id);
        setIsDeleteModalOpen(false);
        setItemToDelete(null);
    };

    // Fee Type handlers
    const handleAddFeeType = async () => {
        if (!newFeeTypeName.trim()) return;
        await addFeeType({ name: newFeeTypeName.trim() });
        setNewFeeTypeName('');
    };

    const handleStartEditFeeType = (ft: FeeType) => {
        setEditingFeeType(ft);
        setEditFeeTypeName(ft.name);
    };

    const handleSaveEditFeeType = async () => {
        if (!editingFeeType || !editFeeTypeName.trim()) return;
        await updateFeeType({ ...editingFeeType, name: editFeeTypeName.trim() });
        setEditingFeeType(null);
        setEditFeeTypeName('');
    };

    const handleDeleteFeeType = async () => {
        if (!feeTypeToDelete) return;
        await deleteFeeType(feeTypeToDelete.id);
        setFeeTypeToDelete(null);
    };

    return (
        <div className="bg-[#141414] min-h-full rounded-[30px] p-8 -m-8 md:-m-8 md:p-10 space-y-10 border border-[#222] animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2.5 rounded-xl bg-[#1F1F1F] border border-white/5 text-[#808080] hover:text-white hover:bg-[#252525] transition-all"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Gestão de Taxas Logzz</h1>
                        <p className="text-[10px] font-bold text-[#808080] uppercase tracking-widest mt-1">Taxas da venda e outras taxas do negócio</p>
                    </div>
                </div>
            </div>

            {/* Total Summary */}
            <div className="bg-gradient-to-r from-[#5D7F38]/20 to-[#1F1F1F] p-6 rounded-2xl border border-[#5D7F38]/30">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#5D7F38]">Total de Taxas</p>
                        <p className="text-3xl font-black text-white mt-1">{formatCurrency(grandTotal)}</p>
                    </div>
                    <div className="text-right text-[11px] font-bold text-[#808080] space-y-1">
                        <p>Entregas: <span className="text-[#A0A0A0]">{formatCurrency(saleFees.totalDeliveryFee)}</span></p>
                        <p>Taxa Logzz: <span className="text-[#A0A0A0]">{formatCurrency(saleFees.totalLogzzFee)}</span></p>
                        <p>Outras: <span className="text-[#A0A0A0]">{formatCurrency(totalOtherFees)}</span></p>
                    </div>
                </div>
            </div>

            {/* SECTION 1: Taxas da Venda */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-1 h-6 bg-[#5D7F38] rounded-full"></div>
                    <h2 className="text-lg font-bold text-white">Taxas da Venda</h2>
                    <span className="text-[9px] font-black uppercase text-[#606060] bg-[#252525] px-2 py-1 rounded-lg">Automáticas</span>
                </div>
                <p className="text-xs text-[#808080] ml-4">Valores já descontados do seu faturamento. Você recebe: <span className="text-[#5D7F38] font-bold">Venda - Taxas</span></p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Entregas Card */}
                    <div className="bg-[#1F1F1F] p-6 rounded-2xl border border-white/5 flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-[#2E241A] text-[#FB923C]">
                            <Truck size={24} />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#808080]">Taxa de Entrega</p>
                            <p className="text-2xl font-black text-white mt-1">{formatCurrency(saleFees.totalDeliveryFee)}</p>
                            <p className="text-[10px] text-[#606060] mt-1">{saleFees.deliveredSales.length} vendas entregues</p>
                        </div>
                    </div>

                    {/* Taxa Logzz Card */}
                    <div className="bg-[#1F1F1F] p-6 rounded-2xl border border-white/5 flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-[#1A2E22] text-[#22C55E]">
                            <DollarSign size={24} />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#808080]">Taxa Logzz</p>
                            <p className="text-2xl font-black text-white mt-1">{formatCurrency(saleFees.totalLogzzFee)}</p>
                            <p className="text-[10px] text-[#606060] mt-1">Comissão da plataforma</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 2: Outras Taxas */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-6 bg-amber-500 rounded-full"></div>
                        <h2 className="text-lg font-bold text-white">Outras Taxas</h2>
                        <span className="text-[9px] font-black uppercase text-[#606060] bg-[#252525] px-2 py-1 rounded-lg">Adicionais</span>
                    </div>
                    <button
                        onClick={() => handleOpenTransaction()}
                        className="bg-[#5D7F38] text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-[#5D7F38]/20 hover:bg-[#4a662c] flex items-center gap-2 transition-all"
                    >
                        <Plus size={16} /> Novo Registro
                    </button>
                </div>
                <p className="text-xs text-[#808080] ml-4">Taxas adicionais ao saque: antecipação, pedidos frustrados, multas, etc.</p>

                {/* Fee Type Management */}
                <div className="bg-[#1F1F1F] p-4 rounded-xl border border-white/5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#808080] mb-3">Categorias de Taxas</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                        <button
                            onClick={() => setActiveOtherFeeCategory('all')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeOtherFeeCategory === 'all'
                                ? 'bg-[#5D7F38] text-white'
                                : 'bg-[#252525] text-[#808080] hover:bg-[#2A2A2A]'
                                }`}
                        >
                            Todas
                        </button>
                        <button
                            onClick={() => setActiveOtherFeeCategory('taxas Logzz')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeOtherFeeCategory === 'taxas Logzz'
                                ? 'bg-[#5D7F38] text-white'
                                : 'bg-[#252525] text-[#808080] hover:bg-[#2A2A2A]'
                                }`}
                        >
                            Taxas Logzz
                        </button>
                        {feeTypes.map(ft => (
                            <div key={ft.id} className="flex items-center gap-1">
                                {editingFeeType?.id === ft.id ? (
                                    <div className="flex items-center gap-1 bg-[#252525] rounded-lg px-2 py-1">
                                        <input
                                            type="text"
                                            value={editFeeTypeName}
                                            onChange={(e) => setEditFeeTypeName(e.target.value)}
                                            className="bg-transparent text-[10px] font-bold text-white w-20 focus:outline-none"
                                            autoFocus
                                        />
                                        <button onClick={handleSaveEditFeeType} className="text-[#5D7F38] hover:text-[#7AA84E]">
                                            <Check size={14} />
                                        </button>
                                        <button onClick={() => setEditingFeeType(null)} className="text-[#808080] hover:text-red-400">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setActiveOtherFeeCategory(ft.name)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all group ${activeOtherFeeCategory === ft.name
                                            ? 'bg-amber-500 text-white'
                                            : 'bg-[#252525] text-[#808080] hover:bg-[#2A2A2A]'
                                            }`}
                                    >
                                        {ft.name}
                                    </button>
                                )}
                                {editingFeeType?.id !== ft.id && (
                                    <div className="flex items-center gap-0.5 opacity-0 hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleStartEditFeeType(ft)}
                                            className="p-1 text-[#808080] hover:text-[#5D7F38]"
                                        >
                                            <Edit2 size={12} />
                                        </button>
                                        <button
                                            onClick={() => setFeeTypeToDelete(ft)}
                                            className="p-1 text-[#808080] hover:text-red-400"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="Nova categoria..."
                            value={newFeeTypeName}
                            onChange={(e) => setNewFeeTypeName(e.target.value)}
                            className="flex-1 bg-[#252525] border border-white/5 rounded-lg px-3 py-2 text-xs font-bold text-white placeholder:text-[#606060] focus:outline-none focus:border-[#5D7F38]"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddFeeType()}
                        />
                        <button
                            onClick={handleAddFeeType}
                            disabled={!newFeeTypeName.trim()}
                            className="bg-[#252525] border border-white/5 text-[#5D7F38] px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#2A2A2A] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="bg-[#1F1F1F] p-4 rounded-xl border border-white/5 shadow-sm flex items-center gap-4">
                    <Search size={18} className="text-[#808080] ml-2" />
                    <input
                        type="text"
                        placeholder="Buscar por descrição..."
                        className="flex-1 bg-transparent text-sm font-bold text-white placeholder:text-[#606060] focus:outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Transactions List */}
                <div className="bg-[#1F1F1F] rounded-xl border border-white/5 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[10px] font-black uppercase text-[#808080] tracking-widest border-b border-white/5 bg-[#252525]">
                                    <th className="p-6">Data</th>
                                    <th className="p-6">Descrição</th>
                                    <th className="p-6">Categoria</th>
                                    <th className="p-6">Valor</th>
                                    <th className="p-6 text-center">Status</th>
                                    <th className="p-6 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {otherFeesTransactions.map(t => (
                                    <tr key={t.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-6 text-xs font-bold text-[#A0A0A0]">{formatDate(t.date)}</td>
                                        <td className="p-6">
                                            <p className="text-sm font-bold text-white">{t.description}</p>
                                        </td>
                                        <td className="p-6">
                                            <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-2 py-1 rounded uppercase">{t.category}</span>
                                        </td>
                                        <td className="p-6 font-black text-red-400">{formatCurrency(t.amount)}</td>
                                        <td className="p-6 text-center">
                                            <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ring-1 ring-inset ${t.status === 'pago'
                                                ? 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/30'
                                                : 'bg-amber-500/10 text-amber-500 ring-amber-500/30'
                                                }`}>
                                                {t.status}
                                            </span>
                                        </td>
                                        <td className="p-6 text-center">
                                            <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleOpenTransaction(t)}
                                                    className="p-2 text-[#808080] hover:text-[#5D7F38] bg-[#252525] hover:bg-[#5D7F38]/10 rounded-lg transition-colors"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setItemToDelete(t);
                                                        setIsDeleteModalOpen(true);
                                                    }}
                                                    className="p-2 text-[#808080] hover:text-red-500 bg-[#252525] hover:bg-red-500/10 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {otherFeesTransactions.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-16 text-center text-[#606060] font-bold italic">
                                            Nenhuma taxa encontrada nesta categoria.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <TransactionModal
                isOpen={isModalOpen}
                editingItem={editingItem}
                ledgers={ledgers}
                cards={cards}
                filterMonth={new Date().toISOString().slice(0, 7)}
                debtCalc={{ total: 0, part: 0, count: 1 }}
                feeTypes={feeTypes}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveTransaction}
                onEditingItemChange={setEditingItem}
                onDebtCalcChange={() => { }}
            />


            <DeleteConfirmModal
                isOpen={isDeleteModalOpen}
                item={itemToDelete}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirmDelete={handleDelete}
            />

            {/* Fee Type Delete Confirmation */}
            {feeTypeToDelete && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#1F1F1F] rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-white/5 animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-white mb-2">Excluir Categoria</h3>
                        <p className="text-sm text-[#808080] mb-6">
                            Deseja excluir a categoria "<span className="text-white font-bold">{feeTypeToDelete.name}</span>"?
                            As transações vinculadas não serão excluídas.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setFeeTypeToDelete(null)}
                                className="flex-1 px-4 py-3 text-[10px] font-black border border-white/5 rounded-xl text-[#808080] hover:bg-white/5 transition-all uppercase tracking-widest"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteFeeType}
                                className="flex-1 px-4 py-3 text-[10px] font-black bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all uppercase tracking-widest"
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
