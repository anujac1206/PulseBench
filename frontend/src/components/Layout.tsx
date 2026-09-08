import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { clearAuth } from '../services/client';
import { 
  LayoutDashboard, 
  Activity, 
  LogOut, 
  Menu, 
  X, 
  User,
  ShieldCheck,
  Flame,
  LineChart
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  projectName?: string;
}

export default function Layout({ children, projectName }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userName, setUserName] = useState('Operator');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const name = localStorage.getItem('userName');
    const email = localStorage.getItem('userEmail');
    if (name) setUserName(name);
    if (email) setUserEmail(email);
  }, []);

  function handleLogout() {
    clearAuth();
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    navigate('/login');
  }

  const menuItems = [
    { 
      name: 'Overview', 
      path: '/', 
      icon: LayoutDashboard 
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row grid-bg">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800/80 z-20">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-cyan-400 animate-pulse-glow" />
          <span className="font-bold text-lg tracking-wider bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
            PulseBench
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1 rounded text-slate-400 hover:text-white focus:outline-none"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[60px] bg-slate-900 border-b border-slate-800 z-10 p-4 space-y-4 animate-fadeIn">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    active 
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {projectName && (
            <div className="px-4 py-3 bg-slate-800/40 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-500 block uppercase tracking-wider font-bold">Active Project</span>
              <span className="text-sm font-semibold text-slate-200 mt-1 block truncate">{projectName}</span>
            </div>
          )}

          <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold text-sm uppercase">
                {userName.charAt(0)}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-300 leading-none">{userName}</p>
                <p className="text-xs text-slate-500 truncate mt-0.5 max-w-[150px]">{userEmail || 'operator@pulsebench.io'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900/80 backdrop-blur-xl border-r border-slate-800/60 p-5 shrink-0 select-none">
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="p-2 bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 rounded-lg border border-cyan-500/30 glow-cyan">
            <Activity className="h-6 w-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent">
              PulseBench
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Metrics Live</span>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="space-y-6 flex-1">
          <div>
            <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2.5">
              Monitoring
            </span>
            <div className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      active 
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.05)]' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {projectName && (
            <div className="pt-2">
              <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2.5">
                Current Scope
              </span>
              <div className="mx-2 p-3 bg-slate-950/60 rounded-lg border border-slate-800/60 relative overflow-hidden group">
                <div className="absolute right-2 top-2">
                  <Flame className="h-4 w-4 text-orange-500/30 group-hover:text-orange-500/50 transition-colors" />
                </div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Project</p>
                <p className="text-sm font-bold text-slate-200 mt-1 truncate" title={projectName}>
                  {projectName}
                </p>
                <Link
                  to="/"
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold mt-2.5 inline-flex items-center gap-1 group/link"
                >
                  Change Project
                  <span className="group-hover/link:translate-x-0.5 transition-transform">→</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User profile & actions at bottom */}
        <div className="border-t border-slate-800/80 pt-4 mt-auto">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 border border-slate-800/40">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-sm uppercase">
                {userName.charAt(0)}
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-bold text-slate-200 truncate leading-tight">{userName}</p>
                <p className="text-[10px] text-slate-500 truncate mt-0.5">{userEmail || 'operator@pulsebench.io'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Row */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-slate-900/30 border-b border-slate-800/40 select-none">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <span>PulseBench</span>
            <span className="text-slate-600">/</span>
            {projectName ? (
              <>
                <Link to="/" className="hover:text-slate-300">Projects</Link>
                <span className="text-slate-600">/</span>
                <span className="text-slate-200 font-semibold truncate max-w-[200px]">{projectName}</span>
              </>
            ) : (
              <span className="text-slate-200 font-semibold">Overview</span>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-md text-[11px] font-semibold text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span>API Gateway Connected</span>
            </div>
          </div>
        </header>

        {/* Page Content wrapper */}
        <div className="p-6 md:p-8 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
