
import React, { useContext, useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOperations } from '../contexts/OperationsContext';
import { useAuth } from '../contexts/AuthContext';

import { formatDate, getCurrentLocalDate, getLast30DaysDate } from '../constants';
import {
    CheckSquare,
    Square,
    Clock,
    Video,
    FileText,
    Edit,
    Share2,
    BarChart2,
    Plus,
    Trash2,
    CheckCircle,
    Calendar,
    Lock,
    LayoutDashboard,
    Globe,
    User as UserIcon,
    ChevronDown,
    X,
    Repeat,
    ArrowRight,
    MessageSquare,
    Package,
    RefreshCw,
    Target,
    DollarSign,
    Filter,
    AlertCircle,
    TrendingUp,
    Users,
    ShieldCheck,
    AlertTriangle,
    Archive
} from 'lucide-react';
import { Task, TaskStatus, TaskType, Goal, GoalType, PeriodType, RecurrenceConfig, User } from '../types';

import { ConfirmationModal } from '../components/ConfirmationModal';

type PeriodOption = 'hoje' | '7d_passado' | '7d_futuro' | '30d_passado' | '30d_futuro' | 'este_mes' | 'mes_passado' | 'personalizado' | 'tudo';

const getTypeIcon = (type?: TaskType) => {
    switch (type) {
        case 'Tráfego': return <Share2 size={16} className="text-[#5D7F38]" />;
        case 'Atendimento': return <MessageSquare size={16} className="text-blue-400" />;
        case 'ERP': return <Package size={16} className="text-purple-400" />;
        case 'Desenvolv. operacional': return <RefreshCw size={16} className="text-orange-400" />;
        case 'Estratégia/Gestão': return <Target size={16} className="text-indigo-400" />;
        case 'Financeiro': return <DollarSign size={16} className="text-emerald-400" />;
        case 'Gerais/Diversos': return <CheckSquare size={16} className="text-[#808080]" />;
        default: return <CheckSquare size={16} className="text-[#808080]" />;
    }
};

const WEEK_DAYS = [
    { label: 'D', value: 0 },
    { label: 'S', value: 1 },
    { label: 'T', value: 2 },
    { label: 'Q', value: 3 },
    { label: 'Q', value: 4 },
    { label: 'S', value: 5 },
    { label: 'S', value: 6 }
];

export const GoalsAndTasks = () => {
    const {
        tasks, goals, users,
        addTask, updateTask, deleteTask, toggleTaskStatus,
        addGoal, updateGoal, deleteGoal
    } = useOperations();
    const { currentUser, can, profileReady } = useAuth();


    const navigate = useNavigate();
    const isAdmin = currentUser?.profile === 'ADMIN';


    // Filtros Globais
    const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('este_mes');
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');
    const [userFilter, setUserFilter] = useState<string>(isAdmin ? 'all' : (currentUser?.id || ''));
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [showArchived, setShowArchived] = useState(false);
    const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);

    // Lógica para atualizar as datas baseado no período selecionado
    useEffect(() => {
        const today = new Date();
        const formatDate = (d: Date) => d.toISOString().split('T')[0];

        switch (selectedPeriod) {
            case 'hoje':
                setDateFrom(formatDate(today));
                setDateTo(formatDate(today));
                break;
            case '7d_passado': {
                const start = new Date();
                start.setDate(today.getDate() - 6);
                setDateFrom(formatDate(start));
                setDateTo(formatDate(today));
                break;
            }
            case '7d_futuro': {
                const end = new Date();
                end.setDate(today.getDate() + 6);
                setDateFrom(formatDate(today));
                setDateTo(formatDate(end));
                break;
            }
            case '30d_passado': {
                const start = new Date();
                start.setDate(today.getDate() - 29);
                setDateFrom(formatDate(start));
                setDateTo(formatDate(today));
                break;
            }
            case '30d_futuro': {
                const end = new Date();
                end.setDate(today.getDate() + 29);
                setDateFrom(formatDate(today));
                setDateTo(formatDate(end));
                break;
            }
            case 'este_mes': {
                const start = new Date(today.getFullYear(), today.getMonth(), 1);
                const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                setDateFrom(formatDate(start));
                setDateTo(formatDate(end));
                break;
            }
            case 'mes_passado': {
                const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const end = new Date(today.getFullYear(), today.getMonth(), 0);
                setDateFrom(formatDate(start));
                setDateTo(formatDate(end));
                break;
            }
            case 'tudo':
                setDateFrom('');
                setDateTo('');
                break;
            case 'personalizado':
                // Mantém as datas atuais para o usuário editar
                break;
        }
    }, [selectedPeriod]);

    // Estados dos Modais
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [taskForm, setTaskForm] = useState<Partial<Task>>({});

    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
    const [goalForm, setGoalForm] = useState<Partial<Goal>>({});

    const hasAccess = useMemo(() => can('goals'), [can, currentUser, profileReady]);

    // Lista de usuários limpa: Remove "Novo Usuário" e ordena
    const cleanUsersList = useMemo(() => {
        return users
            .filter(u => {
                const name = u.name || '';
                const isGeneric = name.toLowerCase().trim() === 'novo usuário' || name.trim() === '';
                // Assume true se isActive for indefinido (para garantir que Mateus apareça)
                const isActive = u.isActive !== false;
                return !isGeneric && isActive;
            })
            .sort((a, b) => {
                // Coloca o usuário atual (Você) no topo
                if (a.id === currentUser?.id) return -1;
                if (b.id === currentUser?.id) return 1;
                return a.name.localeCompare(b.name);
            });
    }, [users, currentUser]);



    // Lógica de Filtragem Unificada
    const filteredData = useMemo(() => {
        if (!hasAccess) return { tasks: [], goals: [] };

        const matchesDate = (d?: string) => {
            if (!dateFrom && !dateTo) return true;
            if (!d) return false;
            const start = dateFrom || '0000-01-01';
            const end = dateTo || '9999-12-31';
            return d >= start && d <= end;
        };

        const matchesUser = (responsibleId?: string) => {
            if (userFilter === 'all') return true;
            return responsibleId === userFilter || responsibleId === 'all';
        };

        const matchesCategory = (type?: string) => {
            if (categoryFilter === 'all') return true;
            return type === categoryFilter;
        };

        const filteredGoals = goals.filter(g => matchesDate(g.endDate) && matchesUser(g.responsibleId) && matchesCategory(g.type));



        const today = getCurrentLocalDate();
        const baseFilteredTasks = tasks.filter(t => matchesUser(t.responsibleId) && matchesCategory(t.type));

        // Safe helper to get ISO date string (YYYY-MM-DD); handles Firebase timestamps, Date objects, and strings
        const getSafeIsoDate = (ts: any) => {
            if (!ts) return '';
            try {
                const ipv = ts.toDate ? ts.toDate() : new Date(ts);
                if (isNaN(ipv.getTime())) return '';
                return ipv.toISOString().split('T')[0];
            } catch (e) {
                return '';
            }
        };

        const activeTasks = baseFilteredTasks.filter(t => {
            if (t.status !== 'Concluída') return matchesDate(t.deadline);

            // Done tasks on board: MUST be today
            const doneDate = getSafeIsoDate(t.completedAt || t.updatedAt || t.createdAt);
            return doneDate === today;
        });

        const archivedTasks = baseFilteredTasks.filter(t => {
            if (t.status !== 'Concluída') return false;
            // Archive view matches Date Filter against Completion Date
            const doneIso = getSafeIsoDate(t.completedAt || t.updatedAt);
            return matchesDate(doneIso);
        });

        return {
            tasks: showArchived ? archivedTasks : activeTasks,
            activeTasks,
            archivedTasks,
            goals: filteredGoals
        };
    }, [tasks, goals, dateFrom, dateTo, userFilter, categoryFilter, hasAccess, showArchived]);

    const kpis = useMemo(() => {
        const today = getCurrentLocalDate();
        // Use activeTasks for KPI if not in archive mode? Or always active?
        const source = filteredData.activeTasks;
        const overdue = source.filter(t => t.status !== 'Concluída' && t.deadline < today).length;
        const pending = source.filter(t => t.status !== 'Concluída').length;
        return { overdue, pending };
    }, [filteredData]);

    const columns = useMemo(() => {
        const source = filteredData.activeTasks;
        return {
            todo: source.filter(t => t.status === 'A fazer'),
            doing: source.filter(t => t.status === 'Em andamento'),
            done: source.filter(t => t.status === 'Concluída')
        };
    }, [filteredData]);

    const handleOpenTaskModal = (task?: Task) => {
        if (!hasAccess) return;
        setEditingTask(task || null);

        if (task) {
            setTaskForm({ ...task });
        } else {
            setTaskForm({
                description: '',
                deadline: getCurrentLocalDate(),
                responsibleId: (userFilter !== 'all' && userFilter) ? userFilter : currentUser?.id,
                priority: 'Média',
                status: 'A fazer',
                type: 'Tráfego',
                quantity: 1,
                goalId: '',
                isRecurring: false,
                recurrence: {
                    frequency: 'Diário',
                    daysOfWeek: [],
                    endOption: 'Nunca',
                    currentOccurrenceCount: 0
                }
            });
        }
        setIsTaskModalOpen(true);
    };

    const handleSaveTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingTask) {
            await updateTask({ ...editingTask, ...taskForm } as Task);
        } else {
            await addTask({ ...taskForm } as Task);
        }
        setIsTaskModalOpen(false);
    };

    const handleOpenGoalModal = (goal?: Goal) => {
        if (!hasAccess) return;
        setEditingGoal(goal || null);
        if (goal) {
            setGoalForm({ ...goal });
        } else {
            setGoalForm({
                type: 'Tráfego',
                description: '',
                period: 'Mensal',
                startDate: getCurrentLocalDate(),
                endDate: getCurrentLocalDate(),
                targetValue: 10,
                responsibleId: (userFilter !== 'all' && userFilter) ? userFilter : currentUser?.id,
                status: 'Em andamento'
            });
        }
        setIsGoalModalOpen(true);
    };

    const handleSaveGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingGoal) {
                await updateGoal({ ...editingGoal, ...goalForm } as Goal);
            } else {
                await addGoal({ ...goalForm } as any);
            }
            setIsGoalModalOpen(false);
        } catch (err) {
            console.error("Erro ao salvar meta:", err);
        }
    };

    const toggleDay = (day: number) => {
        const currentDays = taskForm.recurrence?.daysOfWeek || [];
        const newDays = currentDays.includes(day)
            ? currentDays.filter(d => d !== day)
            : [...currentDays, day].sort();

        setTaskForm({
            ...taskForm,
            recurrence: {
                ...(taskForm.recurrence as RecurrenceConfig),
                daysOfWeek: newDays
            }
        });
    };

    if (!profileReady) return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-[#808080]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5D7F38] mb-4"></div>
            <p>Sincronizando Metas...</p>
        </div>
    );

    if (!hasAccess) return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6 bg-[#1F1F1F] rounded-3xl border border-white/5 shadow-sm">
            <div className="bg-red-500/10 text-red-500 p-5 rounded-full mb-4 shadow-inner">
                <Lock size={44} />
            </div>
            <h2 className="text-2xl font-bold text-white">Acesso Restrito</h2>
            <p className="text-[#808080] max-w-sm mt-2 mb-8">Você não possui permissão para gerenciar metas ou tarefas.</p>
            <button
                onClick={() => navigate('/')}
                className="flex items-center justify-center gap-2 bg-[#5D7F38] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#4a662c]"
            >
                <LayoutDashboard size={20} /> VOLTAR AO DASHBOARD
            </button>
        </div>
    );

    return (
        <div className="bg-[#141414] min-h-full rounded-[30px] p-8 -m-8 md:-m-8 md:p-10 space-y-10 border border-[#222]">
            <ConfirmationModal
                isOpen={!!goalToDelete}
                onClose={() => setGoalToDelete(null)}
                onConfirm={() => {
                    if (goalToDelete) deleteGoal(goalToDelete.id);
                }}
                title="Excluir Meta"
                description={`Tem certeza que deseja excluir a meta "${goalToDelete?.description}"? Esta ação não pode ser desfeita e removerá todas as tarefas vinculadas.`}
                confirmText="Excluir Meta"
                cancelText="Cancelar"
                variant="danger"
            />
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Metas & Produção</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border ${userFilter === 'all' ? 'text-[#A3E635] bg-[#A3E635]/10 border-[#A3E635]/20' : 'text-[#5D7F38] bg-[#5D7F38]/10 border-[#5D7F38]/20'}`}>
                            {userFilter === 'all' ? <Globe size={10} /> : <UserIcon size={10} />}
                            {userFilter === 'all' ? 'Toda a Equipe' : `Visualizando: ${users.find(u => u.id === userFilter)?.name || 'Responsável'}`}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                    <div className="flex items-center gap-2 bg-[#1F1F1F] border border-white/10 rounded-xl p-2 shadow-sm w-full sm:w-auto">
                        <Filter size={16} className="text-[#808080] ml-1" />
                        <select
                            className="text-xs font-bold text-white bg-transparent outline-none cursor-pointer pr-4"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                        >
                            <option value="all" className="bg-[#1F1F1F]">Todas as Categorias</option>
                            <option value="Tráfego" className="bg-[#1F1F1F]">Tráfego</option>
                            <option value="Atendimento" className="bg-[#1F1F1F]">Atendimento</option>
                            <option value="ERP" className="bg-[#1F1F1F]">ERP</option>
                            <option value="Desenvolv. operacional" className="bg-[#1F1F1F]">Desenvolv. operacional</option>
                            <option value="Estratégia/Gestão" className="bg-[#1F1F1F]">Estratégia/Gestão</option>
                            <option value="Financeiro" className="bg-[#1F1F1F]">Financeiro</option>
                            <option value="Gerais/Diversos" className="bg-[#1F1F1F]">Gerais/Diversos</option>
                        </select>
                    </div>

                    {isAdmin && (
                        <div className="flex items-center gap-2 bg-[#1F1F1F] border border-white/10 rounded-xl p-2 shadow-sm w-full sm:w-auto">
                            <Users size={16} className="text-[#808080] ml-1" />
                            <select
                                value={userFilter}
                                onChange={(e) => setUserFilter(e.target.value)}
                                className="text-xs font-bold text-white bg-transparent outline-none cursor-pointer pr-4"
                            >
                                <option value="all" className="bg-[#1F1F1F]">Toda a Equipe</option>
                                {cleanUsersList.map(u => (
                                    <option key={u.id} value={u.id} className="bg-[#1F1F1F]">
                                        {u.name} {u.profile === 'ADMIN' ? '(ADM)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="relative">
                        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-[#808080]">
                            <ChevronDown size={14} />
                        </div>
                        <select
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value as PeriodOption)}
                            className="appearance-none bg-[#1F1F1F] border border-white/10 rounded-xl pl-4 pr-10 py-3 text-[10px] font-bold uppercase tracking-widest text-[#E5E5E5] focus:outline-none focus:border-white/30 cursor-pointer hover:bg-[#252525] transition-colors"
                        >
                            <option value="hoje">Hoje</option>
                            <option value="7d_passado">Últimos 7 dias</option>
                            <option value="7d_futuro">Próximos 7 dias</option>
                            <option value="30d_passado">Últimos 30 dias</option>
                            <option value="30d_futuro">Próximos 30 dias</option>
                            <option value="este_mes">Este mês</option>
                            <option value="mes_passado">Mês passado</option>
                            <option value="tudo">Ver Tudo</option>
                            <option value="personalizado">Personalizado</option>
                        </select>
                    </div>

                    {selectedPeriod === 'personalizado' && (
                        <div className="flex items-center gap-2 bg-[#1F1F1F] border border-white/10 rounded-xl p-2 px-3 animate-in fade-in slide-in-from-right-2 duration-200">
                            <Calendar size={16} className="text-[#808080]" />
                            <input
                                type="date"
                                className="text-[10px] font-bold text-white bg-transparent outline-none cursor-pointer [color-scheme:dark]"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                            />
                            <span className="text-[#606060] text-[9px] font-bold">até</span>
                            <input
                                type="date"
                                className="text-[10px] font-bold text-white bg-transparent outline-none cursor-pointer [color-scheme:dark]"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                            />
                        </div>
                    )}

                    <button onClick={() => handleOpenTaskModal()} className="bg-[#5D7F38] text-white px-5 py-3 rounded-xl hover:bg-[#4a662c] flex items-center gap-2 font-bold shadow-lg shadow-[#5D7F38]/20 transition-all w-full sm:w-auto justify-center">
                        <Plus size={20} /> NOVA TAREFA
                    </button>
                </div>
            </div >

            {!showArchived && (
                <>
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-[#1F1F1F] p-6 rounded-2xl border border-white/5 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#808080]">Pendente Ativo</p>
                                <h3 className="text-3xl font-black mt-1 text-white">{kpis.pending}</h3>
                            </div>
                            <div className="p-3 bg-[#5D7F38]/10 text-[#5D7F38] rounded-xl">
                                <Clock size={28} />
                            </div>
                        </div>
                        <div className={`p-6 rounded-2xl border flex items-center justify-between transition-colors ${kpis.overdue > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-[#1F1F1F] border-white/5'}`}>
                            <div>
                                <p className={`text-[10px] font-black uppercase tracking-widest ${kpis.overdue > 0 ? 'text-red-500' : 'text-[#808080]'}`}>Atrasadas</p>
                                <h3 className={`text-3xl font-black mt-1 ${kpis.overdue > 0 ? 'text-red-500' : 'text-white'}`}>{kpis.overdue}</h3>
                            </div>
                            <div className={`p-3 rounded-xl ${kpis.overdue > 0 ? 'bg-red-500/20 text-red-500' : 'bg-[#252525] text-[#808080]'}`}>
                                <AlertCircle size={28} />
                            </div>
                        </div>
                    </section>

                    <section className="bg-[#1F1F1F] rounded-2xl border border-white/5 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-white flex items-center gap-2"><CheckCircle size={22} className="text-[#5D7F38]" /> Metas Estratégicas</h3>
                            {isAdmin && (
                                <button
                                    onClick={() => handleOpenGoalModal()}
                                    className="bg-[#5D7F38]/10 text-[#5D7F38] hover:bg-[#5D7F38]/20 text-[10px] font-black px-4 py-2 rounded-lg flex items-center gap-2 transition-all border border-[#5D7F38]/20 uppercase"
                                >
                                    <Plus size={14} /> NOVA META
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {filteredData.goals.length === 0 && <p className="text-[#808080] text-sm py-12 italic text-center w-full col-span-2 bg-[#252525] rounded-2xl border border-dashed border-white/10">Nenhuma meta {userFilter === 'all' ? 'da equipe' : 'deste responsável'} encontrada.</p>}
                            {filteredData.goals.map(g => {
                                const linkedTasks = tasks.filter(t => t.goalId === g.id && t.status === 'Concluída');
                                const progress = linkedTasks.reduce((acc, t) => acc + (t.quantity || 1), 0);
                                const pct = Math.min(100, (progress / g.targetValue) * 100);
                                const responsible = users.find(u => u.id === g.responsibleId);
                                return (
                                    <div key={g.id} className="border border-white/5 rounded-2xl p-5 bg-[#252525] group relative hover:border-[#5D7F38]/30 hover:bg-[#2A2A2A] transition-all shadow-sm">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex-1 pr-16">
                                                <h4 className="font-black text-white text-lg leading-tight group-hover:text-[#5D7F38] transition-colors">{g.description}</h4>
                                                <div className="flex flex-wrap items-center gap-3 mt-2">
                                                    <span className="text-[9px] font-black uppercase bg-[#1F1F1F] border border-white/10 px-2 py-0.5 rounded shadow-sm text-[#5D7F38]">{g.type}</span>
                                                    <span className="text-[10px] font-bold text-[#808080] flex items-center gap-1"><Calendar size={12} /> Prazo: {formatDate(g.endDate)}</span>
                                                    <span className="text-[10px] font-bold text-[#5D7F38] flex items-center gap-1"><UserIcon size={12} /> {responsible?.name || 'Responsável'}</span>
                                                </div>
                                            </div>
                                            {isAdmin && (
                                                <div className="absolute top-5 right-5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleOpenGoalModal(g)} className="p-2 bg-[#1F1F1F] border border-white/10 rounded-xl text-[#808080] hover:text-[#5D7F38] hover:border-[#5D7F38]/30 transition-all shadow-sm"><Edit size={16} /></button>
                                                    <button onClick={() => setGoalToDelete(g)} className="p-2 bg-[#1F1F1F] border border-white/10 rounded-xl text-[#808080] hover:text-red-500 hover:border-red-500/30 transition-all shadow-sm"><Trash2 size={16} /></button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-6">
                                            <div className="flex justify-between text-[11px] font-black uppercase text-[#808080] mb-2">
                                                <span className="flex items-center gap-1.5"><Target size={12} className="text-[#5D7F38]" /> Progresso: {progress} / {g.targetValue}</span>
                                                <span className={pct >= 100 ? 'text-emerald-400' : 'text-[#5D7F38]'}>{pct.toFixed(0)}%</span>
                                            </div>
                                            <div className="w-full bg-[#1F1F1F] rounded-full h-3 overflow-hidden shadow-inner border border-white/5 p-0.5">
                                                <div className={`h-full transition-all duration-700 rounded-full ${pct >= 100 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-[#5D7F38] shadow-[0_0_10px_rgba(93,127,56,0.3)]'}`} style={{ width: `${pct}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </>
            )}

            <section>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-white flex items-center gap-2">
                        {showArchived ? (
                            <button onClick={() => setShowArchived(false)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                                <span className="bg-[#1F1F1F] p-2 rounded-xl text-[#808080]"><ChevronDown className="rotate-90" size={20} /></span>
                                <span className="flex items-center gap-2"><Archive size={24} className="text-[#5D7F38]" /> Tarefas Arquivadas</span>
                            </button>
                        ) : (
                            <><Clock size={24} className="text-[#5D7F38]" /> Pipeline Operacional</>
                        )}
                    </h3>
                </div>

                {showArchived ? (
                    <div className="bg-[#1F1F1F] rounded-3xl border border-white/5 overflow-hidden">
                        {filteredData.archivedTasks.length === 0 ? (
                            <div className="p-12 text-center text-[#808080] italic">Nenhuma tarefa arquivada encontrada com os filtros atuais.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/5 text-[10px] uppercase font-black text-[#808080] tracking-widest bg-[#252525]">
                                            <th className="p-4 rounded-tl-3xl">Tarefa</th>
                                            <th className="p-4">Categoria</th>
                                            <th className="p-4">Prioridade</th>
                                            <th className="p-4">Responsável</th>
                                            <th className="p-4">Concluída em</th>
                                            <th className="p-4 rounded-tr-3xl text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredData.archivedTasks.map(t => (
                                            <tr key={t.id} className="hover:bg-[#2A2A2A] transition-colors group">
                                                <td className="p-4 font-bold text-white text-sm">{t.description}</td>
                                                <td className="p-4">
                                                    <span className="bg-[#1F1F1F] border border-white/5 px-2 py-1 rounded text-[10px] font-black text-[#5D7F38] uppercase flex items-center gap-1 w-fit">
                                                        {getTypeIcon(t.type)} {t.type}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${t.priority === 'Alta' ? 'bg-red-500/10 text-red-400' : t.priority === 'Média' ? 'bg-amber-500/10 text-amber-400' : 'bg-[#1F1F1F] text-[#808080]'}`}>
                                                        {t.priority}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-xs font-bold text-white flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-[#252525] border border-white/10 flex items-center justify-center text-[9px] text-[#808080]">
                                                        <UserIcon size={12} />
                                                    </div>
                                                    {users.find(u => u.id === t.responsibleId)?.name || 'N/A'}
                                                </td>
                                                <td className="p-4 text-xs font-bold text-[#808080]">
                                                    {t.completedAt ? formatDate(t.completedAt.toDate ? t.completedAt.toDate() : new Date(t.completedAt)) : 'N/A'}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button onClick={() => toggleTaskStatus(t, 'A fazer')} className="text-[#808080] hover:text-[#5D7F38] transition-colors p-2 rounded-lg hover:bg-[#5D7F38]/10" title="Reabrir Tarefa">
                                                        <Repeat size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {(['A fazer', 'Em andamento', 'Concluída'] as TaskStatus[]).map(status => (
                            <div key={status} className={`rounded-3xl p-5 border transition-all h-fit ${status === 'A fazer' ? 'bg-[#1F1F1F] border-white/5' : status === 'Em andamento' ? 'bg-blue-500/5 border-blue-500/10' : 'bg-emerald-500/5 border-emerald-500/10'}`}>
                                <h4 className={`font-black mb-5 flex justify-between items-center text-[11px] tracking-widest uppercase ${status === 'A fazer' ? 'text-[#808080]' : status === 'Em andamento' ? 'text-blue-400' : 'text-emerald-400'}`}>
                                    <span className="flex items-center gap-2">{status}</span>
                                    <div className="flex items-center gap-2">
                                        {status === 'Concluída' && (
                                            <button onClick={() => { setShowArchived(true); setSelectedPeriod('tudo'); }} className="p-1 hover:bg-[#252525] rounded-md transition-all text-[#808080] hover:text-[#5D7F38]" title="Ver Histórico Completo">
                                                <Archive size={14} />
                                            </button>
                                        )}
                                        <span className="bg-[#252525] border border-white/5 px-3 py-1 rounded-full text-[10px] font-black shadow-sm text-white">{columns[status === 'A fazer' ? 'todo' : status === 'Em andamento' ? 'doing' : 'done'].length}</span>
                                    </div>
                                </h4>
                                <div className="space-y-4">
                                    {columns[status === 'A fazer' ? 'todo' : status === 'Em andamento' ? 'doing' : 'done'].map(t => {
                                        const responsible = users.find(u => u.id === t.responsibleId);
                                        return (
                                            <div key={t.id} className="bg-[#252525] p-4 rounded-2xl border border-white/5 shadow-sm hover:shadow-xl transition-all group border-l-4" style={{ borderLeftColor: t.priority === 'Alta' ? '#ef4444' : t.priority === 'Média' ? '#f59e0b' : '#5D7F38' }}>
                                                <div className="flex justify-between items-start gap-3">
                                                    <button onClick={() => toggleTaskStatus(t, t.status === 'Concluída' ? 'A fazer' : 'Concluída')} className={`mt-0.5 flex-shrink-0 transition-all transform active:scale-90 ${t.status === 'Concluída' ? 'text-emerald-500' : 'text-[#606060] hover:text-[#5D7F38]'}`}>
                                                        {t.status === 'Concluída' ? <CheckCircle size={22} strokeWidth={3} /> : <div className="w-5 h-5 rounded-md border-2 border-current" />}
                                                    </button>
                                                    <div className="flex-1 overflow-hidden">
                                                        <div className="flex items-center gap-1.5 mb-1">
                                                            <p className={`text-sm font-bold leading-tight ${t.status === 'Concluída' ? 'text-[#606060] line-through' : 'text-white'}`}>{t.description}</p>
                                                            {t.isRecurring && <RefreshCw size={12} className="text-[#5D7F38] animate-spin-slow" />}
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-2 mt-3 text-[9px] text-[#808080] uppercase font-black">
                                                            <span className="flex items-center gap-1 bg-[#1F1F1F] px-2 py-0.5 rounded-full border border-white/5">{getTypeIcon(t.type)} {t.type}</span>
                                                            <span className={`px-2 py-0.5 rounded-full border ${t.priority === 'Alta' ? 'bg-red-500/10 text-red-400 border-red-500/20' : t.priority === 'Média' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-[#1F1F1F] border-white/5'}`}>{t.priority}</span>
                                                        </div>

                                                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="w-5 h-5 rounded-full bg-[#1F1F1F] flex items-center justify-center text-[10px] font-black text-[#808080] overflow-hidden">
                                                                    {responsible?.name?.charAt(0) || '?'}
                                                                </div>
                                                                <span className="text-[10px] font-black text-[#808080] truncate max-w-[80px]">{responsible?.name || 'Responsável'}</span>
                                                            </div>
                                                            <span className="text-[10px] font-black text-[#808080] uppercase tracking-tighter">{formatDate(t.deadline)}</span>
                                                        </div>
                                                    </div>
                                                    {(isAdmin || t.responsibleId === currentUser?.id) && (
                                                        <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => handleOpenTaskModal(t)} className="p-2 bg-[#1F1F1F] rounded-xl text-[#808080] hover:text-[#5D7F38] hover:bg-[#5D7F38]/10 transition-all"><Edit size={14} /></button>
                                                            <button onClick={() => { if (window.confirm("Excluir tarefa?")) deleteTask(t.id); }} className="p-2 bg-[#1F1F1F] rounded-xl text-[#808080] hover:text-red-500 hover:bg-red-500/10 transition-all"><Trash2 size={14} /></button>
                                                            {t.status === 'A fazer' && (
                                                                <button onClick={() => toggleTaskStatus(t, 'Em andamento')} className="p-2 bg-[#5D7F38]/10 rounded-xl text-[#5D7F38] hover:bg-[#5D7F38] hover:text-white transition-all flex items-center justify-center" title="Iniciar Tarefa">
                                                                    <ArrowRight size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {columns[status === 'A fazer' ? 'todo' : status === 'Em andamento' ? 'doing' : 'done'].length === 0 && (
                                        <div className="text-center py-10 text-[10px] font-bold text-[#606060] uppercase border-2 border-dashed border-white/10 rounded-3xl">Vazio</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {
                isTaskModalOpen && (
                    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-[#1F1F1F] rounded-3xl shadow-2xl w-full max-w-xl p-8 animate-in zoom-in duration-200 overflow-y-auto max-h-[95vh] border border-white/5">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h3 className="text-2xl font-black text-white">{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
                                    <p className="text-xs text-[#808080] font-bold uppercase tracking-widest mt-1">Delegue atividades para sua equipe.</p>
                                </div>
                                <button onClick={() => setIsTaskModalOpen(false)} className="text-[#808080] hover:text-red-500 bg-[#252525] p-2 rounded-xl transition-all"><X size={24} /></button>
                            </div>
                            <form onSubmit={handleSaveTask} className="space-y-5">
                                <div>
                                    <label className="block text-[10px] font-black text-[#808080] uppercase mb-1.5 tracking-widest">Responsável pela Atividade</label>
                                    <select
                                        required
                                        className="w-full border border-white/5 rounded-2xl p-3.5 text-sm bg-[#252525] outline-none focus:border-[#5D7F38] font-bold text-white"
                                        value={taskForm.responsibleId || ''}
                                        onChange={e => setTaskForm({ ...taskForm, responsibleId: e.target.value })}
                                    >
                                        <option value="" className="bg-[#252525]">Selecione um responsável...</option>
                                        {cleanUsersList.map(u => (
                                            <option key={u.id} value={u.id} className="bg-[#252525]">
                                                {u.name} {u.profile === 'ADMIN' ? '(ADM)' : ''} {u.id === currentUser?.id ? '(Você)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-[#808080] uppercase mb-1.5 tracking-widest">Descrição da Atividade</label>
                                    <input required className="w-full border border-white/5 rounded-2xl p-3.5 text-sm outline-none focus:border-[#5D7F38] transition-all bg-[#252525] font-bold text-white placeholder:text-[#606060]" value={taskForm.description || ''} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} placeholder="Ex: Criar roteiro para vídeo de perfume" />
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-[#808080] uppercase mb-1.5 tracking-widest">Categoria</label>
                                        <select
                                            disabled={!!taskForm.goalId}
                                            className={`w-full border border-white/5 rounded-2xl p-3.5 text-sm bg-[#252525] outline-none focus:border-[#5D7F38] font-bold text-white ${!!taskForm.goalId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            value={taskForm.type || 'Gerais/Diversos'}
                                            onChange={e => setTaskForm({ ...taskForm, type: e.target.value as any })}
                                        >
                                            <option value="Tráfego">Tráfego</option>
                                            <option value="Atendimento">Atendimento</option>
                                            <option value="ERP">ERP</option>
                                            <option value="Desenvolv. operacional">Desenvolv. operacional</option>
                                            <option value="Estratégia/Gestão">Estratégia/Gestão</option>
                                            <option value="Financeiro">Financeiro</option>
                                            <option value="Gerais/Diversos">Gerais/Diversos</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-[#808080] uppercase mb-1.5 tracking-widest">Status</label>
                                        <select className="w-full border border-white/5 rounded-2xl p-3.5 text-sm bg-[#252525] outline-none focus:border-[#5D7F38] font-bold text-white" value={taskForm.status || 'A fazer'} onChange={e => setTaskForm({ ...taskForm, status: e.target.value as any })}>
                                            <option value="A fazer">A fazer</option>
                                            <option value="Em andamento">Em andamento</option>
                                            <option value="Concluída">Concluída</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-[#808080] uppercase mb-1.5 tracking-widest">Prioridade</label>
                                        <select className="w-full border border-white/5 rounded-2xl p-3.5 text-sm bg-[#252525] outline-none focus:border-[#5D7F38] font-bold text-white" value={taskForm.priority || 'Média'} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value as any })}>
                                            <option value="Baixa">🟢 Baixa</option>
                                            <option value="Média">🟡 Média</option>
                                            <option value="Alta">🔴 Alta</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="bg-[#5D7F38]/10 p-5 rounded-2xl border border-[#5D7F38]/20">
                                    <label className="block text-[10px] font-black text-[#5D7F38] uppercase mb-2 tracking-widest flex items-center gap-2"><Target size={12} /> Vínculo com Meta (Opcional)</label>
                                    <select className="w-full border border-[#5D7F38]/20 rounded-xl p-3 text-sm bg-[#1F1F1F] font-black text-[#5D7F38] outline-none" value={taskForm.goalId || ''} onChange={e => {
                                        const selectedGoalId = e.target.value;
                                        const selectedGoal = goals.find(g => g.id === selectedGoalId);
                                        setTaskForm({
                                            ...taskForm,
                                            goalId: selectedGoalId,
                                            // Auto-set category from goal if selected
                                            type: selectedGoal ? (selectedGoal.type as any) : taskForm.type
                                        });
                                    }}>
                                        <option value="" className="text-white">Nenhuma meta (Tarefa isolada)</option>
                                        {goals.filter(g => g.responsibleId === taskForm.responsibleId || g.responsibleId === 'all').map(g => <option key={g.id} value={g.id} className="text-white">{g.responsibleId === 'all' ? '⭐ ' : ''}{g.description}</option>)}
                                    </select>
                                    <p className="text-[9px] text-[#5D7F38]/70 mt-2 font-bold italic">* Apenas metas do mesmo responsável aparecem aqui.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-[#808080] uppercase mb-1.5 tracking-widest">Data Limite</label>
                                        <input type="date" required className="w-full border border-white/5 rounded-2xl p-3.5 text-sm bg-[#252525] font-bold text-white [color-scheme:dark]" value={taskForm.deadline || ''} onChange={e => setTaskForm({ ...taskForm, deadline: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-[#808080] uppercase mb-1.5 tracking-widest">Peso / Qtd</label>
                                        <input type="number" min="1" required className="w-full border border-white/5 rounded-2xl p-3.5 text-sm bg-[#252525] font-bold text-white" value={taskForm.quantity || 1} onChange={e => setTaskForm({ ...taskForm, quantity: parseInt(e.target.value) })} />
                                    </div>
                                </div>

                                <div className="bg-[#252525] rounded-2xl border border-white/5 p-5 space-y-4 shadow-inner">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Repeat size={18} className="text-[#5D7F38]" />
                                            <span className="text-[10px] font-black uppercase text-white tracking-widest">Repetir Tarefa</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setTaskForm({ ...taskForm, isRecurring: !taskForm.isRecurring })}
                                            className={`w-12 h-6 rounded-full transition-all relative flex items-center px-1 ${taskForm.isRecurring ? 'bg-[#5D7F38]' : 'bg-[#606060]'}`}
                                        >
                                            <div className={`w-4 h-4 bg-white rounded-full transition-all shadow-md ${taskForm.isRecurring ? 'translate-x-6' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                    {taskForm.isRecurring && (
                                        <div className="space-y-5 animate-in slide-in-from-top-2 duration-300">
                                            <div>
                                                <label className="block text-[10px] font-black text-[#808080] uppercase mb-2 tracking-widest">Frequência</label>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {(['Diário', 'Semanal', 'Quinzenal', 'Mensal'] as const).map(f => (
                                                        <button
                                                            key={f}
                                                            type="button"
                                                            onClick={() => setTaskForm({ ...taskForm, recurrence: { ...(taskForm.recurrence as RecurrenceConfig), frequency: f } })}
                                                            className={`py-2 text-[10px] font-black rounded-lg border transition-all ${taskForm.recurrence?.frequency === f ? 'bg-[#5D7F38] border-[#5D7F38] text-white shadow-md' : 'bg-[#1F1F1F] border-white/5 text-[#808080] hover:border-[#5D7F38]/30'}`}
                                                        >
                                                            {f}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            {(taskForm.recurrence?.frequency === 'Semanal' || taskForm.recurrence?.frequency === 'Quinzenal') && (
                                                <div>
                                                    <label className="block text-[10px] font-black text-[#808080] uppercase mb-2 tracking-widest">Dias da Semana</label>
                                                    <div className="flex justify-between gap-1">
                                                        {WEEK_DAYS.map(day => (
                                                            <button
                                                                key={day.value}
                                                                type="button"
                                                                onClick={() => toggleDay(day.value)}
                                                                className={`w-9 h-9 rounded-full text-[10px] font-black border transition-all ${taskForm.recurrence?.daysOfWeek.includes(day.value) ? 'bg-[#5D7F38] border-[#5D7F38] text-white shadow-md' : 'bg-[#1F1F1F] border-white/5 text-[#808080] hover:border-[#5D7F38]/30'}`}
                                                            >
                                                                {day.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end gap-3 pt-6 border-t border-white/5 mt-4">
                                    <button type="button" onClick={() => setIsTaskModalOpen(false)} className="px-6 py-3.5 text-sm font-black border border-white/10 rounded-2xl text-[#808080] hover:bg-white/5 transition-all uppercase">CANCELAR</button>
                                    <button type="submit" className="px-10 py-3.5 text-sm font-black bg-[#5D7F38] text-white rounded-2xl shadow-xl shadow-[#5D7F38]/30 hover:bg-[#4a662c] transition-all flex items-center gap-2 uppercase">
                                        {editingTask ? 'ATUALIZAR' : 'CRIAR TAREFA'} <ArrowRight size={18} />
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {
                isGoalModalOpen && (
                    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-[#1F1F1F] rounded-3xl shadow-2xl w-full max-w-lg p-8 animate-in zoom-in duration-200 overflow-y-auto max-h-[95vh] border border-white/5">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h3 className="text-2xl font-black text-white">{editingGoal ? 'Editar Meta' : 'Nova Meta Estratégica'}</h3>
                                    <p className="text-xs text-[#808080] font-bold uppercase tracking-widest mt-1">Defina objetivos de longo prazo.</p>
                                </div>
                                <button onClick={() => setIsGoalModalOpen(false)} className="text-[#808080] hover:text-red-500 bg-[#252525] p-2 rounded-xl transition-all"><X size={24} /></button>
                            </div>
                            <form onSubmit={handleSaveGoal} className="space-y-5">
                                <div>
                                    <label className="block text-[10px] font-black text-[#808080] uppercase mb-1.5 tracking-widest">Membro Responsável</label>
                                    <select
                                        required
                                        className="w-full border border-white/5 rounded-2xl p-3.5 text-sm bg-[#252525] outline-none focus:border-[#5D7F38] font-bold text-white"
                                        value={goalForm.responsibleId || ''}
                                        onChange={e => setGoalForm({ ...goalForm, responsibleId: e.target.value })}
                                    >
                                        <option value="" className="bg-[#252525]">Selecione um responsável...</option>
                                        <option value="all" className="bg-[#252525]">⭐ Toda a Equipe</option>
                                        {cleanUsersList.map(u => (
                                            <option key={u.id} value={u.id} className="bg-[#252525]">
                                                {u.name} {u.profile === 'ADMIN' ? '(ADM)' : ''} {u.id === currentUser?.id ? '(Você)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-[#808080] uppercase mb-1.5 tracking-widest">Descrição do Objetivo</label>
                                    <input required className="w-full border border-white/5 rounded-2xl p-3.5 text-sm outline-none focus:border-[#5D7F38] transition-all bg-[#252525] font-bold text-white placeholder:text-[#606060]" value={goalForm.description || ''} onChange={e => setGoalForm({ ...goalForm, description: e.target.value })} placeholder="Ex: Produção de 50 Criativos / Mês" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-[#808080] uppercase mb-1.5 tracking-widest">Categoria</label>
                                        <select className="w-full border border-white/5 rounded-2xl p-3.5 text-sm bg-[#252525] outline-none focus:border-[#5D7F38] font-bold text-white" value={goalForm.type || 'Gerais/Diversos'} onChange={e => setGoalForm({ ...goalForm, type: e.target.value as GoalType })}>
                                            <option value="Tráfego">Tráfego</option>
                                            <option value="Atendimento">Atendimento</option>
                                            <option value="ERP">ERP</option>
                                            <option value="Desenvolv. operacional">Desenvolv. operacional</option>
                                            <option value="Estratégia/Gestão">Estratégia/Gestão</option>
                                            <option value="Financeiro">Financeiro</option>
                                            <option value="Gerais/Diversos">Gerais/Diversos</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-[#808080] uppercase mb-1.5 tracking-widest">Objetivo Final</label>
                                        <input type="number" required min="1" className="w-full border border-white/5 rounded-2xl p-3.5 text-sm bg-[#252525] font-bold text-white" value={goalForm.targetValue || 1} onChange={e => setGoalForm({ ...goalForm, targetValue: parseFloat(e.target.value) })} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-[#808080] uppercase mb-1.5 tracking-widest">Início</label>
                                        <input type="date" required className="w-full border border-white/5 rounded-2xl p-3.5 text-sm bg-[#252525] font-bold text-white [color-scheme:dark]" value={goalForm.startDate || ''} onChange={e => setGoalForm({ ...goalForm, startDate: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-[#808080] uppercase mb-1.5 tracking-widest">Prazo</label>
                                        <input type="date" required className="w-full border border-white/5 rounded-2xl p-3.5 text-sm bg-[#252525] font-bold text-white [color-scheme:dark]" value={goalForm.endDate || ''} onChange={e => setGoalForm({ ...goalForm, endDate: e.target.value })} />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-6 border-t border-white/5 mt-4">
                                    <button type="button" onClick={() => setIsGoalModalOpen(false)} className="px-6 py-3.5 text-sm font-black border border-white/10 rounded-2xl text-[#808080] hover:bg-white/5 transition-all uppercase">CANCELAR</button>
                                    <button type="submit" className="px-10 py-3.5 text-sm font-black bg-[#5D7F38] text-white rounded-2xl shadow-xl shadow-[#5D7F38]/30 hover:bg-[#4a662c] transition-all flex items-center gap-2 uppercase">
                                        {editingGoal ? 'ATUALIZAR' : 'SALVAR META'} <ArrowRight size={18} />
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
