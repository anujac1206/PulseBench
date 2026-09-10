import { useEffect, useState } from 'react';
import { TickMetrics } from '../types/metrics';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { Activity, BarChart2, AlertTriangle } from 'lucide-react';

interface LiveChartsProps {
  metrics: TickMetrics | null;
}

interface ChartPoint extends TickMetrics {
  second: number;
}

export default function LiveCharts({ metrics }: LiveChartsProps) {
  const [history, setHistory] = useState<ChartPoint[]>([]);

  useEffect(() => {
    if (metrics) {
      setHistory((prev) => [...prev, { second: prev.length + 1, ...metrics }]);
    } else {
      setHistory([]);
    }
  }, [metrics]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 shadow-xl text-xs font-mono">
          <p className="text-slate-400 font-bold mb-1 border-b border-slate-800 pb-1">Time: {label}s</p>
          {payload.map((p: any) => (
            <div key={p.name} className="flex items-center gap-4 py-0.5 justify-between">
              <span className="flex items-center gap-1.5" style={{ color: p.color }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.color }}></span>
                {p.name}:
              </span>
              <span className="font-bold text-slate-100">{p.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (history.length === 0) {
    return (
      <div className="w-full bg-slate-900/40 border border-slate-800/80 rounded-xl p-8 text-center text-slate-500 text-xs">
        Waiting for live telemetry stream...
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Chart 1: Requests Progress */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <Activity className="h-4 w-4 text-blue-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Chart 1: Requests Progress</h4>
        </div>
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
              <XAxis dataKey="second" stroke="#64748b" fontSize={10} fontFamily="monospace" tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} fontFamily="monospace" tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              <Line type="monotone" dataKey="sentRequests" stroke="#3b82f6" strokeWidth={2} dot={false} name="Sent" />
              <Line type="monotone" dataKey="completedRequests" stroke="#10b981" strokeWidth={2} dot={false} name="Completed" />
              <Line type="monotone" dataKey="inFlightCount" stroke="#f59e0b" strokeWidth={2} dot={false} name="In Flight" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Throughput (Target vs Actual) */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <BarChart2 className="h-4 w-4 text-indigo-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Chart 2: Throughput (Target vs Actual)</h4>
        </div>
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
              <XAxis dataKey="second" stroke="#64748b" fontSize={10} fontFamily="monospace" tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} fontFamily="monospace" tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              <Line type="monotone" dataKey="targetRps" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Target RPS" />
              <Line type="monotone" dataKey="actualRps" stroke="#ec4899" strokeWidth={2} dot={false} name="Actual RPS" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 3: Error Breakdown */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <AlertTriangle className="h-4 w-4 text-emerald-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Chart 3: Error Breakdown</h4>
        </div>
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
              <XAxis dataKey="second" stroke="#64748b" fontSize={10} fontFamily="monospace" tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} fontFamily="monospace" tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              <Line type="monotone" dataKey="successRequests" stroke="#10b981" strokeWidth={2} dot={false} name="Success" />
              <Line type="monotone" dataKey="failedRequests" stroke="#ef4444" strokeWidth={2} dot={false} name="Failed" />
              <Line type="monotone" dataKey="timeoutRequests" stroke="#f59e0b" strokeWidth={2} dot={false} name="Timeout" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
