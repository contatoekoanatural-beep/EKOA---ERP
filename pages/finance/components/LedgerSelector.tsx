import React from 'react';
import { User, Building2 } from 'lucide-react';
import { Ledger } from '../../../types';

interface LedgerSelectorProps {
    ledgers: Ledger[];
    selectedLedgerId: string;
    onLedgerChange: (ledgerId: string) => void;
}

export const LedgerSelector: React.FC<LedgerSelectorProps> = ({
    ledgers,
    selectedLedgerId,
    onLedgerChange,
}) => {
    return (
        <div className="flex bg-[#1F1F1F] rounded-xl p-1 border border-white/5">
            {ledgers.map(l => (
                <button
                    key={l.id}
                    onClick={() => onLedgerChange(l.id)}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 transition-all ${selectedLedgerId === l.id
                        ? l.type === 'PF'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-emerald-600 text-white shadow-md'
                        : 'text-[#808080] hover:bg-[#2A2A2A] hover:text-white'
                        }`}
                >
                    {l.type === 'PF' ? <User size={14} /> : <Building2 size={14} />}
                    {l.type}
                </button>
            ))}

            <div className="w-[1px] bg-white/10 mx-1"></div>

            <button
                onClick={() => onLedgerChange('consolidated')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 transition-all ${selectedLedgerId === 'consolidated'
                    ? 'bg-gradient-to-r from-indigo-600 to-emerald-600 text-white shadow-md'
                    : 'text-[#808080] hover:bg-[#2A2A2A] hover:text-white'
                    }`}
            >
                <div className="flex -space-x-1">
                    <div className="w-2 h-3 bg-indigo-400 rounded-sm"></div>
                    <div className="w-2 h-3 bg-emerald-400 rounded-sm"></div>
                </div>
                Consolidado
            </button>
        </div>
    );
};
