/** Decimal SI units throughout. This is an optimistic teaching model, not a benchmark. */
export interface ModelInput {
  records: number;
  bytesPerRecord: number;
  nodes: number;
  replicas: number;
  linkGbps: number;
  compression: number;
  skew: number;
  mode: "out" | "up";
}
export function capacityModel(input: ModelInput) {
  const {
    records,
    bytesPerRecord,
    nodes,
    replicas,
    linkGbps,
    compression,
    skew,
    mode,
  } = input;
  if (
    ![records, bytesPerRecord, nodes, replicas, linkGbps, compression].every(
      (n) => Number.isFinite(n) && n > 0,
    ) ||
    !Number.isFinite(skew) ||
    skew < 0 ||
    skew >= 1
  )
    throw new Error("Invalid model input");
  const rawBytes = records * bytesPerRecord;
  const logicalBytes = rawBytes / compression;
  const physicalBytes = logicalBytes * replicas;
  // Fixed assumptions: 2 GB/s sequential disk per worker, 16 GB/s max scale-up server.
  const workers = mode === "up" ? 1 : nodes;
  const diskGBps = mode === "up" ? 16 : workers * 2;
  const fabricGBps = mode === "up" ? 40 : ((workers * linkGbps) / 8) * 0.65;
  const effectiveGBps = Math.min(diskGBps, fabricGBps) * (1 - skew);
  // Disaggregated scan + transfer: every logical compressed byte crosses the path.
  // Single replica; index, CPU, decompression and queue costs excluded.
  const scanSeconds = logicalBytes / (effectiveGBps * 1e9);
  const shuffleBytes = logicalBytes * 0.4;
  const shuffleSeconds = shuffleBytes / (fabricGBps * 1e9 * (1 - skew));
  const recoverySeconds =
    physicalBytes / workers / (Math.min(1, (linkGbps / 8) * 0.65) * 1e9);
  return {
    rawBytes,
    logicalBytes,
    physicalBytes,
    effectiveGBps,
    scanSeconds,
    shuffleBytes,
    shuffleSeconds,
    recoverySeconds,
    fabricGBps,
    diskGBps,
    workers,
  };
}
export function formatBytes(n: number): string {
  const units = ["B", "kB", "MB", "GB", "TB", "PB"];
  let i = 0;
  while (n >= 1000 && i < units.length - 1) {
    n /= 1000;
    i++;
  }
  return `${Number(n.toFixed(n < 10 ? 1 : 0))} ${units[i]}`;
}
export function formatDuration(seconds: number): string {
  if (seconds < 1) return `${Math.round(seconds * 1000)} ms`;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)} min`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} h`;
  return `${(seconds / 86400).toFixed(1)} days`;
}
