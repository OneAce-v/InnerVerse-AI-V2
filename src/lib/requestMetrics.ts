// Real, process-local request telemetry (not fabricated) used to back /api/admin/health.
export const requestMetrics: { timestamps: number[]; durationsMs: number[]; errorCount: number; totalCount: number } = {
  timestamps: [],
  durationsMs: [],
  errorCount: 0,
  totalCount: 0,
};

export function recordRequestMetric(durationMs: number, isError: boolean) {
  const now = Date.now();
  requestMetrics.timestamps.push(now);
  requestMetrics.durationsMs.push(durationMs);
  requestMetrics.totalCount += 1;
  if (isError) requestMetrics.errorCount += 1;
  // Keep only the last 5 minutes of samples so the window stays current.
  const cutoff = now - 5 * 60 * 1000;
  while (requestMetrics.timestamps.length > 0 && requestMetrics.timestamps[0] < cutoff) {
    requestMetrics.timestamps.shift();
    requestMetrics.durationsMs.shift();
  }
}
