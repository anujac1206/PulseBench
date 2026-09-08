import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import LiveChart from '../components/LiveChart';
import { api, socket } from '../services/client';
import { Activity, Play, Plus, CheckCircle2, XCircle, AlertCircle, Info, Terminal, Globe, Clock, TrendingUp, ArrowLeftRight, Database } from 'lucide-react';
export default function ProjectPage() {
    const { id } = useParams();
    const [project, setProject] = useState(null);
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
    const [activeTestId, setActiveTestId] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [recommendation, setRecommendation] = useState(null);
    // Real-time Activity Log
    const [logs, setLogs] = useState([]);
    const logEndRef = useRef(null);
    // Comparison View State
    const [selectedRuns, setSelectedRuns] = useState([]);
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
            addLog(`Metrics Tick: Reqs processed: ${stats.totalRequests} | Success: ${stats.successRequests} | Failed: ${stats.failedRequests} | Avg Latency: ${stats.avgLatencyMs}ms`);
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
            addLog(`Error registering endpoint: ${epUrl}`);
        }
        finally {
            setAddingEp(false);
        }
    }
    async function handleRunTest(e) {
        e.preventDefault();
        if (!selectedEndpoint)
            return;
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
        }
        catch (err) {
            console.error('Failed to launch test:', err);
            addLog('Stress test launch failed. Check server logs.');
        }
        finally {
            setStartingTest(false);
        }
    }
    function handleCompareToggle(runId) {
        setSelectedRuns((prev) => prev.includes(runId) ? prev.filter((id) => id !== runId) : [...prev, runId]);
    }
    if (!project)
        return null;
    // Flatten and sort history
    const allTestRuns = project.endpoints.flatMap((ep) => ep.testRuns.map((t) => ({ ...t, endpointName: ep.name, endpointUrl: ep.url, endpointMethod: ep.method }))).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
    function getRecSeverity(recText) {
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
    function getMethodBadge(method) {
        switch (method.toUpperCase()) {
            case 'GET': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'POST': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'PUT': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
            case 'DELETE': return 'bg-red-500/10 text-red-400 border-red-500/20';
            default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        }
    }
    return (_jsx(Layout, { projectName: project.name, children: _jsxs("div", { className: "space-y-8 max-w-7xl mx-auto", children: [_jsxs("section", { className: "grid grid-cols-2 lg:grid-cols-5 gap-4", children: [_jsxs("div", { className: "bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between", children: [_jsx("span", { className: "text-[10px] font-bold text-slate-500 uppercase tracking-widest", children: "Historical Throughput" }), _jsxs("div", { className: "mt-2 flex items-baseline gap-1.5", children: [_jsx("span", { className: "text-2xl font-extrabold tracking-tight font-mono text-slate-100", children: totalThroughput.toLocaleString() }), _jsx("span", { className: "text-[10px] text-slate-500 uppercase font-bold", children: "Reqs" })] }), _jsx("div", { className: "absolute right-3 bottom-3 opacity-20", children: _jsx(Database, { className: "h-5 w-5 text-cyan-400" }) })] }), _jsxs("div", { className: "bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between", children: [_jsx("span", { className: "text-[10px] font-bold text-slate-500 uppercase tracking-widest font-sans", children: "Active Tests" }), _jsxs("div", { className: "mt-2 flex items-center gap-2", children: [_jsx("span", { className: `h-2.5 w-2.5 rounded-full ${activeTestsCount > 0 ? 'bg-cyan-500 animate-ping' : 'bg-slate-700'}` }), _jsx("span", { className: "text-2xl font-extrabold tracking-tight font-mono text-slate-100", children: activeTestsCount })] }), _jsx("div", { className: "absolute right-3 bottom-3 opacity-20", children: _jsx(Activity, { className: "h-5 w-5 text-cyan-400" }) })] }), _jsxs("div", { className: "bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between", children: [_jsx("span", { className: "text-[10px] font-bold text-slate-500 uppercase tracking-widest", children: "Overall Avg Latency" }), _jsxs("div", { className: "mt-2 flex items-baseline gap-1.5", children: [_jsx("span", { className: "text-2xl font-extrabold tracking-tight font-mono text-cyan-400", children: avgLatency }), _jsx("span", { className: "text-[10px] text-slate-500 uppercase font-bold", children: "ms" })] }), _jsx("div", { className: "absolute right-3 bottom-3 opacity-20", children: _jsx(Clock, { className: "h-5 w-5 text-cyan-400" }) })] }), _jsxs("div", { className: "bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between", children: [_jsx("span", { className: "text-[10px] font-bold text-slate-500 uppercase tracking-widest", children: "Overall P95 Latency" }), _jsxs("div", { className: "mt-2 flex items-baseline gap-1.5", children: [_jsx("span", { className: "text-2xl font-extrabold tracking-tight font-mono text-purple-400", children: p95Latency }), _jsx("span", { className: "text-[10px] text-slate-500 uppercase font-bold", children: "ms" })] }), _jsx("div", { className: "absolute right-3 bottom-3 opacity-20", children: _jsx(TrendingUp, { className: "h-5 w-5 text-purple-400" }) })] }), _jsxs("div", { className: "bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between col-span-2 lg:col-span-1", children: [_jsx("span", { className: "text-[10px] font-bold text-slate-500 uppercase tracking-widest font-sans", children: "Avg Success Rate" }), _jsx("div", { className: "mt-2 flex items-baseline gap-1.5", children: _jsxs("span", { className: `text-2xl font-extrabold tracking-tight font-mono ${successRate > 95 ? 'text-emerald-400' : successRate > 80 ? 'text-yellow-400' : 'text-red-400'}`, children: [successRate, "%"] }) }), _jsx("div", { className: "absolute right-3 bottom-3 opacity-20", children: _jsx(CheckCircle2, { className: "h-5 w-5 text-emerald-400" }) })] })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-8", children: [_jsxs("div", { className: "lg:col-span-2 space-y-8", children: [_jsxs("section", { className: "bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4", children: [_jsx("div", { className: "flex items-center justify-between border-b border-slate-800 pb-3", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Globe, { className: "h-4.5 w-4.5 text-cyan-400" }), _jsx("h3", { className: "text-sm font-bold uppercase tracking-wider text-slate-200", children: "API Targets" })] }) }), _jsxs("form", { onSubmit: handleAddEndpoint, className: "grid grid-cols-1 sm:grid-cols-12 gap-2.5", children: [_jsx("input", { placeholder: "Console Name (e.g. Healthcheck)", value: epName, onChange: (e) => setEpName(e.target.value), disabled: addingEp, className: "sm:col-span-3 bg-slate-950/80 border border-slate-850 focus:border-cyan-500/50 rounded-lg px-3 py-2 text-xs placeholder-slate-500 outline-none transition-all font-sans" }), _jsx("input", { placeholder: "https://your-api.com/v1/endpoint", value: epUrl, onChange: (e) => setEpUrl(e.target.value), disabled: addingEp, className: "sm:col-span-5 bg-slate-950/80 border border-slate-850 focus:border-cyan-500/50 rounded-lg px-3 py-2 text-xs placeholder-slate-500 outline-none transition-all font-sans" }), _jsxs("select", { value: epMethod, onChange: (e) => setEpMethod(e.target.value), disabled: addingEp, className: "sm:col-span-2 bg-slate-950/80 border border-slate-850 focus:border-cyan-500/50 rounded-lg px-2 py-2 text-xs text-slate-300 outline-none transition-all", children: [_jsx("option", { children: "GET" }), _jsx("option", { children: "POST" }), _jsx("option", { children: "PUT" }), _jsx("option", { children: "DELETE" })] }), _jsxs("button", { type: "submit", disabled: addingEp || !epName.trim() || !epUrl.trim(), className: "sm:col-span-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 hover:text-cyan-300 text-xs font-bold rounded-lg py-2 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50", children: [_jsx(Plus, { className: "h-3.5 w-3.5" }), _jsx("span", { children: "Add Target" })] })] }), _jsxs("div", { className: "max-h-44 overflow-y-auto border border-slate-850 rounded-xl divide-y divide-slate-850", children: [project.endpoints.map((ep) => (_jsxs("div", { className: "flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 text-xs bg-slate-950/20 gap-2.5", children: [_jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [_jsx("span", { className: `px-2 py-0.5 rounded border text-[10px] font-bold ${getMethodBadge(ep.method)}`, children: ep.method }), _jsx("span", { className: "font-semibold text-slate-200 truncate", title: ep.url, children: ep.url })] }), _jsxs("span", { className: "text-[10px] text-slate-500 font-medium font-mono shrink-0", children: ["Alias: ", ep.name] })] }, ep.id))), project.endpoints.length === 0 && (_jsx("p", { className: "text-center text-slate-500 text-xs p-6", children: "No target endpoints configured." }))] })] }), _jsxs("section", { className: "bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-6", children: [_jsx("div", { className: "flex items-center justify-between border-b border-slate-800 pb-3", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Play, { className: "h-4.5 w-4.5 text-cyan-400" }), _jsx("h3", { className: "text-sm font-bold uppercase tracking-wider text-slate-200", children: "Load Test Controller" })] }) }), _jsxs("form", { onSubmit: handleRunTest, className: "grid grid-cols-1 md:grid-cols-4 gap-4 items-end", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx("label", { className: "text-[10px] font-bold text-slate-400 uppercase tracking-wider", children: "Target Endpoint" }), _jsxs("select", { value: selectedEndpoint, onChange: (e) => setSelectedEndpoint(e.target.value), disabled: !!activeTestId || startingTest, className: "w-full bg-slate-950/80 border border-slate-850 focus:border-cyan-500/50 rounded-lg px-2.5 py-2.5 text-xs text-slate-200 outline-none", children: [project.endpoints.map((ep) => (_jsxs("option", { value: ep.id, children: [ep.name, " (", ep.method, ")"] }, ep.id))), project.endpoints.length === 0 && _jsx("option", { value: "", children: "No endpoints" })] })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx("label", { className: "text-[10px] font-bold text-slate-400 uppercase tracking-wider", children: "Total Requests" }), _jsx("input", { type: "number", min: 1, value: numRequests, onChange: (e) => setNumRequests(Number(e.target.value)), disabled: !!activeTestId || startingTest, className: "w-full bg-slate-950/80 border border-slate-850 focus:border-cyan-500/50 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none font-mono" })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx("label", { className: "text-[10px] font-bold text-slate-400 uppercase tracking-wider", children: "Rate (Reqs/Sec)" }), _jsx("input", { type: "number", min: 1, value: requestsPerSec, onChange: (e) => setRequestsPerSec(Number(e.target.value)), disabled: !!activeTestId || startingTest, className: "w-full bg-slate-950/80 border border-slate-850 focus:border-cyan-500/50 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none font-mono" })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx("label", { className: "text-[10px] font-bold text-slate-400 uppercase tracking-wider", children: "Load Distribution" }), _jsxs("select", { value: pattern, onChange: (e) => setPattern(e.target.value), disabled: !!activeTestId || startingTest, className: "w-full bg-slate-950/80 border border-slate-850 focus:border-cyan-500/50 rounded-lg px-2 py-2.5 text-xs text-slate-200 outline-none", children: [_jsx("option", { value: "constant", children: "Constant Load" }), _jsx("option", { value: "ramp", children: "Ramp Up" }), _jsx("option", { value: "spike", children: "Traffic Spike" })] })] }), _jsx("div", { className: "md:col-span-4 pt-2", children: _jsx("button", { type: "submit", disabled: !!activeTestId || startingTest || project.endpoints.length === 0, className: "w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:opacity-50 font-bold py-3 px-4 rounded-xl text-xs transition-all duration-150 flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(6,182,212,0.15)] outline-none", children: activeTestId ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "h-4.5 w-4.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" }), _jsx("span", { children: "Running Stress Analysis..." })] })) : startingTest ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "h-4.5 w-4.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" }), _jsx("span", { children: "Initializing..." })] })) : (_jsxs(_Fragment, { children: [_jsx(Play, { className: "h-3.5 w-3.5 fill-slate-950 text-slate-950" }), _jsx("span", { children: "Launch Stress Run" })] })) }) })] }), (chartData.length > 0 || activeTestId) && (_jsx("div", { className: "pt-2 animate-fadeIn", children: _jsx(LiveChart, { data: chartData }) })), recommendation && (_jsxs("div", { className: `p-4 rounded-xl border flex items-start gap-3 transition-all animate-fadeIn ${getRecSeverity(recommendation).bg} ${getRecSeverity(recommendation).border} ${getRecSeverity(recommendation).text}`, children: [(() => {
                                                    const SeverityIcon = getRecSeverity(recommendation).icon;
                                                    return _jsx(SeverityIcon, { className: "h-5 w-5 shrink-0 mt-0.5" });
                                                })(), _jsxs("div", { className: "space-y-1", children: [_jsx("span", { className: "text-[10px] font-bold uppercase tracking-wider block font-mono", children: getRecSeverity(recommendation).label }), _jsx("p", { className: "text-xs leading-relaxed font-sans", children: recommendation })] })] }))] })] }), _jsxs("div", { className: "lg:col-span-1 space-y-8", children: [_jsxs("section", { className: "bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-sm flex flex-col h-[380px]", children: [_jsxs("div", { className: "flex items-center gap-2 border-b border-slate-800 pb-3 mb-4 shrink-0", children: [_jsx(Terminal, { className: "h-4.5 w-4.5 text-cyan-400" }), _jsx("h3", { className: "text-sm font-bold uppercase tracking-wider text-slate-200", children: "Telemetry Console" })] }), _jsxs("div", { className: "flex-1 overflow-y-auto bg-slate-950/80 rounded-xl p-3 border border-slate-850/80 font-mono text-[10px] text-cyan-500/80 space-y-1.5 select-text selection:bg-cyan-500/20", children: [logs.map((log, idx) => (_jsx("div", { className: "leading-normal break-all", children: log }, idx))), _jsx("div", { ref: logEndRef })] })] }), compareRuns.length > 0 && (_jsxs("section", { className: "bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4 animate-fadeIn", children: [_jsxs("div", { className: "flex items-center gap-2 border-b border-slate-800 pb-3 mb-1", children: [_jsx(ArrowLeftRight, { className: "h-4.5 w-4.5 text-purple-400" }), _jsx("h3", { className: "text-sm font-bold uppercase tracking-wider text-slate-200", children: "Compare Runs" })] }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-[10px] font-mono border border-slate-850 rounded-lg", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-slate-950/50 border-b border-slate-850 text-slate-400 text-left", children: [_jsx("th", { className: "p-2 border-r border-slate-850", children: "Spec" }), compareRuns.map((r, i) => (_jsxs("th", { className: "p-2 border-r border-slate-850 truncate max-w-[80px]", children: ["Run #", compareRuns.length - i] }, r.id)))] }) }), _jsxs("tbody", { className: "divide-y divide-slate-850 bg-slate-950/10", children: [_jsxs("tr", { className: "border-b border-slate-850", children: [_jsx("td", { className: "p-2 font-bold border-r border-slate-850 bg-slate-950/30", children: "Target" }), compareRuns.map((r) => (_jsx("td", { className: "p-2 border-r border-slate-850 truncate max-w-[80px] text-slate-300", title: r.endpointName, children: r.endpointName }, r.id)))] }), _jsxs("tr", { className: "border-b border-slate-850", children: [_jsx("td", { className: "p-2 font-bold border-r border-slate-850 bg-slate-950/30", children: "Reqs" }), compareRuns.map((r) => (_jsx("td", { className: "p-2 border-r border-slate-850 text-slate-300", children: r.totalRequests ?? '-' }, r.id)))] }), _jsxs("tr", { className: "border-b border-slate-850", children: [_jsx("td", { className: "p-2 font-bold border-r border-slate-850 bg-slate-950/30", children: "Success %" }), compareRuns.map((r) => {
                                                                        const rate = r.totalRequests && r.successRequests ? Math.round((r.successRequests / r.totalRequests) * 100) : 0;
                                                                        return (_jsxs("td", { className: `p-2 border-r border-slate-850 font-bold ${rate > 95 ? 'text-emerald-400' : 'text-yellow-400'}`, children: [rate, "%"] }, r.id));
                                                                    })] }), _jsxs("tr", { className: "border-b border-slate-850", children: [_jsx("td", { className: "p-2 font-bold border-r border-slate-850 bg-slate-950/30", children: "Avg (ms)" }), compareRuns.map((r) => (_jsx("td", { className: "p-2 border-r border-slate-850 text-cyan-400 font-bold", children: r.avgLatencyMs ?? '-' }, r.id)))] }), _jsxs("tr", { className: "border-b border-slate-850", children: [_jsx("td", { className: "p-2 font-bold border-r border-slate-850 bg-slate-950/30", children: "P95 (ms)" }), compareRuns.map((r) => (_jsx("td", { className: "p-2 border-r border-slate-850 text-purple-400 font-bold", children: r.p95LatencyMs ?? '-' }, r.id)))] }), _jsxs("tr", { children: [_jsx("td", { className: "p-2 font-bold border-r border-slate-850 bg-slate-950/30", children: "Pattern" }), compareRuns.map((r) => (_jsx("td", { className: "p-2 border-r border-slate-850 text-slate-400 capitalize", children: r.pattern }, r.id)))] })] })] }) }), _jsx("button", { onClick: () => setSelectedRuns([]), className: "w-full bg-slate-950 hover:bg-slate-850 border border-slate-850 hover:border-slate-800 text-[10px] font-bold text-slate-400 py-1.5 rounded-lg transition-colors", children: "Clear Selection" })] }))] })] }), _jsxs("section", { className: "bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-800 pb-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Clock, { className: "h-4.5 w-4.5 text-cyan-400" }), _jsx("h3", { className: "text-sm font-bold uppercase tracking-wider text-slate-200", children: "Historical Runs" })] }), selectedRuns.length > 0 && (_jsxs("span", { className: "text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded font-mono font-bold animate-pulse", children: [selectedRuns.length, " selected for comparison"] }))] }), _jsx("div", { className: "overflow-x-auto border border-slate-850 rounded-xl", children: _jsxs("table", { className: "w-full text-xs text-left bg-slate-950/20 divide-y divide-slate-850", children: [_jsx("thead", { className: "bg-slate-950/50 text-slate-400 uppercase text-[9px] tracking-wider font-mono", children: _jsxs("tr", { children: [_jsx("th", { className: "p-3 w-8" }), _jsx("th", { className: "p-3", children: "Target Endpoint" }), _jsx("th", { className: "p-3", children: "Pattern" }), _jsx("th", { className: "p-3 text-right", children: "Total Requests" }), _jsx("th", { className: "p-3 text-right", children: "Success Rate" }), _jsx("th", { className: "p-3 text-right", children: "Avg (ms)" }), _jsx("th", { className: "p-3 text-right", children: "P95 (ms)" }), _jsx("th", { className: "p-3 text-center", children: "Status" }), _jsx("th", { className: "p-3 text-right", children: "Run Time" })] }) }), _jsxs("tbody", { className: "divide-y divide-slate-850 font-mono text-[11px] text-slate-300", children: [allTestRuns.map((t) => {
                                                const isChecked = selectedRuns.includes(t.id);
                                                const sRate = t.totalRequests && t.successRequests ? Math.round((t.successRequests / t.totalRequests) * 100) : 0;
                                                return (_jsxs("tr", { className: `hover:bg-slate-900/30 transition-all ${isChecked ? 'bg-purple-500/5 hover:bg-purple-500/10' : ''}`, children: [_jsx("td", { className: "p-3 text-center", children: _jsx("input", { type: "checkbox", checked: isChecked, onChange: () => handleCompareToggle(t.id), disabled: t.status !== 'completed', className: "rounded bg-slate-950 border-slate-800 text-purple-500 focus:ring-purple-500 focus:ring-offset-slate-950 h-3.5 w-3.5 disabled:opacity-30 disabled:cursor-not-allowed" }) }), _jsx("td", { className: "p-3", children: _jsxs("div", { className: "flex items-center gap-1.5 max-w-[200px] sm:max-w-xs", children: [_jsx("span", { className: `px-1.5 py-0.5 rounded border text-[9px] font-bold shrink-0 ${getMethodBadge(t.endpointMethod || 'GET')}`, children: t.endpointMethod }), _jsx("span", { className: "truncate text-slate-200", title: t.endpointUrl, children: t.endpointName })] }) }), _jsx("td", { className: "p-3 capitalize text-slate-400", children: t.pattern }), _jsx("td", { className: "p-3 text-right font-mono", children: t.totalRequests ?? '—' }), _jsx("td", { className: "p-3 text-right font-mono font-bold", children: t.status === 'completed' ? (_jsxs("span", { className: sRate > 95 ? 'text-emerald-400' : sRate > 80 ? 'text-yellow-400' : 'text-red-400', children: [sRate, "%"] })) : '—' }), _jsx("td", { className: "p-3 text-right font-mono text-cyan-400 font-bold", children: t.avgLatencyMs ?? '—' }), _jsx("td", { className: "p-3 text-right font-mono text-purple-400 font-bold", children: t.p95LatencyMs ?? '—' }), _jsx("td", { className: "p-3 text-center", children: _jsx("span", { className: `inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${t.status === 'completed'
                                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                                    : t.status === 'running'
                                                                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse'
                                                                        : 'bg-red-500/10 text-red-400 border border-red-500/20'}`, children: t.status }) }), _jsx("td", { className: "p-3 text-right text-slate-500 text-[10px]", children: new Date(t.createdAt).toLocaleString(undefined, {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            }) })] }, t.id));
                                            }), allTestRuns.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 9, className: "p-8 text-center text-slate-500 italic", children: "No historical telemetry logs recorded. Launch a stress run above." }) }))] })] }) })] })] }) }));
}
