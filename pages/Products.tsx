import React, { useContext, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOperations } from '../contexts/OperationsContext';
import { useFinance } from '../contexts/FinanceContext';

import { Product, KitConfig, Warehouse } from '../types';
import { formatCurrency } from '../constants';
import { Plus, Edit2, Trash2, Package, ArrowLeft, CheckCircle, XCircle, Box, X, Building2, ShoppingBag } from 'lucide-react';

export const Products = () => {
    const { products, addProduct, updateProduct, deleteProduct, warehouses, addWarehouse, updateWarehouse, deleteWarehouse } = useOperations();
    const { transactions } = useFinance();

    const navigate = useNavigate();

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [warehouseForm, setWarehouseForm] = useState({ name: '' });
    const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);

    // Transfer State
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [transferData, setTransferData] = useState({
        fromId: '',
        toId: '',
        quantity: 0
    });

    const [isPurchasesModalOpen, setIsPurchasesModalOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<Product>>({
        name: '',
        active: true,
        unitPrice: 0,
        stock: 0,
        stockByWarehouse: {},
        kits: []
    });

    // New Kit State
    const [newKit, setNewKit] = useState<Partial<KitConfig>>({
        name: '',
        units: 3,
        price: 0
    });

    // Editing Kit State
    const [editingKitId, setEditingKitId] = useState<string | null>(null);
    const [kitEditData, setKitEditData] = useState<{ name: string; price: number }>({ name: '', price: 0 });

    const sortedProducts = useMemo(() => {
        return [...products].sort((a, b) => {
            // Active first, then by name
            if (a.active !== b.active) return a.active ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
    }, [products]);

    const handleOpenModal = (product?: Product) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                name: product.name,
                active: product.active,
                unitPrice: product.unitPrice || 0,
                stock: product.stock || 0,
                stockByWarehouse: product.stockByWarehouse || {},
                kits: product.kits || []
            });
        } else {
            setEditingProduct(null);
            setFormData({
                name: '',
                active: true,
                unitPrice: 0,
                stockByWarehouse: {},
                kits: []
            });
        }
        setNewKit({ name: '', units: 3, price: 0 });
        setIsModalOpen(true);
    };

    const handleAddKit = () => {
        if (!newKit.name || !newKit.units || !newKit.price) {
            alert("Preencha todos os campos do kit");
            return;
        }

        const kitToAdd: KitConfig = {
            kitId: Date.now().toString(),
            name: newKit.name,
            units: newKit.units,
            price: newKit.price
        };

        setFormData(prev => ({
            ...prev,
            kits: [...(prev.kits || []), kitToAdd]
        }));

        setNewKit({ name: '', units: 3, price: 0 });
    };

    const handleRemoveKit = (kitId: string) => {
        setFormData(prev => ({
            ...prev,
            kits: prev.kits?.filter(k => k.kitId !== kitId) || []
        }));
    };

    const handleStartEditKit = (kit: KitConfig) => {
        setEditingKitId(kit.kitId);
        setKitEditData({ name: kit.name, price: kit.price });
    };

    const handleSaveKitEdit = (kitId: string) => {
        setFormData(prev => ({
            ...prev,
            kits: prev.kits?.map(k =>
                k.kitId === kitId
                    ? { ...k, name: kitEditData.name, price: kitEditData.price }
                    : k
            ) || []
        }));
        setEditingKitId(null);
    };

    const handleCancelKitEdit = () => {
        setEditingKitId(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) {
            alert("Preencha o nome do produto");
            return;
        }

        if (editingProduct) {
            await updateProduct({
                ...editingProduct,
                name: formData.name!,
                active: formData.active ?? true,
                unitPrice: formData.unitPrice || 0,
                stock: formData.stock || 0,
                kits: formData.kits || []
            });
        } else {
            await addProduct({
                name: formData.name,
                active: formData.active ?? true,
                unitPrice: formData.unitPrice || 0,
                stock: formData.stock || 0,
                kits: formData.kits || []
            });
        }
        setIsModalOpen(false);
    };

    const handleDelete = async (productId: string) => {
        if (window.confirm("Tem certeza que deseja excluir este produto?")) {
            await deleteProduct(productId);
        }
    };

    const handleToggleActive = async (product: Product) => {
        await updateProduct({ ...product, active: !product.active });
    };

    // Auto-generate kit name recommendation
    const suggestKitName = (units: number) => {
        return `Kit ${units} Unidades`;
    };

    const calculateSavings = (unitPrice: number, kitPrice: number, units: number) => {
        if (!unitPrice || !kitPrice || !units) return 0;
        const regularPrice = unitPrice * units;
        return Math.max(0, regularPrice - kitPrice);
    };

    // Calculate Unassigned Stock safely
    const totalStock: number = formData.stock || 0;
    const assignedStock: number = (Object.values(formData.stockByWarehouse || {}) as number[]).reduce((acc: number, curr: number) => acc + curr, 0);
    const unassignedStock: number = Math.max(0, (totalStock as number) - (assignedStock as number));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/vendas')}
                        className="p-2 hover:bg-white/5 rounded-xl text-[#808080] transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Gestão de Produtos</h2>
                        <p className="text-sm text-[#808080]">Cadastre produtos e seus kits promocionais</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsWarehouseModalOpen(true)}
                        className="bg-[#252525] text-[#A0A0A0] border border-white/5 px-4 py-2 rounded-lg hover:bg-[#303030] flex items-center gap-2 font-bold transition-all"
                    >
                        <Building2 size={18} />
                        Galpões
                    </button>
                    <button
                        onClick={() => setIsPurchasesModalOpen(true)}
                        className="bg-[#252525] text-[#A0A0A0] border border-white/5 px-4 py-2 rounded-lg hover:bg-[#303030] flex items-center gap-2 font-bold transition-all"
                    >
                        <ShoppingBag size={18} />
                        Compras
                    </button>
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-[#5D7F38] text-white px-4 py-2 rounded-lg hover:bg-[#4a662c] flex items-center gap-2 font-bold shadow-lg shadow-[#5D7F38]/20"
                    >
                        <Plus size={18} />
                        Novo Produto
                    </button>
                </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedProducts.map((product) => (
                    <div
                        key={product.id}
                        className={`bg-[#1F1F1F] rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${product.active ? 'border-white/5' : 'border-white/10 opacity-60'
                            }`}
                    >
                        <div className="p-5">
                            {/* Product Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2.5 rounded-xl ${product.active ? 'bg-[#5D7F38]/10 text-[#5D7F38]' : 'bg-[#252525] text-[#606060]'}`}>
                                        <Package size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white">{product.name}</h3>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${product.active ? 'text-emerald-400' : 'text-[#606060]'}`}>
                                                {product.active ? 'Ativo' : 'Inativo'}
                                            </span>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-[#606060]">•</span>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${(product.stock || 0) > 0 ? 'text-[#5D7F38]' : 'text-red-400'}`}>
                                                {(product.stock || 0)} em estoque
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Pricing Info */}
                            <div className="space-y-3">
                                <div className="bg-[#252525] rounded-xl p-3 flex justify-between items-center">
                                    <span className="text-[10px] font-black text-[#808080] uppercase tracking-widest">Preço Unitário</span>
                                    <span className="text-lg font-black text-white">{formatCurrency(product.unitPrice || 0)}</span>
                                </div>

                                {/* Kits Summary */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Box size={14} className="text-[#5D7F38]" />
                                        <span className="text-[10px] font-black text-[#5D7F38] uppercase tracking-widest">
                                            Kits Disponíveis ({product.kits?.length || 0})
                                        </span>
                                    </div>

                                    <div className="grid gap-2">
                                        {product.kits?.slice(0, 3).map(kit => (
                                            <div key={kit.kitId || Math.random()} className="flex justify-between items-center bg-[#5D7F38]/10 p-2 rounded-lg border border-[#5D7F38]/20">
                                                <span className="text-[10px] font-bold text-[#A0A0A0]">{kit.name}</span>
                                                <span className="text-[11px] font-black text-[#5D7F38]">{formatCurrency(kit.price)}</span>
                                            </div>
                                        ))}
                                        {product.kits && product.kits.length > 3 && (
                                            <p className="text-[10px] text-center text-[#606060] font-bold italic">
                                                + {product.kits.length - 3} outros kits
                                            </p>
                                        )}
                                        {(!product.kits || product.kits.length === 0) && (
                                            <p className="text-[10px] text-[#606060] italic pl-2">Nenhum kit configurado.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions Footer */}
                        <div className="px-5 py-3 bg-[#252525] border-t border-white/5 flex items-center justify-end gap-2">
                            <button
                                onClick={() => handleToggleActive(product)}
                                className={`p-2 rounded-lg transition-colors ${product.active
                                    ? 'hover:bg-red-500/10 text-red-400 hover:text-red-500'
                                    : 'hover:bg-emerald-500/10 text-emerald-400 hover:text-emerald-500'
                                    }`}
                                title={product.active ? 'Desativar' : 'Ativar'}
                            >
                                {product.active ? <XCircle size={18} /> : <CheckCircle size={18} />}
                            </button>
                            <button
                                onClick={() => handleOpenModal(product)}
                                className="p-2 hover:bg-white/5 rounded-lg text-[#808080] transition-colors"
                                title="Editar"
                            >
                                <Edit2 size={18} />
                            </button>
                            <button
                                onClick={() => handleDelete(product.id)}
                                className="p-2 hover:bg-red-500/10 rounded-lg text-red-400 transition-colors"
                                title="Excluir"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}

                {sortedProducts.length === 0 && (
                    <div className="col-span-full bg-[#1F1F1F] rounded-2xl border border-white/5 p-16 text-center">
                        <div className="bg-[#252525] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Package size={32} className="text-[#606060]" />
                        </div>
                        <p className="text-[#808080] font-bold">Nenhum produto cadastrado</p>
                        <p className="text-sm text-[#606060] mt-1">Clique em "Novo Produto" para começar</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
                        <div className="bg-[#1F1F1F] rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in duration-200 border border-white/5">
                            <div className="p-6 border-b border-white/5 flex justify-between items-center sticky top-0 bg-[#1F1F1F] z-10">
                                <div>
                                    <h3 className="text-xl font-black text-white">
                                        {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                                    </h3>
                                    <p className="text-xs font-bold text-[#808080] uppercase tracking-widest mt-1">
                                        Configure preços e kits
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="text-[#808080] hover:text-red-500 bg-[#252525] p-2 rounded-xl transition-all"
                                >
                                    <Plus size={24} className="rotate-45" />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="p-6 space-y-6">
                                {/* Product Name */}
                                <div>
                                    <label className="block text-[10px] font-black text-[#808080] uppercase mb-1.5 tracking-widest">
                                        Nome do Produto
                                    </label>
                                    <input
                                        required
                                        className="w-full border border-white/5 rounded-2xl p-3.5 text-sm font-bold bg-[#252525] focus:border-[#5D7F38] outline-none transition-all text-white placeholder:text-[#606060]"
                                        value={formData.name || ''}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ex: Óleo de Copaíba 30ml"
                                    />
                                </div>

                                {/* Stock - Warehouse Breakdown & Manual Adjustment */}
                                <div className="bg-[#252525] p-4 rounded-2xl border border-white/5 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <label className="block text-[10px] font-black text-[#808080] uppercase tracking-widest">
                                            Estoque por Galpão (Total: {formData.stock})
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setIsTransferModalOpen(true)}
                                            className="text-[10px] uppercase font-black text-[#5D7F38] hover:text-[#6d9445] bg-[#5D7F38]/10 hover:bg-[#5D7F38]/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                        >
                                            <ArrowLeft size={12} className="rotate-180" />
                                            Transferir Estoque
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        {/* List Active Warehouses */}
                                        {warehouses.filter(w => w.active).map(w => {
                                            const qty = (formData.stockByWarehouse || {})[w.id] || 0;
                                            return (
                                                <div key={w.id} className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-[#A0A0A0] w-1/3 truncate" title={w.name}>{w.name}</span>
                                                    <input
                                                        readOnly
                                                        disabled
                                                        type="number"
                                                        className="flex-1 border border-white/5 rounded-xl p-2 text-xs font-bold bg-[#1F1F1F] text-[#A0A0A0] outline-none"
                                                        value={qty}
                                                    />
                                                </div>
                                            );
                                        })}

                                        {/* Unassigned / Legacy Stock */}

                                    </div>
                                    <p className="text-[9px] text-[#606060] italic">O estoque é definido por lançamentos de compra e venda. Use "Transferir" para mover entre galpões.</p>
                                </div>

                                {/* Unit Price */}
                                <div>
                                    <label className="block text-[10px] font-black text-[#808080] uppercase mb-1.5 tracking-widest">
                                        Preço Unitário (R$)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="w-full border border-white/5 rounded-2xl p-3.5 text-sm font-bold bg-[#252525] focus:border-[#5D7F38] outline-none transition-all text-white placeholder:text-[#606060]"
                                        value={formData.unitPrice || ''}
                                        onChange={e => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
                                        placeholder="197.00"
                                    />
                                </div>

                                {/* Kits Manager Section */}
                                <div className="bg-[#252525] rounded-2xl p-5 border border-white/5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Box size={16} className="text-[#5D7F38]" />
                                        <span className="text-[10px] font-black text-[#5D7F38] uppercase tracking-widest">
                                            Gerenciar Kits
                                        </span>
                                    </div>

                                    {/* Add New Kit Form */}
                                    <div className="grid grid-cols-12 gap-2 mb-4 items-end">
                                        <div className="col-span-5">
                                            <label className="block text-[9px] font-black text-[#808080] uppercase mb-1">Nome/Qtd</label>
                                            <input
                                                placeholder="Ex: Kit 3un"
                                                className="w-full p-2 rounded-xl text-xs font-bold border border-white/5 outline-none focus:border-[#5D7F38] bg-[#1F1F1F] text-white placeholder:text-[#606060]"
                                                value={newKit.name}
                                                onChange={e => setNewKit({ ...newKit, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-[9px] font-black text-[#808080] uppercase mb-1">Unid.</label>
                                            <input
                                                type="number"
                                                min="2"
                                                className="w-full p-2 rounded-xl text-xs font-bold border border-white/5 outline-none focus:border-[#5D7F38] bg-[#1F1F1F] text-white"
                                                value={newKit.units}
                                                onChange={e => {
                                                    const units = parseInt(e.target.value) || 0;
                                                    setNewKit(prev => ({ ...prev, units: units, name: suggestKitName(units) }));
                                                }}
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <label className="block text-[9px] font-black text-[#808080] uppercase mb-1">Preço (R$)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="w-full p-2 rounded-xl text-xs font-bold border border-white/5 outline-none focus:border-[#5D7F38] bg-[#1F1F1F] text-white"
                                                value={newKit.price}
                                                onChange={e => setNewKit({ ...newKit, price: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <button
                                                type="button"
                                                onClick={handleAddKit}
                                                className="w-full p-2 bg-[#5D7F38] text-white rounded-xl flex items-center justify-center hover:bg-[#4a662c] transition-colors"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Kits List */}
                                    <div className="space-y-2">
                                        {formData.kits?.map(kit => {
                                            const savings = calculateSavings(formData.unitPrice || 0, (editingKitId === kit.kitId ? kitEditData.price : kit.price), kit.units);
                                            const isEditing = editingKitId === kit.kitId;

                                            return (
                                                <div key={kit.kitId || Math.random()} className={`p-3 rounded-xl border transition-all ${isEditing ? 'bg-[#5D7F38]/5 border-[#5D7F38]/30' : 'bg-[#1F1F1F] border-white/5'
                                                    } flex justify-between items-center group`}>
                                                    {isEditing ? (
                                                        <div className="flex-1 flex flex-col gap-2 mr-4">
                                                            <input
                                                                className="w-full bg-[#252525] border border-[#5D7F38]/30 rounded-lg p-2 text-xs font-bold text-white outline-none"
                                                                value={kitEditData.name}
                                                                onChange={e => setKitEditData({ ...kitEditData, name: e.target.value })}
                                                                autoFocus
                                                            />
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-black text-[#808080] uppercase">Preço R$</span>
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    className="flex-1 bg-[#252525] border border-[#5D7F38]/30 rounded-lg p-2 text-xs font-bold text-white outline-none"
                                                                    value={kitEditData.price}
                                                                    onChange={e => setKitEditData({ ...kitEditData, price: parseFloat(e.target.value) || 0 })}
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <p className="text-xs font-black text-white">{kit.name}</p>
                                                            <div className="flex gap-2 text-[10px] text-[#808080] mt-0.5">
                                                                <span>{kit.units} unidades</span>
                                                                <span>•</span>
                                                                <span className="font-bold text-[#5D7F38]">{formatCurrency(kit.price)}</span>
                                                                {savings > 0 && (
                                                                    <span className="text-emerald-400 font-bold ml-1">(-{formatCurrency(savings)})</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="flex gap-1">
                                                        {isEditing ? (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={handleCancelKitEdit}
                                                                    className="p-1.5 text-[#808080] hover:bg-white/5 rounded-lg transition-colors"
                                                                    title="Cancelar"
                                                                >
                                                                    <XCircle size={16} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSaveKitEdit(kit.kitId)}
                                                                    className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                                                    title="Salvar"
                                                                >
                                                                    <CheckCircle size={16} />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleStartEditKit(kit)}
                                                                    className="p-1.5 text-[#606060] hover:bg-white/5 hover:text-white rounded-lg transition-colors"
                                                                    title="Editar Kit"
                                                                >
                                                                    <Edit2 size={14} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveKit(kit.kitId)}
                                                                    className="p-1.5 text-[#606060] hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors"
                                                                    title="Excluir Kit"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {(!formData.kits || formData.kits.length === 0) && (
                                            <div className="text-center py-4 text-xs text-[#606060] italic">
                                                Nenhum kit adicionado.
                                            </div>
                                        )}
                                    </div>
                                </div>


                                {/* Actions */}
                                <div className="flex gap-3 pt-4 border-t border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-6 py-3.5 text-xs font-black border border-white/5 rounded-2xl text-[#808080] hover:bg-white/5 transition-all uppercase tracking-widest"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-[2] px-6 py-3.5 text-xs font-black bg-[#5D7F38] text-white rounded-2xl shadow-xl shadow-[#5D7F38]/30 hover:bg-[#4a662c] transition-all uppercase tracking-widest"
                                    >
                                        Salvar Produto
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {
                isWarehouseModalOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                        <div className="bg-[#1F1F1F] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-white/5">
                            <div className="p-6 border-b border-white/5 flex justify-between items-center">
                                <h3 className="text-xl font-black text-white">Gestão de Galpões</h3>
                                <button onClick={() => setIsWarehouseModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-[#808080] hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* List */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-black uppercase text-[#808080] tracking-widest">Galpões Cadastrados</h4>
                                    {warehouses.length === 0 && <p className="text-sm text-[#606060] italic">Nenhum galpão cadastrado.</p>}
                                    {warehouses.map(w => (
                                        <div key={w.id} className="flex justify-between items-center p-3 bg-[#252525] rounded-xl border border-white/5">
                                            <span className="font-bold text-white">{w.name}</span>
                                            <button onClick={() => { if (window.confirm('Excluir galpão?')) deleteWarehouse(w.id) }} className="p-2 text-[#808080] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* Add New */}
                                <div className="pt-6 border-t border-white/5">
                                    <h4 className="text-xs font-black uppercase text-[#808080] tracking-widest mb-3">Novo Galpão</h4>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Nome do Galpão (ex: Sede SP)"
                                            className="flex-1 bg-[#252525] border border-white/5 rounded-xl p-3 font-bold text-sm outline-none focus:border-[#5D7F38] transition-all text-white placeholder:text-[#606060]"
                                            value={warehouseForm.name}
                                            onChange={e => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                                        />
                                        <button
                                            onClick={async () => {
                                                if (!warehouseForm.name) return;
                                                await addWarehouse(warehouseForm);
                                                setWarehouseForm({ name: '' });
                                            }}
                                            className="bg-[#5D7F38] text-white px-4 rounded-xl font-bold hover:bg-[#4a662c] transition-colors"
                                        >
                                            <Plus size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Transfer Stock Modal */}
            {
                isTransferModalOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
                        <div className="bg-[#1F1F1F] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-white/5">
                            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#252525]">
                                <div>
                                    <h3 className="text-xl font-black text-white">Transferir Estoque</h3>
                                    <p className="text-xs text-[#808080] font-bold mt-1">Mova unidades entre galpões</p>
                                </div>
                                <button onClick={() => setIsTransferModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-[#808080] hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Source & Dest */}
                                <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
                                    {/* From */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-[#808080] tracking-widest">Origem</label>
                                        <select
                                            className="w-full bg-[#252525] border border-white/5 rounded-xl p-2.5 text-xs font-bold outline-none focus:border-[#5D7F38] text-white"
                                            value={transferData.fromId}
                                            onChange={e => setTransferData({ ...transferData, fromId: e.target.value })}
                                        >
                                            <option value="">Selecione...</option>

                                            {warehouses.filter(w => w.active).map(w => (
                                                <option key={w.id} value={w.id}>{w.name} ({(formData.stockByWarehouse || {})[w.id] || 0})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="pt-4 text-[#606060]">
                                        <ArrowLeft size={16} className="rotate-180" />
                                    </div>

                                    {/* To */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-[#808080] tracking-widest">Destino</label>
                                        <select
                                            className="w-full bg-[#252525] border border-white/5 rounded-xl p-2.5 text-xs font-bold outline-none focus:border-[#5D7F38] text-white"
                                            value={transferData.toId}
                                            onChange={e => setTransferData({ ...transferData, toId: e.target.value })}
                                        >
                                            <option value="">Selecione...</option>
                                            {warehouses.filter(w => w.active).map(w => (
                                                <option key={w.id} value={w.id}>{w.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Quantity */}
                                <div>
                                    <label className="text-[10px] font-black uppercase text-[#808080] tracking-widest mb-1.5 block">Quantidade a Transferir</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-full bg-[#252525] border border-white/5 rounded-xl p-3 font-black text-center text-lg outline-none focus:border-[#5D7F38] text-white"
                                        value={transferData.quantity || ''}
                                        onChange={e => setTransferData({ ...transferData, quantity: parseInt(e.target.value) })}
                                    />
                                </div>

                                {/* Action */}
                                <button
                                    onClick={() => {
                                        const { fromId, toId, quantity } = transferData;
                                        if (!fromId || !toId || !quantity || quantity <= 0) return alert('Preencha todos os campos corretamente.');
                                        if (fromId === toId) return alert('Origem e destino devem ser diferentes.');

                                        const currentStockMap = { ...(formData.stockByWarehouse || {}) };

                                        // Validate Source Stock
                                        const sourceStock = currentStockMap[fromId] || 0;
                                        if (quantity > sourceStock) return alert('Quantidade indisponível na origem.');

                                        // Execution Logic: Warehouse to Warehouse
                                        currentStockMap[fromId] = sourceStock - quantity;
                                        currentStockMap[toId] = (currentStockMap[toId] || 0) + quantity;

                                        setFormData({ ...formData, stockByWarehouse: currentStockMap });
                                        setIsTransferModalOpen(false);
                                        setTransferData({ fromId: '', toId: '', quantity: 0 });
                                    }}
                                    className="w-full bg-[#5D7F38] text-white py-4 rounded-xl font-bold hover:bg-[#4a662c] transition-colors shadow-lg shadow-[#5D7F38]/20"
                                >
                                    Confirmar Transferência
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Purchases Modal */}
            {
                isPurchasesModalOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                        <div className="bg-[#1F1F1F] w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-white/5">
                            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#252525]">
                                <div>
                                    <h3 className="text-xl font-black text-white">Histórico de Compras</h3>
                                    <p className="text-xs text-[#808080] font-bold mt-1">Lotes e entradas de estoque (via Financeiro)</p>
                                </div>
                                <button onClick={() => setIsPurchasesModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-[#808080] hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr>
                                            <th className="p-3 text-[10px] font-black uppercase text-[#808080] tracking-widest border-b border-white/5">Data</th>
                                            <th className="p-3 text-[10px] font-black uppercase text-[#808080] tracking-widest border-b border-white/5">Lote / ID</th>
                                            <th className="p-3 text-[10px] font-black uppercase text-[#808080] tracking-widest border-b border-white/5">Produto</th>
                                            <th className="p-3 text-[10px] font-black uppercase text-[#808080] tracking-widest border-b border-white/5">Galpão</th>
                                            <th className="p-3 text-right text-[10px] font-black uppercase text-[#808080] tracking-widest border-b border-white/5">Qtd</th>
                                            <th className="p-3 text-right text-[10px] font-black uppercase text-[#808080] tracking-widest border-b border-white/5">Total</th>
                                            <th className="p-3 text-right text-[10px] font-black uppercase text-[#808080] tracking-widest border-b border-white/5">Unt.</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {transactions
                                            .filter(t => t.category === 'Estoque')
                                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                            .map(t => {
                                                const prod = products.find(p => p.id === t.productId);
                                                const warehouse = warehouses.find(w => w.id === t.warehouseId);
                                                const unitValue = (t.amount || 0) / (t.productQuantity || 1);

                                                return (
                                                    <tr key={t.id} className="hover:bg-white/5 transition-colors">
                                                        <td className="p-3 border-b border-white/5 font-bold text-[#A0A0A0] text-xs text-nowrap">
                                                            {new Date(t.date).toLocaleDateString('pt-BR')}
                                                        </td>
                                                        <td className="p-3 border-b border-white/5 font-bold text-white text-xs">
                                                            {t.batchName || <span className="text-[#606060] italic">-</span>}
                                                        </td>
                                                        <td className="p-3 border-b border-white/5 font-bold text-white">
                                                            {prod ? prod.name : <span className="text-[#606060] italic">Excluído</span>}
                                                        </td>
                                                        <td className="p-3 border-b border-white/5 font-bold text-[#A0A0A0] text-xs">
                                                            {warehouse ? warehouse.name : <span className="text-[#606060] italic">-</span>}
                                                        </td>
                                                        <td className="p-3 text-right border-b border-white/5 font-black text-white">
                                                            {t.productQuantity || 0}
                                                        </td>
                                                        <td className="p-3 text-right border-b border-white/5 font-bold text-[#A0A0A0] text-xs">
                                                            {formatCurrency(t.amount)}
                                                        </td>
                                                        <td className="p-3 text-right border-b border-white/5 font-bold text-emerald-400 text-xs">
                                                            {formatCurrency(unitValue)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        {transactions.filter(t => t.category === 'Estoque').length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="p-8 text-center text-[#606060] italic text-xs">
                                                    Nenhuma compra registrada no financeiro.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
