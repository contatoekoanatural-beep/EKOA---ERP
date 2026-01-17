import React, { useRef, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { formatMonthDisplay } from '../constants';

interface MonthNavigatorProps {
    filterStartMonth: string;
    filterEndMonth: string;
    onNavigate: (direction: 'prev' | 'next') => void;
    onSetPreset: (preset: string) => void;
    onSetStartMonth: (month: string) => void;
    onSetEndMonth: (month: string) => void;
}

export const MonthNavigator: React.FC<MonthNavigatorProps> = ({
    filterStartMonth,
    filterEndMonth,
    onNavigate,
    onSetPreset,
    onSetStartMonth,
    onSetEndMonth,
}) => {
    const [showMonthPresets, setShowMonthPresets] = useState(false);
    const monthPresetRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (monthPresetRef.current && !monthPresetRef.current.contains(event.target as Node)) {
                setShowMonthPresets(false);
            }
        };

        if (showMonthPresets) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMonthPresets]);

    const isRangeFilter = filterStartMonth !== filterEndMonth;

    const filterDisplayText = isRangeFilter
        ? `${formatMonthDisplay(filterStartMonth)} - ${formatMonthDisplay(filterEndMonth)}`
        : formatMonthDisplay(filterStartMonth);

    const handlePresetClick = (preset: string) => {
        onSetPreset(preset);
        setShowMonthPresets(false);
    };

    return (
        <div className="flex items-center bg-[#1F1F1F] border border-white/5 rounded-xl">
            <button
                onClick={() => onNavigate('prev')}
                className="p-2.5 hover:bg-[#2A2A2A] transition-colors border-r border-white/5 rounded-l-xl"
                title="Mês anterior"
            >
                <ChevronLeft size={18} className="text-[#808080]" />
            </button>

            <div ref={monthPresetRef} className="relative">
                <button
                    onClick={() => setShowMonthPresets(!showMonthPresets)}
                    className="px-4 py-2 text-sm font-black text-white flex items-center gap-2 hover:bg-[#2A2A2A] transition-colors min-w-[140px] justify-center"
                >
                    {filterDisplayText}
                    <ChevronDown
                        size={14}
                        className={`text-[#808080] transition-transform ${showMonthPresets ? 'rotate-180' : ''}`}
                    />
                </button>

                {showMonthPresets && (
                    <div className="absolute top-full left-0 mt-1 bg-[#1F1F1F] border border-white/10 rounded-xl shadow-xl z-50 min-w-[240px] py-2 animate-in fade-in slide-in-from-top-2 duration-150">
                        <p className="px-4 py-1 text-[10px] font-black text-[#808080] uppercase tracking-wider">Atalhos</p>
                        <button
                            onClick={() => handlePresetClick('current')}
                            className="w-full px-4 py-2 text-left text-sm font-bold text-white hover:bg-[#2A2A2A] transition-colors"
                        >
                            Este mês
                        </button>
                        <button
                            onClick={() => handlePresetClick('last')}
                            className="w-full px-4 py-2 text-left text-sm font-bold text-white hover:bg-[#2A2A2A] transition-colors"
                        >
                            Mês anterior
                        </button>
                        <button
                            onClick={() => handlePresetClick('last3')}
                            className="w-full px-4 py-2 text-left text-sm font-bold text-white hover:bg-[#2A2A2A] transition-colors"
                        >
                            Últimos 3 meses
                        </button>
                        <button
                            onClick={() => handlePresetClick('last6')}
                            className="w-full px-4 py-2 text-left text-sm font-bold text-white hover:bg-[#2A2A2A] transition-colors"
                        >
                            Últimos 6 meses
                        </button>
                        <button
                            onClick={() => handlePresetClick('year')}
                            className="w-full px-4 py-2 text-left text-sm font-bold text-white hover:bg-[#2A2A2A] transition-colors"
                        >
                            Ano inteiro ({new Date().getFullYear()})
                        </button>

                        <hr className="my-2 border-white/10" />

                        <p className="px-4 py-1 text-[10px] font-black text-[#808080] uppercase tracking-wider">Período Personalizado</p>
                        <div className="px-4 py-2 space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-[#808080] mb-1">Mês Início</label>
                                <input
                                    type="month"
                                    className="w-full bg-[#2A2A2A] border border-white/10 rounded-lg px-3 py-1.5 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                    value={filterStartMonth}
                                    min="2026-01"
                                    onChange={e => onSetStartMonth(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-[#808080] mb-1">Mês Final</label>
                                <input
                                    type="month"
                                    className="w-full bg-[#2A2A2A] border border-white/10 rounded-lg px-3 py-1.5 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                    value={filterEndMonth}
                                    min={filterStartMonth}
                                    onChange={e => onSetEndMonth(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={() => setShowMonthPresets(false)}
                                className="w-full bg-brand-600 text-white py-2 rounded-lg text-xs font-black uppercase hover:bg-brand-700 transition-colors"
                            >
                                Aplicar Filtro
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <button
                onClick={() => onNavigate('next')}
                className="p-2.5 hover:bg-[#2A2A2A] transition-colors border-l border-white/5 rounded-r-xl"
                title="Próximo mês"
            >
                <ChevronRight size={18} className="text-[#808080]" />
            </button>
        </div>
    );
};
