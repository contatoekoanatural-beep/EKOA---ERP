
import React, { useContext, useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOperations } from '../contexts/OperationsContext';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';

import {
    User as UserIcon,
    Edit2,
    Trash2,
    Shield,
    X as XIcon,
    Lock,
    Loader2,
    UserPlus,
    Info,
    Power,
    PowerOff,
    Target,
    Check,
    Briefcase,
    Key,
    Mail
} from 'lucide-react';


import { User, UserAccess } from '../types';
import { ConfirmationModal } from '../components/ConfirmationModal';

// Separate Modal for Changing Password
// Separate Modal for Changing Password
// Separate Modal for Changing Password
const ChangePasswordModal = ({ isOpen, onClose, onConfirm, onForgot }: any) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-md">
            <div className="bg-[#1F1F1F] rounded-3xl p-8 w-full max-w-md border border-white/5 space-y-6">
                <h3 className="text-xl font-bold text-white mb-4">Alterar Minha Senha</h3>

                <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/20 mb-4">
                    <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest mb-1">Segurança</p>
                    <p className="text-xs text-amber-200/80">Para sua segurança, confirme sua senha atual antes de definir uma nova.</p>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-[10px] font-black text-[#808080] uppercase tracking-widest">Senha Atual</label>
                        <button onClick={onForgot} type="button" className="text-[10px] font-bold text-[#5D7F38] hover:underline uppercase tracking-widest">
                            Não lembro a senha
                        </button>
                    </div>
                    <input type="password" className="w-full border border-white/5 rounded-2xl p-4 text-sm font-black text-white bg-[#252525]" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-[#808080] uppercase mb-2 tracking-widest">Nova Senha</label>
                    <input type="password" className="w-full border border-white/5 rounded-2xl p-4 text-sm font-black text-white bg-[#252525]" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-[#808080] uppercase mb-2 tracking-widest">Confirmar Nova Senha</label>
                    <input type="password" className="w-full border border-white/5 rounded-2xl p-4 text-sm font-black text-white bg-[#252525]" value={confirm} onChange={e => setConfirm(e.target.value)} />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                    <button onClick={onClose} className="px-5 py-3 rounded-xl border border-white/5 text-[#808080] font-bold text-xs uppercase">Cancelar</button>
                    <button
                        disabled={!password || !currentPassword || password !== confirm}
                        onClick={() => onConfirm(password, currentPassword)}
                        className="px-5 py-3 rounded-xl bg-[#5D7F38] text-white font-bold text-xs uppercase disabled:opacity-50"
                    >
                        Salvar Nova Senha
                    </button>
                </div>
            </div>
        </div>
    );
};

const DEFAULT_ACCESS: UserAccess = {
    dashboard: true,
    sales: true,
    marketing: true,
    finance: true,
    goals: true,
    team: false,
};

const FULL_ACCESS: UserAccess = {
    dashboard: true,
    sales: true,
    marketing: true,
    finance: true,
    team: true,
    goals: true,
};

export const Team = () => {
    const {
        users,
        addUser,
        updateUser,
        deleteUser
    } = useOperations();
    const { currentUser, can, profileReady } = useAuth();


    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const [userForm, setUserForm] = useState<{
        name: string;
        email: string;
        role: 'admin' | 'staff';
        isActive: boolean;
        access: UserAccess;
        password?: string;
    }>({
        name: '',
        email: '',
        role: 'staff',
        isActive: true,
        access: DEFAULT_ACCESS,
        password: ''
    });

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState<{
        title: string;
        description: string;
        onConfirm: () => void;
        variant?: 'danger' | 'warning' | 'info' | 'success';
    }>({
        onConfirm: () => { }
    });

    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    const handlePasswordChange = async (newPass: string, currentPass: string) => {
        try {
            await authService.changeCurrentPassword(currentUser, newPass, currentPass);
            alert("Senha alterada com sucesso!");
            setIsPasswordModalOpen(false);
        } catch (e: any) {
            alert("Erro ao alterar senha: " + e.message);
        }
    };

    const handleResetEmail = async (email: string) => {
        try {
            await authService.sendResetEmail(email);
            alert(`E-mail de redefinição enviado para ${email}`);
        } catch (e: any) {
            alert("Erro ao enviar e-mail: " + e.message);
        }
    };

    const canManageTeam = useMemo(() => {
        if (!profileReady) return false;
        return can('team');
    }, [can, profileReady]);

    const sortedUsers = useMemo(() => {
        if (!canManageTeam) return [];
        return [...users].sort((a, b) => {
            const aIsAdmin = String(a.role).toLowerCase() === 'admin';
            const bIsAdmin = String(b.role).toLowerCase() === 'admin';
            if (aIsAdmin && !bIsAdmin) return -1;
            if (!aIsAdmin && bIsAdmin) return 1;
            return a.name.localeCompare(b.name);
        });
    }, [users, canManageTeam]);

    const handleOpenModal = (u?: User) => {
        if (!canManageTeam) return;
        if (u) {
            setEditingUser(u);
            setUserForm({
                name: u.name || '',
                email: u.email || '',
                role: (u.role as 'admin' | 'staff') || 'staff',
                isActive: u.isActive ?? true,
                access: { ...DEFAULT_ACCESS, ...(u.access || {}) }
            });
        } else {
            setEditingUser(null);
            setUserForm({
                name: '',
                email: '',
                role: 'staff',
                isActive: true,
                access: { ...DEFAULT_ACCESS, team: false },
                password: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canManageTeam || !userForm.name.trim() || !userForm.email.trim()) return;

        try {
            const isNewAdmin = userForm.role === 'admin';
            const payload = {
                ...userForm,
                profile: userForm.role.toUpperCase(),
                // Se for admin, garante acesso total. Se for staff, mantém o que foi marcado no form.
                access: isNewAdmin ? FULL_ACCESS : userForm.access,
            };

            if (editingUser) {
                await updateUser({ ...editingUser, ...payload } as User);
            } else {
                await addUser(payload as any);
            }
            setIsModalOpen(false);
        } catch (err) {
            console.error(err);
            alert("Erro ao salvar dados do membro.");
        }
    };

    const toggleStatus = async (user: User) => {
        if (!canManageTeam || user.id === currentUser?.id) return;
        const currentIsActive = user.isActive ?? true;
        const newStatus = !currentIsActive;

        setConfirmConfig({
            title: `${newStatus ? 'Ativar' : 'Desativar'} Usuário`,
            description: `Deseja ${newStatus ? 'ativar' : 'desativar'} o acesso de ${user.name} ao sistema?`,
            variant: 'warning',
            onConfirm: async () => {
                await updateUser({ ...user, isActive: newStatus });
            }
        });
        setIsConfirmOpen(true);
    };

    const handleDeleteUser = async (user: User) => {
        if (!canManageTeam || user.id === currentUser?.id) return;

        setConfirmConfig({
            title: 'Excluir Usuário',
            description: `Tem certeza que deseja excluir ${user.name}? Esta ação não pode ser desfeita.`,
            variant: 'danger',
            onConfirm: async () => {
                await deleteUser(user.id);
            }
        });
        setIsConfirmOpen(true);
    };

    const toggleAccess = (key: keyof UserAccess) => {
        setUserForm(prev => ({
            ...prev,
            access: {
                ...prev.access,
                [key]: !prev.access[key]
            }
        }));
    };

    if (!profileReady) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-[#808080]">
                <Loader2 className="w-10 h-10 animate-spin text-[#5D7F38] mb-4" />
                <p className="font-medium text-sm">Carregando permissões...</p>
            </div>
        );
    }

    if (!canManageTeam) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6 bg-[#1F1F1F] rounded-3xl border border-white/5 shadow-sm">
                <div className="bg-amber-500/10 text-amber-400 p-5 rounded-full mb-4 shadow-inner">
                    <Lock size={44} />
                </div>
                <h2 className="text-2xl font-bold text-white">Acesso Administrativo Restrito</h2>
                <p className="text-[#808080] max-w-sm mt-2 mb-8 text-sm">Sua conta não possui permissão para gerenciar a equipe. Utilize os módulos liberados para você.</p>
                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                    {can('goals') && (
                        <button
                            onClick={() => navigate('/metas')}
                            className="flex-1 flex items-center justify-center gap-2 bg-[#5D7F38] text-white py-3 rounded-xl font-bold hover:bg-[#4a662c] transition-all shadow-lg shadow-[#5D7F38]/20"
                        >
                            <Target size={18} /> IR PARA METAS & TAREFAS
                        </button>
                    )}
                    <button
                        onClick={() => navigate('/')}
                        className="flex-1 flex items-center justify-center gap-2 bg-[#252525] border border-white/5 text-[#E5E5E5] py-3 rounded-xl font-bold hover:bg-[#303030] transition-all"
                    >
                        VOLTAR AO INÍCIO
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Equipe & Permissões</h2>
                    <p className="text-sm text-[#808080]">Controle o acesso dos membros ao sistema.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-[#5D7F38] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-[#5D7F38]/20 hover:bg-[#4a662c] transition-all"
                >
                    <UserPlus size={20} /> ADICIONAR MEMBRO
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedUsers.map(u => {
                    const active = u.isActive ?? true;
                    const isAdmin = String(u.role).toLowerCase() === 'admin';
                    return (
                        <div
                            key={u.id}
                            className={`bg-[#1F1F1F] p-5 rounded-xl border flex flex-col justify-between transition-all hover:shadow-md relative ${!active ? 'opacity-60 grayscale' : ''} ${u.id === currentUser?.id ? 'ring-2 ring-[#5D7F38] border-[#5D7F38]/30' : 'border-white/5 shadow-sm'}`}
                        >
                            <div className="flex items-start gap-4 mb-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${isAdmin ? 'bg-purple-600 shadow-lg shadow-purple-500/20' : 'bg-[#606060]'}`}>
                                    {u.name?.charAt(0).toUpperCase() || '?'}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-white truncate">{u.name}</h4>
                                        {u.id === currentUser?.id && <span className="bg-[#5D7F38]/20 text-[#5D7F38] text-[9px] px-1.5 py-0.5 rounded-full font-black">VOCÊ</span>}
                                    </div>
                                    <p className="text-xs text-[#808080] truncate font-medium">{u.email}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${isAdmin ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-[#252525] text-[#A0A0A0] border-white/5'}`}>
                                            {isAdmin ? 'ADMINISTRADOR' : 'COLABORADOR'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5">
                                <p className="text-[10px] font-bold text-[#808080] uppercase mb-2 tracking-widest">Módulos Liberados:</p>
                                <div className="flex flex-wrap gap-1 mb-4 min-h-[22px]">
                                    {isAdmin ? (
                                        <span className="text-[9px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/20 font-black uppercase tracking-tighter">
                                            ACESSO TOTAL LIBERADO
                                        </span>
                                    ) : (
                                        Object.entries(u.access || DEFAULT_ACCESS).map(([key, val]) => (
                                            val && (
                                                <span key={key} className="text-[9px] bg-[#252525] text-[#A0A0A0] px-2 py-0.5 rounded-full border border-white/5 font-black uppercase tracking-tighter">
                                                    {key}
                                                </span>
                                            )
                                        ))
                                    )}
                                    {!isAdmin && !Object.values(u.access || {}).some(v => v) && <span className="text-[10px] text-[#606060] italic font-bold">Sem acesso configurado</span>}
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleOpenModal(u)}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-white/5 text-[#A0A0A0] text-xs font-black hover:bg-white/5 transition-colors uppercase tracking-widest"
                                    >
                                        <Edit2 size={12} /> CONFIGURAR
                                    </button>
                                    <div className="flex gap-1">
                                        {u.id !== currentUser?.id && (
                                            <button
                                                onClick={() => toggleStatus(u)}
                                                className={`p-2.5 rounded-xl border transition-colors ${active ? 'border-amber-500/20 text-amber-400 hover:bg-amber-500/10' : 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'}`}
                                                title={active ? 'Desativar' : 'Ativar'}
                                            >
                                                {active ? <PowerOff size={16} /> : <Power size={16} />}
                                            </button>
                                        )}
                                        {u.id !== currentUser?.id && (
                                            <button
                                                onClick={() => handleDeleteUser(u)}
                                                className="p-2.5 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
                                                title="Excluir"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md">
                    <div className="bg-[#1F1F1F] rounded-3xl shadow-2xl p-8 w-full max-w-lg space-y-6 animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[95vh] border border-white/5">
                        <div className="flex justify-between items-center border-b border-white/5 pb-6">
                            <div>
                                <h3 className="text-2xl font-black text-white">{editingUser ? 'Editar Membro' : 'Novo Membro'}</h3>
                                <p className="text-[10px] text-[#808080] font-black uppercase tracking-widest mt-1">Definição de Perfil e Acessos</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-[#808080] hover:text-red-500 bg-[#252525] p-2 rounded-xl transition-all"><XIcon size={24} /></button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-[#808080] uppercase mb-2 tracking-widest">Nome Completo</label>
                                    <input required className="w-full border border-white/5 rounded-2xl p-4 text-sm font-black text-white outline-none focus:border-[#5D7F38] bg-[#252525] placeholder:text-[#606060]" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-[#808080] uppercase mb-2 tracking-widest">E-mail de Login</label>
                                    <input required type="email" className="w-full border border-white/5 rounded-2xl p-4 text-sm font-black text-white outline-none focus:border-[#5D7F38] bg-[#252525] placeholder:text-[#606060]" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} />
                                </div>
                            </div>

                            <div className="bg-[#252525] p-6 rounded-3xl border border-white/5">
                                <label className="block text-[10px] font-black text-[#808080] uppercase mb-3 tracking-widest flex items-center gap-2"><Briefcase size={12} /> Perfil de Usuário</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setUserForm({ ...userForm, role: 'staff' })}
                                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${userForm.role === 'staff' ? 'bg-[#1F1F1F] border-[#5D7F38] text-[#5D7F38] shadow-md' : 'bg-[#303030] border-transparent text-[#808080] hover:bg-[#353535]'}`}
                                    >
                                        <span className="text-xs font-black uppercase">Colaborador</span>
                                        <span className="text-[9px] font-bold mt-1 opacity-70">Acesso Limitado</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setUserForm({ ...userForm, role: 'admin' })}
                                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${userForm.role === 'admin' ? 'bg-[#1F1F1F] border-purple-500 text-purple-400 shadow-md' : 'bg-[#303030] border-transparent text-[#808080] hover:bg-[#353535]'}`}
                                    >
                                        <span className="text-xs font-black uppercase">Administrador</span>
                                        <span className="text-[9px] font-bold mt-1 opacity-70">Acesso Total</span>
                                    </button>
                                </div>
                            </div>

                            {userForm.role === 'staff' && (
                                <div className="bg-[#1F1F1F] p-6 rounded-3xl border border-white/5 space-y-4">
                                    <p className="text-[10px] font-black text-[#808080] flex items-center gap-2 uppercase tracking-widest"><Shield size={12} className="text-[#5D7F38]" /> Módulos Disponíveis:</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {[
                                            { key: 'dashboard', label: 'Dashboard' },
                                            { key: 'sales', label: 'Vendas' },
                                            { key: 'marketing', label: 'Marketing' },
                                            { key: 'finance', label: 'Financeiro' },
                                            { key: 'goals', label: 'Metas' }
                                        ].map(perm => (
                                            <button
                                                key={perm.key}
                                                type="button"
                                                onClick={() => toggleAccess(perm.key as keyof UserAccess)}
                                                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${(userForm.access as any)[perm.key]
                                                    ? 'bg-[#5D7F38]/10 border-[#5D7F38] text-[#5D7F38]'
                                                    : 'bg-[#252525] border-transparent text-[#808080] hover:bg-[#303030]'
                                                    }`}
                                            >
                                                <span className="text-[9px] font-black uppercase">{perm.label}</span>
                                                {(userForm.access as any)[perm.key] ? <Check strokeWidth={4} size={14} className="mt-1" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-[#606060] mt-1" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}



                            {/* Password Section for New Users */}
                            {!editingUser && (
                                <div className="bg-[#252525] p-6 rounded-3xl border border-white/5">
                                    <label className="block text-[10px] font-black text-[#808080] uppercase mb-3 tracking-widest flex items-center gap-2"><Lock size={12} /> Senha de Acesso</label>
                                    <input
                                        type="password"
                                        placeholder="Defina uma senha inicial..."
                                        className="w-full border border-white/5 rounded-2xl p-4 text-sm font-black text-white outline-none focus:border-[#5D7F38] bg-[#1F1F1F] placeholder:text-[#606060]"
                                        value={userForm.password}
                                        onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                                    />
                                    <p className="text-[10px] text-[#606060] mt-2 font-medium">Se deixar em branco, será gerada uma senha aleatória.</p>
                                </div>
                            )}

                            {/* Password Actions for Existing Users */}
                            {editingUser && (
                                <div className="bg-[#252525] p-6 rounded-3xl border border-white/5 space-y-3">
                                    <label className="block text-[10px] font-black text-[#808080] uppercase mb-1 tracking-widest flex items-center gap-2"><Key size={12} /> Segurança</label>

                                    {editingUser.id === currentUser?.id ? (
                                        <button
                                            type="button"
                                            onClick={() => setIsPasswordModalOpen(true)}
                                            className="w-full py-3 rounded-xl bg-[#5D7F38]/10 text-[#5D7F38] font-bold text-xs uppercase border border-[#5D7F38]/20 hover:bg-[#5D7F38]/20 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Key size={14} /> Alterar Minha Senha
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleResetEmail(editingUser.email || '')}
                                            className="w-full py-3 rounded-xl bg-blue-500/10 text-blue-400 font-bold text-xs uppercase border border-blue-500/20 hover:bg-blue-500/20 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Mail size={14} /> Enviar E-mail de Redefinição de Senha
                                        </button>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-xs font-black rounded-2xl border border-white/5 text-[#808080] hover:bg-white/5 transition-colors uppercase tracking-widest">CANCELAR</button>
                                <button type="submit" className="flex-[2] py-4 text-xs font-black rounded-2xl bg-[#5D7F38] text-white shadow-xl shadow-[#5D7F38]/30 hover:bg-[#4a662c] transition-all uppercase tracking-widest flex items-center justify-center gap-2">
                                    {editingUser ? 'ATUALIZAR MEMBRO' : 'SALVAR NOVO MEMBRO'} <Check size={18} />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ChangePasswordModal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
                onConfirm={handlePasswordChange}
                onForgot={() => {
                    const email = currentUser?.email || editingUser?.email;
                    if (email) {
                        setIsPasswordModalOpen(false);
                        handleResetEmail(email);
                    } else {
                        alert("E-mail não encontrado.");
                    }
                }}
            />

            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={confirmConfig.onConfirm}
                title={confirmConfig.title}
                description={confirmConfig.description}
                variant={confirmConfig.variant}
                confirmText="Confirmar"
                cancelText="Cancelar"
            />
        </div>
    );
};
