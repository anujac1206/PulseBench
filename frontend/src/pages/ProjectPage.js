import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import LiveCharts from '../components/LiveCharts';
import TestResults from '../components/TestResults';
import { api, socket } from '../services/client';
import { Play, Plus, Globe } from 'lucide-react';
export default function ProjectPage() {
    const { id } = useParams();
    const [project, setProject] = useState(null);
    const [epName, setEpName] = useState('');
    const [epUrl, setEpUrl] = useState('');
    const [epMethod, setEpMethod] = useState('GET');
    const [addingEp, setAddingEp] = useState(false);
    const [selectedEndpoint, setSelectedEndpoint] = useState('');
    const [numRequests, setNumRequests] = useState(50);
    const [requestsPerSec, setRequestsPerSec] = useState(5);
    const [pattern, setPattern] = useState('constant');
    const [startingTest, setStartingTest] = useState(false);
    const [activeTestId, setActiveTestId] = useState(null);
    const [testMetrics, setTestMetrics] = useState(null);
    const [recommendation, setRecommendation] = useState(null);
    const [logs, setLogs] = useState([]);
    const logEndRef = useRef(null);
    function addLog(message) {
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
        }
        catch (err) {
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
        socket.on('test_tick', (metrics) => {
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
            addLog(`Metrics Tick: Sent: ${metrics.sentRequests} | Completed: ${metrics.completedRequests} | RPS: ${metrics.actualRps} | Avg Latency: ${metrics.avgLatencyMs}ms`);
        });
        socket.on('test_complete', (metrics) => {
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
    async function handleAddEndpoint(e) {
        e.preventDefault();
        if (!epName.trim() || !epUrl.trim())
            return;
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
        }
        catch (err) {
            console.error('Failed to add endpoint:', err);
        }
        finally {
            setAddingEp(false);
        }
    }
    async function handleRunTest(e) {
        e.preventDefault();
        if (!selectedEndpoint)
            return;
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
        }
        catch (err) {
            console.error('Failed to launch test:', err);
        }
        finally {
            setStartingTest(false);
        }
    }
    if (!project)
        return null;
    const allTestRuns = project.endpoints.flatMap((ep) => ep.testRuns.map((t) => ({ ...t, endpointName: ep.name, endpointUrl: ep.url, endpointMethod: ep.method }))).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const completedRuns = allTestRuns.filter((r) => r.status === 'completed');
    const totalThroughput = completedRuns.reduce((sum, run) => sum + (run.completedRequests || run.sentRequests || 0), 0);
    const activeTestsCount = activeTestId ? 1 : 0;
    const avgLatency = completedRuns.length > 0 ? Math.round(completedRuns.reduce((sum, run) => sum + (run.avgLatencyMs || 0), 0) / completedRuns.length) : 0;
    const p95Latency = completedRuns.length > 0 ? Math.round(completedRuns.reduce((sum, run) => sum + (run.p95LatencyMs || 0), 0) / completedRuns.length) : 0;
    const totalSuccess = completedRuns.reduce((sum, run) => sum + (run.successRequests || 0), 0);
    const totalCompletedSum = completedRuns.reduce((sum, run) => sum + (run.completedRequests || 0), 0);
    const successRate = totalCompletedSum > 0 ? Math.round((totalSuccess / totalCompletedSum) * 100) : 100;
    function getMethodBadge(method) {
        switch (method.toUpperCase()) {
            case 'GET': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'POST': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        }
    }
    return (_jsx(Layout, { projectName: project.name, children: _jsxs("div", { className: "space-y-8 max-w-7xl mx-auto", children: [_jsxs("section", { className: "grid grid-cols-2 lg:grid-cols-5 gap-4", children: [_jsxs("div", { className: "bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between", children: [_jsx("span", { className: "text-[10px] font-bold text-slate-500 uppercase tracking-widest", children: "Historical Throughput" }), _jsxs("div", { className: "mt-2 flex items-baseline gap-1.5", children: [_jsx("span", { className: "text-2xl font-extrabold font-mono text-slate-100", children: totalThroughput.toLocaleString() }), _jsx("span", { className: "text-[10px] text-slate-500 uppercase font-bold", children: "Reqs" })] })] }), _jsxs("div", { className: "bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between", children: [_jsx("span", { className: "text-[10px] font-bold text-slate-500 uppercase tracking-widest", children: "Active Tests" }), _jsxs("div", { className: "mt-2 flex items-center gap-2", children: [_jsx("span", { className: `h-2.5 w-2.5 rounded-full ${activeTestsCount > 0 ? 'bg-cyan-500 animate-ping' : 'bg-slate-700'}` }), _jsx("span", { className: "text-2xl font-extrabold font-mono text-slate-100", children: activeTestsCount })] })] }), _jsxs("div", { className: "bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between", children: [_jsx("span", { className: "text-[10px] font-bold text-slate-500 uppercase tracking-widest", children: "Avg Latency" }), _jsxs("div", { className: "mt-2 flex items-baseline gap-1.5", children: [_jsx("span", { className: "text-2xl font-extrabold font-mono text-cyan-400", children: avgLatency }), _jsx("span", { className: "text-[10px] text-slate-500 uppercase font-bold", children: "ms" })] })] }), _jsxs("div", { className: "bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between", children: [_jsx("span", { className: "text-[10px] font-bold text-slate-500 uppercase tracking-widest", children: "P95 Latency" }), _jsxs("div", { className: "mt-2 flex items-baseline gap-1.5", children: [_jsx("span", { className: "text-2xl font-extrabold font-mono text-purple-400", children: p95Latency }), _jsx("span", { className: "text-[10px] text-slate-500 uppercase font-bold", children: "ms" })] })] }), _jsxs("div", { className: "bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between", children: [_jsx("span", { className: "text-[10px] font-bold text-slate-500 uppercase tracking-widest", children: "Success Rate" }), _jsx("div", { className: "mt-2 flex items-baseline gap-1.5", children: _jsxs("span", { className: `text-2xl font-extrabold font-mono ${successRate > 95 ? 'text-emerald-400' : 'text-yellow-400'}`, children: [successRate, "%"] }) })] })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-8", children: [_jsxs("div", { className: "lg:col-span-2 space-y-8", children: [_jsxs("section", { className: "bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-6", children: [_jsx("div", { className: "flex items-center justify-between border-b border-slate-800 pb-3", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Globe, { className: "h-4.5 w-4.5 text-cyan-400" }), _jsx("h3", { className: "text-sm font-bold uppercase tracking-wider text-slate-200", children: "Target Endpoints" })] }) }), _jsxs("form", { onSubmit: handleAddEndpoint, className: "grid grid-cols-1 sm:grid-cols-12 gap-2.5", children: [_jsx("input", { placeholder: "Console Name", value: epName, onChange: (e) => setEpName(e.target.value), disabled: addingEp, className: "sm:col-span-4 bg-slate-950/80 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none" }), _jsx("input", { placeholder: "https://api.example.com", value: epUrl, onChange: (e) => setEpUrl(e.target.value), disabled: addingEp, className: "sm:col-span-5 bg-slate-950/80 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none" }), _jsxs("select", { value: epMethod, onChange: (e) => setEpMethod(e.target.value), disabled: addingEp, className: "sm:col-span-3 bg-slate-950/80 border border-slate-850 rounded-lg px-2 py-2 text-xs text-slate-300 outline-none", children: [_jsx("option", { children: "GET" }), _jsx("option", { children: "POST" }), _jsx("option", { children: "PUT" }), _jsx("option", { children: "DELETE" })] }), _jsxs("button", { type: "submit", disabled: addingEp || !epName.trim() || !epUrl.trim(), className: "sm:col-span-12 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 text-xs font-bold rounded-lg py-2 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50", children: [_jsx(Plus, { className: "h-3.5 w-3.5" }), _jsx("span", { children: "Add Target Endpoint" })] })] })] }), _jsxs("section", { className: "bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-6", children: [_jsxs("form", { onSubmit: handleRunTest, className: "grid grid-cols-1 md:grid-cols-4 gap-4 items-end", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx("label", { className: "text-[10px] font-bold text-slate-400 uppercase tracking-wider", children: "Target" }), _jsx("select", { value: selectedEndpoint, onChange: (e) => setSelectedEndpoint(e.target.value), disabled: !!activeTestId, className: "w-full bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-2.5 text-xs text-slate-200", children: project.endpoints.map((ep) => _jsx("option", { value: ep.id, children: ep.name }, ep.id)) })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx("label", { className: "text-[10px] font-bold text-slate-400 uppercase tracking-wider", children: "Reqs" }), _jsx("input", { type: "number", value: numRequests, onChange: (e) => setNumRequests(Number(e.target.value)), disabled: !!activeTestId, className: "w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-200" })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx("label", { className: "text-[10px] font-bold text-slate-400 uppercase tracking-wider", children: "RPS" }), _jsx("input", { type: "number", value: requestsPerSec, onChange: (e) => setRequestsPerSec(Number(e.target.value)), disabled: !!activeTestId, className: "w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-200" })] }), _jsxs("button", { type: "submit", disabled: !!activeTestId || startingTest || project.endpoints.length === 0, className: "bg-cyan-500 text-slate-950 font-bold py-2.5 rounded-lg text-xs hover:bg-cyan-400 transition-all flex items-center justify-center gap-1.5", children: [_jsx(Play, { className: "h-3.5 w-3.5 fill-slate-950 text-slate-950" }), _jsx("span", { children: "Launch Stress Run" })] })] }), _jsx(TestResults, { metrics: testMetrics, recommendation: recommendation }), _jsx(LiveCharts, { metrics: testMetrics })] })] }), _jsx("div", { className: "lg:col-span-1", children: _jsxs("section", { className: "bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 h-[500px] flex flex-col", children: [_jsx("h3", { className: "text-xs font-bold uppercase text-slate-400 mb-4", children: "Telemetry Console" }), _jsxs("div", { className: "flex-1 overflow-y-auto bg-slate-950 rounded-xl p-3 font-mono text-[10px] text-cyan-500/80 space-y-1", children: [logs.map((log, i) => _jsx("div", { children: log }, i)), _jsx("div", { ref: logEndRef })] })] }) })] }), _jsxs("section", { className: "bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6", children: [_jsx("h3", { className: "text-xs font-bold uppercase text-slate-400 mb-4", children: "Historical Runs" }), _jsx("div", { className: "overflow-x-auto border border-slate-850 rounded-xl", children: _jsxs("table", { className: "w-full text-xs text-left bg-slate-950/20", children: [_jsx("thead", { className: "bg-slate-950 text-slate-500 uppercase text-[9px] font-mono", children: _jsxs("tr", { children: [_jsx("th", { className: "p-3", children: "Target" }), _jsx("th", { className: "p-3 text-right", children: "Completed Reqs" }), _jsx("th", { className: "p-3 text-right", children: "Success %" }), _jsx("th", { className: "p-3 text-right", children: "Avg (ms)" }), _jsx("th", { className: "p-3 text-center", children: "Status" }), _jsx("th", { className: "p-3 text-right", children: "Time" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-850 font-mono text-[11px] text-slate-300", children: allTestRuns.map((t) => {
                                            const compReqs = t.completedRequests ?? t.sentRequests ?? 0;
                                            const sRate = compReqs > 0 && t.successRequests ? Math.round((t.successRequests / compReqs) * 100) : 0;
                                            return (_jsxs("tr", { children: [_jsx("td", { className: "p-3", children: t.endpointName }), _jsx("td", { className: "p-3 text-right", children: compReqs || '—' }), _jsxs("td", { className: "p-3 text-right font-bold text-emerald-400", children: [sRate, "%"] }), _jsx("td", { className: "p-3 text-right text-cyan-400", children: t.avgLatencyMs ?? '—' }), _jsx("td", { className: "p-3 text-center uppercase text-[9px] font-bold", children: t.status }), _jsx("td", { className: "p-3 text-right text-slate-500", children: new Date(t.createdAt).toLocaleTimeString() })] }, t.id));
                                        }) })] }) })] })] }) }));
}
