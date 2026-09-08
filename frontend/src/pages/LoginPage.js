import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, saveAuth } from '../services/client';
import { Activity, Mail, Lock, User, UserPlus, LogIn, AlertCircle } from 'lucide-react';
export default function LoginPage() {
    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
            const body = mode === 'login' ? { email, password } : { email, password, name };
            const data = await api(path, { method: 'POST', body: JSON.stringify(body) });
            saveAuth(data.token);
            if (data.user) {
                localStorage.setItem('userName', data.user.name || 'Operator');
                localStorage.setItem('userEmail', data.user.email || '');
            }
            navigate('/');
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsxs("div", { className: "flex items-center justify-center min-h-screen bg-slate-950 text-slate-100 grid-bg px-4 relative overflow-hidden", children: [_jsx("div", { className: "absolute top-1/4 left-1/4 h-[300px] w-[300px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" }), _jsx("div", { className: "absolute bottom-1/4 right-1/4 h-[300px] w-[300px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" }), _jsxs("div", { className: "w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden transition-all duration-300", children: [_jsxs("div", { className: "flex flex-col items-center mb-8 select-none text-center", children: [_jsx("div", { className: "p-3 bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 rounded-xl border border-cyan-500/30 glow-cyan mb-3", children: _jsx(Activity, { className: "h-8 w-8 text-cyan-400 animate-pulse" }) }), _jsx("h1", { className: "text-2xl font-extrabold tracking-wider bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent", children: "PULSEBENCH" }), _jsx("p", { className: "text-xs text-slate-400 mt-1 uppercase tracking-widest font-mono", children: "DevOps Load Testing telemetry" })] }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [mode === 'register' && (_jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500", children: _jsx(User, { className: "h-4 w-4" }) }), _jsx("input", { placeholder: "Full Name", type: "text", required: true, value: name, onChange: (e) => setName(e.target.value), className: "w-full bg-slate-950/80 border border-slate-850 hover:border-slate-800 focus:border-cyan-500/50 rounded-lg pl-10 pr-4 py-2.5 text-sm placeholder-slate-500 text-slate-200 outline-none transition-all font-sans" })] })), _jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500", children: _jsx(Mail, { className: "h-4 w-4" }) }), _jsx("input", { placeholder: "Email Address", type: "email", required: true, value: email, onChange: (e) => setEmail(e.target.value), className: "w-full bg-slate-950/80 border border-slate-850 hover:border-slate-800 focus:border-cyan-500/50 rounded-lg pl-10 pr-4 py-2.5 text-sm placeholder-slate-500 text-slate-200 outline-none transition-all font-sans" })] }), _jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500", children: _jsx(Lock, { className: "h-4 w-4" }) }), _jsx("input", { placeholder: "Password", type: "password", required: true, value: password, onChange: (e) => setPassword(e.target.value), className: "w-full bg-slate-950/80 border border-slate-850 hover:border-slate-800 focus:border-cyan-500/50 rounded-lg pl-10 pr-4 py-2.5 text-sm placeholder-slate-500 text-slate-200 outline-none transition-all font-sans" })] }), error && (_jsxs("div", { className: "bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg p-3 flex items-start gap-2 animate-shake font-mono", children: [_jsx(AlertCircle, { className: "h-4 w-4 shrink-0 mt-0.5" }), _jsx("span", { children: error })] })), _jsx("button", { type: "submit", disabled: loading, className: "w-full bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-bold py-2.5 px-4 rounded-lg text-sm transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(6,182,212,0.15)] focus:outline-none", children: loading ? (_jsx("span", { className: "h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" })) : mode === 'login' ? (_jsxs(_Fragment, { children: [_jsx(LogIn, { className: "h-4 w-4" }), _jsx("span", { children: "Sign In" })] })) : (_jsxs(_Fragment, { children: [_jsx(UserPlus, { className: "h-4 w-4" }), _jsx("span", { children: "Create Account" })] })) }), _jsx("div", { className: "text-center pt-2 select-none", children: _jsx("button", { type: "button", onClick: () => {
                                        setError('');
                                        setMode(mode === 'login' ? 'register' : 'login');
                                    }, className: "text-xs text-slate-400 hover:text-cyan-400 transition-colors", children: mode === 'login'
                                        ? "New operator? Request authorization (Register)"
                                        : "Already authorized? Authenticate here (Sign In)" }) })] })] })] }));
}
