
import React, { useContext, useState } from 'react';
import { useOperations } from '../contexts/OperationsContext';
import { useAuth } from '../contexts/AuthContext';

import { formatCurrency, formatDate } from '../constants';
import {
  CheckSquare,
  Square,
  User,
  Edit2,
  Trash2,
  Plus,
} from 'lucide-react';
import { UserAccess } from '../types';

// Fixed: Permissions was not exported from types.ts, using UserAccess instead
const DEFAULT_PERMISSIONS: UserAccess = {
  dashboard: true,
  sales: false,
  marketing: true,
  finance: false,
  team: false,
  goals: true,
};

export const TeamAndGoals = () => {
  const {
    users,
    tasks,
    goals,
    toggleTaskStatus,
    addUser,
    updateUser,
    deleteUser,
    addGoal, updateGoal, deleteGoal
  } = useOperations();
  const { currentUser } = useAuth();


  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [userForm, setUserForm] = useState({
    name: '',
    role: '',
    profile: 'COLABORADOR',
    access: DEFAULT_PERMISSIONS // Fixed: using 'access' instead of 'permissions' to match User interface
  });

  const myTasks = tasks.filter(t => t.responsibleId === currentUser?.id);

  const openNewUser = () => {
    setIsNewUser(true);
    setEditingUser(null);
    setUserForm({ name: '', role: '', profile: 'COLABORADOR', access: DEFAULT_PERMISSIONS });
  };

  const openEditUser = (u: any) => {
    setIsNewUser(false);
    setEditingUser(u);
    setUserForm({
      name: u.name,
      role: u.role,
      profile: u.profile,
      access: u.access || DEFAULT_PERMISSIONS
    });
  };

  const handleSaveUser = () => {
    if (!userForm.name.trim()) return;

    if (isNewUser) {
      addUser({
        name: userForm.name,
        role: userForm.role,
        profile: userForm.profile,
        isActive: true, // Fixed: changed 'active' to 'isActive'
        email: '',
        access: userForm.access // Fixed: changed 'permissions' to 'access'
      });
    } else if (editingUser) {
      updateUser({
        ...editingUser,
        name: userForm.name,
        role: userForm.role,
        profile: userForm.profile,
        access: userForm.access // Fixed: changed 'permissions' to 'access'
      });
    }

    setEditingUser(null);
    setIsNewUser(false);
  };

  const handleDelete = (id: string | number) => {
    const userToDelete = users.find(u => String(u.id) === String(id));
    if (!userToDelete) return;

    // Simplified delete confirmation without guards
    if (window.confirm(`Tem certeza que deseja remover ${userToDelete.name} da equipe?`)) {
      deleteUser(id);
    }
  };

  // Fixed: using UserAccess key type
  const togglePermission = (key: keyof UserAccess) => {
    setUserForm(prev => ({
      ...prev,
      access: {
        ...prev.access,
        [key]: !prev.access[key]
      }
    }));
  };

  return (
    <div className="space-y-6">
      {/* Team Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-slate-800">Equipe</h2>
          {currentUser?.profile === 'ADMIN' && (
            <button
              onClick={openNewUser}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
            >
              <Plus className="w-4 h-4" />
              Novo membro
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {users.map(u => (
            <div
              key={u.id}
              className="bg-white p-4 rounded-xl border border-slate-100 flex items-center gap-4 justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                  <User />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">{u.name}</h4>
                  <p className="text-sm text-slate-500">
                    {u.role} •{' '}
                    <span className="text-xs bg-slate-100 px-1 rounded">
                      {u.profile}
                    </span>
                  </p>
                </div>
              </div>
              {currentUser?.profile === 'ADMIN' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditUser(u)}
                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(u.id)}
                    type="button"
                    className="p-2 rounded-lg border border-red-100 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Goals Section */}
      <section>
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Metas do Mês</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map(g => (
            <div
              key={g.id}
              className="bg-gradient-to-br from-brand-600 to-brand-700 text-white p-6 rounded-xl shadow-md"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg">{g.description}</h3>
                  <p className="text-brand-100 text-sm">
                    Responsável:{' '}
                    {users.find(u => u.id === g.responsibleId)?.name}
                  </p>
                </div>
                <span className="bg-white/20 px-2 py-1 rounded text-xs">
                  {g.status}
                </span>
              </div>
              <div className="flex justify-between items-end">
                <div className="text-3xl font-bold">
                  {formatCurrency(g.targetValue)}
                </div>
                <div className="text-sm text-brand-100">
                  {formatDate(g.endDate)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tasks Section */}
      <section>
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Minhas Tarefas</h2>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          {myTasks.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Você não tem tarefas pendentes.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {myTasks.map(t => (
                <div
                  key={t.id}
                  className="p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                >
                  <button
                    onClick={() =>
                      toggleTaskStatus(
                        t.id,
                        t.status === 'Concluída' ? 'A fazer' : 'Concluída',
                      )
                    }
                    className={`text-slate-400 hover:text-brand-600 ${t.status === 'Concluída' ? 'text-brand-600' : ''
                      }`}
                  >
                    {t.status === 'Concluída' ? <CheckSquare /> : <Square />}
                  </button>
                  <div className="flex-1">
                    <p
                      className={`font-medium ${t.status === 'Concluída'
                        ? 'line-through text-slate-400'
                        : 'text-slate-800'
                        }`}
                    >
                      {t.description}
                    </p>
                    <p className="text-xs text-slate-500">
                      Prazo: {formatDate(t.deadline)} • Prioridade: {t.priority}
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 bg-slate-100 rounded">
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Modal de criar/editar usuário */}
      {(editingUser || isNewUser) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-800">
              {isNewUser ? 'Novo membro da equipe' : 'Editar membro da equipe'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={userForm.name}
                  onChange={e =>
                    setUserForm(f => ({ ...f, name: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Função
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={userForm.role}
                  onChange={e =>
                    setUserForm(f => ({ ...f, role: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Perfil de acesso
                </label>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={userForm.profile}
                  onChange={e =>
                    setUserForm(f => ({ ...f, profile: e.target.value }))
                  }
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="COLABORADOR">COLABORADOR</option>
                </select>
              </div>

              {currentUser?.profile === 'ADMIN' && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-sm font-bold text-slate-700 mb-2">Permissões de Visualização</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <label className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={userForm.access.dashboard}
                        onChange={() => togglePermission('dashboard')}
                        className="rounded text-brand-600"
                      />
                      <span>Dashboard</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={userForm.access.sales}
                        onChange={() => togglePermission('sales')}
                        className="rounded text-brand-600"
                      />
                      <span>Vendas</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={userForm.access.marketing}
                        onChange={() => togglePermission('marketing')}
                        className="rounded text-brand-600"
                      />
                      <span>Marketing</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={userForm.access.finance}
                        onChange={() => togglePermission('finance')}
                        className="rounded text-brand-600"
                      />
                      <span>Financeiro</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={userForm.access.team}
                        onChange={() => togglePermission('team')}
                        className="rounded text-brand-600"
                      />
                      <span>Equipe</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={userForm.access.goals}
                        onChange={() => togglePermission('goals')}
                        className="rounded text-brand-600"
                      />
                      <span>Metas & Tarefas</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-2">
              <button
                onClick={() => {
                  setEditingUser(null);
                  setIsNewUser(false);
                }}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveUser}
                className="px-3 py-2 text-sm rounded-lg bg-brand-600 text-white hover:bg-brand-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
