import React, { useState } from 'react';
import { KeyRound, Lock, ArrowRight } from 'lucide-react';
import App from './App';

export default function Root() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('auth_token') === 'authenticated';
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const defaultPassword = import.meta.env.VITE_APP_PASSWORD || 'admin123';
    if (password === defaultPassword) {
      localStorage.setItem('auth_token', 'authenticated');
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 p-8 rounded-xl shadow-sm w-full max-w-md">
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
              <Lock className="w-6 h-6" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-center text-slate-800 mb-1">Task Manager Kuliah</h1>
          <p className="text-slate-500 text-center text-sm mb-6">Masukkan password untuk mengakses sistem</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <KeyRound className="w-5 h-5" />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  autoFocus
                />
              </div>
              {error && <p className="text-rose-500 text-xs mt-2 pl-1">Password salah! Coba lagi.</p>}
            </div>

    <button
      type="submit"
      className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium rounded-lg transition-all shadow-md flex items-center justify-center gap-2"
    >
      <span>Masuk Sistem</span>
      <ArrowRight className="w-4 h-4" />
    </button>
          </form>
        </div>
      </div>
    );
  }

  return <App onLogout={handleLogout} />;
}
