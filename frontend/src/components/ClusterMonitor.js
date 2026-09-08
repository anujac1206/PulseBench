import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../services/client';
import { Cpu, HardDrive, Layers, RefreshCw } from 'lucide-react';
export default function ClusterMonitor() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    async function poll() {
        try {
            const data = await api('/api/cluster');
            setStats(data);
            setLastUpdated(new Date());
        }
        catch {
            // cluster metrics are best-effort; ignore errors so the rest of the UI keeps working
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        poll();
        const interval = setInterval(poll, 5000);
        return () => clearInterval(interval);
    }, []);
    function getStatusColor(percent) {
        if (percent > 85)
            return 'text-red-500';
        if (percent > 60)
            return 'text-yellow-500';
        return 'text-emerald-500';
    }
    function getProgressColor(percent) {
        if (percent > 85)
            return 'bg-red-500';
        if (percent > 60)
            return 'bg-yellow-500';
        return 'bg-gradient-to-r from-cyan-500 to-emerald-500';
    }
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Layers, { className: "h-4 w-4 text-cyan-400" }), _jsx("h3", { className: "text-xs font-bold text-slate-400 uppercase tracking-widest", children: "Cluster Telemetry" })] }), _jsxs("div", { className: "flex items-center gap-2 text-[10px] text-slate-500 font-mono", children: [_jsx(RefreshCw, { className: `h-3 w-3 ${loading ? 'animate-spin text-cyan-400' : ''}` }), _jsx("span", { children: lastUpdated
                                    ? `Refreshed: ${lastUpdated.toLocaleTimeString()}`
                                    : 'Polling...' })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsxs("div", { className: "bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-xl p-5 relative overflow-hidden group hover:border-slate-700/80 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.15)]", children: [_jsx("div", { className: "absolute right-4 top-4 text-slate-700 group-hover:text-slate-500 transition-colors", children: _jsx(Cpu, { className: "h-5 w-5" }) }), _jsx("p", { className: "text-xs font-semibold text-slate-400 uppercase tracking-wider", children: "CPU Utilization" }), _jsx("div", { className: "mt-3 flex items-baseline gap-2", children: _jsx("span", { className: `text-3xl font-bold tracking-tight font-mono ${stats ? getStatusColor(stats.cpuPercent) : 'text-slate-500'}`, children: stats ? `${stats.cpuPercent}%` : '—' }) }), _jsx("div", { className: "mt-4 w-full bg-slate-850 h-1.5 rounded-full overflow-hidden border border-slate-800/50", children: _jsx("div", { className: `h-full rounded-full transition-all duration-1000 ${stats ? getProgressColor(stats.cpuPercent) : 'bg-slate-700'}`, style: { width: stats ? `${Math.min(100, stats.cpuPercent)}%` : '0%' } }) })] }), _jsxs("div", { className: "bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-xl p-5 relative overflow-hidden group hover:border-slate-700/80 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.15)]", children: [_jsx("div", { className: "absolute right-4 top-4 text-slate-700 group-hover:text-slate-500 transition-colors", children: _jsx(HardDrive, { className: "h-5 w-5" }) }), _jsx("p", { className: "text-xs font-semibold text-slate-400 uppercase tracking-wider", children: "Memory Allocation" }), _jsx("div", { className: "mt-3 flex items-baseline gap-2", children: _jsx("span", { className: `text-3xl font-bold tracking-tight font-mono ${stats ? getStatusColor(stats.memoryPercent) : 'text-slate-500'}`, children: stats ? `${stats.memoryPercent}%` : '—' }) }), _jsx("div", { className: "mt-4 w-full bg-slate-850 h-1.5 rounded-full overflow-hidden border border-slate-800/50", children: _jsx("div", { className: `h-full rounded-full transition-all duration-1000 ${stats ? getProgressColor(stats.memoryPercent) : 'bg-slate-700'}`, style: { width: stats ? `${Math.min(100, stats.memoryPercent)}%` : '0%' } }) })] }), _jsxs("div", { className: "bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-xl p-5 relative overflow-hidden group hover:border-slate-700/80 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.15)]", children: [_jsx("div", { className: "absolute right-4 top-4 text-slate-700 group-hover:text-slate-500 transition-colors", children: _jsx(Layers, { className: "h-5 w-5" }) }), _jsx("p", { className: "text-xs font-semibold text-slate-400 uppercase tracking-wider", children: "Active Workers (Pods)" }), _jsxs("div", { className: "mt-3 flex items-baseline gap-2", children: [_jsx("span", { className: "text-3xl font-bold tracking-tight font-mono text-cyan-400", children: stats ? stats.runningPods : '—' }), _jsx("span", { className: "text-[10px] text-slate-400 font-medium font-mono", children: "running" })] }), _jsxs("div", { className: "mt-4 flex gap-1.5 items-center", children: [stats && stats.runningPods > 0 ? (Array.from({ length: Math.min(12, stats.runningPods) }).map((_, i) => (_jsx("span", { className: "h-2 w-2 rounded-sm bg-emerald-500/80 shadow-[0_0_6px_rgba(16,185,129,0.3)] animate-pulse", style: { animationDelay: `${i * 150}ms` } }, i)))) : (_jsx("span", { className: "text-[11px] text-slate-505 italic", children: "No active worker pods detected" })), stats && stats.runningPods > 12 && (_jsxs("span", { className: "text-[10px] text-slate-500 font-mono font-bold", children: ["+", stats.runningPods - 12] }))] })] })] })] }));
}
