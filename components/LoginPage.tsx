
import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInAnonymously, 
  Auth 
} from 'firebase/auth';
import { LogIn, UserPlus, UserCircle } from 'lucide-react';

interface LoginPageProps {
  auth: Auth;
}

export const LoginPage: React.FC<LoginPageProps> = ({ auth }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError('Falha ao entrar: Verifique suas credenciais.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password) return setError('Preencha email e senha.');
    setLoading(true);
    setError('');
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError('Erro ao criar conta: Verifique os dados.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setLoading(true);
    setError('');
    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      setError('Erro ao entrar como convidado.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-brand-700">Ekoa<span className="text-slate-800">Manager</span></h1>
          <p className="text-slate-500 mt-2">Gestão Operacional Ekoa Natural</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
            <input 
              type="email" 
              required 
              className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand-500 transition-all"
              placeholder="exemplo@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
            <input 
              type="password" 
              required 
              className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand-500 transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-brand-600 text-white font-bold py-3 rounded-lg hover:bg-brand-700 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <LogIn size={20} /> Entrar
            </button>
            <button 
              type="button"
              onClick={handleSignUp}
              disabled={loading}
              className="w-full bg-white text-slate-700 border border-slate-200 font-bold py-3 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <UserPlus size={20} /> Criar Conta
            </button>
          </div>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200"></span></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400">Ou continue como</span></div>
        </div>

        <button 
          onClick={handleGuest}
          disabled={loading}
          className="w-full text-brand-600 font-semibold py-2 hover:underline flex items-center justify-center gap-2 text-sm disabled:opacity-50"
        >
          <UserCircle size={18} /> Entrar como convidado
        </button>

        <p className="text-[10px] text-center text-slate-400">
          Acesso seguro via Firebase Authentication. Dados isolados por UID.
        </p>
      </div>
    </div>
  );
};
