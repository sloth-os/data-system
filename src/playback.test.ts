import { describe, expect, it } from "vitest";
import { advanceOperation } from "./playback";

describe("operation playback and fault boundaries", () => {
  it("advances and wraps a healthy operation while retaining fractional time", () => {
    const next = advanceOperation({ index: 0, progress: 0.9 }, 0.2, 5);
    expect(next.index).toBe(1);
    expect(next.progress).toBeCloseTo(0.1);
    expect(advanceOperation({ index: 4, progress: 0.99 }, 0.01, 5).index).toBe(
      0,
    );
  });
  it("cannot animate a downstream success while a required dependency is unresolved", () => {
    let current = { index: 0, progress: 0 };
    for (let i = 0; i < 10000; i++)
      current = advanceOperation(current, 0.01, 5, 2);
    expect(current).toEqual({ index: 2, progress: 0.64 });
    expect(advanceOperation(current, 0.1, 5, 2)).toBe(current);
  });
  it("resumes forward progress after the dependency is restored", () => {
    let current = { index: 2, progress: 0.64 };
    for (let i = 0; i < 40; i++) current = advanceOperation(current, 0.01, 5);
    expect(current.index).toBe(3);
  });
});
