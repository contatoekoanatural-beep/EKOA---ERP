import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Transaction } from '../../../types';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    item: Transaction | null;
    onClose: () => void;
    onConfirmDelete: (mode: 'ONLY_THIS' | 'ALL_RELATED') => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
    isOpen,
    item,
    onClose,
    onConfirmDelete,
}) => {
    if (!isOpen || !item) return null;

    // Check if this transaction has related items (recurrent or multiple installments)
    const isRecurrent = item.nature === 'recorrente';
    const isInstallment = item.nature === 'parcela' && (item.installmentsInfo?.total || 1) > 1;
    const hasRelated = isRecurrent || isInstallment;

    return (
        <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-[#1F1F1F] rounded-2xl p-10 w-full max-w-md shadow-2xl border border-white/10 animate-in zoom-in duration-200 text-center">
                <div className="p-5 bg-red-500/20 text-red-500 rounded-full mb-6 inline-block">
                    <AlertTriangle size={48} />
                </div>

                <h3 className="text-2xl font-black text-white mb-2">
                    Excluir Lançamento
                </h3>

                {hasRelated ? (
                    <>
                        <p className="text-[#808080] font-bold text-sm mb-8 leading-relaxed">
                            Este item possui vínculos. Como deseja proceder?
                        </p>

                        <div className="grid grid-cols-1 gap-3 w-full">
                            <button
                                onClick={() => onConfirmDelete('ALL_RELATED')}
                                className="w-full bg-red-600 text-white py-4 rounded-xl font-black text-[11px] uppercase shadow-lg shadow-red-500/20 hover:bg-red-700 transition-all"
                            >
                                Excluir TODAS as parcelas
                            </button>

                            <button
                                onClick={() => onConfirmDelete('ONLY_THIS')}
                                className="w-full bg-[#2A2A2A] text-white py-4 rounded-xl font-black text-[11px] uppercase hover:bg-[#333] transition-all border border-white/10"
                            >
                                Excluir apenas este mês
                            </button>

                            <button
                                onClick={onClose}
                                className="w-full bg-transparent text-[#808080] py-4 rounded-xl font-black text-[11px] uppercase hover:text-white transition-all"
                            >
                                Cancelar
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <p className="text-[#808080] font-bold text-sm mb-8 leading-relaxed">
                            Tem certeza que deseja excluir este lançamento?
                        </p>

                        <div className="grid grid-cols-1 gap-3 w-full">
                            <button
                                onClick={() => onConfirmDelete('ONLY_THIS')}
                                className="w-full bg-red-600 text-white py-4 rounded-xl font-black text-[11px] uppercase shadow-lg shadow-red-500/20 hover:bg-red-700 transition-all"
                            >
                                Excluir
                            </button>

                            <button
                                onClick={onClose}
                                className="w-full bg-[#2A2A2A] text-white py-4 rounded-xl font-black text-[11px] uppercase hover:bg-[#333] transition-all border border-white/10"
                            >
                                Cancelar
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
