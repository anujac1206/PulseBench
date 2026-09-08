import { Router } from 'express';

const router = Router();
const PROM_URL = process.env.PROMETHEUS_URL || 'http://localhost:9090';

async function promQuery(query: string): Promise<number> {
  try {
    const res = await fetch(`${PROM_URL}/api/v1/query?query=${encodeURIComponent(query)}`);
    const data: any = await res.json();
    const result = data?.data?.result?.[0]?.value?.[1];
    return result ? parseFloat(result) : 0;
  } catch {
    return 0;
  }
}

// GET /api/cluster - CPU %, memory %, running pod count
router.get('/', async (_req, res) => {
  const [cpuPercent, memoryPercent, runningPods] = await Promise.all([
    promQuery('avg(rate(container_cpu_usage_seconds_total{namespace="pulsebench"}[1m])) * 100'),
    promQuery(
      'avg(container_memory_usage_bytes{namespace="pulsebench"} / container_spec_memory_limit_bytes{namespace="pulsebench"}) * 100'
    ),
    promQuery('count(kube_pod_status_phase{namespace="pulsebench", phase="Running"})'),
  ]);

  res.json({
    cpuPercent: Math.round(cpuPercent * 10) / 10,
    memoryPercent: Math.round(memoryPercent * 10) / 10,
    runningPods: Math.round(runningPods),
  });
});

export default router;
