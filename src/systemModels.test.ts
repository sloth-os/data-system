import { describe, expect, it } from "vitest";
import { systemModels, projectSystem, dataModelSystem } from "./systemModels";
import { dataTypes, projects } from "./content";

describe("executable architecture stories", () => {
  it("provides 12 distinct systems and 60 substantive stages", () => {
    expect(new Set(systemModels.map((s) => s.id)).size).toBe(12);
    expect(systemModels.flatMap((s) => s.phases)).toHaveLength(60);
    for (const model of systemModels) {
      expect(model.phases).toHaveLength(5);
      expect(new Set(model.nodes.map((n) => n.id)).size).toBe(
        model.nodes.length,
      );
      expect(new Set(model.phases.map((p) => p.title)).size).toBe(5);
      for (const phase of model.phases) {
        expect(
          phase.detail.length,
          `${model.id}/${phase.title} needs an explanation`,
        ).toBeGreaterThan(75);
        expect(phase.invariant.length).toBeGreaterThan(15);
        expect(phase.before).not.toBe(phase.after);
      }
    }
  });
  it("never routes a packet to a missing or unhighlighted component", () => {
    for (const model of systemModels) {
      const ids = new Set(model.nodes.map((n) => n.id));
      for (const phase of model.phases) {
        for (const id of phase.active)
          expect(ids.has(id), `${model.id}: unknown active ${id}`).toBe(true);
        for (const route of phase.routes) {
          for (const id of [route.from, route.to]) {
            expect(ids.has(id), `${model.id}: invalid endpoint ${id}`).toBe(
              true,
            );
            expect(
              phase.active,
              `${model.id}/${phase.title}: unhighlighted endpoint ${id}`,
            ).toContain(id);
          }
        }
      }
    }
  });
  it("ties each fault to a real component and reachable operation stage", () => {
    for (const model of systemModels) {
      expect(model.nodes.some((n) => n.id === model.fault.node)).toBe(true);
      expect(
        model.phases.some((p) =>
          p.routes.some((r) => [r.from, r.to].includes(model.fault.node)),
        ),
      ).toBe(true);
      expect(model.fault.response.length).toBeGreaterThan(50);
      for (const node of model.nodes)
        expect(node.position.every(Number.isFinite)).toBe(true);
    }
  });
  it("links every project chip to an existing atlas entry and uses primary HTTPS references", () => {
    const names = new Set(projects.map((p) => p.name));
    for (const model of systemModels) {
      for (const project of model.projects)
        expect(names.has(project), `${model.id}: ${project}`).toBe(true);
      expect(new URL(model.reference.url).protocol).toBe("https:");
    }
    for (const project of projects)
      expect(systemModels.some((s) => s.id === projectSystem[project.id])).toBe(
        true,
      );
    for (const type of dataTypes)
      expect(systemModels.some((s) => s.id === dataModelSystem[type.id])).toBe(
        true,
      );
  });
});
