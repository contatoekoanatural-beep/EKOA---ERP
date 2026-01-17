import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Transaction } from '../../../types';
import { formatCurrency } from '../../../constants';

interface FinanceChartsProps {
    transactions: Transaction[];
    isConsolidated: boolean;
}

const COLORS = [
    '#4F46E5', // indigo-600
    '#059669', // emerald-600
    '#D97706', // amber-600
    '#DC2626', // red-600
    '#7C3AED', // violet-600
    '#DB2777', // pink-600
    '#2563EB', // blue-600
    '#F59E0B', // amber-500
    '#10B981', // emerald-500
    '#6366F1', // indigo-500
    '#8B5CF6', // violet-500
    '#EC4899', // pink-500
    '#94A3B8', // slate-400 (Outros)
];

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
    if (percent < 0.05) return null; // Don't show label for small slices
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-[10px] font-bold">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

export const FinanceCharts: React.FC<FinanceChartsProps> = ({ transactions, isConsolidated }) => {

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

        // 5. Consolidated Logic: Show top 5, group rest
        if (isConsolidated && result.length > 5) {
            const top5 = result.slice(0, 5);
            const others = result.slice(5).reduce((acc, curr) => acc + curr.value, 0);
            result = [...top5];
            if (others > 0) {
                result.push({ name: 'Outros', value: others });
            }
        }

        return result.filter(item => item.value > 0);
    };

    const incomeData = useMemo(() => processData('income'), [transactions, isConsolidated]);
    const expenseData = useMemo(() => processData('expense'), [transactions, isConsolidated]);

    if (incomeData.length === 0 && expenseData.length === 0) return null;

    const ChartCard = ({ title, data }: { title: string, data: any[] }) => {
        if (data.length === 0) return null;

        return (
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 flex flex-col h-[400px]">
                <h3 className="font-black text-slate-800 uppercase text-[11px] tracking-widest mb-4">{title}</h3>
                <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={renderCustomizedLabel}
                                outerRadius={100}
                                innerRadius={60}
                                fill="#8884d8"
                                dataKey="value"
                                paddingAngle={2}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.name === 'Outros' ? '#94A3B8' : COLORS[index % COLORS.length]} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: number) => formatCurrency(value)}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}
                            />
                            <Legend
                                layout="vertical"
                                verticalAlign="middle"
                                align="right"
                                wrapperStyle={{ fontSize: '10px', fontWeight: 600, color: '#64748B' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-bottom-2 duration-300">
            {incomeData.length > 0 && <ChartCard title="Receitas por Categoria" data={incomeData} />}
            {expenseData.length > 0 && <ChartCard title="Despesas por Categoria" data={expenseData} />}
        </div>
    );
};
