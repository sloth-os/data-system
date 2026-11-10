import { expect, it, vi } from "vitest";
import * as THREE from "three";
import { createGameWorld, initialPlayer } from "./GameWorld";
import type { GameView, PlayerTelemetry } from "./GameWorld";
import { currentObjective, missions, reduceGame, startGame } from "./game";
import { findSystem } from "./systemModels";
import { initialLoad } from "./workspace";

it("the actual player controller can physically finish every contract with navigation assistance", () => {
  vi.stubGlobal("window", {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    matchMedia: () => ({ matches: true }),
  });
  try {
    for (const mission of missions) {
      let state = startGame(mission.id, 1),
        telemetry: PlayerTelemetry = { ...initialPlayer };
      let navigation: GameView["navigation"] = null;
      const scene = new THREE.Scene(),
        camera = new THREE.PerspectiveCamera();
      camera.position.set(7, 10, 12);
      camera.lookAt(0, 0, 0);
      const world = createGameWorld(scene, camera, findSystem(mission.id), {
        get: () => ({
          state,
          navigation,
          follow: true,
          touch: { forward: 0, right: 0, boost: false },
        }),
        event: (event) => {
          state = reduceGame(state, event);
        },
        telemetry: (data) => {
          telemetry = data;
        },
      });
      for (let i = 0; i < mission.objectives.length; i++) {
        const objective = currentObjective(state)!;
        navigation = { serial: i, node: objective.node };
        // Ignore stale previous-station telemetry; require the current goal in range.
        let reached = false;
        for (let frame = 0; frame < 30 * 25; frame++) {
          world.update(1 / 30);
          if (
            telemetry.near === objective.node &&
            telemetry.targetDistance <= 2.82
          ) {
            reached = true;
            break;
          }
        }
        expect(state.status, `${mission.id}/${objective.node} state`).toBe(
          "playing",
        );
        expect(reached, `${mission.id}/${objective.node} route`).toBe(true);
        state = reduceGame(state, {
          type: "interact",
          node: telemetry.near!,
          distance: telemetry.distance,
        });
        expect(state.status).toBe("terminal");
        state = reduceGame(state, {
          type: "answer",
          choice: objective.correct || "confirm",
          load: {
            ...initialLoad,
            records: 1e11,
            bytesPerRecord: 100000,
            nodes: 64,
            replicas: 3,
            compression: 4,
            linkGbps: 25,
            skew: 0.1,
            mode: "out",
          },
        });
      }
      expect(state.status, mission.id).toBe("won");
      world.dispose();
    }
  } finally {
    vi.unstubAllGlobals();
  }
});
