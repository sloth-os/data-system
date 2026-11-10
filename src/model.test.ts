import { describe, expect, it } from "vitest";
import { capacityModel, formatBytes, formatDuration } from "./model";
const base = {
  records: 1e11,
  bytesPerRecord: 100000,
  nodes: 32,
  replicas: 3,
  linkGbps: 25,
  compression: 2,
  skew: 0,
  mode: "out" as const,
};
describe("capacity model physical invariants", () => {
  it("supports 100B records = 10 PB raw without equating counts to bytes", () => {
    const m = capacityModel(base);
    expect(m.rawBytes).toBe(1e16);
    expect(m.logicalBytes).toBe(5e15);
    expect(m.physicalBytes).toBe(15e15);
    expect(formatBytes(m.rawBytes)).toBe("10 PB");
  });
  it("replication increases storage but does not multiply a single-replica scan", () => {
    const a = capacityModel(base),
      b = capacityModel({ ...base, replicas: 1 });
    expect(a.physicalBytes).toBe(3 * b.physicalBytes);
    expect(a.scanSeconds).toBe(b.scanSeconds);
  });
  it("adds throughput with workers until other constraints intervene", () => {
    expect(capacityModel({ ...base, nodes: 64 }).scanSeconds).toBeCloseTo(
      capacityModel(base).scanSeconds / 2,
    );
    expect(capacityModel({ ...base, skew: 0.5 }).scanSeconds).toBeCloseTo(
      capacityModel(base).scanSeconds * 2,
    );
    expect(capacityModel({ ...base, linkGbps: 1 }).scanSeconds).toBeGreaterThan(
      capacityModel(base).scanSeconds,
    );
  });
  it("scale-up ignores cluster worker count", () => {
    expect(capacityModel({ ...base, mode: "up", nodes: 1 }).scanSeconds).toBe(
      capacityModel({ ...base, mode: "up", nodes: 128 }).scanSeconds,
    );
  });
  it("rejects impossible inputs and formats durations", () => {
    expect(() => capacityModel({ ...base, nodes: 0 })).toThrow();
    expect(() => capacityModel({ ...base, skew: 1 })).toThrow();
    expect(formatDuration(3600)).toBe("1.0 h");
  });
});
