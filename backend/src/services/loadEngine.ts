import { Server } from 'socket.io';

export interface LoadTestConfig {
  targetUrl: string;
  method?: string;
  numRequests: number;
  rate: number; // Target requests per second
  concurrencyLimit: number;
  duration?: number; // Optional test duration limit in seconds
  pattern?: string; // 'constant', 'ramp', 'spike'
}

export interface TickMetrics {
  sentRequests: number;
  completedRequests: number;
  successRequests: number;
  failedRequests: number;
  timeoutRequests: number;
  targetRps: number;
  actualRps: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  inFlightCount: number;
}

/**
 * Executes a load test with a concurrent worker pool and rate-limiting scheduler.
 */
export async function* executeLoadTest(config: LoadTestConfig): AsyncGenerator<TickMetrics, void, void> {
  const {
    targetUrl,
    method = 'GET',
    numRequests,
    rate,
    concurrencyLimit,
    duration,
    pattern = 'constant',
  } = config;

  const startTime = Date.now();
  let sentCount = 0;
  let completedCount = 0;
  let successCount = 0;
  let failedCount = 0;
  let timeoutCount = 0;
  let inFlightCount = 0;
  const latencies: number[] = [];

  let shouldStop = false;
  let lastTickTime = Date.now();
  let cumulativeTargetRequests = 0;

  function getCurrentRate(progress: number): number {
    if (pattern === 'ramp') {
      return Math.max(1, Math.floor(rate * progress));
    } else if (pattern === 'spike') {
      const inSpike = progress > 0.4 && progress < 0.6;
      return inSpike ? rate * 3 : rate;
    }
    return rate;
  }

  function fireRequest() {
    sentCount++;
    inFlightCount++;
    const requestStart = Date.now();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    fetch(targetUrl, {
      method,
      signal: controller.signal,
    })
      .then((res) => {
        clearTimeout(timeoutId);
        const latency = Date.now() - requestStart;
        latencies.push(latency);
        if (res.ok) successCount++;
        else failedCount++;
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        const latency = Date.now() - requestStart;
        latencies.push(latency);
        if (error.name === 'AbortError') timeoutCount++;
        else failedCount++;
      })
      .finally(() => {
        completedCount++;
        inFlightCount--;
      });
  }

  const runScheduler = async () => {
    while (!shouldStop) {
      const now = Date.now();
      const elapsedMs = now - startTime;

      if (duration !== undefined && elapsedMs >= duration * 1000) {
        shouldStop = true;
        break;
      }

      if (sentCount >= numRequests) break;

      const deltaTimeSec = (now - lastTickTime) / 1000;
      lastTickTime = now;

      // Use time-based progress to avoid the feedback loop in ramp/spike patterns
      const expectedDurationSec = duration !== undefined ? duration : (2 * numRequests / rate);
      const timeProgress = expectedDurationSec > 0 ? Math.min(1, (elapsedMs / 1000) / expectedDurationSec) : 1;
      const currentRate = getCurrentRate(timeProgress);

      cumulativeTargetRequests += currentRate * deltaTimeSec;

      const targetToSend = Math.min(numRequests, Math.floor(cumulativeTargetRequests));
      const toFire = targetToSend - sentCount;

      if (toFire > 0) {
        const availableSlots = concurrencyLimit - inFlightCount;
        const actualFire = Math.max(0, Math.min(toFire, availableSlots));
        for (let i = 0; i < actualFire; i++) fireRequest();
      }

      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  };

  const schedulerPromise = runScheduler();

  function computeLiveStats(): TickMetrics {
    const elapsedSec = (Date.now() - startTime) / 1000;
    const actualRps = elapsedSec > 0 ? Math.round(completedCount / elapsedSec) : 0;
    
    const sampleSize = Math.min(latencies.length, 2000);
    const sample = latencies.slice(-sampleSize);
    const avg = sample.length ? sample.reduce((a, b) => a + b, 0) / sample.length : 0;
    const sorted = [...sample].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p95 = sorted.length ? sorted[Math.min(p95Index, sorted.length - 1)] : 0;

    return {
      sentRequests: sentCount,
      completedRequests: completedCount,
      successRequests: successCount,
      failedRequests: failedCount,
      timeoutRequests: timeoutCount,
      targetRps: rate,
      actualRps,
      avgLatencyMs: Math.round(avg),
      p95LatencyMs: Math.round(p95),
      inFlightCount,
    };
  }

  let lastYieldTime = Date.now();
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 50));

    const elapsedMs = Date.now() - startTime;
    const isDurationExceeded = duration !== undefined && elapsedMs >= duration * 1000;
    const isRequestsFinished = sentCount >= numRequests && inFlightCount === 0;

    const now = Date.now();
    const shouldYield = (now - lastYieldTime >= 1000) || isDurationExceeded || isRequestsFinished || (shouldStop && inFlightCount === 0);

    if (shouldYield) {
      yield computeLiveStats();
      lastYieldTime = now;
    }

    if (isDurationExceeded || isRequestsFinished || (shouldStop && inFlightCount === 0)) {
      shouldStop = true;
      break;
    }
  }

  await schedulerPromise;

  const finalElapsedSec = (Date.now() - startTime) / 1000;
  const finalActualRps = finalElapsedSec > 0 ? Math.round(completedCount / finalElapsedSec) : 0;
  const avg = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
  const sorted = [...latencies].sort((a, b) => a - b);
  const p95Index = Math.floor(sorted.length * 0.95);
  const p95 = sorted.length ? sorted[Math.min(p95Index, sorted.length - 1)] : 0;

  yield {
    sentRequests: sentCount,
    completedRequests: completedCount,
    successRequests: successCount,
    failedRequests: failedCount,
    timeoutRequests: timeoutCount,
    targetRps: rate,
    actualRps: finalActualRps,
    avgLatencyMs: Math.round(avg),
    p95LatencyMs: Math.round(p95),
    inFlightCount: 0,
  };
}
