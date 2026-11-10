import type { ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  Network,
  RotateCcw,
  Search,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { capacityModel, formatBytes, formatDuration } from "./model";
import type { ModelInput } from "./model";
import {
  dataTypes,
  issues,
  levels,
  projects,
  recoveryScenarios,
  sources,
} from "./content";
import type { LevelId } from "./content";
import type { SystemModel } from "./systemModels";
import type { RecoveryDrill, WorkspaceTool } from "./workspace";
import { journeyContexts } from "./workspace";

interface Props {
  gameLocked: boolean;
  capacityUnlocked: boolean;
  search: string;
  category: string;
  onSearch: (value: string) => void;
  onCategory: (value: string) => void;
  blockedAt: number | null;
  tool: WorkspaceTool;
  model: SystemModel;
  phase: number;
  scale: LevelId;
  onScale: (level: LevelId) => void;
  load: ModelInput;
  onLoad: (patch: Partial<ModelInput>) => void;
  onPhase: (index: number) => void;
  onJourney: (journey: keyof typeof journeyContexts) => void;
  project: string | null;
  onProject: (id: string) => void;
  issue: string | null;
  onIssue: (id: string | null) => void;
  recovery: RecoveryDrill;
  onScenario: (index: number) => void;
  onDrillStart: () => void;
  onDrillNext: () => void;
  onDrillReset: () => void;
  onTool: (tool: WorkspaceTool) => void;
}
const Link = ({ url, children }: { url: string; children: ReactNode }) => (
  <a className="workspace-link" href={url} target="_blank" rel="noreferrer">
    {children}
    <ArrowUpRight size={13} />
  </a>
);

export default function WorkspacePanel(p: Props) {
  const { search, category } = p;
  const drillRunning = p.recovery.status === "running";
  const locked = drillRunning || p.gameLocked;
  const capacityLocked =
    p.recovery.status === "running" || (p.gameLocked && !p.capacityUnlocked);
  const level = levels.find((l) => l.id === p.scale)!;
  const result = capacityModel(p.load);
  const chosen = projects.find((project) => project.id === p.project);
  const challenge = issues.find((issue) => issue.id === p.issue);
  const scenario = recoveryScenarios[p.recovery.scenario];
  const shown = projects.filter(
    (project) =>
      (category === "All" || project.category === category) &&
      `${project.name} ${project.summary} ${project.algorithm} ${project.kind}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const maxTime = Math.max(
    capacityModel({ ...p.load, mode: "up" }).scanSeconds,
    capacityModel({ ...p.load, mode: "out" }).scanSeconds,
  );

  if (p.tool === "scale")
    return (
      <div className="workspace-panel scale-panel">
        <span className="workspace-eyebrow">
          SAME OPERATION · DIFFERENT ENVELOPE
        </span>
        <h3>Where does the work happen?</h3>
        <p>
          The scale lens surrounds this operation with its compute and
          deployment context. Logical components keep their identities.
        </p>
        <div className="workspace-choice-grid">
          {levels.map((l) => (
            <button
              key={l.id}
              disabled={locked}
              aria-pressed={p.scale === l.id}
              onClick={() => p.onScale(l.id)}
            >
              {l.title}
              <span>
                {
                  [
                    "Cache & memory",
                    "One host",
                    "Workers & replicas",
                    "Regional boundaries",
                  ][levels.indexOf(l)]
                }
              </span>
            </button>
          ))}
        </div>
        <div className="workspace-callout">
          <strong>{level.eyebrow}</strong>
          <p>{level.description}</p>
          <span>PRIMARY CONSTRAINT</span>
          <p>{level.bottleneck}</p>
        </div>
        <h4>Change the limit</h4>
        <ul className="workspace-list">
          {level.solutions.map((solution) => (
            <li key={solution}>{solution}</li>
          ))}
        </ul>
        {level.details.map((detail) => (
          <details key={detail.title}>
            <summary>{detail.title}</summary>
            <p>{detail.body}</p>
          </details>
        ))}
        <p className="workspace-note">
          The envelope is illustrative, not a host allocation plan. Adding a
          scale lens does not change this system's transaction or replication
          semantics.
        </p>
        <button
          className="workspace-action"
          onClick={() => p.onTool("capacity")}
        >
          Size this deployment
          <ArrowRight size={14} />
        </button>
      </div>
    );

  if (p.tool === "paths")
    return (
      <div className="workspace-panel paths-panel">
        <span className="workspace-eyebrow">TRACE INSIDE THIS WORLD</span>
        <h3>Follow the bytes.</h3>
        <p>
          Choose a worked journey or step through the selected system's own
          operation. The highlighted geometry, packet paths and timeline stay
          synchronized.
        </p>
        <div className="workspace-journeys">
          {Object.entries(journeyContexts).map(([id, journey]) => (
            <button
              disabled={locked}
              key={id}
              onClick={() => p.onJourney(id as keyof typeof journeyContexts)}
            >
              <Network size={16} />
              <span>
                <strong>{journey.title}</strong>
                <small>{journey.description}</small>
              </span>
              <ChevronRight size={14} />
            </button>
          ))}
        </div>
        <h4>{p.model.name} · current trace</h4>
        <div className="workspace-step-list">
          {p.model.phases.map((phase, i) => (
            <button
              key={phase.title}
              disabled={
                p.gameLocked || (p.blockedAt !== null && i > p.blockedAt)
              }
              aria-current={p.phase === i ? "step" : undefined}
              onClick={() => p.onPhase(i)}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
              <div>
                <strong>{phase.title}</strong>
                <small>{phase.action}</small>
              </div>
            </button>
          ))}
        </div>
        <div className="workspace-callout">
          <span>DATA TRANSFORMATION</span>
          <p>
            {p.model.phases[p.phase].before} → {p.model.phases[p.phase].after}
          </p>
        </div>
        <details>
          <summary>What does a network acknowledgement mean?</summary>
          <p>
            TCP confirms byte delivery, not a committed database transaction. An
            application ACK can depend on WAL durability, replica persistence or
            sink commit. Batching, TLS, serialization and compression all cost
            CPU; backpressure bounds in-flight work.
          </p>
        </details>
        <details>
          <summary>Why does exchange dominate?</summary>
          <p>
            Many-to-one reducers can create incast. Rack uplinks can be
            oversubscribed even when host NICs are idle. Push filters and
            partial aggregation to storage, colocate useful keys and keep
            recovery traffic within a budget.
          </p>
        </details>
        <details>
          <summary>Rows, columns and messages</summary>
          <p>
            JSON/BSON, row versions, log records, Arrow batches and Parquet
            files carry different encodings. Preserve stable IDs, event time and
            schema versions across transformations. A file format alone does not
            supply distributed transactions.
          </p>
        </details>
        <details>
          <summary>Data representation guide</summary>
          {dataTypes.map((d) => (
            <div className="workspace-mini-section" key={d.id}>
              <strong>{d.name}</strong>
              <p>
                {d.storage} {d.access}
              </p>
            </div>
          ))}
        </details>
      </div>
    );

  if (p.tool === "capacity")
    return (
      <div className="workspace-panel capacity-panel">
        <span className="workspace-eyebrow">
          MODELED CAPACITY · NOT TELEMETRY
        </span>
        <h3>
          Change the workload.
          <br />
          See the pressure.
        </h3>
        <p>
          Worker markers, replica rings and the data-volume stack respond in the
          same scene. Packet speed remains illustrative.
        </p>
        <fieldset disabled={capacityLocked}>
          <label>
            Records
            <strong>
              {p.load.records === 1e11
                ? "100 billion"
                : p.load.records.toLocaleString()}
            </strong>
            <input
              aria-label="Record count exponent"
              type="range"
              min={6}
              max={11}
              step={1}
              value={Math.log10(p.load.records)}
              onChange={(e) => p.onLoad({ records: 10 ** +e.target.value })}
            />
          </label>
          <div className="workspace-control-pair">
            <label>
              Average record
              <select
                aria-label="Average record"
                value={p.load.bytesPerRecord}
                onChange={(e) => p.onLoad({ bytesPerRecord: +e.target.value })}
              >
                {[100, 1000, 10000, 100000].map((n) => (
                  <option value={n} key={n}>
                    {formatBytes(n)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Replicas
              <select
                aria-label="Replicas"
                value={p.load.replicas}
                onChange={(e) => p.onLoad({ replicas: +e.target.value })}
              >
                {[1, 3, 5].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="workspace-control-pair">
            <label>
              Network per worker
              <select
                aria-label="Network per worker"
                value={p.load.linkGbps}
                onChange={(e) => p.onLoad({ linkGbps: +e.target.value })}
              >
                {[1, 10, 25, 100].map((n) => (
                  <option key={n} value={n}>
                    {n} Gbit/s
                  </option>
                ))}
              </select>
            </label>
            <label>
              Compression
              <select
                aria-label="Compression"
                value={p.load.compression}
                onChange={(e) => p.onLoad({ compression: +e.target.value })}
              >
                {[1, 2, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}:1
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Workers
            <strong>
              {p.load.mode === "up" ? "1 larger host" : p.load.nodes}
            </strong>
            <input
              aria-label="Worker count"
              type="range"
              min={4}
              max={128}
              step={4}
              disabled={p.load.mode === "up"}
              value={p.load.nodes}
              onChange={(e) => p.onLoad({ nodes: +e.target.value })}
            />
          </label>
          <label>
            Skew penalty<strong>{Math.round(p.load.skew * 100)}%</strong>
            <input
              aria-label="Skew penalty"
              type="range"
              min={0}
              max={0.8}
              step={0.05}
              value={p.load.skew}
              onChange={(e) => p.onLoad({ skew: +e.target.value })}
            />
          </label>
          <div className="workspace-choice-grid">
            <button
              aria-pressed={p.load.mode === "up"}
              onClick={() => p.onScale("server")}
            >
              Scale up
            </button>
            <button
              aria-pressed={p.load.mode === "out"}
              onClick={() => p.onScale("cluster")}
            >
              Scale out
            </button>
          </div>
        </fieldset>
        <div className="workspace-results" aria-live="polite">
          <div>
            <small>RAW DATA</small>
            <strong>{formatBytes(result.rawBytes)}</strong>
          </div>
          <div>
            <small>PHYSICAL · COMPRESSED × REPLICAS</small>
            <strong>{formatBytes(result.physicalBytes)}</strong>
          </div>
          <div>
            <small>MODELED I/O BOUND</small>
            <strong>{result.effectiveGBps.toFixed(1)} GB/s</strong>
          </div>
          <div>
            <small>SCAN + TRANSFER FLOOR</small>
            <strong>{formatDuration(result.scanSeconds)}</strong>
          </div>
        </div>
        <h4>Same data · two architectures</h4>
        {(["up", "out"] as const).map((mode) => {
          const time = capacityModel({ ...p.load, mode }).scanSeconds;
          return (
            <div className="workspace-comparison" key={mode}>
              <span>
                {mode === "up" ? "Larger host" : `${p.load.nodes} workers`}
              </span>
              <i>
                <b
                  style={{ width: `${Math.max(2, (time / maxTime) * 100)}%` }}
                />
              </i>
              <strong>{formatDuration(time)}</strong>
            </div>
          );
        })}
        <div className="workspace-callout">
          <strong>
            {result.fabricGBps < result.diskGBps
              ? "Network-bound under these assumptions."
              : "Storage-bound under these assumptions."}
          </strong>
          <p>
            {formatBytes(result.shuffleBytes)} illustrative exchange at 40% of
            logical bytes; network-only floor{" "}
            {formatDuration(result.shuffleSeconds)}.
          </p>
        </div>
        <details>
          <summary>Inspect assumptions and formulas</summary>
          <p>
            Decimal units. Raw = records × bytes; physical = raw ÷ compression ×
            replicas. A distributed scan assumes every compressed logical byte
            crosses a disaggregated storage/compute fabric. Local pushdown can
            avoid that traffic.
          </p>
          <p>
            Storage: 2 GB/s per worker or 16 GB/s per larger host. Fabric:
            workers × Gbit/s ÷ 8 × 65% useful bandwidth; local host path: 40
            GB/s. Apply the skew penalty to the minimum path rate. CPU, index
            size, queueing, protocol RTT, shared uplinks, backups and headroom
            are excluded. Capacity settings do not change the story's durability
            contract.
          </p>
        </details>
      </div>
    );

  if (p.tool === "projects")
    return (
      <div className="workspace-panel projects-panel">
        <span className="workspace-eyebrow">
          PROJECTS INSIDE THE ARCHITECTURE
        </span>
        <h3>Go beneath the logo.</h3>
        <p>
          Selecting a project brings its system family into this scene. Camera,
          scale and workload settings stay with you.
        </p>
        <label className="workspace-search">
          <Search size={14} />
          <input
            aria-label="Search projects"
            value={search}
            onChange={(e) => p.onSearch(e.target.value)}
            placeholder="Project, algorithm, workload…"
          />
        </label>
        <select
          className="workspace-select"
          aria-label="Project category"
          value={category}
          onChange={(e) => p.onCategory(e.target.value)}
        >
          {["All", ...new Set(projects.map((project) => project.category))].map(
            (c) => (
              <option key={c}>{c}</option>
            ),
          )}
        </select>
        <div className="workspace-project-list">
          {shown.map((project) => (
            <button
              key={project.id}
              disabled={locked}
              aria-pressed={p.project === project.id}
              onClick={() => p.onProject(project.id)}
            >
              <span>
                <strong>{project.name}</strong>
                <small>
                  {project.category} · {project.kind}
                </small>
              </span>
              <ChevronRight size={13} />
            </button>
          ))}
        </div>
        {!shown.length && (
          <p role="status">
            No matching projects. Try a different algorithm or clear the search.
          </p>
        )}
        {chosen && (
          <article className="workspace-profile">
            <span className="workspace-eyebrow">ARCHITECTURE FIELD NOTES</span>
            <h3>{chosen.name}</h3>
            <p>{chosen.summary}</p>
            <h4>Deployment</h4>
            <p>{chosen.deployment}</p>
            <h4>Core algorithm</h4>
            <p>{chosen.algorithm}</p>
            <h4>Operation path</h4>
            <ol className="workspace-list">
              {chosen.process.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <h4>The tradeoff</h4>
            <p>{chosen.tradeoff}</p>
            <Link url={chosen.source}>Primary documentation</Link>
            <button
              className="workspace-action"
              onClick={() => p.onTool("paths")}
            >
              Trace this family's operation
              <ArrowRight size={14} />
            </button>
          </article>
        )}
      </div>
    );

  if (p.tool === "issues")
    return (
      <div className="workspace-panel issues-panel">
        <span className="workspace-eyebrow">TEN ENGINEERING CHALLENGES</span>
        <h3>Stress the same world.</h3>
        <p>
          Each challenge selects a relevant operation and adds its mechanism to
          this scene. These are editorial selections, not a measured popularity
          ranking.
        </p>
        <div className="workspace-issue-list">
          {issues.map((issue, i) => (
            <button
              disabled={locked}
              aria-pressed={p.issue === issue.id}
              key={issue.id}
              onClick={() => p.onIssue(issue.id)}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
              <strong>{issue.title}</strong>
              {p.issue === issue.id ? <Check size={13} /> : <Zap size={12} />}
            </button>
          ))}
        </div>
        {challenge && (
          <article className="workspace-profile">
            <span className="workspace-eyebrow">{challenge.category}</span>
            <h3>{challenge.title}</h3>
            <p>{challenge.summary}</p>
            {[
              ["The symptom", challenge.symptom],
              ["The mechanism", challenge.mechanism],
              ["The response", challenge.solution],
              ["The tradeoff", challenge.tradeoff],
            ].map(([title, body]) => (
              <div key={title}>
                <h4>{title}</h4>
                <p>{body}</p>
              </div>
            ))}
            <Link url={challenge.source}>Primary documentation</Link>
            <button
              className="workspace-action"
              onClick={() => p.onIssue(null)}
            >
              <RotateCcw size={14} />
              Clear the challenge
            </button>
          </article>
        )}
      </div>
    );

  if (p.tool === "recovery")
    return (
      <div className="workspace-panel recovery-panel">
        <span className="workspace-eyebrow">
          A DRILL IN THE CURRENT ARCHITECTURE
        </span>
        <h3>Recover the operation.</h3>
        <p>
          Faults, regional context and the runbook all act on this scene.
          Playback waits at the unresolved dependency until the drill is
          completed.
        </p>
        <select
          className="workspace-select"
          aria-label="Recovery scenario"
          disabled={drillRunning || p.gameLocked}
          value={p.recovery.scenario}
          onChange={(e) => p.onScenario(+e.target.value)}
        >
          {recoveryScenarios.map((r, i) => (
            <option key={r.id} value={i}>
              {r.title}
            </option>
          ))}
        </select>
        <p>{scenario.summary}</p>
        {p.gameLocked && (
          <p className="workspace-note">
            End the active game run before launching a separate runbook. Mission
            decisions use their own station objectives.
          </p>
        )}
        <div className="workspace-callout">
          <span>RECOVERY POINT TARGET</span>
          <p>{scenario.rpo}</p>
          <span>RECOVERY TIME TARGET</span>
          <p>{scenario.rto}</p>
        </div>
        <p className="workspace-drill-status" role="status">
          {drillRunning
            ? `Drill in progress · step ${p.recovery.step + 1} of ${scenario.steps.length}`
            : p.recovery.status === "complete"
              ? "Drill complete · dependency restored"
              : "Ready · infrastructure is not affected"}
        </p>
        {!drillRunning && (
          <button
            className="workspace-action"
            disabled={p.gameLocked}
            onClick={p.onDrillStart}
          >
            <Zap size={14} />
            {p.recovery.status === "complete"
              ? "Run this drill again"
              : "Start recovery drill"}
          </button>
        )}
        <ol className="workspace-runbook">
          {scenario.steps.map((step, i) => (
            <li
              className={
                drillRunning && p.recovery.step === i
                  ? "current"
                  : p.recovery.status === "complete" ||
                      (drillRunning && p.recovery.step > i)
                    ? "complete"
                    : ""
              }
              key={step}
            >
              <span>
                {p.recovery.status === "complete" ||
                (drillRunning && p.recovery.step > i) ? (
                  <Check size={13} />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </span>
              <div>
                <strong>{step.split(":")[0]}</strong>
                <p>
                  {step.includes(":")
                    ? step.slice(step.indexOf(":") + 1)
                    : step}
                </p>
                {drillRunning && p.recovery.step === i && (
                  <button className="workspace-action" onClick={p.onDrillNext}>
                    {i === scenario.steps.length - 1
                      ? "Complete recovery"
                      : "Confirm & continue"}
                    <ArrowRight size={12} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
        {drillRunning && (
          <button
            className="workspace-action secondary"
            onClick={p.onDrillReset}
          >
            <RotateCcw size={13} />
            End and reset the drill
          </button>
        )}
        <details>
          <summary>Replication is not a backup</summary>
          <p>
            Deletes or corruption can reach every replica. Retain isolated
            immutable backups, catalog metadata, identities, encryption keys and
            replay logs. Rehearse a restore and verify application invariants.
            At 10 PB, 100 GB/s sustained throughput still needs at least 27.8
            hours before validation.
          </p>
          <p>{scenario.tradeoff}</p>
        </details>
      </div>
    );

  if (p.tool === "sources")
    return (
      <div className="workspace-panel sources-panel">
        <span className="workspace-eyebrow">
          PRIMARY SOURCES & MODEL LIMITS
        </span>
        <h3>Inspect the evidence.</h3>
        <p>
          Logical roles can share a process or host. Packet timing, worker
          markers and environment envelopes are teaching models, not production
          telemetry. Capacity estimates expose separate assumptions.
        </p>
        {sources.map((source, i) => (
          <a
            className="workspace-source"
            href={source.url}
            target="_blank"
            rel="noreferrer"
            key={source.url}
          >
            <span>{String(i + 1).padStart(2, "0")}</span>
            <div>
              <strong>{source.title}</strong>
              <p>{source.note}</p>
            </div>
            <ArrowUpRight size={13} />
          </a>
        ))}
      </div>
    );

  return (
    <div className="workspace-panel guide-panel">
      <span className="workspace-eyebrow">ONE SCENE · EVERY PERSPECTIVE</span>
      <h3>
        Keep the context.
        <br />
        Change the question.
      </h3>
      <p>
        Drag to orbit; scroll or pinch to zoom. Select a component or exchange
        to inspect it. These tools alter this world or reveal its evidence
        without opening a different page or renderer.
      </p>
      {(
        [
          [
            "scale",
            "Frame the scale",
            "Surround the operation with CPU, host, cluster or regional context.",
          ],
          [
            "paths",
            "Follow the data",
            "Trace a transaction, analytical exchange or stateful stream.",
          ],
          [
            "capacity",
            "Change the load",
            "Model up to 100 billion records / 10 PB and see deployment markers respond.",
          ],
          [
            "projects",
            "Choose an implementation",
            "Inspect 16 projects and trace their system families in place.",
          ],
          [
            "issues",
            "Expose a bottleneck",
            "Activate one of ten challenges in the same architecture.",
          ],
          [
            "recovery",
            "Practice the response",
            "Hold a fault, verify the runbook and restore the dependency.",
          ],
        ] as const
      ).map(([tool, title, body], i) => (
        <button
          className="workspace-guide-step"
          key={tool}
          onClick={() => p.onTool(tool)}
        >
          <span>0{i + 1}</span>
          <div>
            <strong>{title}</strong>
            <p>{body}</p>
          </div>
          <ArrowRight size={13} />
        </button>
      ))}
      <div className="workspace-callout">
        <ShieldCheck size={17} />
        <p>
          Space pauses or plays when the page or canvas has focus.
          Reduced-motion preferences begin paused. If WebGL is unavailable, the
          same component controls and explanations remain available.
        </p>
      </div>
      <button className="workspace-action" onClick={() => p.onTool("sources")}>
        <BookOpen size={14} />
        Sources & methodology
      </button>
      <p className="workspace-note">
        Architectural choices depend on workload, placement and guarantees.
        Named projects do not all implement identical deployment topologies.
      </p>
    </div>
  );
}
