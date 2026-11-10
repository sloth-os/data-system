import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Boxes,
  Check,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Cpu,
  Database,
  ExternalLink,
  Github,
  HardDrive,
  Layers3,
  Maximize2,
  Menu,
  Network,
  Pause,
  Play,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import Scene from "./Scene";
import ImmersiveLab from "./ImmersiveLab";
import { dataModelSystem, projectSystem } from "./systemModels";
import type { SystemId } from "./systemModels";
import {
  dataTypes,
  issues,
  levels,
  projects,
  recoveryScenarios,
  sources,
} from "./content";
import type { LevelId } from "./content";
import { capacityModel, formatBytes, formatDuration } from "./model";

type Section =
  | "immersive"
  | "explore"
  | "motion"
  | "performance"
  | "projects"
  | "issues"
  | "recovery";
type Overlay = {
  kind: "sources" | "tour" | "project" | "issue" | "node";
  id?: string;
} | null;
const nav = [
  { id: "immersive" as const, label: "Immersive lab", icon: Sparkles },
  { id: "explore" as const, label: "Explore systems", icon: Boxes },
  { id: "motion" as const, label: "Data in motion", icon: Network },
  { id: "performance" as const, label: "Performance lab", icon: Activity },
  { id: "projects" as const, label: "Project atlas", icon: Layers3 },
  { id: "issues" as const, label: "Hot issues", icon: Zap },
  {
    id: "recovery" as const,
    label: "Resilience & recovery",
    icon: ShieldCheck,
  },
];
const levelIcons = [Cpu, HardDrive, Network, Cloud];
const issueLevel = (id: string): LevelId =>
  ["egress", "governance", "recovery"].includes(id)
    ? "multicloud"
    : id === "compaction"
      ? "server"
      : "cluster";
const pipelines = {
  write: [
    [
      "Accept",
      "Client → load balancer",
      "TLS terminates at a trusted boundary. A request carries a partition key and an idempotency key; authentication and admission control happen before expensive work.",
    ],
    [
      "Route",
      "Gateway → shard leader",
      "A range map or consistent-hash ring maps the key to a shard. Client-side routing saves a hop; stale metadata is refreshed after a redirect. A hot key still lands on one owner.",
    ],
    [
      "Persist",
      "Leader → WAL → replicas",
      "Append to a durable write-ahead log. With a majority consensus protocol, acknowledge only after the required replicas persist. Async replication trades a shorter critical path for possible data loss.",
    ],
    [
      "Materialize",
      "Log → indexes → storage",
      "A B-tree updates pages; an LSM engine first updates a memtable, then flushes sorted files. Compaction, index maintenance and garbage collection create background work.",
    ],
    [
      "Propagate",
      "CDC → broker → consumers",
      "Change data capture turns committed changes into events. Consumers update search, analytics and caches. At-least-once delivery requires idempotency or deduplication at each sink.",
    ],
  ],
  query: [
    [
      "Plan",
      "SQL → optimizer",
      "Parse, authorize and estimate cardinalities. Partition pruning, an index lookup or a columnar scan can change bytes read by orders of magnitude. Stale statistics can choose an expensive join.",
    ],
    [
      "Push down",
      "Coordinator → workers",
      "Send predicates and projections toward storage. Read only relevant columns and partitions, use Parquet row-group statistics, and apply dynamic filters when supported.",
    ],
    [
      "Exchange",
      "Worker ↔ worker",
      "A hash exchange routes equal join or group keys to the same worker. A broadcast join sends a small relation to every worker. Neither makes network traffic disappear.",
    ],
    [
      "Aggregate",
      "Local partials → reducers",
      "Partial aggregation shrinks the exchange. Skewed keys create stragglers; salt heavy keys or adapt partitions. External sort spills to disk when working sets exceed memory.",
    ],
    [
      "Return",
      "Reducers → coordinator → client",
      "Merge results, enforce ordering and apply limits. A small result can require a very large scan. Measure bytes scanned, spilled and exchanged as well as elapsed time.",
    ],
  ],
  stream: [
    [
      "Partition",
      "Producers → broker log",
      "Choose keys for ordering and load distribution. Each partition is an ordered log; ordering across partitions is a separate problem. Batch and compress records to amortize network and disk overhead.",
    ],
    [
      "Consume",
      "Broker → task slots",
      "A consumer group assigns partitions to workers. More workers than partitions cannot add useful read parallelism. Rebalances and slow consumers can cause lag.",
    ],
    [
      "Window",
      "Events → keyed state",
      "Event-time windows use timestamps and watermarks to reason about late events. State grows with key cardinality and retention. Backpressure propagates when a downstream operator cannot keep up.",
    ],
    [
      "Checkpoint",
      "State → durable snapshots",
      "Checkpoints tie operator state to source positions. Barrier alignment can stall under skew; unaligned checkpoints trade larger snapshots for faster progress in supported runtimes.",
    ],
    [
      "Commit",
      "Task → transactional sink",
      "Exactly-once effects require a compatible source, state checkpoint and transactional or idempotent sink. A checkpoint alone does not guarantee exactly-once delivery to an arbitrary external service.",
    ],
  ],
};
const tours: {
  title: string;
  body: string;
  section: Section;
  level: LevelId;
}[] = [
  {
    title: "Start with the machine",
    body: "Drag the 3D scene to orbit. A core is fast; moving data through caches, DRAM and storage often determines the real limit. Select a block to inspect its role.",
    section: "explore",
    level: "cpu",
  },
  {
    title: "Scale up, then scale out",
    body: "A larger server preserves local coordination. A cluster adds capacity and failure domains, but pays for partitioning, replication and network exchange.",
    section: "explore",
    level: "cluster",
  },
  {
    title: "Follow a single record",
    body: "Trace a write, an analytical query or a stream. The animated links are conceptual paths; the step-by-step narrative explains acknowledgement, durability and ownership.",
    section: "motion",
    level: "cluster",
  },
  {
    title: "Test your assumptions",
    body: "Change record size, node count and network speed. The lab calculates storage and optimistic I/O bounds. Compare scale-up and scale-out using the same workload.",
    section: "performance",
    level: "cluster",
  },
  {
    title: "Choose a system by its tradeoffs",
    body: "Explore database, streaming, search, graph, vector and lakehouse projects. Each explains its deployment model, core algorithm and processing path.",
    section: "projects",
    level: "cluster",
  },
  {
    title: "Design for the day things break",
    body: "Take a region offline in a simulated recovery drill. Fence the old writer, verify the recovery point, promote safely and reconcile before failing back.",
    section: "recovery",
    level: "multicloud",
  },
];

function Modal({
  children,
  title,
  onClose,
  wide = false,
}: {
  children: ReactNode;
  title: string;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    return () => d.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "modal-wide" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label={title}
    >
      <div className="modal-heading">
        <span className="eyebrow">FIELD NOTES / DATA SCALE</span>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <h2>{title}</h2>
      {children}
    </dialog>
  );
}
function SourceLink({
  url,
  children = "Read the primary documentation",
}: {
  url: string;
  children?: ReactNode;
}) {
  return (
    <a className="text-link" href={url} target="_blank" rel="noreferrer">
      {children}
      <ArrowUpRight size={15} />
    </a>
  );
}

export default function App() {
  const [section, setSection] = useState<Section>("immersive");
  const [immersiveSystem, setImmersiveSystem] =
    useState<SystemId>("relational");
  const [level, setLevel] = useState<LevelId>("cluster");
  const [playing, setPlaying] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [speed, setSpeed] = useState(1);
  const [failure, setFailure] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [menu, setMenu] = useState(false);
  const [tour, setTour] = useState(0);
  const [activeIssue, setActiveIssue] = useState("hotspot");
  const [pipeline, setPipeline] = useState<keyof typeof pipelines>("write");
  const [stage, setStage] = useState(0);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("All systems");
  const [dataType, setDataType] = useState("");
  const [scenario, setScenario] = useState(2);
  const [recoveryStep, setRecoveryStep] = useState(-1);
  const [recordPower, setRecordPower] = useState(11);
  const [recordBytes, setRecordBytes] = useState(1000);
  const [nodes, setNodes] = useState(32);
  const [replicas, setReplicas] = useState(3);
  const [link, setLink] = useState(25);
  const [compression, setCompression] = useState(2);
  const [skew, setSkew] = useState(0.1);
  const [mode, setMode] = useState<"out" | "up">("out");
  const sceneRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const selectedLevel = levels.find((x) => x.id === level)!;
  const selectedIssue = issues.find((x) => x.id === activeIssue) || issues[0];
  const selectedData = dataTypes.find((x) => x.id === dataType) || dataTypes[0];
  const selectedRecovery = recoveryScenarios[scenario];
  const faultLabel =
    selectedRecovery.id === "node"
      ? "Simulate node failure"
      : selectedRecovery.id === "zone"
        ? "Simulate zone outage"
        : selectedRecovery.id === "region"
          ? "Simulate regional outage"
          : selectedRecovery.id === "corruption"
            ? "Simulate data corruption"
            : "Simulate estate restore";
  const modelInput = {
    records: 10 ** recordPower,
    bytesPerRecord: recordBytes,
    nodes,
    replicas,
    linkGbps: link,
    compression,
    skew,
    mode,
  };
  const model = capacityModel(modelInput);
  const comparisons = [
    {
      label: "One larger server",
      detail: "16 GB/s storage ceiling",
      value: capacityModel({ ...modelInput, mode: "up" }).scanSeconds,
      color: "#a8ada3",
    },
    {
      label: `${nodes} workers · balanced`,
      detail: "No skew in this comparison",
      value: capacityModel({ ...modelInput, mode: "out", skew: 0 }).scanSeconds,
      color: "#b3df66",
    },
    {
      label: `${nodes} workers · current skew`,
      detail: `${Math.round(skew * 100)}% throughput penalty`,
      value: capacityModel({ ...modelInput, mode: "out" }).scanSeconds,
      color: "#43573a",
    },
  ];
  const maxTime = Math.max(...comparisons.map((x) => x.value));
  function navigate(id: Section) {
    setSection(id);
    setMenu(false);
    setFailure(false);
    if (id === "recovery") {
      setLevel("multicloud");
      setScenario(2);
      setRecoveryStep(-1);
    }
    if (id === "issues") setLevel(issueLevel(activeIssue));
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  useEffect(() => {
    function shortcut(e: KeyboardEvent) {
      if (
        e.code === "Space" &&
        (e.target === document.body ||
          (e.target as HTMLElement).tagName === "CANVAS")
      ) {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    }
    function fs() {
      setFullscreen(!!document.fullscreenElement);
    }
    window.addEventListener("keydown", shortcut);
    document.addEventListener("fullscreenchange", fs);
    return () => {
      window.removeEventListener("keydown", shortcut);
      document.removeEventListener("fullscreenchange", fs);
    };
  }, []);
  function startTour() {
    setTour(0);
    setSection(tours[0].section);
    setLevel(tours[0].level);
    setOverlay({ kind: "tour" });
  }
  function advanceTour(n: number) {
    setTour(n);
    setSection(tours[n].section);
    setLevel(tours[n].level);
  }
  async function toggleFullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (sceneRef.current?.requestFullscreen)
      await sceneRef.current
        .requestFullscreen()
        .catch(() => setFullscreen(false));
  }
  const shownProjects = projects.filter(
    (p) =>
      (projectFilter === "All systems" || p.category === projectFilter) &&
      `${p.name} ${p.kind} ${p.summary} ${p.algorithm}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const categories = [
    "All systems",
    ...new Set(projects.map((p) => p.category)),
  ];
  const headings: Record<Section, [string, string, string]> = {
    immersive: ["IMMERSIVE SYSTEMS LAB", "Step inside", "the data plane."],
    explore: [
      "INTERACTIVE SYSTEMS ATLAS",
      "Small pieces.",
      "Planet-scale systems.",
    ],
    motion: ["FOLLOW THE BYTES", "Every record", "has a journey."],
    performance: [
      "CAPACITY & TRADEOFFS",
      "More machines.",
      "Different limits.",
    ],
    projects: [
      "THE OPEN-SOURCE LANDSCAPE",
      "Right workload.",
      "Right architecture.",
    ],
    issues: ["TEN ENGINEERING FRONTIERS", "Big systems.", "Hard problems."],
    recovery: ["DESIGN FOR FAILURE", "Lose a region.", "Keep your promises."],
  };
  const descriptions: Record<Section, string> = {
    immersive:
      "Twelve data systems. Sixty animated stages. Follow a record, inspect the machinery, and see the tradeoffs take shape.",
    explore:
      "An explorable guide to how data-intensive systems grow—from a single CPU to 100 billion records across clouds.",
    motion:
      "Follow data through ingestion, transformation, exchange and storage. Discover where latency, traffic and consistency come from.",
    performance:
      "Turn architecture into numbers. Explore storage, bandwidth and scan-time bounds from a million records to 10 petabytes.",
    projects:
      "Go beneath the logos. Explore deployment patterns, core algorithms and the decisions that make each system different.",
    issues:
      "Ten consequential challenges, selected from primary engineering documentation. Explore the mechanisms, then animate the tradeoffs.",
    recovery:
      "Replication is a beginning. Practice fencing, promotion, verification and recovery with a simulated regional failure.",
  };

  return (
    <div
      className={`app-shell ${section === "immersive" ? "immersive-mode" : ""}`}
    >
      <aside className={`sidebar ${menu ? "sidebar-open" : ""}`}>
        <a
          href="#"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            navigate("immersive");
          }}
          aria-label="Data Scale home"
        >
          <span className="brand-mark">
            <Layers3 size={25} strokeWidth={1.7} />
          </span>
          <span>
            DATA<span className="brand-slash"> / </span>SCALE
            <small>THE SYSTEMS ATLAS</small>
          </span>
        </a>
        <div className="sidebar-caption">
          WORKSPACE <span>01</span>
        </div>
        <nav aria-label="Main navigation">
          {nav.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${section === n.id ? "active" : ""}`}
              onClick={() => navigate(n.id)}
            >
              <n.icon size={18} strokeWidth={1.7} />
              <span>{n.label}</span>
              {n.id === "issues" ? (
                <span className="count">10</span>
              ) : section === n.id ? (
                <span className="active-dot" />
              ) : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="mini-orbit">
            <Sparkles size={20} />
          </span>
          <h3>
            Complex systems.
            <br />A clearer perspective.
          </h3>
          <p>
            Start small. Follow the data.
            <br />
            See the bigger picture.
          </p>
          <button onClick={startTour}>
            Take the guided tour <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <button onClick={() => setOverlay({ kind: "sources" })}>
            <BookOpen size={17} /> Sources & methodology{" "}
            <ArrowUpRight size={14} />
          </button>
          <div>
            <span className="online-dot" /> OPEN KNOWLEDGE, OPEN SOURCE
          </div>
        </div>
      </aside>
      {menu && (
        <button
          className="menu-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMenu(!menu)}
            >
              <Menu size={21} />
            </button>
            <span>Atlas</span>
            <ChevronRight size={13} />
            <strong>{nav.find((n) => n.id === section)?.label}</strong>
          </div>
          <div className="topbar-actions">
            <span className="version">
              VOL. 01 <span> / </span> SYSTEMS THAT SCALE
            </span>
            <a
              href="https://github.com/sloth-os/data-system"
              target="_blank"
              rel="noreferrer"
              aria-label="View source on GitHub"
            >
              <Github size={17} />
              <span>View source</span>
              <ArrowUpRight size={14} />
            </a>
          </div>
        </header>
        <main id="main-content">
          <section className="page-intro">
            <div>
              <div className="eyebrow">
                <span className="tiny-cross">✳</span>
                {headings[section][0]}
              </div>
              <h1>
                {headings[section][1]}
                <br />
                <span>{headings[section][2]}</span>
              </h1>
            </div>
            <div className="intro-aside">
              <p>{descriptions[section]}</p>
              <button
                className="inline-button"
                onClick={
                  section === "immersive"
                    ? () => navigate("explore")
                    : section === "explore"
                      ? () => navigate("performance")
                      : startTour
                }
              >
                {section === "immersive"
                  ? "Explore CPU → multi-cloud"
                  : section === "explore"
                    ? "Open the scale lab"
                    : "Take the guided tour"}
                <ArrowUpRight size={17} />
              </button>
            </div>
          </section>

          {section === "immersive" && (
            <ImmersiveLab
              initialSystem={immersiveSystem}
              onSystemChange={setImmersiveSystem}
              playing={playing}
              onPlaying={setPlaying}
              speed={speed}
              onSpeed={setSpeed}
              onProject={(name) => {
                navigate("projects");
                setProjectFilter("All systems");
                setSearch(name);
              }}
            />
          )}

          {section === "explore" && (
            <div className="stat-strip">
              <div>
                <strong>
                  100<span>B</span>
                </strong>
                <small>RECORDS TO REASON ABOUT</small>
              </div>
              <div>
                <strong>
                  10 <span>PB</span>
                </strong>
                <small>RAW DATA AT 100 kB / RECORD</small>
              </div>
              <div>
                <strong>04</strong>
                <small>LEVELS OF SCALE</small>
              </div>
              <div>
                <strong>{projects.length.toString().padStart(2, "0")}</strong>
                <small>PROJECT ARCHITECTURES</small>
              </div>
            </div>
          )}

          {(section === "explore" ||
            section === "motion" ||
            section === "issues" ||
            section === "recovery") && (
            <>
              <div className="section-topline">
                <div>
                  <span className="section-number">
                    {section === "explore"
                      ? "01"
                      : section === "motion"
                        ? "02"
                        : section === "issues"
                          ? "05"
                          : "06"}
                  </span>
                  <h2>
                    {section === "explore"
                      ? "A change in scale. A change in rules."
                      : section === "motion"
                        ? "One pipeline. Many moving parts."
                        : section === "issues"
                          ? "See the bottleneck take shape."
                          : "The failure is simulated. The lessons are real."}
                  </h2>
                </div>
                <span className="micro muted">
                  INTERACTIVE 3D MODEL <span className="lime-dot" />
                </span>
              </div>
              <div
                className="level-tabs"
                role="tablist"
                aria-label="Scale level"
              >
                {levels.map((l, i) => {
                  const Icon = levelIcons[i];
                  return (
                    <button
                      key={l.id}
                      role="tab"
                      aria-selected={l.id === level}
                      className={l.id === level ? "selected" : ""}
                      onClick={() => {
                        setLevel(l.id);
                        setFailure(false);
                      }}
                    >
                      <span className="step-index">0{i + 1}</span>
                      <Icon size={17} />
                      <strong>{l.title}</strong>
                      <span className="level-description">
                        {
                          [
                            "Within a chip",
                            "Within a machine",
                            "Across machines",
                            "Across regions",
                          ][i]
                        }
                      </span>
                      {i < 3 && (
                        <ChevronRight className="step-arrow" size={14} />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="visualization-layout">
                <div
                  className={`scene-panel ${fullscreen ? "is-fullscreen" : ""}`}
                  ref={sceneRef}
                >
                  <div className="scene-canvas">
                    <Scene
                      level={level}
                      playing={playing}
                      speed={speed}
                      failure={failure}
                      issue={
                        section === "issues"
                          ? activeIssue
                          : section === "motion"
                            ? pipeline === "query"
                              ? "shuffle"
                              : pipeline === "stream"
                                ? "stream"
                                : "replication"
                            : section === "recovery"
                              ? `recovery-${selectedRecovery.id}`
                              : undefined
                      }
                      resetKey={resetKey}
                      onSelect={(id) => setOverlay({ kind: "node", id })}
                    />
                  </div>
                  <div className="scene-top">
                    <div>
                      <span className="scene-badge">
                        <span
                          className={failure ? "warning-dot" : "online-dot"}
                        />
                        {failure ? "FAULT INJECTED" : "LIVE SIMULATION"}
                      </span>
                      <p>
                        {section === "issues"
                          ? selectedIssue.title
                          : section === "motion"
                            ? pipelines[pipeline][stage][0]
                            : selectedLevel.eyebrow}
                      </p>
                    </div>
                    <span className="scene-coordinate">
                      {level === "multicloud"
                        ? "3 REGIONS"
                        : level === "cpu"
                          ? "L1 → L3 → DRAM"
                          : level === "server"
                            ? "1 FAILURE DOMAIN"
                            : "3 SHARD GROUPS"}
                      <br />
                      <span>CONCEPTUAL TOPOLOGY</span>
                    </span>
                  </div>
                  <div className="scene-hint">
                    <span className="hint-dot" /> Drag to orbit <span>·</span>{" "}
                    Scroll to zoom <span>·</span> Select a node
                  </div>
                  <div className="scene-toolbar">
                    <div className="playback">
                      <button
                        className="icon-button"
                        aria-label={
                          playing ? "Pause animation" : "Play animation"
                        }
                        onClick={() => setPlaying(!playing)}
                      >
                        {playing ? (
                          <Pause size={15} fill="currentColor" />
                        ) : (
                          <Play size={15} fill="currentColor" />
                        )}
                      </button>
                      <select
                        value={speed}
                        aria-label="Animation speed"
                        onChange={(e) => setSpeed(Number(e.target.value))}
                      >
                        <option value={0.5}>0.5×</option>
                        <option value={1}>1× speed</option>
                        <option value={2}>2× speed</option>
                      </select>
                      <span className="toolbar-divider" />
                      <span className="flow-key">
                        <i /> Data flow
                      </span>
                      <span className="flow-key secondary">
                        <i /> Replica link
                      </span>
                    </div>
                    <div className="scene-tools">
                      <button
                        className="icon-button"
                        aria-label="Reset camera"
                        title="Reset camera"
                        onClick={() => setResetKey((v) => v + 1)}
                      >
                        <RotateCcw size={16} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label="Toggle fullscreen"
                        title="Fullscreen"
                        onClick={toggleFullscreen}
                      >
                        <Maximize2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
                <aside className="inspector">
                  <div className="eyebrow">
                    {section === "issues"
                      ? "CHALLENGE IN FOCUS"
                      : section === "motion"
                        ? "INSIDE THE PIPELINE"
                        : section === "recovery"
                          ? "RECOVERY CONTROL"
                          : "THE ARCHITECTURE"}
                  </div>
                  <h3>
                    {section === "issues"
                      ? selectedIssue.title
                      : section === "motion"
                        ? pipelines[pipeline][stage][0]
                        : section === "recovery"
                          ? selectedRecovery.title
                          : selectedLevel.title}
                  </h3>
                  <p>
                    {section === "issues"
                      ? selectedIssue.summary
                      : section === "motion"
                        ? pipelines[pipeline][stage][2]
                        : section === "recovery"
                          ? selectedRecovery.summary
                          : selectedLevel.description}
                  </p>
                  {section === "explore" && (
                    <>
                      <div className="bottleneck">
                        <span>
                          <Activity size={14} /> PRIMARY CONSTRAINT
                        </span>
                        <p>{selectedLevel.bottleneck}</p>
                      </div>
                      <div className="inspector-metrics">
                        {selectedLevel.metrics.map((m) => (
                          <div key={m.label}>
                            <span>{m.label}</span>
                            <strong>{m.value}</strong>
                          </div>
                        ))}
                      </div>
                      <p className="small-note">
                        Orders of magnitude are illustrative; hardware and
                        workload change the result.
                      </p>
                    </>
                  )}
                  {section === "motion" && (
                    <>
                      <div className="bottleneck">
                        <span>
                          <Network size={14} /> CURRENT EXCHANGE
                        </span>
                        <p>{pipelines[pipeline][stage][1]}</p>
                      </div>
                      <div className="inspector-controls">
                        <button
                          disabled={stage === 0}
                          onClick={() => setStage((s) => s - 1)}
                          aria-label="Previous pipeline step"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span>STEP {stage + 1} / 5</span>
                        <button
                          disabled={stage === 4}
                          onClick={() => setStage((s) => s + 1)}
                          aria-label="Next pipeline step"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </>
                  )}
                  {section === "issues" && (
                    <>
                      <div className="bottleneck">
                        <span>
                          <Zap size={14} /> WHAT YOU SEE
                        </span>
                        <p>{selectedIssue.symptom}</p>
                      </div>
                      <button
                        className="dark-button"
                        onClick={() =>
                          setOverlay({ kind: "issue", id: activeIssue })
                        }
                      >
                        Explore the mechanism <ArrowUpRight size={15} />
                      </button>
                    </>
                  )}
                  {section === "recovery" && (
                    <>
                      <div className="recovery-objectives">
                        <div>
                          <small>RPO TARGET</small>
                          <strong>{selectedRecovery.rpo}</strong>
                        </div>
                        <div>
                          <small>RTO TARGET</small>
                          <strong>{selectedRecovery.rto}</strong>
                        </div>
                      </div>
                      <button
                        className={
                          failure ? "outline-button" : "failure-button"
                        }
                        onClick={() => {
                          setFailure(!failure);
                          setRecoveryStep(failure ? -1 : 0);
                        }}
                      >
                        {failure ? <RotateCcw size={15} /> : <Zap size={15} />}
                        {failure ? "Reset the drill" : faultLabel}
                      </button>
                      <p className="small-note">
                        Targets depend on topology and tested procedures; they
                        are not guarantees.
                      </p>
                    </>
                  )}
                  <div className="inspector-footer">
                    <span className="lime-dot" />
                    {section === "recovery" && failure
                      ? "FAILURE INJECTED · SIMULATION ONLY"
                      : "EXPLORE. QUESTION. UNDERSTAND."}
                  </div>
                </aside>
              </div>
            </>
          )}

          {section === "explore" && (
            <>
              <div className="learning-cards">
                {selectedLevel.details.map((d, i) => (
                  <article key={d.title}>
                    <div className="card-top">
                      <span className="card-icon">
                        {i === 0 ? (
                          <Boxes size={18} />
                        ) : i === 1 ? (
                          <Layers3 size={18} />
                        ) : (
                          <Network size={18} />
                        )}
                      </span>
                      <span className="micro muted">0{i + 1}</span>
                    </div>
                    <h3>{d.title}</h3>
                    <p>{d.body}</p>
                  </article>
                ))}
              </div>
              <div className="architecture-notes">
                <div>
                  <span className="eyebrow">THE PLAYBOOK</span>
                  <h2>What changes at this level?</h2>
                  <p>{selectedLevel.solutions.join(" · ")}</p>
                </div>
                <ol className="flow-list">
                  {selectedLevel.flow.map((f, i) => (
                    <li key={f}>
                      <span>0{i + 1}</span>
                      {f}
                      {i < selectedLevel.flow.length - 1 && (
                        <ArrowDown size={14} />
                      )}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="section-topline lower">
                <div>
                  <span className="section-number">↳</span>
                  <h2>Different data. Different access paths.</h2>
                </div>
                <span className="micro muted">WORKLOAD BEFORE TECHNOLOGY</span>
              </div>
              <div className="data-type-layout">
                <div
                  className="data-type-tabs"
                  role="tablist"
                  aria-label="Data model"
                >
                  {dataTypes.map((d) => (
                    <button
                      role="tab"
                      aria-selected={selectedData.id === d.id}
                      key={d.id}
                      onClick={() => setDataType(d.id)}
                      className={selectedData.id === d.id ? "selected" : ""}
                    >
                      <Database size={15} />
                      {d.name}
                      <ChevronRight size={14} />
                    </button>
                  ))}
                </div>
                <article className="data-type-detail">
                  <span className="pill">DATA MODEL</span>
                  <h3>{selectedData.name}</h3>
                  <p className="data-example">{selectedData.example}</p>
                  <div className="detail-grid">
                    <div>
                      <h4>Storage & representation</h4>
                      <p>{selectedData.storage}</p>
                    </div>
                    <div>
                      <h4>Access pattern</h4>
                      <p>{selectedData.access}</p>
                    </div>
                    <div>
                      <h4>Scaling challenge</h4>
                      <p>{selectedData.scaling}</p>
                    </div>
                    <div>
                      <h4>Explore the systems</h4>
                      <div className="tag-row">
                        {selectedData.projects.map((p) => (
                          <button
                            key={p}
                            className="tag-button"
                            onClick={() => {
                              navigate("projects");
                              setProjectFilter("All systems");
                              setSearch(p);
                            }}
                          >
                            {p}
                            <ArrowUpRight size={12} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    className="animate-data-model"
                    onClick={() => {
                      setImmersiveSystem(dataModelSystem[selectedData.id]);
                      navigate("immersive");
                    }}
                  >
                    <Sparkles size={15} />
                    Explore this data model in 3D
                    <ArrowUpRight size={15} />
                  </button>
                </article>
              </div>
            </>
          )}

          {section === "motion" && (
            <>
              <div className="motion-heading">
                <div>
                  <span className="eyebrow">CHOOSE A JOURNEY</span>
                  <h2>Follow one operation, end to end.</h2>
                </div>
                <div className="segmented">
                  {(["write", "query", "stream"] as const).map((x) => (
                    <button
                      key={x}
                      className={pipeline === x ? "selected" : ""}
                      onClick={() => {
                        setPipeline(x);
                        setStage(0);
                      }}
                    >
                      {x === "write"
                        ? "Write path"
                        : x === "query"
                          ? "Analytical query"
                          : "Event stream"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pipeline-steps">
                {pipelines[pipeline].map((s, i) => (
                  <button
                    key={s[0]}
                    className={stage === i ? "selected" : ""}
                    onClick={() => setStage(i)}
                  >
                    <span>0{i + 1}</span>
                    <h3>{s[0]}</h3>
                    <p>{s[1]}</p>
                    <ChevronRight size={15} />
                  </button>
                ))}
              </div>
              <div className="article-grid">
                <article className="essay-card">
                  <Network size={23} />
                  <h3>The network is part of the algorithm.</h3>
                  <p>
                    Incast happens when many workers send to one reducer.
                    Oversubscription makes rack-to-rack bandwidth scarcer than
                    host NIC capacity. TCP congestion control, queueing and
                    packet loss turn nominal link speed into a very different
                    application throughput.
                  </p>
                  <p>
                    Batch small writes, compress before exchange, push
                    predicates to storage, and colocate related keys. A
                    broadcast join has traffic proportional to the small table ×
                    worker count; repartitioning both inputs can cost the
                    combined size of both relations.
                  </p>
                </article>
                <article className="essay-card">
                  <Layers3 size={23} />
                  <h3>Data changes shape as it travels.</h3>
                  <p>
                    Row-oriented events become columnar batches; JSON documents
                    become inverted indexes or embeddings; CDC logs become
                    materialized views. Keep schema versions, event timestamps
                    and stable identifiers through each transformation.
                  </p>
                  <p>
                    Serialization costs CPU. Compression trades CPU for I/O.
                    Arrow supports columnar interchange in memory; Parquet
                    supports encoded columnar files. Neither alone supplies
                    transactions, a catalog or a distributed query engine.
                  </p>
                  <SourceLink url="https://arrow.apache.org/docs/format/Columnar.html">
                    Apache Arrow format
                  </SourceLink>
                </article>
              </div>
            </>
          )}

          {section === "performance" && (
            <>
              <div className="lab-layout">
                <section className="lab-controls">
                  <div className="panel-title">
                    <SlidersHorizontal size={18} />
                    <h2>Build your workload</h2>
                    <span className="pill">LIVE MODEL</span>
                  </div>
                  <label>
                    Records{" "}
                    <strong>
                      {recordPower === 11
                        ? "100 billion"
                        : recordPower === 10
                          ? "10 billion"
                          : recordPower === 9
                            ? "1 billion"
                            : `${10 ** (recordPower - 6)} million`}
                    </strong>
                    <input
                      aria-label="Record count exponent"
                      type="range"
                      min={6}
                      max={11}
                      step={1}
                      value={recordPower}
                      onChange={(e) => setRecordPower(+e.target.value)}
                    />
                    <span className="range-labels">
                      <span>1 million</span>
                      <span>100 billion</span>
                    </span>
                  </label>
                  <div className="control-pair">
                    <label>
                      Average record
                      <select
                        value={recordBytes}
                        onChange={(e) => setRecordBytes(+e.target.value)}
                      >
                        <option value={100}>100 B</option>
                        <option value={1000}>1 kB</option>
                        <option value={10000}>10 kB</option>
                        <option value={100000}>100 kB</option>
                      </select>
                    </label>
                    <label>
                      Replicas
                      <select
                        value={replicas}
                        onChange={(e) => setReplicas(+e.target.value)}
                      >
                        {[1, 3, 5].map((n) => (
                          <option key={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="control-pair">
                    <label>
                      Network per worker
                      <select
                        value={link}
                        onChange={(e) => setLink(+e.target.value)}
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
                        value={compression}
                        onChange={(e) => setCompression(+e.target.value)}
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
                    Workers <strong>{nodes}</strong>
                    <input
                      aria-label="Worker count"
                      type="range"
                      min={4}
                      max={128}
                      step={4}
                      value={nodes}
                      onChange={(e) => setNodes(+e.target.value)}
                      disabled={mode === "up"}
                    />
                    <span className="range-labels">
                      <span>4 workers</span>
                      <span>128 workers</span>
                    </span>
                  </label>
                  <label>
                    Skew penalty <strong>{Math.round(skew * 100)}%</strong>
                    <input
                      aria-label="Skew penalty"
                      type="range"
                      min={0}
                      max={0.8}
                      step={0.05}
                      value={skew}
                      onChange={(e) => setSkew(+e.target.value)}
                    />
                    <span className="range-labels">
                      <span>Balanced</span>
                      <span>Severe skew</span>
                    </span>
                  </label>
                  <div className="segmented wide">
                    <button
                      className={mode === "up" ? "selected" : ""}
                      onClick={() => setMode("up")}
                    >
                      Scale up
                    </button>
                    <button
                      className={mode === "out" ? "selected" : ""}
                      onClick={() => setMode("out")}
                    >
                      Scale out
                    </button>
                  </div>
                </section>
                <section className="lab-results" aria-live="polite">
                  <div className="result-top">
                    <span className="eyebrow">YOUR SYSTEM, AT A GLANCE</span>
                    <span className="model-badge">
                      ILLUSTRATIVE · NOT A BENCHMARK
                    </span>
                  </div>
                  <div className="big-result">
                    <span>Raw data footprint</span>
                    <strong>
                      {formatBytes(model.rawBytes)}
                      <span>
                        {" "}
                        /{" "}
                        {recordPower === 11
                          ? "100B"
                          : (10 ** recordPower).toLocaleString()}{" "}
                        records
                      </span>
                    </strong>
                  </div>
                  <div className="result-cards">
                    <div>
                      <Database size={17} />
                      <strong>{formatBytes(model.physicalBytes)}</strong>
                      <span>Compressed × replicas</span>
                    </div>
                    <div>
                      <Activity size={17} />
                      <strong>{model.effectiveGBps.toFixed(1)} GB/s</strong>
                      <span>Modeled I/O bound</span>
                    </div>
                    <div>
                      <Network size={17} />
                      <strong>{formatDuration(model.scanSeconds)}</strong>
                      <span>Scan + transfer floor</span>
                    </div>
                  </div>
                  <div className="chart-heading">
                    <h3>Same data. Different architectures.</h3>
                    <span>SCAN + TRANSFER · LOWER IS BETTER</span>
                  </div>
                  <div className="comparison-chart">
                    {comparisons.map((c) => (
                      <div className="comparison-row" key={c.label}>
                        <div>
                          <strong>{c.label}</strong>
                          <span>{c.detail}</span>
                        </div>
                        <div className="bar-track">
                          <div
                            className="bar"
                            style={{
                              width: `${Math.max(2, (c.value / maxTime) * 100)}%`,
                              background: c.color,
                            }}
                          />
                        </div>
                        <strong>{formatDuration(c.value)}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="lab-callout">
                    <Zap size={17} />
                    <p>
                      <strong>
                        {model.fabricGBps < model.diskGBps
                          ? "Network-bound at this setting."
                          : "Storage-bound at this setting."}
                      </strong>{" "}
                      {model.fabricGBps < model.diskGBps
                        ? "More disk bandwidth cannot beat a saturated fabric. Filter or compress before shuffling."
                        : "Faster links alone will not shorten the modeled scan. Improve pruning or storage throughput."}
                    </p>
                  </div>
                </section>
              </div>
              <div className="article-grid">
                <article className="essay-card">
                  <h3>Make the math inspectable.</h3>
                  <dl className="formula-list">
                    <div>
                      <dt>Raw data</dt>
                      <dd>record count × average bytes</dd>
                    </div>
                    <div>
                      <dt>Physical storage</dt>
                      <dd>raw ÷ compression × replicas</dd>
                    </div>
                    <div>
                      <dt>Fabric throughput</dt>
                      <dd>workers × Gbit/s ÷ 8 × 65%</dd>
                    </div>
                    <div>
                      <dt>Scan lower bound</dt>
                      <dd>logical bytes ÷ min(disk, fabric) ÷ (1 − skew)</dd>
                    </div>
                  </dl>
                  <p>
                    Decimal units: 1 PB = 10¹⁵ bytes. At 100 billion records, 1
                    kB each is 100 TB; 100 kB each is 10 PB. Indexes, metadata,
                    spare capacity and backups are additional.
                  </p>
                </article>
                <article className="essay-card">
                  <h3>Read the limits before the result.</h3>
                  <p>
                    Assumptions: 2 GB/s sequential storage per worker, 16 GB/s
                    on the scale-up server, 40 GB/s local path, and 65%
                    effective network bandwidth. The distributed model assumes
                    every scanned compressed byte crosses the fabric between
                    storage and compute, using one logical replica, with even
                    partitioning before the skew penalty. Shard-local pushdown
                    and aggregation can avoid much of this traffic; this is not
                    a universal scan limit.
                  </p>
                  <p>
                    This model excludes CPU, decompression, request queues,
                    caches, indexes, protocol round trips, and shared rack or
                    cross-region contention. It is an optimistic I/O bound, not
                    a latency or QPS forecast. Replication overhead applies to
                    capacity; write durability needs a separate critical-path
                    model.
                  </p>
                  <div className="tag-row">
                    <span className="tag">
                      40% illustrative shuffle:{" "}
                      {formatBytes(model.shuffleBytes)}
                    </span>
                    <span className="tag">
                      Network-only floor: {formatDuration(model.shuffleSeconds)}
                    </span>
                  </div>
                </article>
              </div>
            </>
          )}

          {section === "projects" && (
            <>
              <div className="project-controls">
                <label className="search-field">
                  <Search size={18} />
                  <input
                    aria-label="Search projects"
                    placeholder="Search systems, algorithms, workloads…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button
                      className="icon-button"
                      aria-label="Clear search"
                      onClick={() => setSearch("")}
                    >
                      <X size={15} />
                    </button>
                  )}
                </label>
                <span className="micro muted">
                  {shownProjects.length} ARCHITECTURES TO EXPLORE
                </span>
              </div>
              <div className="filter-row" aria-label="Filter projects">
                {categories.map((c) => (
                  <button
                    key={c}
                    className={c === projectFilter ? "selected" : ""}
                    onClick={() => setProjectFilter(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="project-grid">
                {shownProjects.map((p, i) => (
                  <button
                    className="project-card"
                    key={p.id}
                    onClick={() => setOverlay({ kind: "project", id: p.id })}
                  >
                    <div className="card-top">
                      <span className={`project-monogram mono-${i % 4}`}>
                        {p.name.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="pill">{p.category}</span>
                      <ArrowUpRight size={18} />
                    </div>
                    <h3>{p.name}</h3>
                    <span className="project-kind">{p.kind}</span>
                    <p>{p.summary}</p>
                    <div className="project-card-footer">
                      <span>Architecture field notes</span>
                      <ArrowRight size={16} />
                    </div>
                  </button>
                ))}
              </div>
              {shownProjects.length === 0 && (
                <div className="empty-state">
                  <Search size={30} />
                  <h3>No matching systems</h3>
                  <p>
                    Try a workload like “graph”, an algorithm like “LSM”, or
                    clear the filters.
                  </p>
                  <button
                    className="outline-button"
                    onClick={() => {
                      setSearch("");
                      setProjectFilter("All systems");
                    }}
                  >
                    Reset filters
                  </button>
                </div>
              )}
              <div className="editorial-banner">
                <div>
                  <span className="eyebrow">THERE IS NO UNIVERSAL WINNER</span>
                  <h2>Compare the work, not just the number.</h2>
                  <p>
                    Match durability, isolation, record size, indexes, client
                    concurrency, data skew and hardware before comparing
                    results. A cached key lookup and a distributed full scan
                    answer different questions.
                  </p>
                </div>
                <button
                  className="dark-button"
                  onClick={() => navigate("performance")}
                >
                  Test a capacity model <ArrowUpRight size={16} />
                </button>
              </div>
            </>
          )}

          {section === "issues" && (
            <>
              <div className="section-topline lower">
                <div>
                  <span className="section-number">10</span>
                  <h2>Challenges worth understanding.</h2>
                </div>
                <span className="micro muted">
                  EDITORIAL SELECTION · NOT A RANKING
                </span>
              </div>
              <div className="issues-grid">
                {issues.map((issue, i) => (
                  <article
                    key={issue.id}
                    className={
                      issue.id === activeIssue
                        ? "issue-card selected"
                        : "issue-card"
                    }
                  >
                    <div className="card-top">
                      <span className="issue-number">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="pill">{issue.category}</span>
                      {issue.id === activeIssue && (
                        <span className="lime-dot" />
                      )}
                    </div>
                    <h3>{issue.title}</h3>
                    <p>{issue.summary}</p>
                    <div className="issue-card-actions">
                      <button
                        onClick={() => {
                          setActiveIssue(issue.id);
                          setLevel(issueLevel(issue.id));
                          setPlaying(true);
                          sceneRef.current?.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                        }}
                      >
                        {issue.id === activeIssue ? (
                          <Activity size={14} />
                        ) : (
                          <Play size={14} />
                        )}
                        {issue.id === activeIssue && playing
                          ? "Animating"
                          : "Animate challenge"}
                      </button>
                      <button
                        aria-label={`Read about ${issue.title}`}
                        onClick={() =>
                          setOverlay({ kind: "issue", id: issue.id })
                        }
                      >
                        <BookOpen size={16} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          {section === "recovery" && (
            <>
              <div className="motion-heading">
                <div>
                  <span className="eyebrow">RECOVERY PLAYBOOK</span>
                  <h2>A failover is a process, not a button.</h2>
                </div>
                <select
                  className="scenario-select"
                  aria-label="Recovery scenario"
                  value={scenario}
                  onChange={(e) => {
                    const n = +e.target.value;
                    setScenario(n);
                    setLevel(
                      n < 2 ? "cluster" : n === 3 ? "server" : "multicloud",
                    );
                    setFailure(false);
                    setRecoveryStep(-1);
                  }}
                >
                  {recoveryScenarios.map((r, i) => (
                    <option key={r.id} value={i}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="recovery-status" role="status">
                <span className={failure ? "warning-dot" : "online-dot"} />
                <strong>
                  {failure
                    ? `Drill in progress · step ${recoveryStep + 1} of ${selectedRecovery.steps.length}`
                    : recoveryStep === selectedRecovery.steps.length
                      ? "Drill complete · verify and document the result"
                      : "Healthy topology · ready for a simulated outage"}
                </strong>
                <span>No infrastructure is affected</span>
              </div>
              <div className="recovery-steps">
                {selectedRecovery.steps.map((step, i) => (
                  <article
                    key={step}
                    className={
                      recoveryStep === i
                        ? "current"
                        : recoveryStep > i
                          ? "complete"
                          : ""
                    }
                  >
                    <span>
                      {recoveryStep > i ? (
                        <Check size={17} />
                      ) : (
                        String(i + 1).padStart(2, "0")
                      )}
                    </span>
                    <div>
                      <h3>{step.split(":")[0]}</h3>
                      <p>
                        {step.includes(":")
                          ? step.substring(step.indexOf(":") + 1)
                          : "Verify the outcome and record evidence before proceeding."}
                      </p>
                    </div>
                    {recoveryStep === i && (
                      <button
                        className="dark-button"
                        onClick={() => {
                          const next = i + 1;
                          setRecoveryStep(next);
                          if (next === selectedRecovery.steps.length)
                            setFailure(false);
                        }}
                      >
                        {i === selectedRecovery.steps.length - 1
                          ? "Complete drill"
                          : "Confirm & continue"}
                        <ArrowRight size={14} />
                      </button>
                    )}
                  </article>
                ))}
              </div>
              <div className="article-grid">
                <article className="essay-card">
                  <ShieldCheck size={24} />
                  <h3>Recovery point ≠ recovery time.</h3>
                  <p>
                    RPO is the maximum acceptable data loss measured in time.
                    RTO is the target time to restore service. Synchronous
                    quorum replication can protect acknowledged writes within
                    its quorum failure model; async regional replication can
                    lose the unreplicated tail.
                  </p>
                  <p>{selectedRecovery.tradeoff}</p>
                </article>
                <article className="essay-card">
                  <Database size={24} />
                  <h3>A replica is not a backup.</h3>
                  <p>
                    Deletes, corruption and ransomware can propagate to every
                    replica. Keep versioned, immutable backups under separate
                    access controls; retain WAL or change logs for point-in-time
                    recovery. Test a restore into an isolated environment and
                    verify application invariants.
                  </p>
                  <p>
                    At 10 PB, even 100 GB/s of sustained restore throughput
                    takes roughly 27.8 hours before verification or index
                    rebuilds. Prioritize critical datasets, pre-position
                    snapshots and test the real recovery path.
                  </p>
                  <SourceLink url="https://www.postgresql.org/docs/current/continuous-archiving.html">
                    PostgreSQL point-in-time recovery
                  </SourceLink>
                </article>
              </div>
            </>
          )}

          <footer className="page-footer">
            <div className="footer-brand">
              <Layers3 size={17} />
              DATA / SCALE <span>A field guide for curious engineers.</span>
            </div>
            <button onClick={() => setOverlay({ kind: "sources" })}>
              Built on primary sources <ArrowUpRight size={14} />
            </button>
            <span>EXPLORE THE TRADEOFFS.</span>
          </footer>
        </main>
      </div>

      {overlay && (
        <Modal
          title={
            overlay.kind === "sources"
              ? "Good explanations start with good sources."
              : overlay.kind === "tour"
                ? tours[tour].title
                : overlay.kind === "project"
                  ? projects.find((p) => p.id === overlay.id)!.name
                  : overlay.kind === "issue"
                    ? issues.find((i) => i.id === overlay.id)!.title
                    : overlay.id || "Inside the topology"
          }
          wide={overlay.kind === "sources" || overlay.kind === "project"}
          onClose={() => setOverlay(null)}
        >
          {overlay.kind === "sources" && (
            <>
              <p className="modal-lead">
                Primary documentation grounds this atlas. The topology
                animations are conceptual; model outputs are calculated
                estimates, never measured project benchmarks.
              </p>
              <div className="method-note">
                <strong>Research note · 10 November 2026</strong>
                <p>
                  The ten hot issues are an editorial selection of enduring,
                  active engineering challenges—not a measured popularity
                  ranking. Documentation evolves; consult the linked project
                  version before making a deployment decision.
                </p>
              </div>
              <div className="source-list">
                {sources.map((s, i) => (
                  <a key={s.url} href={s.url} target="_blank" rel="noreferrer">
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <strong>{s.title}</strong>
                      <p>{s.note}</p>
                    </div>
                    <ExternalLink size={16} />
                  </a>
                ))}
              </div>
            </>
          )}
          {overlay.kind === "tour" && (
            <>
              <div className="tour-visual">
                <span>{String(tour + 1).padStart(2, "0")}</span>
                {tour === 0 ? (
                  <Cpu size={70} strokeWidth={1} />
                ) : tour === 5 ? (
                  <ShieldCheck size={70} strokeWidth={1} />
                ) : (
                  <Network size={70} strokeWidth={1} />
                )}
              </div>
              <p className="modal-lead">{tours[tour].body}</p>
              <div className="tour-controls">
                <div className="tour-dots">
                  {tours.map((t, i) => (
                    <button
                      key={t.title}
                      aria-label={`Tour step ${i + 1}`}
                      className={i === tour ? "selected" : ""}
                      onClick={() => advanceTour(i)}
                    />
                  ))}
                </div>
                <button
                  className="dark-button"
                  onClick={() => {
                    if (tour === tours.length - 1) setOverlay(null);
                    else advanceTour(tour + 1);
                  }}
                >
                  {tour === tours.length - 1
                    ? "Start exploring"
                    : "Next perspective"}
                  <ArrowRight size={15} />
                </button>
              </div>
            </>
          )}
          {overlay.kind === "project" &&
            (() => {
              const p = projects.find((x) => x.id === overlay.id)!;
              return (
                <>
                  <div className="tag-row">
                    <span className="pill">{p.category}</span>
                    <span className="tag">{p.kind}</span>
                  </div>
                  <p className="modal-lead">{p.summary}</p>
                  <div className="detail-grid modal-detail-grid">
                    <div>
                      <h4>Deployment model</h4>
                      <p>{p.deployment}</p>
                    </div>
                    <div>
                      <h4>Core algorithm</h4>
                      <p>{p.algorithm}</p>
                    </div>
                  </div>
                  <h3 className="modal-subhead">Inside a typical operation</h3>
                  <ol className="modal-process">
                    {p.process.map((s, i) => (
                      <li key={s}>
                        <span>0{i + 1}</span>
                        <p>{s}</p>
                      </li>
                    ))}
                  </ol>
                  <div className="method-note">
                    <strong>The tradeoff</strong>
                    <p>{p.tradeoff}</p>
                  </div>
                  <SourceLink url={p.source} />
                  <button
                    className="dark-button modal-bottom-action"
                    onClick={() => {
                      setImmersiveSystem(projectSystem[p.id]);
                      navigate("immersive");
                      setOverlay(null);
                    }}
                  >
                    Explore this system family in 3D
                    <Sparkles size={14} />
                  </button>
                </>
              );
            })()}
          {overlay.kind === "issue" &&
            (() => {
              const i = issues.find((x) => x.id === overlay.id)!;
              return (
                <>
                  <span className="pill">{i.category}</span>
                  <p className="modal-lead">{i.summary}</p>
                  <div className="issue-analysis">
                    {[
                      ["The symptom", i.symptom],
                      ["The mechanism", i.mechanism],
                      ["The response", i.solution],
                      ["The tradeoff", i.tradeoff],
                    ].map(([t, b]) => (
                      <div key={t}>
                        <h3>{t}</h3>
                        <p>{b}</p>
                      </div>
                    ))}
                  </div>
                  <SourceLink url={i.source} />
                  <button
                    className="dark-button modal-bottom-action"
                    onClick={() => {
                      navigate("issues");
                      setActiveIssue(i.id);
                      setLevel(issueLevel(i.id));
                      setPlaying(true);
                      setOverlay(null);
                    }}
                  >
                    Animate this challenge <Play size={14} />
                  </button>
                </>
              );
            })()}
          {overlay.kind === "node" && (
            <>
              <span className="pill">
                {selectedLevel.title.toUpperCase()} / TOPOLOGY NODE
              </span>
              <p className="modal-lead">{selectedLevel.description}</p>
              <div className="method-note">
                <strong>What limits this component?</strong>
                <p>{selectedLevel.bottleneck}</p>
              </div>
              <h3 className="modal-subhead">Ways to change the limit</h3>
              <ul className="node-solutions">
                {selectedLevel.solutions.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              <p className="small-note">
                This is a representative topology, not an inventory of running
                infrastructure. Node counts in the 3D scene are illustrative;
                the capacity lab has its own explicit worker setting.
              </p>
              <button
                className="dark-button"
                onClick={() => {
                  navigate("motion");
                  setOverlay(null);
                }}
              >
                Follow data through this system <ArrowRight size={15} />
              </button>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
