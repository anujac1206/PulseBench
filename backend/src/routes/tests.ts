import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import { AuthRequest } from '../middleware/auth';
import { executeLoadTest, TickMetrics } from '../services/loadEngine';
import { generateRecommendation } from '../services/recommendations';

const prisma = new PrismaClient();

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
        sentRequests: 0,
        completedRequests: 0,
        successRequests: 0,
        failedRequests: 0,
        timeoutRequests: 0,
        targetRps: requestsPerSec || 0,
        actualRps: 0,
        avgLatencyMs: 0,
        p95LatencyMs: 0,
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

// ---- The load test engine runner ----

async function runLoadTest(
  io: Server,
  testId: string,
  url: string,
  method: string,
  numRequests: number,
  requestsPerSec: number,
  pattern: string
) {
  const room = `test:${testId}`;
  const generator = executeLoadTest({
    targetUrl: url,
    method,
    numRequests,
    rate: requestsPerSec,
    concurrencyLimit: 50,
    pattern,
  });

  let lastStats: TickMetrics | null = null;

  try {
    for await (const stats of generator) {
      lastStats = stats;
      
      // WebSocket emit MUST include all 10 fields
      io.to(room).emit('test_tick', {
        sentRequests: stats.sentRequests,
        completedRequests: stats.completedRequests,
        successRequests: stats.successRequests,
        failedRequests: stats.failedRequests,
        timeoutRequests: stats.timeoutRequests,
        targetRps: stats.targetRps,
        actualRps: stats.actualRps,
        avgLatencyMs: stats.avgLatencyMs,
        p95LatencyMs: stats.p95LatencyMs,
        inFlightCount: stats.inFlightCount,
      });
    }
  } catch (err) {
    console.error(`Error during load test ${testId}:`, err);
  }

  // Database save MUST map all 10 fields (9 saved to DB)
  if (lastStats) {
    const recommendation = generateRecommendation(lastStats);

    await prisma.testRun.update({
      where: { id: testId },
      data: {
        status: 'completed',
        sentRequests: lastStats.sentRequests,
        completedRequests: lastStats.completedRequests,
        successRequests: lastStats.successRequests,
        failedRequests: lastStats.failedRequests,
        timeoutRequests: lastStats.timeoutRequests,
        targetRps: lastStats.targetRps,
        actualRps: lastStats.actualRps,
        avgLatencyMs: lastStats.avgLatencyMs,
        p95LatencyMs: lastStats.p95LatencyMs,
        recommendation,
      },
    });

    io.to(room).emit('test_complete', {
      ...lastStats,
      recommendation,
    });
  }
}
