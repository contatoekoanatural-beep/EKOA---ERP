// CardsTab - Dark Theme Applied v6 - Using inline styles for reliability
import React from 'react';
import {
    CreditCard, Edit2, Trash2, Plus, AlertTriangle,
    User, Building2, Check, Eye
} from 'lucide-react';
import { formatCurrency } from '../../../constants';
import { CreditCard as CreditCardType, Ledger, Transaction } from '../../../types';
import { FinanceTab } from '../constants';

interface CardsTabProps {
    filteredCards: CreditCardType[];
    allCards: CreditCardType[];
    ledgers: Ledger[];
    currentMonthTransactions: Transaction[];
    filterMonth: string;
    selectedLedgerId: string;
    getCardUsage: (cardId: string) => number;
    onOpenCardModal: (card?: CreditCardType) => void;
    onUpdateCard: (card: CreditCardType) => Promise<void>;
    onDeleteCard: (id: string) => Promise<void>;
    onSetSelectedCardId: (id: string) => void;
    onSetActiveTab: (tab: FinanceTab) => void;
    onUpdateTransaction: (t: Transaction) => Promise<void>;
}

export const CardsTab: React.FC<CardsTabProps> = ({
    filteredCards,
    allCards,
    ledgers,
    currentMonthTransactions,
    filterMonth,
    selectedLedgerId,
    getCardUsage,
    onOpenCardModal,
    onUpdateCard,
    onDeleteCard,
    onSetSelectedCardId,
    onSetActiveTab,
    onUpdateTransaction,
}) => {
    const getCardMonthlyInvoice = (cardId: string) =>
        currentMonthTransactions
            .filter(t => t.cardId === cardId && t.method === 'cartao')
            .reduce((acc, t) => acc + t.amount, 0);

    const isCardInvoicePaid = (cardId: string) => {
        const txs = currentMonthTransactions.filter(t => t.cardId === cardId && t.method === 'cartao');
        return txs.length > 0 && txs.every(t => t.status === 'pago');
    };

    const markInvoicePaid = async (cardId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const txs = currentMonthTransactions.filter(t => t.cardId === cardId && t.method === 'cartao' && t.status !== 'pago');
        for (const tx of txs) await onUpdateTransaction({ ...tx, status: 'pago' });
    };

    const totalCardsInvoice = filteredCards.reduce((acc, card) => acc + getCardMonthlyInvoice(card.id), 0);
    const unclassifiedCards = allCards.filter(c => !c.ledgerId);

    // Dark theme color palette
    const colors = {
        cardBg: '#1A1A1A',
        cardBorder: 'rgba(255,255,255,0.1)',
        cardBorderWarning: 'rgba(245,158,11,0.3)',
        headerBg: '#1F1F1F',
        textPrimary: '#FFFFFF',
        textSecondary: '#808080',
        textMuted: '#606060',
        brandPrimary: '#0ea5e9',
        brandBg: 'rgba(14,165,233,0.2)',
        successBg: 'rgba(16,185,129,0.2)',
        successText: '#34D399',
        warningBg: 'rgba(245,158,11,0.2)',
        warningText: '#F59E0B',
        dangerBg: 'rgba(239,68,68,0.2)',
        dangerText: '#EF4444',
        purpleBg: 'rgba(139,92,246,0.2)',
        purpleText: '#A78BFA',
    };

    const CardItem = ({ card, isUnclassified = false }: { card: CreditCardType; isUnclassified?: boolean }) => {
        const used = getCardUsage(card.id);
        const pct = card.limit > 0 ? (used / card.limit) * 100 : 0;
        const isOver = used > card.limit;
        const monthlyInvoice = getCardMonthlyInvoice(card.id);
        const invoicePaid = isCardInvoicePaid(card.id);
        const ledger = ledgers.find(l => l.id === card.ledgerId);

        return (
            <div
                style={{
                    backgroundColor: colors.cardBg,
                    borderRadius: '1rem',
                    border: `1px solid ${isUnclassified ? colors.cardBorderWarning : colors.cardBorder}`,
                    transition: 'all 0.2s'
                }}
            >
                {/* Card Header */}
                <div style={{ padding: '1.25rem', borderBottom: `1px solid ${colors.cardBorder}` }}>
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div
                                style={{
                                    padding: '0.625rem',
                                    borderRadius: '0.75rem',
                                    backgroundColor: isOver ? colors.dangerBg : isUnclassified ? colors.warningBg : colors.brandBg,
                                    color: isOver ? colors.dangerText : isUnclassified ? colors.warningText : colors.brandPrimary
                                }}
                            >
                                <CreditCard size={18} />
                            </div>
                            <div>
                                <p style={{ fontWeight: 900, color: colors.textPrimary, fontSize: '0.875rem' }}>{card.name}</p>
                                <p style={{ fontSize: '9px', fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Fecha: {card.closingDay} • Vence: {card.dueDay}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-1">
                            <button
                                onClick={(e) => { e.stopPropagation(); onOpenCardModal(card); }}
                                style={{ padding: '0.375rem', color: colors.textMuted, transition: 'color 0.2s' }}
                                className="hover:text-sky-500"
                                title="Editar"
                            >
                                <Edit2 size={14} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); if (window.confirm("Excluir cartão?")) onDeleteCard(card.id); }}
                                style={{ padding: '0.375rem', color: colors.textMuted, transition: 'color 0.2s' }}
                                className="hover:text-red-500"
                                title="Excluir"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Card Body */}
                <div style={{ padding: '1.25rem' }} className="space-y-4">
                    {/* Invoice */}
                    <div>
                        <p style={{ fontSize: '9px', fontWeight: 900, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                            Fatura do Mês
                        </p>
                        <div className="flex items-center gap-2">
                            <span style={{ fontSize: '1.25rem', fontWeight: 900, color: invoicePaid ? colors.successText : colors.purpleText }}>
                                {formatCurrency(monthlyInvoice)}
                            </span>
                            {monthlyInvoice > 0 && (
                                invoicePaid ? (
                                    <span style={{
                                        fontSize: '8px', fontWeight: 900, textTransform: 'uppercase',
                                        padding: '0.125rem 0.5rem', borderRadius: '9999px',
                                        backgroundColor: colors.successBg, color: colors.successText,
                                        display: 'flex', alignItems: 'center', gap: '0.25rem'
                                    }}>
                                        <Check size={10} /> Pago
                                    </span>
                                ) : (
                                    <button
                                        onClick={(e) => markInvoicePaid(card.id, e)}
                                        style={{
                                            fontSize: '8px', fontWeight: 900, textTransform: 'uppercase',
                                            padding: '0.125rem 0.5rem', borderRadius: '9999px',
                                            backgroundColor: '#7C3AED', color: '#FFFFFF',
                                            display: 'flex', alignItems: 'center', gap: '0.25rem',
                                            transition: 'background-color 0.2s'
                                        }}
                                        className="hover:bg-purple-700"
                                    >
                                        <Check size={10} /> Pagar
                                    </button>
                                )
                            )}
                        </div>
                    </div>

                    {/* Balance Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p style={{ fontSize: '9px', fontWeight: 900, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                                Saldo Bloqueado
                            </p>
                            <p style={{ fontSize: '1.125rem', fontWeight: 900, color: isOver ? colors.dangerText : colors.brandPrimary }}>
                                {formatCurrency(used)}
                            </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '9px', fontWeight: 900, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                                Disponível
                            </p>
                            <p style={{ fontSize: '1.125rem', fontWeight: 900, color: isOver ? colors.dangerText : colors.successText }}>
                                {formatCurrency(card.limit - used)}
                            </p>
                        </div>
                    </div>

                    {/* Limit Progress */}
                    <div>
                        <div className="flex justify-between items-center" style={{ marginBottom: '0.375rem' }}>
                            <p style={{ fontSize: '9px', fontWeight: 900, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Limite: {formatCurrency(card.limit)}
                            </p>
                            <p style={{ fontSize: '9px', fontWeight: 900, color: pct > 90 ? colors.dangerText : colors.textMuted }}>
                                {pct.toFixed(0)}%
                            </p>
                        </div>
                        <div style={{ width: '100%', backgroundColor: '#252525', height: '0.5rem', borderRadius: '9999px', overflow: 'hidden' }}>
                            <div
                                style={{
                                    height: '100%',
                                    width: `${Math.min(100, pct)}%`,
                                    backgroundColor: pct > 90 ? colors.dangerText : colors.brandPrimary,
                                    borderRadius: '9999px',
                                    transition: 'width 0.3s'
                                }}
                            />
                        </div>
                    </div>

                    {/* Classification */}
                    {isUnclassified ? (
                        <div className="flex gap-2 justify-center" style={{ paddingTop: '0.5rem' }}>
                            {ledgers.map(l => (
                                <button
                                    key={l.id}
                                    onClick={() => onUpdateCard({ ...card, ledgerId: l.id })}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: '0.75rem',
                                        fontSize: '9px',
                                        fontWeight: 900,
                                        textTransform: 'uppercase',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.375rem',
                                        border: '1px solid #333',
                                        backgroundColor: card.ledgerId === l.id
                                            ? (l.type === 'PF' ? '#4F46E5' : '#059669')
                                            : '#252525',
                                        color: card.ledgerId === l.id ? '#FFFFFF' : '#666',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {l.type === 'PF' ? <User size={12} /> : <Building2 size={12} />}
                                    {l.type}
                                </button>
                            ))}
                        </div>
                    ) : (
                        ledger && (
                            <div className="flex justify-center" style={{ paddingTop: '0.5rem' }}>
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.375rem',
                                    fontSize: '9px',
                                    fontWeight: 900,
                                    textTransform: 'uppercase',
                                    padding: '0.375rem 0.75rem',
                                    borderRadius: '0.75rem',
                                    backgroundColor: ledger.type === 'PF' ? 'rgba(79,70,229,0.2)' : 'rgba(5,150,105,0.2)',
                                    color: ledger.type === 'PF' ? '#818CF8' : '#34D399',
                                    border: `1px solid ${ledger.type === 'PF' ? 'rgba(79,70,229,0.3)' : 'rgba(5,150,105,0.3)'}`
                                }}>
                                    {ledger.type === 'PF' ? <User size={12} /> : <Building2 size={12} />}
                                    {ledger.type}
                                </span>
                            </div>
                        )
                    )}
                </div>

                {/* Card Footer */}
                <div style={{ padding: '1rem', borderTop: `1px solid ${colors.cardBorder}` }}>
                    <button
                        onClick={() => { onSetSelectedCardId(card.id); onSetActiveTab('CARD_DETAILS'); }}
                        style={{
                            width: '100%',
                            padding: '0.625rem',
                            backgroundColor: 'rgba(14,165,233,0.1)',
                            color: colors.brandPrimary,
                            fontWeight: 900,
                            fontSize: '10px',
                            textTransform: 'uppercase',
                            borderRadius: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            border: '1px solid rgba(14,165,233,0.2)',
                            transition: 'all 0.2s'
                        }}
                        className="hover:bg-sky-500/20 hover:border-sky-500/40"
                    >
                        <Eye size={14} />
                        Ver Lançamentos
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
            {/* Summary Card */}
            <div style={{
                background: 'linear-gradient(to right, #1F1F1F, #2A2A2A)',
                padding: '1.5rem',
                borderRadius: '1rem',
                border: '1px solid rgba(255,255,255,0.05)'
            }}>
                <div className="flex justify-between items-center">
                    <div>
                        <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.textSecondary }}>
                            Total Faturas do Mês
                        </p>
                        <p style={{ fontSize: '1.875rem', fontWeight: 900, marginTop: '0.25rem', color: colors.textPrimary }}>
                            {formatCurrency(totalCardsInvoice)}
                        </p>
                        <p style={{ fontSize: '9px', fontWeight: 700, color: colors.brandPrimary, marginTop: '0.5rem' }}>
                            {filteredCards.length} {filteredCards.length === 1 ? 'cartão' : 'cartões'} • {filterMonth}
                        </p>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '1rem' }}>
                        <CreditCard size={32} style={{ color: colors.textSecondary }} />
                    </div>
                </div>
            </div>

            {/* Header with Add Button */}
            <div className="flex justify-between items-center">
                <h3 style={{ fontWeight: 900, color: colors.textPrimary, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.1em' }}>
                    Meus Cartões
                </h3>
                <button
                    onClick={() => onOpenCardModal()}
                    className="bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-2 shadow-lg"
                    style={{ padding: '0.625rem 1rem', borderRadius: '0.75rem', fontWeight: 900, fontSize: '10px', textTransform: 'uppercase' }}
                >
                    <Plus size={14} />
                    Novo Cartão
                </button>
            </div>

            {/* Unclassified Cards Alert */}
            {unclassifiedCards.length > 0 && (
                <div style={{
                    backgroundColor: 'rgba(245,158,11,0.1)',
                    border: '1px solid rgba(245,158,11,0.2)',
                    padding: '1rem',
                    borderRadius: '1rem'
                }}>
                    <div className="flex items-center gap-3">
                        <AlertTriangle size={20} style={{ color: colors.warningText }} />
                        <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: colors.warningText }}>
                            {unclassifiedCards.length} {unclassifiedCards.length === 1 ? 'cartão' : 'cartões'} sem classificação - Classifique como PF ou PJ abaixo
                        </p>
                    </div>
                </div>
            )}

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {unclassifiedCards.map(card => (
                    <CardItem key={card.id} card={card} isUnclassified={true} />
                ))}
                {filteredCards.map(card => (
                    <CardItem key={card.id} card={card} isUnclassified={false} />
                ))}
            </div>

            {/* Empty State */}
            {filteredCards.length === 0 && unclassifiedCards.length === 0 && (
                <div style={{
                    backgroundColor: colors.cardBg,
                    borderRadius: '1rem',
                    border: `1px solid ${colors.cardBorder}`,
                    padding: '4rem',
                    textAlign: 'center'
                }}>
                    <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '1rem', display: 'inline-block', marginBottom: '1rem' }}>
                        <CreditCard size={32} style={{ color: colors.textMuted }} />
                    </div>
                    <p style={{ color: colors.textMuted, fontWeight: 700 }}>
                        Nenhum cartão cadastrado para este escopo.
                    </p>
                    <p style={{ color: '#505050', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        Clique em "Novo Cartão" para adicionar seu primeiro cartão.
                    </p>
                </div>
            )}
        </div>
    );
};
