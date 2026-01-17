import React, { useMemo, useState } from 'react';
import { Transaction } from '../../../types';
import { formatCurrency } from '../../../constants';
import { ArrowLeft, TrendingUp, TrendingDown, Search } from 'lucide-react';

interface FinanceCategoryListProps {
    transactions: Transaction[];
    isConsolidated: boolean;
}

export const FinanceCategoryList: React.FC<FinanceCategoryListProps> = ({ transactions, isConsolidated }) => {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedType, setSelectedType] = useState<'income' | 'expense' | null>(null);

    const processData = (type: 'income' | 'expense') => {
        // 1. Filter by type
        const filtered = transactions.filter(t => t.type === type && t.status !== 'cancelado');

        // 2. Group by category
        const grouped: Record<string, number> = {};
        filtered.forEach(t => {
            const cat = t.category || 'Outros';
            grouped[cat] = (grouped[cat] || 0) + t.amount;
        });

        // 3. Convert to array
        let result = Object.entries(grouped).map(([name, value]) => ({ name, value }));

        // 4. Sort by value descending
        result.sort((a, b) => b.value - a.value);

        return result.filter(item => item.value > 0);
    };

    const incomeData = useMemo(() => processData('income'), [transactions]);
    const expenseData = useMemo(() => processData('expense'), [transactions]);

    // Filter transactions for the detail view
    const detailTransactions = useMemo(() => {
        if (!selectedCategory || !selectedType) return [];
        return transactions.filter(t =>
            t.type === selectedType &&
            t.status !== 'cancelado' &&
            (t.category || 'Outros') === selectedCategory
        ).sort((a, b) => b.amount - a.amount);
    }, [transactions, selectedCategory, selectedType]);

    if (selectedCategory && selectedType) {
        return (
            <div className="bg-[#1F1F1F] rounded-2xl border border-white/5 p-6 animate-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => { setSelectedCategory(null); setSelectedType(null); }}
                        className="p-2 hover:bg-[#2A2A2A] rounded-xl transition-colors text-[#808080] hover:text-white"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h3 className="text-xl font-black text-white">{selectedCategory}</h3>
                        <p className="text-xs font-bold text-[#808080] uppercase tracking-widest">
                            {selectedType === 'income' ? 'Receitas' : 'Despesas'} - Detalhamento
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="py-3 px-4 text-[10px] uppercase tracking-widest font-black text-[#808080]">Descrição</th>
                                <th className="py-3 px-4 text-[10px] uppercase tracking-widest font-black text-[#808080]">Método</th>
                                <th className="py-3 px-4 text-[10px] uppercase tracking-widest font-black text-[#808080]">Natureza</th>
                                <th className="py-3 px-4 text-[10px] uppercase tracking-widest font-black text-[#808080] text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {detailTransactions.map((t) => (
                                <tr key={t.id} className="hover:bg-[#2A2A2A] transition-colors">
                                    <td className="py-3 px-4 text-sm font-bold text-white">{t.description}</td>
                                    <td className="py-3 px-4 text-xs font-medium text-[#808080] capitalize">{t.method}</td>
                                    <td className="py-3 px-4 text-xs font-medium text-[#808080] capitalize">{t.nature}</td>
                                    <td className={`py-3 px-4 text-sm font-black text-right ${selectedType === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {formatCurrency(t.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-[#2A2A2A]">
                                <td colSpan={3} className="py-3 px-4 text-xs font-black uppercase text-[#808080] text-right">Total</td>
                                <td className={`py-3 px-4 text-sm font-black text-right ${selectedType === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {formatCurrency(detailTransactions.reduce((acc, t) => acc + t.amount, 0))}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        );
    }

    const CategoryCard = ({ title, data, type, icon: Icon, colorClass }: { title: string, data: { name: string, value: number }[], type: 'income' | 'expense', icon: any, colorClass: string }) => {
        if (data.length === 0) return null;

        const total = data.reduce((acc, item) => acc + item.value, 0);

        return (
            <div className="bg-[#1F1F1F] rounded-2xl border border-white/5 p-6 flex flex-col h-full">
                <div className="flex items-center gap-3 mb-6">
                    <div className={`p-2 rounded-xl ${type === 'income' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                        <Icon size={20} />
                    </div>
                    <div>
                        <h3 className="font-black text-white uppercase text-[11px] tracking-widest">{title}</h3>
                        <p className="text-xs font-bold text-[#808080]">{formatCurrency(total)}</p>
                    </div>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                    {data.map((item, index) => {
                        const percentage = (item.value / total) * 100;
                        return (
                            <div
                                key={item.name}
                                onClick={() => { setSelectedCategory(item.name); setSelectedType(type); }}
                                className="group cursor-pointer p-3 rounded-xl hover:bg-[#2A2A2A] border border-transparent hover:border-white/5 transition-all"
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-[#A0A0A0] group-hover:text-white">{item.name}</span>
                                    <span className={`text-xs font-black ${type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {formatCurrency(item.value)}
                                    </span>
                                </div>
                                <div className="w-full bg-[#2A2A2A] h-1.5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ease-out ${type === 'income' ? 'bg-emerald-500' : 'bg-red-500'}`}
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    if (incomeData.length === 0 && expenseData.length === 0) return null;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-bottom-2 duration-300">
            {incomeData.length > 0 && (
                <CategoryCard
                    title="Receitas por Categoria"
                    data={incomeData}
                    type="income"
                    icon={TrendingUp}
                    colorClass="text-emerald-500"
                />
            )}
            {expenseData.length > 0 && (
                <CategoryCard
                    title="Despesas por Categoria"
                    data={expenseData}
                    type="expense"
                    icon={TrendingDown}
                    colorClass="text-red-500"
                />
            )}
        </div>
    );
};
