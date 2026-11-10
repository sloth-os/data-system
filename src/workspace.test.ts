import { expect, it } from "vitest";
import { issues, levels } from "./content";
import { systemModels } from "./systemModels";
import { issueContexts, journeyContexts, scaleMode } from "./workspace";

it("binds every challenge and journey to an available scene, stage and scale", () => {
  expect(Object.keys(issueContexts).sort()).toEqual(
    issues.map((i) => i.id).sort(),
  );
  for (const binding of Object.values(issueContexts)) {
    expect(levels.some((l) => l.id === binding.scale)).toBe(true);
    if (binding.system) {
      const model = systemModels.find((m) => m.id === binding.system);
      expect(model).toBeDefined();
      expect(model!.phases[binding.phase]).toBeDefined();
    } else
      for (const model of systemModels)
        expect(model.phases[binding.phase]).toBeDefined();
  }
  for (const journey of Object.values(journeyContexts))
    expect(systemModels.some((m) => m.id === journey.system)).toBe(true);
  expect(levels.map((l) => scaleMode(l.id))).toEqual([
    "up",
    "up",
    "out",
    "out",
  ]);
});
