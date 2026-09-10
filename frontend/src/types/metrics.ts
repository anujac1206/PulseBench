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
