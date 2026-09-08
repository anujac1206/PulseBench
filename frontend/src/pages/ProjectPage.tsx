import { useEffect, useState, FormEvent, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import LiveChart, { TickPoint } from '../components/LiveChart';
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
  Sparkles, 
  Clock, 
  TrendingUp, 
  ArrowLeftRight,
  Database,
  Shuffle
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
  pattern: string;
  totalRequests?: number;
  successRequests?: number;
  failedRequests?: number;
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

  // Add endpoint form state
  const [epName, setEpName] = useState('');
  const [epUrl, setEpUrl] = useState('');
  const [epMethod, setEpMethod] = useState('GET');
  const [addingEp, setAddingEp] = useState(false);

  // Run test form state
  const [selectedEndpoint, setSelectedEndpoint] = useState('');
  const [numRequests, setNumRequests] = useState(50);
  const [requestsPerSec, setRequestsPerSec] = useState(5);
  const [pattern, setPattern] = useState('constant');
  const [startingTest, setStartingTest] = useState(false);

  // Live test state
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [chartData, setChartData] = useState<TickPoint[]>([]);
  const [recommendation, setRecommendation] = useState<string | null>(null);

  // Real-time Activity Log
  const [logs, setLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Comparison View State
  const [selectedRuns, setSelectedRuns] = useState<string[]>([]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Socket setup
  useEffect(() => {
    socket.connect();
    addLog('Websocket handshake initialized.');

    socket.on('test_tick', (stats) => {
      setChartData((prev) => [...prev, { second: prev.length + 1, ...stats }]);
      addLog(
        `Metrics Tick: Reqs processed: ${stats.totalRequests} | Success: ${stats.successRequests} | Failed: ${stats.failedRequests} | Avg Latency: ${stats.avgLatencyMs}ms`
      );
    });

    socket.on('test_complete', (stats) => {
      setChartData((prev) => [...prev, { second: prev.length + 1, ...stats }]);
      setRecommendation(stats.recommendation);
      setActiveTestId(null);
      addLog(`Stress run completed. Recommendation: "${stats.recommendation}"`);
      loadProject(); // refresh historical runs
    });

    return () => {
      socket.off('test_tick');
      socket.off('test_complete');
      socket.disconnect();
      addLog('Websocket telemetry offline.');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      addLog(`Error registering endpoint: ${epUrl}`);
    } finally {
      setAddingEp(false);
    }
  }

  async function handleRunTest(e: FormEvent) {
    e.preventDefault();
    if (!selectedEndpoint) return;
    setChartData([]);
    setRecommendation(null);
    setStartingTest(true);

    const targetEp = project?.endpoints.find((ep) => ep.id === selectedEndpoint);
    addLog(`Pre-flight checks starting for target: [${targetEp?.method}] ${targetEp?.url}`);

    try {
      const { testId } = await api('/api/tests', {
        method: 'POST',
        body: JSON.stringify({ endpointId: selectedEndpoint, numRequests, requestsPerSec, pattern }),
      });

      addLog(`Stress test run spawned. Test ID: ${testId.substring(0, 8)}... Joining stream.`);
      setActiveTestId(testId);
      socket.emit('join_test', testId);
    } catch (err) {
      console.error('Failed to launch test:', err);
      addLog('Stress test launch failed. Check server logs.');
    } finally {
      setStartingTest(false);
    }
  }

  function handleCompareToggle(runId: string) {
    setSelectedRuns((prev) =>
      prev.includes(runId) ? prev.filter((id) => id !== runId) : [...prev, runId]
    );
  }

  if (!project) return null;

  // Flatten and sort history
  const allTestRuns = project.endpoints.flatMap((ep) =>
    ep.testRuns.map((t) => ({ ...t, endpointName: ep.name, endpointUrl: ep.url, endpointMethod: ep.method }))
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Aggregate telemetry statistics for KPI cards
  const completedRuns = allTestRuns.filter((r) => r.status === 'completed');
  
  // 1. Throughput (Total requests sent across completed tests)
  const totalThroughput = completedRuns.reduce((sum, run) => sum + (run.totalRequests || 0), 0);
  
  // 2. Active tests (count running tests)
  const activeTestsCount = activeTestId ? 1 : 0;
  
  // 3. Overall average latency
  const avgLatency = completedRuns.length > 0
    ? Math.round(completedRuns.reduce((sum, run) => sum + (run.avgLatencyMs || 0), 0) / completedRuns.length)
    : 0;

  // 4. Overall P95 latency (average of P95 values)
  const p95Latency = completedRuns.length > 0
    ? Math.round(completedRuns.reduce((sum, run) => sum + (run.p95LatencyMs || 0), 0) / completedRuns.length)
    : 0;

  // 5. Success rate
  const totalSuccess = completedRuns.reduce((sum, run) => sum + (run.successRequests || 0), 0);
  const totalRequestsSum = completedRuns.reduce((sum, run) => sum + (run.totalRequests || 0), 0);
  const successRate = totalRequestsSum > 0 ? Math.round((totalSuccess / totalRequestsSum) * 100) : 100;

  // Recommendation Severity Classifier
  function getRecSeverity(recText: string) {
    if (recText.includes('High error rate') || recText.includes('failed') && recText.includes('>20%')) {
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
        text: 'text-red-400',
        icon: XCircle,
        label: 'Severity: Danger',
      };
    }
    if (recText.includes('high') || recText.includes('failed') || recText.includes('high latency')) {
      return {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        text: 'text-amber-400',
        icon: AlertCircle,
        label: 'Severity: Warning',
      };
    }
    if (recText.includes('handled this load well')) {
      return {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        text: 'text-emerald-400',
        icon: CheckCircle2,
        label: 'Severity: Healthy',
      };
    }
    return {
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/20',
      text: 'text-sky-400',
      icon: Info,
      label: 'Severity: Informational',
    };
  }

  // Selected runs details for side-by-side compare
  const compareRuns = allTestRuns.filter((run) => selectedRuns.includes(run.id));

  // Badge helper for methods
  function getMethodBadge(method: string) {
    switch (method.toUpperCase()) {
      case 'GET': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'POST': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'PUT': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'DELETE': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  }

  return (
    <Layout projectName={project.name}>
      <div className="space-y-8 max-w-7xl mx-auto">
        
        {/* KPI Cards Grid */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Historical Throughput</span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold tracking-tight font-mono text-slate-100">{totalThroughput.toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 uppercase font-bold">Reqs</span>
            </div>
            <div className="absolute right-3 bottom-3 opacity-20"><Database className="h-5 w-5 text-cyan-400" /></div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-sans">Active Tests</span>
            <div className="mt-2 flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${activeTestsCount > 0 ? 'bg-cyan-500 animate-ping' : 'bg-slate-700'}`}></span>
              <span className="text-2xl font-extrabold tracking-tight font-mono text-slate-100">{activeTestsCount}</span>
            </div>
            <div className="absolute right-3 bottom-3 opacity-20"><Activity className="h-5 w-5 text-cyan-400" /></div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Overall Avg Latency</span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold tracking-tight font-mono text-cyan-400">{avgLatency}</span>
              <span className="text-[10px] text-slate-500 uppercase font-bold">ms</span>
            </div>
            <div className="absolute right-3 bottom-3 opacity-20"><Clock className="h-5 w-5 text-cyan-400" /></div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Overall P95 Latency</span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold tracking-tight font-mono text-purple-400">{p95Latency}</span>
              <span className="text-[10px] text-slate-500 uppercase font-bold">ms</span>
            </div>
            <div className="absolute right-3 bottom-3 opacity-20"><TrendingUp className="h-5 w-5 text-purple-400" /></div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between col-span-2 lg:col-span-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-sans">Avg Success Rate</span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className={`text-2xl font-extrabold tracking-tight font-mono ${successRate > 95 ? 'text-emerald-400' : successRate > 80 ? 'text-yellow-400' : 'text-red-400'}`}>{successRate}%</span>
            </div>
            <div className="absolute right-3 bottom-3 opacity-20"><CheckCircle2 className="h-5 w-5 text-emerald-400" /></div>
          </div>
        </section>

        {/* Workspace Operations layout grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left / Main Workspace details */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Endpoints console */}
            <section className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-4.5 w-4.5 text-cyan-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">API Targets</h3>
                </div>
              </div>

              {/* Endpoint adding inline panel */}
              <form onSubmit={handleAddEndpoint} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <input
                  placeholder="Console Name (e.g. Healthcheck)"
                  value={epName}
                  onChange={(e) => setEpName(e.target.value)}
                  disabled={addingEp}
                  className="sm:col-span-3 bg-slate-950/80 border border-slate-850 focus:border-cyan-500/50 rounded-lg px-3 py-2 text-xs placeholder-slate-500 outline-none transition-all font-sans"
                />
                <input
                  placeholder="https://your-api.com/v1/endpoint"
                  value={epUrl}
                  onChange={(e) => setEpUrl(e.target.value)}
                  disabled={addingEp}
                  className="sm:col-span-5 bg-slate-950/80 border border-slate-850 focus:border-cyan-500/50 rounded-lg px-3 py-2 text-xs placeholder-slate-500 outline-none transition-all font-sans"
                />
                <select
                  value={epMethod}
                  onChange={(e) => setEpMethod(e.target.value)}
                  disabled={addingEp}
                  className="sm:col-span-2 bg-slate-950/80 border border-slate-850 focus:border-cyan-500/50 rounded-lg px-2 py-2 text-xs text-slate-300 outline-none transition-all"
                >
                  <option>GET</option>
                  <option>POST</option>
                  <option>PUT</option>
                  <option>DELETE</option>
                </select>
                <button
                  type="submit"
                  disabled={addingEp || !epName.trim() || !epUrl.trim()}
                  className="sm:col-span-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 hover:text-cyan-300 text-xs font-bold rounded-lg py-2 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Target</span>
                </button>
              </form>

              {/* Targets directory list */}
              <div className="max-h-44 overflow-y-auto border border-slate-850 rounded-xl divide-y divide-slate-850">
                {project.endpoints.map((ep) => (
                  <div key={ep.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 text-xs bg-slate-950/20 gap-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${getMethodBadge(ep.method)}`}>
                        {ep.method}
                      </span>
                      <span className="font-semibold text-slate-200 truncate" title={ep.url}>{ep.url}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium font-mono shrink-0">
                      Alias: {ep.name}
                    </span>
                  </div>
                ))}
                {project.endpoints.length === 0 && (
                  <p className="text-center text-slate-500 text-xs p-6">No target endpoints configured.</p>
                )}
              </div>
            </section>

            {/* Load Test Controller Console */}
            <section className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Play className="h-4.5 w-4.5 text-cyan-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">Load Test Controller</h3>
                </div>
              </div>

              <form onSubmit={handleRunTest} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Endpoint</label>
                  <select
                    value={selectedEndpoint}
                    onChange={(e) => setSelectedEndpoint(e.target.value)}
                    disabled={!!activeTestId || startingTest}
                    className="w-full bg-slate-950/80 border border-slate-850 focus:border-cyan-500/50 rounded-lg px-2.5 py-2.5 text-xs text-slate-200 outline-none"
                  >
                    {project.endpoints.map((ep) => (
                      <option key={ep.id} value={ep.id}>
                        {ep.name} ({ep.method})
                      </option>
                    ))}
                    {project.endpoints.length === 0 && <option value="">No endpoints</option>}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Requests</label>
                  <input
                    type="number"
                    min={1}
                    value={numRequests}
                    onChange={(e) => setNumRequests(Number(e.target.value))}
                    disabled={!!activeTestId || startingTest}
                    className="w-full bg-slate-950/80 border border-slate-850 focus:border-cyan-500/50 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rate (Reqs/Sec)</label>
                  <input
                    type="number"
                    min={1}
                    value={requestsPerSec}
                    onChange={(e) => setRequestsPerSec(Number(e.target.value))}
                    disabled={!!activeTestId || startingTest}
                    className="w-full bg-slate-950/80 border border-slate-850 focus:border-cyan-500/50 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Load Distribution</label>
                  <select
                    value={pattern}
                    onChange={(e) => setPattern(e.target.value)}
                    disabled={!!activeTestId || startingTest}
                    className="w-full bg-slate-950/80 border border-slate-850 focus:border-cyan-500/50 rounded-lg px-2 py-2.5 text-xs text-slate-200 outline-none"
                  >
                    <option value="constant">Constant Load</option>
                    <option value="ramp">Ramp Up</option>
                    <option value="spike">Traffic Spike</option>
                  </select>
                </div>

                <div className="md:col-span-4 pt-2">
                  <button
                    type="submit"
                    disabled={!!activeTestId || startingTest || project.endpoints.length === 0}
                    className="w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:opacity-50 font-bold py-3 px-4 rounded-xl text-xs transition-all duration-150 flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(6,182,212,0.15)] outline-none"
                  >
                    {activeTestId ? (
                      <>
                        <span className="h-4.5 w-4.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                        <span>Running Stress Analysis...</span>
                      </>
                    ) : startingTest ? (
                      <>
                        <span className="h-4.5 w-4.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                        <span>Initializing...</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 fill-slate-950 text-slate-950" />
                        <span>Launch Stress Run</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Chart telemetry placement */}
              {(chartData.length > 0 || activeTestId) && (
                <div className="pt-2 animate-fadeIn">
                  <LiveChart data={chartData} />
                </div>
              )}

              {/* Custom styled severity recommendation alert */}
              {recommendation && (
                <div className={`p-4 rounded-xl border flex items-start gap-3 transition-all animate-fadeIn ${getRecSeverity(recommendation).bg} ${getRecSeverity(recommendation).border} ${getRecSeverity(recommendation).text}`}>
                  {(() => {
                    const SeverityIcon = getRecSeverity(recommendation).icon;
                    return <SeverityIcon className="h-5 w-5 shrink-0 mt-0.5" />;
                  })()}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider block font-mono">
                      {getRecSeverity(recommendation).label}
                    </span>
                    <p className="text-xs leading-relaxed font-sans">{recommendation}</p>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Right Console panel (Activity Logs & Active Comparison Drawer) */}
          <div className="lg:col-span-1 space-y-8">
            
            {/* Realtime Terminal Console Log */}
            <section className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-sm flex flex-col h-[380px]">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4 shrink-0">
                <Terminal className="h-4.5 w-4.5 text-cyan-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">Telemetry Console</h3>
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-950/80 rounded-xl p-3 border border-slate-850/80 font-mono text-[10px] text-cyan-500/80 space-y-1.5 select-text selection:bg-cyan-500/20">
                {logs.map((log, idx) => (
                  <div key={idx} className="leading-normal break-all">
                    {log}
                  </div>
                ))}
                <div ref={logEndRef}></div>
              </div>
            </section>

            {/* Test Run Comparison Dashboard */}
            {compareRuns.length > 0 && (
              <section className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4 animate-fadeIn">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-1">
                  <ArrowLeftRight className="h-4.5 w-4.5 text-purple-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">Compare Runs</h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] font-mono border border-slate-850 rounded-lg">
                    <thead>
                      <tr className="bg-slate-950/50 border-b border-slate-850 text-slate-400 text-left">
                        <th className="p-2 border-r border-slate-850">Spec</th>
                        {compareRuns.map((r, i) => (
                          <th key={r.id} className="p-2 border-r border-slate-850 truncate max-w-[80px]">
                            Run #{compareRuns.length - i}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 bg-slate-950/10">
                      <tr className="border-b border-slate-850">
                        <td className="p-2 font-bold border-r border-slate-850 bg-slate-950/30">Target</td>
                        {compareRuns.map((r) => (
                          <td key={r.id} className="p-2 border-r border-slate-850 truncate max-w-[80px] text-slate-300" title={r.endpointName}>
                            {r.endpointName}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-slate-850">
                        <td className="p-2 font-bold border-r border-slate-850 bg-slate-950/30">Reqs</td>
                        {compareRuns.map((r) => (
                          <td key={r.id} className="p-2 border-r border-slate-850 text-slate-300">
                            {r.totalRequests ?? '-'}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-slate-850">
                        <td className="p-2 font-bold border-r border-slate-850 bg-slate-950/30">Success %</td>
                        {compareRuns.map((r) => {
                          const rate = r.totalRequests && r.successRequests ? Math.round((r.successRequests / r.totalRequests) * 100) : 0;
                          return (
                            <td key={r.id} className={`p-2 border-r border-slate-850 font-bold ${rate > 95 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                              {rate}%
                            </td>
                          );
                        })}
                      </tr>
                      <tr className="border-b border-slate-850">
                        <td className="p-2 font-bold border-r border-slate-850 bg-slate-950/30">Avg (ms)</td>
                        {compareRuns.map((r) => (
                          <td key={r.id} className="p-2 border-r border-slate-850 text-cyan-400 font-bold">
                            {r.avgLatencyMs ?? '-'}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-slate-850">
                        <td className="p-2 font-bold border-r border-slate-850 bg-slate-950/30">P95 (ms)</td>
                        {compareRuns.map((r) => (
                          <td key={r.id} className="p-2 border-r border-slate-850 text-purple-400 font-bold">
                            {r.p95LatencyMs ?? '-'}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="p-2 font-bold border-r border-slate-850 bg-slate-950/30">Pattern</td>
                        {compareRuns.map((r) => (
                          <td key={r.id} className="p-2 border-r border-slate-850 text-slate-400 capitalize">
                            {r.pattern}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
                <button 
                  onClick={() => setSelectedRuns([])}
                  className="w-full bg-slate-950 hover:bg-slate-850 border border-slate-850 hover:border-slate-800 text-[10px] font-bold text-slate-400 py-1.5 rounded-lg transition-colors"
                >
                  Clear Selection
                </button>
              </section>
            )}
          </div>
        </div>

        {/* Historical execution directory */}
        <section className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4.5 w-4.5 text-cyan-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">Historical Runs</h3>
            </div>
            {selectedRuns.length > 0 && (
              <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded font-mono font-bold animate-pulse">
                {selectedRuns.length} selected for comparison
              </span>
            )}
          </div>

          <div className="overflow-x-auto border border-slate-850 rounded-xl">
            <table className="w-full text-xs text-left bg-slate-950/20 divide-y divide-slate-850">
              <thead className="bg-slate-950/50 text-slate-400 uppercase text-[9px] tracking-wider font-mono">
                <tr>
                  <th className="p-3 w-8"></th>
                  <th className="p-3">Target Endpoint</th>
                  <th className="p-3">Pattern</th>
                  <th className="p-3 text-right">Total Requests</th>
                  <th className="p-3 text-right">Success Rate</th>
                  <th className="p-3 text-right">Avg (ms)</th>
                  <th className="p-3 text-right">P95 (ms)</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Run Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 font-mono text-[11px] text-slate-300">
                {allTestRuns.map((t) => {
                  const isChecked = selectedRuns.includes(t.id);
                  const sRate = t.totalRequests && t.successRequests ? Math.round((t.successRequests / t.totalRequests) * 100) : 0;
                  return (
                    <tr key={t.id} className={`hover:bg-slate-900/30 transition-all ${isChecked ? 'bg-purple-500/5 hover:bg-purple-500/10' : ''}`}>
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleCompareToggle(t.id)}
                          disabled={t.status !== 'completed'}
                          className="rounded bg-slate-950 border-slate-800 text-purple-500 focus:ring-purple-500 focus:ring-offset-slate-950 h-3.5 w-3.5 disabled:opacity-30 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 max-w-[200px] sm:max-w-xs">
                          <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold shrink-0 ${getMethodBadge(t.endpointMethod || 'GET')}`}>
                            {t.endpointMethod}
                          </span>
                          <span className="truncate text-slate-200" title={t.endpointUrl}>{t.endpointName}</span>
                        </div>
                      </td>
                      <td className="p-3 capitalize text-slate-400">{t.pattern}</td>
                      <td className="p-3 text-right font-mono">{t.totalRequests ?? '—'}</td>
                      <td className="p-3 text-right font-mono font-bold">
                        {t.status === 'completed' ? (
                          <span className={sRate > 95 ? 'text-emerald-400' : sRate > 80 ? 'text-yellow-400' : 'text-red-400'}>
                            {sRate}%
                          </span>
                        ) : '—'}
                      </td>
                      <td className="p-3 text-right font-mono text-cyan-400 font-bold">{t.avgLatencyMs ?? '—'}</td>
                      <td className="p-3 text-right font-mono text-purple-400 font-bold">{t.p95LatencyMs ?? '—'}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          t.status === 'completed' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : t.status === 'running' 
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse' 
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="p-3 text-right text-slate-500 text-[10px]">
                        {new Date(t.createdAt).toLocaleString(undefined, { 
                          month: 'short', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </td>
                    </tr>
                  );
                })}
                {allTestRuns.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500 italic">
                      No historical telemetry logs recorded. Launch a stress run above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Layout>
  );
}
