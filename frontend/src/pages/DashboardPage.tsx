import { useEffect, useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import ClusterMonitor from '../components/ClusterMonitor';
import { api } from '../services/client';
import { 
  Folder, 
  Plus, 
  ArrowRight, 
  Cpu, 
  Network, 
  Sparkles, 
  Terminal,
  Activity
} from 'lucide-react';

interface Endpoint {
  id: string;
  name: string;
  url: string;
  method: string;
}

interface Project {
  id: string;
  name: string;
  endpoints?: Endpoint[];
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function loadProjects() {
    try {
      const data = await api('/api/projects');
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await api('/api/projects', { 
        method: 'POST', 
        body: JSON.stringify({ name }) 
      });
      setName('');
      await loadProjects();
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout>
      <div className="space-y-8 max-w-7xl mx-auto">
        
        {/* Welcome Section */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-900 to-slate-900/40 p-6 rounded-2xl border border-slate-800/80 shadow-md relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none translate-x-12 -translate-y-12">
            <Sparkles className="h-64 w-64 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <span>Operational Dashboard</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select an environment workspace or spin up a new stress-testing profile.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <Terminal className="h-3.5 w-3.5 text-cyan-400" />
            <span>Telemetry online</span>
          </div>
        </section>

        {/* Cluster Monitoring Telemetry */}
        <section className="bg-slate-900/20 backdrop-blur-md border border-slate-850 p-6 rounded-2xl shadow-sm">
          <ClusterMonitor />
        </section>

        {/* Workspace Management (Projects) */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Create New Project Panel */}
          <div className="lg:col-span-1 bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-md flex flex-col space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Plus className="h-4.5 w-4.5 text-cyan-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                New Workspace
              </h3>
            </div>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Workspace Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Production API Gateway"
                  disabled={submitting}
                  className="w-full bg-slate-950/80 border border-slate-850 hover:border-slate-800 focus:border-cyan-500/50 rounded-lg px-3.5 py-2.5 text-sm placeholder-slate-500 text-slate-200 outline-none transition-all font-sans"
                />
              </div>
              <button 
                type="submit"
                disabled={submitting || !name.trim()}
                className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/30 font-bold py-2.5 px-4 rounded-lg text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
              >
                {submitting ? (
                  <span className="h-3.5 w-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create Workspace</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Projects List Panel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Folder className="h-4.5 w-4.5 text-cyan-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  Stress Profiles ({projects.length})
                </h3>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-32 bg-slate-900/30 border border-slate-850 rounded-2xl animate-pulse"></div>
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="border border-dashed border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
                <Folder className="h-10 w-10 text-slate-600 animate-pulse" />
                <div className="space-y-1">
                  <p className="text-slate-400 text-sm font-semibold">No workspaces registered</p>
                  <p className="text-slate-500 text-xs">Create your first load testing workspace using the left console.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map((p) => (
                  <Link
                    key={p.id}
                    to={`/projects/${p.id}`}
                    className="group bg-slate-900/40 hover:bg-slate-900 border border-slate-800/80 hover:border-cyan-500/30 rounded-2xl p-5 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_24px_rgba(6,182,212,0.05)] relative flex flex-col justify-between h-36"
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-slate-200 group-hover:text-cyan-400 transition-colors text-base truncate pr-6">
                          {p.name}
                        </h4>
                        <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                      </div>
                      <div className="flex gap-4 mt-3 text-slate-400 text-xs font-mono">
                        <span className="flex items-center gap-1.5">
                          <Network className="h-3.5 w-3.5 text-slate-500" />
                          <span>{p.endpoints?.length || 0} Endpoints</span>
                        </span>
                      </div>
                    </div>
                    
                    {/* Status footer inside card */}
                    <div className="border-t border-slate-850 pt-2.5 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>ID: {p.id.substring(0, 8)}...</span>
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/80 animate-pulse"></span>
                        Ready
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
}
