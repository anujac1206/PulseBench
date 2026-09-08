import { useEffect, useState } from 'react';
import { api } from '../services/client';
import { Cpu, HardDrive, Layers, RefreshCw } from 'lucide-react';

interface ClusterStats {
  cpuPercent: number;
  memoryPercent: number;
  runningPods: number;
}

export default function ClusterMonitor() {
  const [stats, setStats] = useState<ClusterStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function poll() {
    try {
      const data = await api('/api/cluster');
      setStats(data);
      setLastUpdated(new Date());
    } catch {
      // cluster metrics are best-effort; ignore errors so the rest of the UI keeps working
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, []);

  function getStatusColor(percent: number) {
    if (percent > 85) return 'text-red-500';
    if (percent > 60) return 'text-yellow-500';
    return 'text-emerald-500';
  }

  function getProgressColor(percent: number) {
    if (percent > 85) return 'bg-red-500';
    if (percent > 60) return 'bg-yellow-500';
    return 'bg-gradient-to-r from-cyan-500 to-emerald-500';
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Cluster Telemetry
          </h3>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>
            {lastUpdated 
              ? `Refreshed: ${lastUpdated.toLocaleTimeString()}`
              : 'Polling...'}
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CPU Usage Card */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-xl p-5 relative overflow-hidden group hover:border-slate-700/80 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
          <div className="absolute right-4 top-4 text-slate-700 group-hover:text-slate-500 transition-colors">
            <Cpu className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">CPU Utilization</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-bold tracking-tight font-mono ${stats ? getStatusColor(stats.cpuPercent) : 'text-slate-500'}`}>
              {stats ? `${stats.cpuPercent}%` : '—'}
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-4 w-full bg-slate-850 h-1.5 rounded-full overflow-hidden border border-slate-800/50">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${stats ? getProgressColor(stats.cpuPercent) : 'bg-slate-700'}`}
              style={{ width: stats ? `${Math.min(100, stats.cpuPercent)}%` : '0%' }}
            />
          </div>
        </div>

        {/* Memory Usage Card */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-xl p-5 relative overflow-hidden group hover:border-slate-700/80 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
          <div className="absolute right-4 top-4 text-slate-700 group-hover:text-slate-500 transition-colors">
            <HardDrive className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Memory Allocation</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-bold tracking-tight font-mono ${stats ? getStatusColor(stats.memoryPercent) : 'text-slate-500'}`}>
              {stats ? `${stats.memoryPercent}%` : '—'}
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-4 w-full bg-slate-850 h-1.5 rounded-full overflow-hidden border border-slate-800/50">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${stats ? getProgressColor(stats.memoryPercent) : 'bg-slate-700'}`}
              style={{ width: stats ? `${Math.min(100, stats.memoryPercent)}%` : '0%' }}
            />
          </div>
        </div>

        {/* Running Pods Card */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-xl p-5 relative overflow-hidden group hover:border-slate-700/80 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
          <div className="absolute right-4 top-4 text-slate-700 group-hover:text-slate-500 transition-colors">
            <Layers className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Workers (Pods)</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight font-mono text-cyan-400">
              {stats ? stats.runningPods : '—'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium font-mono">running</span>
          </div>
          {/* Visual Pod Indicator Grid */}
          <div className="mt-4 flex gap-1.5 items-center">
            {stats && stats.runningPods > 0 ? (
              Array.from({ length: Math.min(12, stats.runningPods) }).map((_, i) => (
                <span 
                  key={i} 
                  className="h-2 w-2 rounded-sm bg-emerald-500/80 shadow-[0_0_6px_rgba(16,185,129,0.3)] animate-pulse"
                  style={{ animationDelay: `${i * 150}ms` }}
                ></span>
              ))
            ) : (
              <span className="text-[11px] text-slate-505 italic">No active worker pods detected</span>
            )}
            {stats && stats.runningPods > 12 && (
              <span className="text-[10px] text-slate-500 font-mono font-bold">+{stats.runningPods - 12}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
