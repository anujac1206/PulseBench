import { useEffect, useState, FormEvent, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import LiveCharts from '../components/LiveCharts';
import TestResults from '../components/TestResults';
import { TickMetrics } from '../types/metrics';
import { api, socket } from '../services/client';
import { 
  Activity, 
  Play, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Info, 
  Terminal, 
  Globe, 
  Clock, 
  TrendingUp, 
  Database
} from 'lucide-react';

interface Endpoint {
  id: string;
  name: string;
  url: string;
  method: string;
  testRuns: TestRun[];
}

interface TestRun {
  id: string;
  status: string;
  sentRequests?: number;
  completedRequests?: number;
  successRequests?: number;
  failedRequests?: number;
  timeoutRequests?: number;
  targetRps?: number;
  actualRps?: number;
  avgLatencyMs?: number;
  p95LatencyMs?: number;
  recommendation?: string;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  endpoints: Endpoint[];
}

export default function ProjectPage() {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);

  const [epName, setEpName] = useState('');
  const [epUrl, setEpUrl] = useState('');
  const [epMethod, setEpMethod] = useState('GET');
  const [addingEp, setAddingEp] = useState(false);

  const [selectedEndpoint, setSelectedEndpoint] = useState('');
  const [numRequests, setNumRequests] = useState(50);
  const [requestsPerSec, setRequestsPerSec] = useState(5);
  const [pattern, setPattern] = useState('constant');
  const [startingTest, setStartingTest] = useState(false);

  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [testMetrics, setTestMetrics] = useState<TickMetrics | null>(null);
  const [recommendation, setRecommendation] = useState<string | null>(null);

  const [logs, setLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  function addLog(message: string) {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${time}] ${message}`]);
  }

  async function loadProject() {
    try {
      const data = await api(`/api/projects/${id}`);
      setProject(data);
      if (data.endpoints.length > 0 && !selectedEndpoint) {
        setSelectedEndpoint(data.endpoints[0].id);
      }
    } catch (err) {
      console.error('Failed to load project details:', err);
    }
  }

  useEffect(() => {
    loadProject();
    addLog('System dashboard loaded.');
  }, [id]);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  useEffect(() => {
    socket.connect();
    addLog('Websocket handshake initialized.');

    socket.on('test_tick', (metrics: TickMetrics) => {
      setTestMetrics({
        sentRequests: metrics.sentRequests,
        completedRequests: metrics.completedRequests,
        successRequests: metrics.successRequests,
        failedRequests: metrics.failedRequests,
        timeoutRequests: metrics.timeoutRequests,
        targetRps: metrics.targetRps,
        actualRps: metrics.actualRps,
        avgLatencyMs: metrics.avgLatencyMs,
        p95LatencyMs: metrics.p95LatencyMs,
        inFlightCount: metrics.inFlightCount,
      });
      addLog(
        `Metrics Tick: Sent: ${metrics.sentRequests} | Completed: ${metrics.completedRequests} | RPS: ${metrics.actualRps} | Avg Latency: ${metrics.avgLatencyMs}ms`
      );
    });

    socket.on('test_complete', (metrics: TickMetrics & { recommendation?: string }) => {
      setTestMetrics({
        sentRequests: metrics.sentRequests,
        completedRequests: metrics.completedRequests,
        successRequests: metrics.successRequests,
        failedRequests: metrics.failedRequests,
        timeoutRequests: metrics.timeoutRequests,
        targetRps: metrics.targetRps,
        actualRps: metrics.actualRps,
        avgLatencyMs: metrics.avgLatencyMs,
        p95LatencyMs: metrics.p95LatencyMs,
        inFlightCount: metrics.inFlightCount,
      });
      if (metrics.recommendation) {
        setRecommendation(metrics.recommendation);
      }
      setActiveTestId(null);
      addLog(`Stress run completed. Recommendation: "${metrics.recommendation || 'Complete'}"`);
      loadProject();
    });

    return () => {
      socket.off('test_tick');
      socket.off('test_complete');
      socket.disconnect();
      addLog('Websocket telemetry offline.');
    };
  }, [socket]);

  async function handleAddEndpoint(e: FormEvent) {
    e.preventDefault();
    if (!epName.trim() || !epUrl.trim()) return;
    setAddingEp(true);
    try {
      await api(`/api/projects/${id}/endpoints`, {
        method: 'POST',
        body: JSON.stringify({ name: epName, url: epUrl, method: epMethod }),
      });
      addLog(`New target endpoint registered: [${epMethod}] ${epUrl}`);
      setEpName('');
      setEpUrl('');
      await loadProject();
    } catch (err) {
      console.error('Failed to add endpoint:', err);
    } finally {
      setAddingEp(false);
    }
  }

  async function handleRunTest(e: FormEvent) {
    e.preventDefault();
    if (!selectedEndpoint) return;
    setTestMetrics(null);
    setRecommendation(null);
    setStartingTest(true);
    try {
      const { testId } = await api('/api/tests', {
        method: 'POST',
        body: JSON.stringify({ endpointId: selectedEndpoint, numRequests, requestsPerSec, pattern }),
      });
      setActiveTestId(testId);
      socket.emit('join_test', testId);
      addLog(`Stress test run spawned. Test ID: ${testId.substring(0, 8)}`);
    } catch (err) {
      console.error('Failed to launch test:', err);
    } finally {
      setStartingTest(false);
    }
  }

  if (!project) return null;

  const allTestRuns = project.endpoints.flatMap((ep) =>
    ep.testRuns.map((t) => ({ ...t, endpointName: ep.name, endpointUrl: ep.url, endpointMethod: ep.method }))
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const completedRuns = allTestRuns.filter((r) => r.status === 'completed');
  const totalThroughput = completedRuns.reduce((sum, run) => sum + (run.completedRequests || run.sentRequests || 0), 0);
  const activeTestsCount = activeTestId ? 1 : 0;
  const avgLatency = completedRuns.length > 0 ? Math.round(completedRuns.reduce((sum, run) => sum + (run.avgLatencyMs || 0), 0) / completedRuns.length) : 0;
  const p95Latency = completedRuns.length > 0 ? Math.round(completedRuns.reduce((sum, run) => sum + (run.p95LatencyMs || 0), 0) / completedRuns.length) : 0;
  const totalSuccess = completedRuns.reduce((sum, run) => sum + (run.successRequests || 0), 0);
  const totalCompletedSum = completedRuns.reduce((sum, run) => sum + (run.completedRequests || 0), 0);
  const successRate = totalCompletedSum > 0 ? Math.round((totalSuccess / totalCompletedSum) * 100) : 100;

  function getMethodBadge(method: string) {
    switch (method.toUpperCase()) {
      case 'GET': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'POST': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  }

  return (
    <Layout projectName={project.name}>
      <div className="space-y-8 max-w-7xl mx-auto">
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Historical Throughput</span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold font-mono text-slate-100">{totalThroughput.toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 uppercase font-bold">Reqs</span>
            </div>
          </div>
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Tests</span>
            <div className="mt-2 flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${activeTestsCount > 0 ? 'bg-cyan-500 animate-ping' : 'bg-slate-700'}`}></span>
              <span className="text-2xl font-extrabold font-mono text-slate-100">{activeTestsCount}</span>
            </div>
          </div>
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Avg Latency</span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold font-mono text-cyan-400">{avgLatency}</span>
              <span className="text-[10px] text-slate-500 uppercase font-bold">ms</span>
            </div>
          </div>
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">P95 Latency</span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold font-mono text-purple-400">{p95Latency}</span>
              <span className="text-[10px] text-slate-500 uppercase font-bold">ms</span>
            </div>
          </div>
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Success Rate</span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className={`text-2xl font-extrabold font-mono ${successRate > 95 ? 'text-emerald-400' : 'text-yellow-400'}`}>{successRate}%</span>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-4.5 w-4.5 text-cyan-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">Target Endpoints</h3>
                </div>
              </div>
              <form onSubmit={handleAddEndpoint} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <input placeholder="Console Name" value={epName} onChange={(e) => setEpName(e.target.value)} disabled={addingEp} className="sm:col-span-4 bg-slate-950/80 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none" />
                <input placeholder="https://api.example.com" value={epUrl} onChange={(e) => setEpUrl(e.target.value)} disabled={addingEp} className="sm:col-span-5 bg-slate-950/80 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none" />
                <select value={epMethod} onChange={(e) => setEpMethod(e.target.value)} disabled={addingEp} className="sm:col-span-3 bg-slate-950/80 border border-slate-850 rounded-lg px-2 py-2 text-xs text-slate-300 outline-none">
                  <option>GET</option>
                  <option>POST</option>
                  <option>PUT</option>
                  <option>DELETE</option>
                </select>
                <button type="submit" disabled={addingEp || !epName.trim() || !epUrl.trim()} className="sm:col-span-12 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 text-xs font-bold rounded-lg py-2 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Target Endpoint</span>
                </button>
              </form>
            </section>

            <section className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-6">
              <form onSubmit={handleRunTest} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target</label>
                  <select value={selectedEndpoint} onChange={(e) => setSelectedEndpoint(e.target.value)} disabled={!!activeTestId} className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-2.5 text-xs text-slate-200">
                    {project.endpoints.map((ep) => <option key={ep.id} value={ep.id}>{ep.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reqs</label>
                  <input type="number" value={numRequests} onChange={(e) => setNumRequests(Number(e.target.value))} disabled={!!activeTestId} className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-200" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">RPS</label>
                  <input type="number" value={requestsPerSec} onChange={(e) => setRequestsPerSec(Number(e.target.value))} disabled={!!activeTestId} className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-200" />
                </div>
                <button type="submit" disabled={!!activeTestId || startingTest || project.endpoints.length === 0} className="bg-cyan-500 text-slate-950 font-bold py-2.5 rounded-lg text-xs hover:bg-cyan-400 transition-all flex items-center justify-center gap-1.5">
                  <Play className="h-3.5 w-3.5 fill-slate-950 text-slate-950" />
                  <span>Launch Stress Run</span>
                </button>
              </form>

              {/* Display Test Results Card Panel */}
              <TestResults metrics={testMetrics} recommendation={recommendation} />

              {/* Display Live Telemetry Charts */}
              <LiveCharts metrics={testMetrics} />
            </section>
          </div>
          <div className="lg:col-span-1">
            <section className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 h-[500px] flex flex-col">
              <h3 className="text-xs font-bold uppercase text-slate-400 mb-4">Telemetry Console</h3>
              <div className="flex-1 overflow-y-auto bg-slate-950 rounded-xl p-3 font-mono text-[10px] text-cyan-500/80 space-y-1">
                {logs.map((log, i) => <div key={i}>{log}</div>)}
                <div ref={logEndRef}></div>
              </div>
            </section>
          </div>
        </div>

        <section className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
          <h3 className="text-xs font-bold uppercase text-slate-400 mb-4">Historical Runs</h3>
          <div className="overflow-x-auto border border-slate-850 rounded-xl">
            <table className="w-full text-xs text-left bg-slate-950/20">
              <thead className="bg-slate-950 text-slate-500 uppercase text-[9px] font-mono">
                <tr>
                  <th className="p-3">Target</th>
                  <th className="p-3 text-right">Completed Reqs</th>
                  <th className="p-3 text-right">Success %</th>
                  <th className="p-3 text-right">Avg (ms)</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 font-mono text-[11px] text-slate-300">
                {allTestRuns.map((t) => {
                  const compReqs = t.completedRequests ?? t.sentRequests ?? 0;
                  const sRate = compReqs > 0 && t.successRequests ? Math.round((t.successRequests / compReqs) * 100) : 0;
                  return (
                    <tr key={t.id}>
                      <td className="p-3">{t.endpointName}</td>
                      <td className="p-3 text-right">{compReqs || '—'}</td>
                      <td className="p-3 text-right font-bold text-emerald-400">{sRate}%</td>
                      <td className="p-3 text-right text-cyan-400">{t.avgLatencyMs ?? '—'}</td>
                      <td className="p-3 text-center uppercase text-[9px] font-bold">{t.status}</td>
                      <td className="p-3 text-right text-slate-500">{new Date(t.createdAt).toLocaleTimeString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Layout>
  );
}
