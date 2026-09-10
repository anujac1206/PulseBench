import http from 'http';
import { executeLoadTest, TickMetrics } from './loadEngine';

async function main() {
  console.log('--- STARTING LOAD ENGINE VERIFICATION ---');

  const server = http.createServer((req, res) => {
    const isSlow = Math.random() < 0.2;
    const delay = isSlow ? 200 : 50;

    setTimeout(() => {
      if (req.url === '/error') {
        res.writeHead(500);
        res.end('Error occurred');
      } else if (req.url === '/hang') {
        // Intentionally never respond
      } else {
        res.writeHead(200, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({ status: 'ok' }));
      }
    }, delay);
  });

  const port = 3987;

  await new Promise<void>((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve());
  });

  console.log(`Test server running at http://127.0.0.1:${port}`);

  try {
    // ==========================
    // TEST 1
    // ==========================

    console.log(
      '\n[TEST 1] Constant Load Test (100 requests @ 50 RPS, concurrency 10)'
    );

    const test1Start = Date.now();

    const generator1 = executeLoadTest({
      targetUrl: `http://127.0.0.1:${port}/`,
      numRequests: 100,
      rate: 50,
      concurrencyLimit: 10,
      pattern: 'constant',
    });

    let lastTick: TickMetrics | null = null;

    for await (const tick of generator1) {
      printTick(tick);
      validateTick(tick, 10);
      lastTick = tick;
    }

    console.log(
      `Test 1 finished in ${Date.now() - test1Start}ms`
    );

    if (!lastTick) {
      throw new Error('No ticks emitted for Test 1');
    }

    if (lastTick.completedRequests !== 100) {
      throw new Error(
        `Expected 100 completed requests, got ${lastTick.completedRequests}`
      );
    }

    if (lastTick.successRequests !== 100) {
      throw new Error(
        `Expected 100 successful requests, got ${lastTick.successRequests}`
      );
    }

    console.log('✔ Test 1 passed');

    // ==========================
    // TEST 2
    // ==========================

    console.log(
      '\n[TEST 2] Ramp Load Test (100 requests @ 100 RPS, concurrency 15)'
    );

    const generator2 = executeLoadTest({
      targetUrl: `http://127.0.0.1:${port}/`,
      numRequests: 100,
      rate: 100,
      concurrencyLimit: 15,
      pattern: 'ramp',
    });

    for await (const tick of generator2) {
      printTick(tick);
      validateTick(tick, 15);
      lastTick = tick;
    }

    console.log('✔ Test 2 passed');

    // ==========================
    // TEST 3
    // ==========================

    console.log(
      '\n[TEST 3] Error Responses (50 requests @ 50 RPS, concurrency 5)'
    );

    const generator3 = executeLoadTest({
      targetUrl: `http://127.0.0.1:${port}/error`,
      numRequests: 50,
      rate: 50,
      concurrencyLimit: 5,
      pattern: 'constant',
    });

    for await (const tick of generator3) {
      printTick(tick);
      validateTick(tick, 5);
      lastTick = tick;
    }

    if (!lastTick) {
      throw new Error('No ticks emitted for Test 3');
    }

    const totalErrors =
      lastTick.failedRequests +
      lastTick.timeoutRequests;

    if (totalErrors !== 50) {
      throw new Error(
        `Expected 50 failures, got ${totalErrors}`
      );
    }

    console.log('✔ Test 3 passed');

    console.log('\n--- ALL TESTS PASSED ---');
  } catch (error: any) {
    console.error(
      '❌ Verification failed:',
      error.message
    );
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

function printTick(tick: TickMetrics) {
  console.log(
    [
      `Sent=${tick.sentRequests}`,
      `Completed=${tick.completedRequests}`,
      `Success=${tick.successRequests}`,
      `Failed=${tick.failedRequests}`,
      `Timeouts=${tick.timeoutRequests}`,
      `TargetRPS=${tick.targetRps}`,
      `ActualRPS=${tick.actualRps}`,
      `Avg=${tick.avgLatencyMs}ms`,
      `P95=${tick.p95LatencyMs}ms`,
      `InFlight=${tick.inFlightCount}`,
    ].join(' | ')
  );
}

function validateTick(
  tick: TickMetrics,
  concurrencyLimit: number
) {
  if (tick.inFlightCount > concurrencyLimit) {
    throw new Error(
      `Concurrency limit violated: ${tick.inFlightCount} > ${concurrencyLimit}`
    );
  }

  if (tick.completedRequests > tick.sentRequests) {
    throw new Error(
      `Completed requests exceed sent requests`
    );
  }

  const accounted =
    tick.successRequests +
    tick.failedRequests +
    tick.timeoutRequests;

  if (accounted > tick.completedRequests) {
    throw new Error(
      `Request accounting mismatch`
    );
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});