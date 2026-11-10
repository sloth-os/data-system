import type { LevelId } from "./content";
import type { ModelInput } from "./model";
import type { SystemId } from "./systemModels";

export type WorkspaceTool =
  | "story"
  | "scale"
  | "paths"
  | "capacity"
  | "projects"
  | "issues"
  | "recovery"
  | "sources"
  | "guide";
export interface RecoveryDrill {
  scenario: number;
  step: number;
  status: "idle" | "running" | "complete";
}
export const initialLoad: ModelInput = {
  records: 1e11,
  bytesPerRecord: 1000,
  nodes: 32,
  replicas: 3,
  linkGbps: 25,
  compression: 2,
  skew: 0.1,
  mode: "out",
};
export const scaleMode = (scale: LevelId): ModelInput["mode"] =>
  scale === "cpu" || scale === "server" ? "up" : "out";
export const issueContexts: Record<
  string,
  { system?: SystemId; scale: LevelId; phase: number }
> = {
  hotspot: { scale: "cluster", phase: 1 },
  shuffle: { system: "lakehouse", scale: "cluster", phase: 3 },
  vector: { system: "vector", scale: "cluster", phase: 2 },
  compaction: { system: "widecolumn", scale: "server", phase: 4 },
  stream: { system: "stream", scale: "cluster", phase: 3 },
  governance: { system: "object", scale: "multicloud", phase: 3 },
  egress: { system: "object", scale: "multicloud", phase: 4 },
  consistency: { system: "relational", scale: "cluster", phase: 3 },
  recovery: { system: "object", scale: "multicloud", phase: 4 },
  replication: { system: "relational", scale: "multicloud", phase: 3 },
};
export const journeyContexts = {
  write: {
    system: "relational" as const,
    title: "Transactional write",
    description:
      "Seek a row, create a version, persist WAL and meet the configured acknowledgement policy.",
  },
  query: {
    system: "lakehouse" as const,
    title: "Analytical exchange",
    description:
      "Resolve a snapshot, prune files, aggregate locally, shuffle and merge a result.",
  },
  stream: {
    system: "stream" as const,
    title: "Stateful event stream",
    description:
      "Follow ordered partitions into keyed state, a recovery checkpoint and a compatible sink.",
  },
};
