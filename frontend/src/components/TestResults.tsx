import { TickMetrics } from '../types/metrics';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';

interface TestResultsProps {
  metrics: TickMetrics | null;
  recommendation?: string | null;
}

export default function TestResults({ metrics, recommendation }: TestResultsProps) {
  if (!metrics) {
    return (
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 text-center text-slate-500 text-xs">
        No active test metrics to display.
      </div>
    );
  }

  const completed = metrics.completedRequests;
  const successRate = completed > 0 ? ((metrics.successRequests / completed) * 100).toFixed(1) : '0.0';
  const failureRate = completed > 0 ? ((metrics.failedRequests / completed) * 100).toFixed(1) : '0.0';
  const timeoutRate = completed > 0 ? ((metrics.timeoutRequests / completed) * 100).toFixed(1) : '0.0';

  const isRpsWarning = metrics.actualRps < metrics.targetRps * 0.9;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Card 1: Sent Requests */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Card 1: Sent</span>
          <div className="mt-2 text-xl font-extrabold font-mono text-blue-400">{metrics.sentRequests.toLocaleString()}</div>
        </div>

        {/* Card 2: Completed Requests */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Card 2: Completed</span>
          <div className="mt-2 text-xl font-extrabold font-mono text-emerald-400">{metrics.completedRequests.toLocaleString()}</div>
        </div>

        {/* Card 3: In Flight */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Card 3: In Flight</span>
          <div className="mt-2 text-xl font-extrabold font-mono text-amber-400">{metrics.inFlightCount.toLocaleString()}</div>
        </div>

        {/* Card 4: Success Rate */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Card 4: Success Rate</span>
          <div className="mt-2 text-xl font-extrabold font-mono text-emerald-400">{successRate}%</div>
        </div>

        {/* Card 5: Failure Rate */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Card 5: Failure Rate</span>
          <div className="mt-2 text-xl font-extrabold font-mono text-red-400">{failureRate}%</div>
        </div>

        {/* Card 6: Timeout Rate */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Card 6: Timeout Rate</span>
          <div className="mt-2 text-xl font-extrabold font-mono text-amber-400">{timeoutRate}%</div>
        </div>

        {/* Card 7: Target RPS */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Card 7: Target RPS</span>
          <div className="mt-2 text-xl font-extrabold font-mono text-indigo-400">{metrics.targetRps}</div>
        </div>

        {/* Card 8: Actual RPS */}
        <div className={`bg-slate-950/80 border rounded-xl p-3.5 flex flex-col justify-between ${
          isRpsWarning ? 'border-amber-500/50 bg-amber-500/10' : 'border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Card 8: Actual RPS</span>
            {isRpsWarning && (
              <span title="Actual RPS is below 90% of target">
                <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
              </span>
            )}
          </div>
          <div className={`mt-2 text-xl font-extrabold font-mono ${isRpsWarning ? 'text-amber-400' : 'text-pink-400'}`}>
            {metrics.actualRps}
          </div>
        </div>

        {/* Card 9: Avg Latency */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Card 9: Avg Latency</span>
          <div className="mt-2 text-xl font-extrabold font-mono text-cyan-400">{metrics.avgLatencyMs} ms</div>
        </div>

        {/* Card 10: P95 Latency */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Card 10: P95 Latency</span>
          <div className="mt-2 text-xl font-extrabold font-mono text-purple-400">{metrics.p95LatencyMs} ms</div>
        </div>
      </div>

      {/* Recommendation Panel */}
      {recommendation && (
        <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 flex items-start gap-3">
          <Info className="h-5 w-5 shrink-0 mt-0.5 text-cyan-400" />
          <div className="space-y-1 text-xs">
            <span className="font-bold uppercase tracking-wider font-mono">System Recommendation</span>
            <p className="whitespace-pre-line leading-relaxed">{recommendation}</p>
          </div>
        </div>
      )}
    </div>
  );
}
