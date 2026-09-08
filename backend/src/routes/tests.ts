import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

// factory so this route file can emit socket events without a separate module
export function createTestRoutes(io: Server) {
  const router = Router();

  // GET /api/tests/:id
  router.get('/:id', async (req: AuthRequest, res) => {
    const test = await prisma.testRun.findUnique({ where: { id: req.params.id } });
    if (!test) return res.status(404).json({ error: 'Test not found' });
    res.json(test);
  });

  // POST /api/tests - starts a load test, returns immediately, runs async
  router.post('/', async (req: AuthRequest, res) => {
    const { endpointId, numRequests, requestsPerSec, pattern } = req.body;

    const endpoint = await prisma.endpoint.findUnique({ where: { id: endpointId } });
    if (!endpoint) return res.status(404).json({ error: 'Endpoint not found' });

    const testRun = await prisma.testRun.create({
      data: {
        endpointId,
        numRequests,
        requestsPerSec,
        pattern: pattern || 'constant',
        status: 'running',
      },
    });

    res.json({ testId: testRun.id });

    // fire-and-forget: run the load test in the background
    runLoadTest(io, testRun.id, endpoint.url, endpoint.method, numRequests, requestsPerSec, pattern).catch(
      (err) => console.error('Load test failed:', err)
    );
  });

  return router;
}

// ---- The load test engine itself ----

interface TickStats {
  totalRequests: number;
  successRequests: number;
  failedRequests: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
}

async function runLoadTest(
  io: Server,
  testId: string,
  url: string,
  method: string,
  numRequests: number,
  requestsPerSec: number,
  pattern: string
) {
  const latencies: number[] = [];
  let success = 0;
  let failed = 0;
  let sent = 0;

  const room = `test:${testId}`;
  const tickInterval = setInterval(() => emitTick(), 1000);

  function emitTick() {
    const stats = computeStats(latencies, success, failed);
    io.to(room).emit('test_tick', stats);
  }

  async function fireOne() {
    const start = Date.now();
    try {
      const res = await fetch(url, { method: method || 'GET' });
      latencies.push(Date.now() - start);
      if (res.ok) success++;
      else failed++;
    } catch {
      latencies.push(Date.now() - start);
      failed++;
    }
    sent++;
  }

  // Simple pattern logic: constant, ramp, spike all just vary
  // the delay between requests based on elapsed progress.
  for (let i = 0; i < numRequests; i++) {
    const progress = i / numRequests;
    let currentRate = requestsPerSec;

    if (pattern === 'ramp') {
      currentRate = Math.max(1, Math.floor(requestsPerSec * progress));
    } else if (pattern === 'spike') {
      const inSpike = progress > 0.4 && progress < 0.6;
      currentRate = inSpike ? requestsPerSec * 3 : requestsPerSec;
    }

    const delayMs = 1000 / currentRate;
    await fireOne();
    await sleep(delayMs);
  }

  clearInterval(tickInterval);

  const final = computeStats(latencies, success, failed);
  const recommendation = generateRecommendation(final, success + failed);

  await prisma.testRun.update({
    where: { id: testId },
    data: {
      status: 'completed',
      totalRequests: success + failed,
      successRequests: success,
      failedRequests: failed,
      avgLatencyMs: final.avgLatencyMs,
      p95LatencyMs: final.p95LatencyMs,
      recommendation,
    },
  });

  io.to(room).emit('test_complete', { ...final, recommendation });
}

function computeStats(latencies: number[], success: number, failed: number): TickStats {
  const total = success + failed;
  const avg = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
  const sorted = [...latencies].sort((a, b) => a - b);
  const p95Index = Math.floor(sorted.length * 0.95);
  const p95 = sorted.length ? sorted[Math.min(p95Index, sorted.length - 1)] : 0;

  return {
    totalRequests: total,
    successRequests: success,
    failedRequests: failed,
    avgLatencyMs: Math.round(avg),
    p95LatencyMs: Math.round(p95),
  };
}

// Simple if/else rule engine - no ML, just thresholds.
function generateRecommendation(stats: TickStats, totalSent: number): string {
  const errorRate = totalSent > 0 ? stats.failedRequests / totalSent : 0;

  if (errorRate > 0.2) {
    return 'High error rate detected (>20%). The endpoint may be rate-limiting requests or is under-provisioned for this load.';
  }
  if (stats.p95LatencyMs > 1000) {
    return 'P95 latency is high (>1000ms). Consider caching, connection pooling, or scaling the target service.';
  }
  if (errorRate > 0.05) {
    return 'Some requests failed (>5% error rate). Investigate error responses under load.';
  }
  if (stats.avgLatencyMs < 200 && errorRate === 0) {
    return 'The endpoint handled this load well — low latency and no failed requests.';
  }
  return 'The endpoint performed acceptably. Consider testing with a higher request rate to find its breaking point.';
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
