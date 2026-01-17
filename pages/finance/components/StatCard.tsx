import React from 'react';

interface StatCardProps {
    title: string;
    value: string;
    subtext?: string;
    icon: any;
    colorClass: string;
    highlight?: boolean;
    onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    subtext,
    icon: Icon,
    colorClass,
    highlight,
    onClick
}) => {
    return (
        <div
            onClick={onClick}
            className={`p-6 rounded-2xl border flex flex-col h-full transition-all ${highlight
                    ? 'bg-gradient-to-br from-[#A3E635]/20 to-[#22C55E]/10 border-[#A3E635]/20'
                    : 'bg-[#1F1F1F] border-white/5 hover:border-white/10'
                } ${onClick ? 'cursor-pointer' : ''}`}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${highlight ? 'text-[#A3E635]' : 'text-[#808080]'
                        }`}>
                        {title}
                    </p>
                    <h3 className={`text-2xl font-black mt-1 ${highlight ? 'text-[#A3E635]' : 'text-white'
                        }`}>
                        {value}
                    </h3>
                    {subtext && (
                        <p className="text-[10px] font-bold mt-1 text-[#606060]">
                            {subtext}
                        </p>
                    )}
                </div>
                <div className={`p-3 rounded-xl ${colorClass || 'bg-[#2A2A2A] text-[#808080]'}`}>
                    <Icon size={20} />
                </div>
            </div>
        </div>
    );
};
