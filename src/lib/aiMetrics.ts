// Process-local, real telemetry for actual Gemini API calls made by this server.
// Shared by every generateContentWithRetry() implementation so admin/health and
// the ecosystem "AI Orchestration" tab report genuine call counts and latency
// instead of invented numbers.
export const aiMetrics = {
  callCount: 0,
  errorCount: 0,
  totalDurationMs: 0,
  lastCallAt: null as string | null,
};

export function recordAiCall(durationMs: number, isError: boolean) {
  aiMetrics.callCount += 1;
  aiMetrics.totalDurationMs += durationMs;
  aiMetrics.lastCallAt = new Date().toISOString();
  if (isError) aiMetrics.errorCount += 1;
}

export function getAiAverageLatencyMs(): number {
  return aiMetrics.callCount > 0 ? Math.round(aiMetrics.totalDurationMs / aiMetrics.callCount) : 0;
}
