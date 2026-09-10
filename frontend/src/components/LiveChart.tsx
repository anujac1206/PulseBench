import { useState } from 'react';
import { TickMetrics } from '../types/metrics';
import { 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { Clock, BarChart3, ShieldCheck } from 'lucide-react';

export interface TickPoint extends TickMetrics {
  second: number;
}

interface LiveChartProps {
  data: TickPoint[];
}

type TabType = 'latency' | 'throughput' | 'success_rate';

export default function LiveChart({ data }: LiveChartProps) {
  const [activeTab, setActiveTab] = useState<TabType>('latency');

  const formattedData = data.map((d) => {
    const total = d.completedRequests;
    const rate = total > 0 ? Math.round((d.successRequests / total) * 100) : 100;
    return {
      ...d,
      successRate: rate,
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 shadow-xl glow-cyan text-xs font-mono">
          <p className="text-slate-400 font-bold mb-1 border-b border-slate-800 pb-1">Time: {label}s</p>
          {payload.map((p: any) => (
            <div key={p.name} className="flex items-center gap-4 py-0.5 justify-between">
              <span className="flex items-center gap-1.5" style={{ color: p.color }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.color }}></span>
                {p.name}:
              </span>
              <span className="font-bold text-slate-100">{p.value}{p.unit || ''}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.15)] flex flex-col space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 bg-cyan-400 rounded-full animate-ping"></span>
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">Live Telemetry Analysis</h4>
        </div>
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('latency')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'latency'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Latency</span>
          </button>
          <button
            onClick={() => setActiveTab('throughput')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'throughput'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Throughput</span>
          </button>
          <button
            onClick={() => setActiveTab('success_rate')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'success_rate'
                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Success Rate</span>
          </button>
        </div>
      </div>

      <div className="w-full h-80 min-h-[320px]">
        {data.length === 0 ? (
          <div className="w-full h-full border border-dashed border-slate-800 rounded-lg flex flex-col items-center justify-center text-slate-500 space-y-2">
            <span className="animate-pulse flex items-center gap-2">
              <span className="h-1.5 w-1.5 bg-slate-500 rounded-full"></span>
              Waiting for live run data stream...
            </span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {activeTab === 'latency' ? (
              <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorP95" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                <XAxis dataKey="second" stroke="#64748b" fontSize={10} fontFamily="monospace" tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} fontFamily="monospace" tickLine={false} unit="ms" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Area type="monotone" dataKey="avgLatencyMs" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorAvg)" name="Avg Latency" unit=" ms" />
                <Area type="monotone" dataKey="p95LatencyMs" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorP95)" name="P95 Latency" unit=" ms" />
              </AreaChart>
            ) : activeTab === 'throughput' ? (
              <LineChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                <XAxis dataKey="second" stroke="#64748b" fontSize={10} fontFamily="monospace" tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} fontFamily="monospace" tickLine={false} unit="req" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Line type="monotone" dataKey="successRequests" stroke="#10b981" strokeWidth={2} dot={false} name="Success Requests" unit=" reqs" />
                <Line type="monotone" dataKey="failedRequests" stroke="#ef4444" strokeWidth={2} dot={false} name="Failed Requests" unit=" reqs" />
              </LineChart>
            ) : (
              <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                <XAxis dataKey="second" stroke="#64748b" fontSize={10} fontFamily="monospace" tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} fontFamily="monospace" tickLine={false} domain={[0, 100]} unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Area type="monotone" dataKey="successRate" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorRate)" name="Success Rate" unit="%" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
