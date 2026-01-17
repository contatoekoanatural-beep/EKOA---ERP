
import React, { useContext, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingBag, Megaphone, DollarSign, Users, Target, Menu, X, LogOut, Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

import { UserAccess } from '../types';

const SidebarItem: React.FC<{ to: string, icon: any, label: string, end?: boolean }> = ({ to, icon: Icon, label, end }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${isActive
        ? 'bg-[#5D7F38] text-white shadow-lg shadow-[#5D7F38]/20 translate-x-1'
        : 'text-[#808080] hover:text-[#E5E5E5] hover:bg-white/5'
      }`
    }
  >
    <Icon size={20} className="shrink-0" />
    <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
  </NavLink>
);

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, logout, can, profileReady } = useAuth();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const location = useLocation();

  const menuItems = useMemo(() => [
    { to: "/", icon: LayoutDashboard, label: "Dashboard", module: 'dashboard' as keyof UserAccess, end: true },
    { to: "/vendas", icon: ShoppingBag, label: "Vendas", module: 'sales' as keyof UserAccess },
    { to: "/marketing", icon: Megaphone, label: "Marketing", module: 'marketing' as keyof UserAccess },
    { to: "/financeiro", icon: DollarSign, label: "Financeiro", module: 'finance' as keyof UserAccess },
    { to: "/equipe", icon: Users, label: "Equipe", module: 'team' as keyof UserAccess },
    { to: "/metas", icon: Target, label: "Metas & Tarefas", module: 'goals' as keyof UserAccess },
  ], []);

  const visibleMenuItems = useMemo(() => {
    if (!profileReady) return [];
    return menuItems.filter(item => can(item.module));
  }, [profileReady, currentUser, can, menuItems]);

  return (
    <div className="flex h-screen bg-[#141414] font-sans selection:bg-[#5D7F38] selection:text-white">
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`
          fixed md:relative z-50 w-72 h-full bg-[#0F0F0F] border-r border-white/5 
          flex flex-col transition-transform duration-300 ease-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Header / Logo */}
        <div className="p-8 pb-4 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-6 bg-[#5D7F38] rounded-full"></div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Ekoa<span className="text-[#808080]">Manager</span></h1>
            </div>
            <p className="text-[10px] text-[#606060] uppercase font-black tracking-[0.2em] ml-4">Operação</p>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden text-[#808080] hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-6 py-6 space-y-2">
          {profileReady ? visibleMenuItems.map(item => (
            <SidebarItem key={item.to} to={item.to} icon={item.icon} label={item.label} end={item.end} />
          )) : (
            <div className="flex flex-col items-center justify-center py-12 text-[#404040] gap-3">
              <Loader2 className="animate-spin" size={24} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Carregando menu...</span>
            </div>
          )}
        </nav>

        {/* Footer / User Profile */}
        <div className="p-6 border-t border-white/5 bg-[#141414]">
          <div className="flex items-center gap-4 p-3 bg-[#1F1F1F] rounded-2xl border border-white/5 mb-4 group hover:border-white/10 transition-colors">
            <div className={`
              flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center 
              text-white font-bold text-lg shadow-inner
              ${profileReady && currentUser?.role?.toLowerCase() === 'admin' ? 'bg-[#5D7F38]' : 'bg-[#333]'}
            `}>
              {profileReady ? (currentUser?.name?.charAt(0).toUpperCase() || 'U') : '...'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-gray-200 truncate group-hover:text-white transition-colors">
                {profileReady ? (currentUser?.name || 'Usuário') : '...'}
              </p>
              <span className="text-[10px] font-black uppercase text-[#606060] tracking-wider">
                {profileReady ? (currentUser?.role || 'staff') : '...'}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-transparent border border-[#EF4444]/20 text-[#EF4444] text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#EF4444]/10 transition-all active:scale-[0.98]"
          >
            <LogOut size={14} /> Sair do Sistema
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#141414] relative">
        {/* Mobile Header */}
        <header className="md:hidden bg-[#0F0F0F] border-b border-white/5 p-4 flex justify-between items-center z-30">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-[#5D7F38] rounded-full"></div>
            <h1 className="font-bold text-white tracking-tight">EkoaManager</h1>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="text-[#808080] p-2 hover:bg-white/5 rounded-lg">
            <Menu size={24} />
          </button>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 md:p-8 relative">
          {children}
        </div>
      </main>
    </div>
  );
};
