import { describe, expect, it } from "vitest";
import {
  campaignXP,
  capacityGoal,
  currentObjective,
  idleGame,
  missionFor,
  missions,
  parseCampaign,
  recordVictory,
  reduceGame,
  startGame,
} from "./game";
import { findSystem } from "./systemModels";
import { initialLoad } from "./workspace";
import type { GameState } from "./game";

const validPlan = {
  ...initialLoad,
  records: 1e11,
  bytesPerRecord: 100000,
  nodes: 64,
  replicas: 3,
  compression: 4,
  linkGbps: 25,
  skew: 0.1,
  mode: "out" as const,
};
function finish(state: GameState) {
  while (state.status === "playing") {
    const objective = currentObjective(state)!;
    state = reduceGame(state, {
      type: "interact",
      node: objective.node,
      distance: 2.4,
    });
    state = reduceGame(state, {
      type: "answer",
      choice: objective.correct || "confirm",
      load: validPlan,
    });
  }
  return state;
}
describe("systems engineering campaign", () => {
  it("connects every objective to an existing node and operation, and completes all 12 contracts", () => {
    expect(missions).toHaveLength(12);
    expect(missions.reduce((n, m) => n + m.objectives.length, 0)).toBe(62);
    for (const mission of missions) {
      const model = findSystem(mission.id);
      for (const objective of mission.objectives) {
        expect(model.nodes.some((n) => n.id === objective.node)).toBe(true);
        expect(model.phases[objective.phase]).toBeDefined();
        if (objective.choices)
          expect(
            objective.choices.filter((c) => c.id === objective.correct),
          ).toHaveLength(1);
      }
      const won = finish(startGame(mission.id, 1));
      expect(won.status, mission.id).toBe("won");
      expect(won.objective).toBe(mission.objectives.length);
      expect(won.carrying).toBe(false);
      expect(won.credits).toBeGreaterThan(0);
    }
  });
  it("enforces proximity, station order, and freezes clocks while reading or paused", () => {
    let state = startGame("relational", 1);
    state = reduceGame(state, {
      type: "interact",
      node: "client",
      distance: 9,
    });
    expect(state.status).toBe("playing");
    state = reduceGame(state, { type: "interact", node: "wal", distance: 2 });
    expect(state.objective).toBe(0);
    expect(state.status).toBe("playing");
    state = reduceGame(state, {
      type: "interact",
      node: "client",
      distance: 2,
    });
    expect(state.status).toBe("terminal");
    expect(reduceGame(state, { type: "tick", seconds: 1 }).elapsed).toBe(0);
    const paused = reduceGame(state, { type: "pause" });
    expect(reduceGame(paused, { type: "tick", seconds: 1 }).elapsed).toBe(0);
    expect(
      reduceGame(paused, { type: "answer", choice: "confirm", load: validPlan })
        .objective,
    ).toBe(0);
    expect(reduceGame(paused, { type: "resume" }).status).toBe("playing");
  });
  it("makes incorrect decisions costly and lets exhausted runs retry without retaining damage", () => {
    let state = startGame("relational", 1);
    state = reduceGame(state, {
      type: "interact",
      node: "client",
      distance: 2,
    });
    state = reduceGame(state, {
      type: "answer",
      choice: "confirm",
      load: validPlan,
    });
    state = reduceGame(state, { type: "interact", node: "index", distance: 2 });
    state = reduceGame(state, {
      type: "answer",
      choice: "scan",
      load: validPlan,
    });
    expect(state).toMatchObject({
      objective: 1,
      integrity: 85,
      credits: 90,
      mistakes: 1,
      status: "terminal",
    });
    for (let i = 0; i < 5; i++)
      state = reduceGame(state, {
        type: "answer",
        choice: "scan",
        load: validPlan,
      });
    expect(state.status).toBe("lost");
    expect(recordVictory({}, state)).toEqual({});
    expect(startGame("relational", 2)).toMatchObject({
      integrity: 100,
      credits: 120,
      objective: 0,
      run: 2,
      status: "playing",
    });
    expect(reduceGame(state, { type: "quit" })).toEqual({
      ...idleGame,
      run: 1,
    });
  });
  it("has retryable timed and collision failures, with each repair chip collected only once", () => {
    let state = reduceGame(startGame("graph", 1), { type: "hit" });
    expect(state).toMatchObject({ integrity: 88, credits: 115, hits: 1 });
    state = reduceGame(state, { type: "pickup", id: "chip-0" });
    expect(state.integrity).toBe(100);
    expect(reduceGame(state, { type: "pickup", id: "chip-0" })).toBe(state);
    const timed = reduceGame(
      { ...state, elapsed: missionFor("graph").seconds - 0.1 },
      { type: "tick", seconds: 0.2 },
    );
    expect(timed.status).toBe("lost");
  });
  it("validates the real capacity model and rejects shrinking the dataset or removing durability", () => {
    expect(capacityGoal(validPlan).every((g) => g.pass)).toBe(true);
    for (const patch of [
      { records: 1e9 },
      { replicas: 1 },
      { mode: "up" as const },
      { nodes: 128 },
      { nodes: 8 },
      { linkGbps: 1, skew: 0.7 },
    ]) {
      expect(
        capacityGoal({ ...validPlan, ...patch }).every((g) => g.pass),
        JSON.stringify(patch),
      ).toBe(false);
    }
    let state = startGame("lakehouse", 1);
    state = { ...state, objective: 3, status: "terminal" };
    const failed = reduceGame(state, {
      type: "answer",
      choice: "confirm",
      load: { ...validPlan, nodes: 8 },
    });
    expect(failed).toMatchObject({
      status: "terminal",
      objective: 3,
      credits: 112,
      integrity: 100,
    });
    expect(
      reduceGame(failed, {
        type: "answer",
        choice: "confirm",
        load: validPlan,
      }),
    ).toMatchObject({ status: "playing", objective: 4 });
  });
  it("stores best records without repeat XP farming and tolerates corrupt local storage", () => {
    const won = finish(startGame("relational", 1));
    const campaign = recordVictory({}, won);
    expect(campaignXP(recordVictory(campaign, won))).toBe(campaignXP(campaign));
    expect(campaignXP(recordVictory(campaign, { ...won, score: 1 }))).toBe(
      won.score,
    );
    expect(parseCampaign(JSON.stringify(campaign))).toEqual(campaign);
    expect(parseCampaign("{bad")).toEqual({});
    expect(
      parseCampaign(
        '{"relational":{"score":900000,"stars":4,"seconds":-1},"unknown":{"score":3}}',
      ),
    ).toEqual({});
  });
});
