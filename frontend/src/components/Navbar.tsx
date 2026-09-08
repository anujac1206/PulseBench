import { useNavigate } from 'react-router-dom';
import { clearAuth } from '../services/client';
import { Activity, LogOut } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();

  function handleLogout() {
    clearAuth();
    navigate('/login');
  }

  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 text-slate-100">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-cyan-400" />
        <span className="font-bold tracking-wide bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">PulseBench</span>
      </div>
      <button 
        onClick={handleLogout} 
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-all"
      >
        <LogOut className="h-4 w-4" />
        <span>Log out</span>
      </button>
    </nav>
  );
}
