'use client';

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Layers,
  Lock,
  Mail,
  Printer,
  Sparkles,
} from 'lucide-react';
import { API_BASE_URL } from './utils/apiBase';
import { saveSession, tryLegacyLogin, getLegacyAdminUser } from './utils/authSession';
import { getDefaultRoute } from './utils/permissions';

const DEFAULT_ADMIN = {
  email: 'krishna@gmail.com',
  password: 'krishna@123',
};

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const admin = localStorage.getItem('adminAuth');
    if (!admin) {
      localStorage.setItem('adminAuth', JSON.stringify(DEFAULT_ADMIN));
    } else {
      try {
        const storedAdmin = JSON.parse(admin);
        const isLegacyAccount =
          storedAdmin.email === 'admin@gmail.com' ||
          storedAdmin.password === '123456';
        if (isLegacyAccount) {
          localStorage.setItem('adminAuth', JSON.stringify(DEFAULT_ADMIN));
        }
      } catch {
        localStorage.setItem('adminAuth', JSON.stringify(DEFAULT_ADMIN));
      }
    }

    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (isLoggedIn === 'true') {
      if (!localStorage.getItem('currentUser')) {
        saveSession(getLegacyAdminUser());
      }
      navigate(getDefaultRoute());
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (response.ok) {
        const data = await response.json();
        saveSession(data.user);
        navigate(getDefaultRoute());
        window.location.reload();
        return;
      }

      const legacyUser = tryLegacyLogin(email.trim(), password);
      if (legacyUser) {
        navigate(getDefaultRoute());
        window.location.reload();
        return;
      }

      const errorData = await response.json().catch(() => ({}));
      setError(errorData.error || 'Invalid email or password. Please try again.');
    } catch (err) {
      const legacyUser = tryLegacyLogin(email.trim(), password);
      if (legacyUser) {
        navigate(getDefaultRoute());
        window.location.reload();
        return;
      }
      setError('Unable to connect to server. Try again or use krishna@gmail.com / krishna@123');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex font-sans relative overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-br from-[#0c1a4a] via-[#1e3a8a] to-[#312e81]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(251,146,60,0.18),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(96,165,250,0.22),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06),transparent_70%)]" />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col justify-between p-12 xl:p-16 z-10">
        <div className="absolute inset-0 bg-linear-to-br from-white/8 to-transparent backdrop-blur-[1px]" />
        <div className="absolute -top-32 -left-32 w-105 h-105 bg-orange-400/25 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-sky-400/20 rounded-full blur-[80px]" />
        <div className="absolute bottom-0 left-0 w-full h-2/5 bg-linear-to-t from-[#0c1a4a]/80 to-transparent" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-3 mb-6">
            <img src="/logo.png" alt="Krishna Printers Logo" className="h-20 w-auto drop-shadow-xl" />
          </div>
        </div>

        <div className="relative z-10 space-y-8 max-w-lg">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-blue-100 text-xs font-semibold mb-5">
              <Sparkles size={14} className="text-orange-400" />
              Smart Print Business CRM
            </span>
            <h1 className="text-4xl xl:text-5xl font-black text-white leading-[1.1] tracking-tight">
              Manage jobs, invoices & stock - all in one place.
            </h1>
            <p className="text-blue-100/80 text-base mt-5 leading-relaxed">
              Job cards, billing, challans, paper inventory and statements -
              built for modern printing presses.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Layers, label: 'Paper Stock', desc: 'Live inventory' },
              { icon: Printer, label: 'Job Cards', desc: 'Track every order' },
            ].map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-4 hover:bg-white/10 transition-colors"
              >
                <Icon size={20} className="text-orange-400 mb-2" />
                <p className="text-white font-bold text-sm">{label}</p>
                <p className="text-blue-200/70 text-xs mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-blue-200/50 text-xs">
          &copy; {new Date().getFullYear()} Krishna Printers
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative overflow-hidden z-10">
        <div className="absolute inset-0 bg-linear-to-bl from-[#eef4ff]/95 via-[#f5f0ff]/90 to-[#fff8f0]/95 lg:rounded-l-[3rem] lg:shadow-[-20px_0_60px_rgba(0,0,0,0.15)]" />
        <div className="absolute top-10 right-10 w-56 h-56 bg-blue-300/30 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-6 w-48 h-48 bg-orange-300/35 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-violet-200/25 rounded-full blur-3xl" />

        <div className="w-full max-w-md relative z-10">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-md">
              <Printer size={22} />
            </div>
            <div>
              <p className="text-gray-900 font-black text-lg leading-none">
                Krishna
              </p>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                Printers
              </p>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-indigo-200/40 border border-white/60 p-8 sm:p-10">
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                Welcome back
              </h2>
              <p className="text-gray-500 text-sm mt-2">
                Sign in to access your CRM dashboard
              </p>
            </div>

            {error && (
              <div className="mb-6 p-3.5 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                <AlertCircle
                  className="text-red-500 shrink-0 mt-0.5"
                  size={18}
                />
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="krishna@gmail.com"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter password"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-12 py-3.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 bg-linear-to-r from-[#2563eb] via-[#4f46e5] to-[#7c3aed] hover:from-[#1d4ed8] hover:via-[#4338ca] hover:to-[#6d28d9] disabled:opacity-70 text-white py-3.5 rounded-xl font-bold text-base shadow-lg shadow-indigo-500/30 transition-all active:scale-[0.98]"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>

          <p className="text-center text-gray-400 text-xs mt-6 lg:hidden">
            &copy; {new Date().getFullYear()} Krishna Printers
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
