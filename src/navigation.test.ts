import { expect, it } from "vitest";
import {
  distance,
  findPath,
  isWalkable,
  movePlayer,
  stationApproach,
} from "./navigation";
import { missions } from "./game";
import { findSystem } from "./systemModels";

it("routes the engineer to every campaign station without crossing component footprints", () => {
  for (const mission of missions) {
    const model = findSystem(mission.id);
    const obstacles = model.nodes.map((n) => ({
      x: n.position[0],
      z: n.position[2],
      radius: 1.76,
    }));
    let position = { x: -8, z: 5.5 };
    expect(isWalkable(position, obstacles), `${mission.id} spawn`).toBe(true);
    for (const objective of mission.objectives) {
      const node = model.nodes.find((n) => n.id === objective.node)!;
      const station = { x: node.position[0], z: node.position[2] };
      const goal = stationApproach(station, position, obstacles);
      const path = findPath(position, goal, obstacles);
      if (distance(position, goal) > 0.5)
        expect(path.length, `${mission.id}/${node.id}`).toBeGreaterThan(0);
      for (const point of path) {
        expect(isWalkable(point, obstacles), `${mission.id}/${node.id}`).toBe(
          true,
        );
        // A moving actor must traverse each segment, not just its grid endpoints.
        const before = position;
        for (let i = 1; i <= 10; i++) {
          const p = {
            x: before.x + ((point.x - before.x) * i) / 10,
            z: before.z + ((point.z - before.z) * i) / 10,
          };
          expect(
            isWalkable(
              p,
              model.nodes.map((n) => ({
                x: n.position[0],
                z: n.position[2],
                radius: 1.64,
              })),
            ),
          ).toBe(true);
        }
        position = point;
      }
      expect(
        distance(position, station),
        `${mission.id}/${node.id} interaction range`,
      ).toBeLessThanOrEqual(2.85);
    }
  }
});
it("slides along blocked axes and keeps the engineer in the playable boundary", () => {
  const obstacle = [{ x: 0, z: 0, radius: 1.64 }];
  const moved = movePlayer({ x: 2, z: 0 }, { x: -0.2, z: 0.2 }, obstacle);
  expect(moved).toEqual({ x: 2, z: 0.2 });
  expect(movePlayer({ x: 12.5, z: 0 }, { x: 1, z: 0 }, [])).toEqual({
    x: 12.5,
    z: 0,
  });
});
