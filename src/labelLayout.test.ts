import { describe, expect, it } from "vitest";
import { placeLabels } from "./labelLayout";

describe("projected annotation placement", () => {
  const bounds = { width: 350, height: 440, top: 62, bottom: 120, margin: 10 };
  it("separates a dense mobile cluster without losing labels or leaving the scene", () => {
    const anchors = Array.from({ length: 9 }, (_, i) => ({
      id: String(i),
      x: 170 + (i % 3) * 12,
      y: 210 + (i % 2) * 15,
      width: i % 2 ? 105 : 125,
      height: 30,
      priority: i < 3 ? 1 : 3,
    }));
    const result = placeLabels(anchors, bounds);
    expect(result).toHaveLength(9);
    for (let i = 0; i < result.length; i++) {
      const a = result[i];
      expect(a.x).toBeGreaterThanOrEqual(bounds.margin);
      expect(a.x + a.width).toBeLessThanOrEqual(bounds.width - bounds.margin);
      expect(a.y).toBeGreaterThanOrEqual(bounds.top);
      expect(a.y + a.height).toBeLessThanOrEqual(bounds.height - bounds.bottom);
      for (const b of result.slice(i + 1)) {
        expect(
          a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y,
          `overlapping labels ${a.id} / ${b.id}`,
        ).toBe(false);
      }
    }
  });
  it("keeps the selected label nearest its anchor and is deterministic across frames", () => {
    const anchors = [
      { id: "normal", x: 150, y: 180, width: 110, height: 30, priority: 3 },
      { id: "selected", x: 150, y: 180, width: 110, height: 30, priority: 0 },
    ];
    const result = placeLabels(anchors, bounds);
    expect(result[0]).toEqual({
      id: "selected",
      x: 95,
      y: 150,
      width: 110,
      height: 30,
    });
    expect(placeLabels(anchors, bounds)).toEqual(result);
    expect(anchors[0].id).toBe("normal");
  });
});
