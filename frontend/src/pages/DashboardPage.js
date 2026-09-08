import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import ClusterMonitor from '../components/ClusterMonitor';
import { api } from '../services/client';
import { Folder, Plus, ArrowRight, Network, Sparkles, Terminal } from 'lucide-react';
export default function DashboardPage() {
    const [projects, setProjects] = useState([]);
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    async function loadProjects() {
        try {
            const data = await api('/api/projects');
            setProjects(data);
        }
        catch (err) {
            console.error('Failed to load projects:', err);
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        loadProjects();
    }, []);
    async function handleCreate(e) {
        e.preventDefault();
        if (!name.trim())
            return;
        setSubmitting(true);
        try {
            await api('/api/projects', {
                method: 'POST',
                body: JSON.stringify({ name })
            });
            setName('');
            await loadProjects();
        }
        catch (err) {
            console.error('Failed to create project:', err);
        }
        finally {
            setSubmitting(false);
        }
    }
    return (_jsx(Layout, { children: _jsxs("div", { className: "space-y-8 max-w-7xl mx-auto", children: [_jsxs("section", { className: "flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-900 to-slate-900/40 p-6 rounded-2xl border border-slate-800/80 shadow-md relative overflow-hidden", children: [_jsx("div", { className: "absolute right-0 top-0 opacity-10 pointer-events-none translate-x-12 -translate-y-12", children: _jsx(Sparkles, { className: "h-64 w-64 text-cyan-400" }) }), _jsxs("div", { children: [_jsx("h2", { className: "text-xl font-bold text-slate-100 flex items-center gap-2", children: _jsx("span", { children: "Operational Dashboard" }) }), _jsx("p", { className: "text-xs text-slate-400 mt-1", children: "Select an environment workspace or spin up a new stress-testing profile." })] }), _jsxs("div", { className: "flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800", children: [_jsx(Terminal, { className: "h-3.5 w-3.5 text-cyan-400" }), _jsx("span", { children: "Telemetry online" })] })] }), _jsx("section", { className: "bg-slate-900/20 backdrop-blur-md border border-slate-850 p-6 rounded-2xl shadow-sm", children: _jsx(ClusterMonitor, {}) }), _jsxs("section", { className: "grid grid-cols-1 lg:grid-cols-3 gap-8 items-start", children: [_jsxs("div", { className: "lg:col-span-1 bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-md flex flex-col space-y-4", children: [_jsxs("div", { className: "flex items-center gap-2 border-b border-slate-800 pb-3", children: [_jsx(Plus, { className: "h-4.5 w-4.5 text-cyan-400" }), _jsx("h3", { className: "text-sm font-bold uppercase tracking-wider text-slate-200", children: "New Workspace" })] }), _jsxs("form", { onSubmit: handleCreate, className: "space-y-4", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx("label", { className: "text-[11px] font-bold text-slate-400 uppercase tracking-wider", children: "Workspace Name" }), _jsx("input", { value: name, onChange: (e) => setName(e.target.value), placeholder: "e.g. Production API Gateway", disabled: submitting, className: "w-full bg-slate-950/80 border border-slate-850 hover:border-slate-800 focus:border-cyan-500/50 rounded-lg px-3.5 py-2.5 text-sm placeholder-slate-500 text-slate-200 outline-none transition-all font-sans" })] }), _jsx("button", { type: "submit", disabled: submitting || !name.trim(), className: "w-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/30 font-bold py-2.5 px-4 rounded-lg text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none", children: submitting ? (_jsx("span", { className: "h-3.5 w-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" })) : (_jsxs(_Fragment, { children: [_jsx(Plus, { className: "h-3.5 w-3.5" }), _jsx("span", { children: "Create Workspace" })] })) })] })] }), _jsxs("div", { className: "lg:col-span-2 space-y-4", children: [_jsx("div", { className: "flex items-center justify-between border-b border-slate-800/80 pb-3", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Folder, { className: "h-4.5 w-4.5 text-cyan-400" }), _jsxs("h3", { className: "text-sm font-bold uppercase tracking-wider text-slate-200", children: ["Stress Profiles (", projects.length, ")"] })] }) }), loading ? (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [1, 2].map((i) => (_jsx("div", { className: "h-32 bg-slate-900/30 border border-slate-850 rounded-2xl animate-pulse" }, i))) })) : projects.length === 0 ? (_jsxs("div", { className: "border border-dashed border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3", children: [_jsx(Folder, { className: "h-10 w-10 text-slate-600 animate-pulse" }), _jsxs("div", { className: "space-y-1", children: [_jsx("p", { className: "text-slate-400 text-sm font-semibold", children: "No workspaces registered" }), _jsx("p", { className: "text-slate-500 text-xs", children: "Create your first load testing workspace using the left console." })] })] })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: projects.map((p) => (_jsxs(Link, { to: `/projects/${p.id}`, className: "group bg-slate-900/40 hover:bg-slate-900 border border-slate-800/80 hover:border-cyan-500/30 rounded-2xl p-5 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_24px_rgba(6,182,212,0.05)] relative flex flex-col justify-between h-36", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex justify-between items-start", children: [_jsx("h4", { className: "font-bold text-slate-200 group-hover:text-cyan-400 transition-colors text-base truncate pr-6", children: p.name }), _jsx(ArrowRight, { className: "h-4 w-4 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" })] }), _jsx("div", { className: "flex gap-4 mt-3 text-slate-400 text-xs font-mono", children: _jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(Network, { className: "h-3.5 w-3.5 text-slate-500" }), _jsxs("span", { children: [p.endpoints?.length || 0, " Endpoints"] })] }) })] }), _jsxs("div", { className: "border-t border-slate-850 pt-2.5 flex items-center justify-between text-[10px] text-slate-500 font-mono", children: [_jsxs("span", { children: ["ID: ", p.id.substring(0, 8), "..."] }), _jsxs("span", { className: "flex items-center gap-1", children: [_jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-emerald-500/80 animate-pulse" }), "Ready"] })] })] }, p.id))) }))] })] })] }) }));
}
