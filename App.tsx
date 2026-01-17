
import React, { } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

// Context Providers
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FinanceProvider } from './contexts/FinanceContext';
import { MarketingProvider } from './contexts/MarketingContext';
import { OperationsProvider } from './contexts/OperationsContext';

import { Layout } from './components/Layout';
import { LoginPage } from './components/LoginPage';
import { ToastProvider } from './components/Toast';
import { Dashboard } from './pages/Dashboard';
import { Sales } from './pages/Sales';
import { Products } from './pages/Products';
import { Marketing } from './pages/Marketing';
import { Finance } from './pages/finance/Finance';
import { FeesManagement } from './pages/FeesManagement';
import { FrustratedSales } from './pages/FrustratedSales';
import { Team } from './pages/Team';
import { GoalsAndTasks } from './pages/GoalsAndTasks';
import { UserAccess } from './types';
import { Lock } from 'lucide-react';

const ProtectedRoute: React.FC<{ children: React.ReactNode; module: keyof UserAccess }> = ({ children, module }) => {
  const { can, profileReady, currentUser } = useAuth();
  if (!profileReady) return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600 mb-4"></div>
      <p className="text-slate-500 font-bold">Verificando permissões...</p>
    </div>
  );
  if (!currentUser) return <Navigate to="/" />;
  if (!can(module)) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6 bg-white rounded-3xl border border-slate-100 mx-4 shadow-sm">
      <div className="bg-red-50 p-4 rounded-full mb-4">
        <Lock size={48} className="text-red-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-800">Módulo Bloqueado</h2>
      <p className="text-slate-500 mt-2 max-w-xs text-sm">Você ainda não tem permissão para acessar este módulo.</p>
    </div>
  );
  return <>{children}</>;
};

const AppContent = () => {
  const { currentUser } = useAuth();

  if (!currentUser) return <LoginPage />; // AuthContext handles checking vs loading loop

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<ProtectedRoute module="dashboard"><Dashboard /></ProtectedRoute>} />
          <Route path="/vendas" element={<ProtectedRoute module="sales"><Sales /></ProtectedRoute>} />
          <Route path="/vendas/frustradas" element={<ProtectedRoute module="sales"><FrustratedSales /></ProtectedRoute>} />
          <Route path="/vendas/produtos" element={<ProtectedRoute module="sales"><Products /></ProtectedRoute>} />
          <Route path="/marketing" element={<ProtectedRoute module="marketing"><Marketing /></ProtectedRoute>} />
          <Route path="/financeiro" element={<ProtectedRoute module="finance"><Finance forcedScope="PJ" /></ProtectedRoute>} />
          <Route path="/financeiro-pessoal" element={<ProtectedRoute module="finance"><Finance forcedScope="PF" /></ProtectedRoute>} />
          <Route path="/financeiro/taxas" element={<ProtectedRoute module="finance"><FeesManagement /></ProtectedRoute>} />
          <Route path="/equipe" element={<ProtectedRoute module="team"><Team /></ProtectedRoute>} />
          <Route path="/metas" element={<ProtectedRoute module="goals"><GoalsAndTasks /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </HashRouter>
  )
}

const App = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <OperationsProvider>
          <FinanceProvider>
            <MarketingProvider>
              <AppContent />
            </MarketingProvider>
          </FinanceProvider>
        </OperationsProvider>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
