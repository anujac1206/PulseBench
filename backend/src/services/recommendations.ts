import { TickMetrics } from './loadEngine';

export function generateRecommendation(metrics: TickMetrics): string {
  const recommendations: string[] = [];

  // Check 1: Actual RPS vs Target RPS
  if (metrics.actualRps < metrics.targetRps * 0.5) {
    recommendations.push(
      `Actual throughput (${metrics.actualRps} RPS) is 50% below target (${metrics.targetRps} RPS). ` +
      `Try increasing concurrencyLimit or check if target endpoint is slow.`
    );
  }

  // Check 2: Timeout rate
  if (metrics.completedRequests > 0) {
    const timeoutRate = metrics.timeoutRequests / metrics.completedRequests;
    if (timeoutRate > 0.1) {
      recommendations.push(
        `High timeout rate (${(timeoutRate * 100).toFixed(1)}%). ` +
        `Consider increasing request timeout or improving target endpoint performance.`
      );
    }
  }

  // Check 3: Error rate
  if (metrics.completedRequests > 0) {
    const errorRate = metrics.failedRequests / metrics.completedRequests;
    if (errorRate > 0.05) {
      recommendations.push(
        `Error rate is ${(errorRate * 100).toFixed(1)}%. ` +
        `Check target endpoint logs and response codes.`
      );
    }
  }

  // Check 4: In-flight requests
  if (metrics.inFlightCount === 0 && metrics.actualRps < metrics.targetRps) {
    recommendations.push(
      `Test completed successfully but actual RPS (${metrics.actualRps}) is lower than target. ` +
      `Increase concurrencyLimit if you need higher throughput.`
    );
  }

  return recommendations.length > 0
    ? recommendations.join('\n\n')
    : 'Test completed successfully within target parameters.';
}
