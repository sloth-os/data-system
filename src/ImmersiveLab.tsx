import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Database,
  Expand,
  Eye,
  EyeOff,
  FileJson,
  Focus,
  GitFork,
  KeyRound,
  Layers3,
  Map,
  Maximize2,
  Minimize2,
  Move3d,
  Network,
  Package,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import ImmersiveScene from "./ImmersiveScene";
import type { CameraMode } from "./ImmersiveScene";
import { findSystem, systemModels } from "./systemModels";
import type { SystemId, SystemRoute } from "./systemModels";
import "./immersive.css";
import { advanceOperation } from "./playback";

const icons = {
  relational: Database,
  document: FileJson,
  keyvalue: KeyRound,
  widecolumn: Layers3,
  graph: GitFork,
  vector: Sparkles,
  stream: Radio,
  timeseries: Clock3,
  lakehouse: Boxes,
  search: Search,
  object: Package,
  spatial: Map,
};
const packetNames: Record<SystemId, string> = {
  relational: "Row / log record",
  document: "Document / mutation",
  keyvalue: "Key / value",
  widecolumn: "Partition mutation",
  graph: "Vertex / frontier",
  vector: "Vector / candidate",
  stream: "Event / offset",
  timeseries: "Timestamped sample",
  lakehouse: "Column batch / state",
  search: "Term / document ID",
  object: "Object part / bytes",
  spatial: "Bounds / geometry",
};
interface Props {
  playing: boolean;
  onPlaying: (playing: boolean) => void;
  speed: number;
  onSpeed: (speed: number) => void;
  onProject: (name: string) => void;
  initialSystem: SystemId;
  onSystemChange: (id: SystemId) => void;
}

export default function ImmersiveLab({
  playing,
  onPlaying,
  speed,
  onSpeed,
  onProject,
  initialSystem,
  onSystemChange,
}: Props) {
  const [system, setSystem] = useState<SystemId>(initialSystem);
  const [sequence, setSequence] = useState({ index: 0, progress: 0 });
  const [selected, setSelected] = useState<string | null>(null);
  const [flow, setFlow] = useState<SystemRoute | null>(null);
  const [exploded, setExploded] = useState(false);
  const [annotations, setAnnotations] = useState(true);
  const [traffic, setTraffic] = useState(true);
  const [fault, setFault] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>("orbit");
  const [resetKey, setResetKey] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [help, setHelp] = useState(false);
  const [status, setStatus] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const picker = useRef<(HTMLButtonElement | null)[]>([]);
  const model = findSystem(system),
    phase = model.phases[sequence.index];
  const node = selected ? model.nodes.find((n) => n.id === selected) : null;
  const faultPhase = Math.max(
    0,
    model.phases.findIndex((p) => p.active.includes(model.fault.node)),
  );
  const held = fault && sequence.index >= faultPhase;
  const output = held ? "Blocked · no completed output" : phase.after;
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      setSequence((current) =>
        advanceOperation(
          current,
          speed / 140,
          model.phases.length,
          fault ? faultPhase : undefined,
        ),
      );
    }, 100);
    return () => window.clearInterval(timer);
  }, [playing, speed, system, fault, faultPhase, model.phases.length]);
  useEffect(() => {
    const onChange = () =>
      setFullscreen(document.fullscreenElement === root.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  useEffect(() => {
    setSelected(null);
    setFlow(null);
  }, [sequence.index]);
  function chooseSystem(id: SystemId) {
    setSystem(id);
    onSystemChange(id);
    setSequence({ index: 0, progress: 0 });
    setSelected(null);
    setFlow(null);
    setFault(false);
    setStatus("");
  }
  function go(index: number) {
    if (fault && index > faultPhase) return;
    setSequence({ index, progress: 0 });
    setSelected(null);
    setFlow(null);
    onPlaying(false);
  }
  function selectNode(id: string) {
    setSelected(id);
    setFlow(null);
    onPlaying(false);
  }
  function selectFlow(route: SystemRoute) {
    setFlow(route);
    setSelected(null);
    onPlaying(false);
  }
  async function focus() {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (root.current?.requestFullscreen)
      await root.current
        .requestFullscreen()
        .catch(() =>
          setStatus(
            "Fullscreen is unavailable here. You can still orbit and zoom the scene.",
          ),
        );
  }
  function injectFault() {
    if (!fault) {
      setSequence({
        index: Math.max(
          0,
          model.phases.findIndex((p) => p.active.includes(model.fault.node)),
        ),
        progress: 0,
      });
      setSelected(null);
      setFlow(null);
    }
    setFault(!fault);
  }
  return (
    <section
      className="fusion-lab"
      style={{ "--system-accent": model.accent } as CSSProperties}
      aria-label="Immersive systems lab"
    >
      <div className="fusion-picker-heading">
        <span>
          <span className="fusion-live-dot" /> CHOOSE A DATA SYSTEM
        </span>
        <span>12 architectures. 60 stages. One explorable world.</span>
      </div>
      <div
        className="fusion-system-picker"
        role="tablist"
        aria-label="System architecture"
      >
        {systemModels.map((s, i) => {
          const Icon = icons[s.id];
          return (
            <button
              role="tab"
              tabIndex={system === s.id ? 0 : -1}
              ref={(el) => {
                picker.current[i] = el;
              }}
              aria-selected={system === s.id}
              className={system === s.id ? "selected" : ""}
              key={s.id}
              onClick={() => chooseSystem(s.id)}
              onKeyDown={(e) => {
                const next =
                  e.key === "ArrowRight"
                    ? (i + 1) % systemModels.length
                    : e.key === "ArrowLeft"
                      ? (i - 1 + systemModels.length) % systemModels.length
                      : e.key === "Home"
                        ? 0
                        : e.key === "End"
                          ? systemModels.length - 1
                          : -1;
                if (next >= 0) {
                  e.preventDefault();
                  chooseSystem(systemModels[next].id);
                  picker.current[next]?.focus();
                }
              }}
              style={{ "--tab-accent": s.accent } as CSSProperties}
            >
              <Icon size={17} strokeWidth={1.6} />
              <span>{s.short}</span>
              <small>{String(i + 1).padStart(2, "0")}</small>
            </button>
          );
        })}
      </div>
      <div className="fusion-stage" ref={root}>
        <header className="fusion-stage-heading">
          <div>
            <span className="fusion-scene-mark">
              <Network size={20} />
            </span>
            <div>
              <span className="fusion-kicker">{model.category}</span>
              <h2>{model.name}</h2>
            </div>
          </div>
          <div className="fusion-stage-header-actions">
            <span className="fusion-model-note">
              ARCHITECTURAL MODEL
              <br />
              <strong>LOGICAL COMPONENTS · SYNTHETIC DATA</strong>
            </span>
            <button
              onClick={() => setHelp(!help)}
              className={help ? "is-active" : ""}
              aria-label="How to explore the 3D lab"
              aria-expanded={help}
            >
              <Focus size={18} />
            </button>
            <button
              onClick={focus}
              aria-label={
                fullscreen ? "Exit immersive focus" : "Enter immersive focus"
              }
            >
              {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
        </header>
        {help && (
          <div className="fusion-help">
            <div>
              <Move3d size={22} />
              <strong>Make the architecture your own.</strong>
              <button aria-label="Close 3D help" onClick={() => setHelp(false)}>
                <X size={16} />
              </button>
            </div>
            <p>
              Drag to orbit, scroll or pinch to zoom. Select a labeled component
              or its 3D object to inspect its role and sample data. Step through
              the operation, separate the layers, or follow the camera tour.
            </p>
            <p>
              A labeled component is a logical role; several can share one
              process or host. The bright path is the current stage. Packets
              show direction and data representation; their speed and count are
              illustrative. Press Space with the page focused to pause or play.
              Reduced-motion preferences start the animation paused.
            </p>
          </div>
        )}
        <div className="fusion-stage-grid">
          <div className="fusion-viewport">
            <ImmersiveScene
              model={model}
              phase={sequence.index}
              progress={sequence.progress}
              playing={playing}
              speed={speed}
              selected={selected}
              onSelect={selectNode}
              onFlowSelect={selectFlow}
              exploded={exploded}
              annotations={annotations}
              traffic={traffic}
              fault={fault}
              cameraMode={cameraMode}
              resetKey={resetKey}
            />
            <div className="fusion-corner top-left">
              <span
                className={fault ? "fusion-fault-chip" : "fusion-state-chip"}
              >
                <i />
                {fault
                  ? "FAULT INJECTED"
                  : playing
                    ? "ANIMATION RUNNING"
                    : "PAUSED · EXPLORE FREELY"}
              </span>
              <span className="fusion-operation-number">
                STAGE <b>{String(sequence.index + 1).padStart(2, "0")}</b> / 05
              </span>
            </div>
            <div className="fusion-corner bottom-left">
              <span className="fusion-view-caption">
                <Move3d size={13} />
                {cameraMode === "follow"
                  ? "Camera follows the active stage"
                  : cameraMode === "top"
                    ? "Plan view · inspect the connections"
                    : "Drag to orbit · scroll to zoom"}
              </span>
            </div>
            <div className="fusion-transform">
              <span className="fusion-transform-label">DATA CHANGES SHAPE</span>
              <div>
                <span>{phase.before}</span>
                <span className="fusion-transform-arrow">
                  <ArrowRight size={17} />
                </span>
                <strong>{output}</strong>
              </div>
            </div>
            <div className="fusion-axis" aria-hidden="true">
              <span>X</span>
              <span>Y</span>
              <span>Z</span>
              <i />
              <i />
              <i />
            </div>
          </div>
          <aside
            className={`fusion-inspector ${fault ? "has-fault" : ""}`}
            aria-label="Live stage inspector"
          >
            <div className="fusion-inspector-top">
              <span>
                {node
                  ? "COMPONENT INSPECTOR"
                  : flow
                    ? "EXCHANGE INSPECTOR"
                    : "FOLLOW THE OPERATION"}
              </span>
              {node || flow ? (
                <button
                  aria-label="Return to stage explanation"
                  onClick={() => {
                    setSelected(null);
                    setFlow(null);
                  }}
                >
                  <X size={14} />
                </button>
              ) : (
                <span className="fusion-phase-count">
                  {sequence.index + 1} / 5
                </span>
              )}
            </div>
            <select
              className="fusion-component-select"
              aria-label="Inspect architecture component"
              value={selected || ""}
              onChange={(e) => selectNode(e.target.value || "")}
            >
              <option value="">Choose a component to inspect…</option>
              {model.nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label}
                </option>
              ))}
            </select>
            <div className="fusion-inspector-story" aria-live="polite">
              <span className="fusion-inspector-kind">
                {node
                  ? node.role
                  : flow
                    ? `${flow.kind.toUpperCase()} PATH`
                    : phase.title.toUpperCase()}
              </span>
              <h3>{node ? node.label : flow ? flow.label : phase.action}</h3>
              <p>{node ? node.detail : phase.detail}</p>
              {node && (
                <button
                  className="fusion-closeup"
                  onClick={() => {
                    setCameraMode("follow");
                    root.current
                      ?.querySelector(".fusion-viewport")
                      ?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                >
                  <Focus size={13} />
                  Inspect in close-up
                  <ArrowUpRight size={12} />
                </button>
              )}
            </div>
            <div className="fusion-payload">
              <div>
                <FileJson size={12} />
                <span>
                  {node
                    ? "EXAMPLE AT THIS COMPONENT"
                    : flow
                      ? "SOURCE → DESTINATION"
                      : "OUTPUT REPRESENTATION"}
                </span>
                <span className="fusion-code-dot" />
              </div>
              <pre>
                <code>
                  {node
                    ? node.sample
                    : flow
                      ? `${model.nodes.find((n) => n.id === flow.from)!.label}\n    ↓ ${flow.kind}\n${model.nodes.find((n) => n.id === flow.to)!.label}`
                      : output}
                </code>
              </pre>
            </div>
            <div className="fusion-guarantee">
              <ShieldCheck size={15} />
              <div>
                <span>THE CORRECTNESS BOUNDARY</span>
                <p>{phase.invariant}</p>
              </div>
            </div>
            {fault ? (
              <div className="fusion-fault-detail" role="status">
                <span>
                  <Zap size={13} />
                  {model.fault.label}
                </span>
                <p>{model.fault.effect}</p>
                <strong>Recovery response</strong>
                <p>{model.fault.response}</p>
                <p className="fusion-hold-note">
                  This drill holds at the unresolved dependency. Restore the
                  healthy path to continue; no downstream success is assumed.
                </p>
              </div>
            ) : (
              <div className="fusion-pressure">
                <Activity size={14} />
                <div>
                  <span>WATCH THE BOTTLENECK</span>
                  <p>{phase.pressure}</p>
                </div>
              </div>
            )}
            <button
              className={`fusion-fault-button ${fault ? "active" : ""}`}
              onClick={injectFault}
            >
              {fault ? <RotateCcw size={14} /> : <Zap size={14} />}
              {fault ? "Restore the healthy path" : model.fault.label}
              <span>{fault ? "RESET" : "WHAT IF?"}</span>
            </button>
          </aside>
        </div>
        <div className="fusion-control-deck">
          <div className="fusion-transport">
            <button
              className="fusion-play"
              aria-label={
                playing
                  ? "Pause immersive animation"
                  : "Play immersive animation"
              }
              onClick={() => {
                setSelected(null);
                setFlow(null);
                onPlaying(!playing);
              }}
            >
              {playing ? (
                <Pause size={17} fill="currentColor" />
              ) : (
                <Play size={17} fill="currentColor" />
              )}
            </button>
            <button
              aria-label="Previous immersive stage"
              disabled={sequence.index === 0}
              onClick={() => go(sequence.index - 1)}
            >
              <ChevronLeft size={17} />
            </button>
            <button
              aria-label="Next immersive stage"
              disabled={
                sequence.index === 4 || (fault && sequence.index >= faultPhase)
              }
              onClick={() => go(sequence.index + 1)}
            >
              <ChevronRight size={17} />
            </button>
            <select
              aria-label="Immersive animation speed"
              value={speed}
              onChange={(e) => onSpeed(+e.target.value)}
            >
              <option value={0.5}>0.5×</option>
              <option value={1}>1× speed</option>
              <option value={2}>2× speed</option>
            </select>
            <button
              aria-label="Replay operation"
              onClick={() => {
                setSequence({ index: 0, progress: 0 });
                setSelected(null);
                setFlow(null);
                setFault(false);
                onPlaying(true);
              }}
            >
              <RotateCcw size={15} />
            </button>
          </div>
          <div className="fusion-view-controls">
            <button
              aria-label="Explode architecture"
              aria-pressed={exploded}
              className={exploded ? "is-active" : ""}
              onClick={() => setExploded(!exploded)}
            >
              <Expand size={15} />
              <span>Explode</span>
            </button>
            <button
              aria-label="Show all component labels"
              aria-pressed={annotations}
              className={annotations ? "is-active" : ""}
              onClick={() => setAnnotations(!annotations)}
            >
              {annotations ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
            <button
              aria-label="Show data packets"
              aria-pressed={traffic}
              className={traffic ? "is-active" : ""}
              onClick={() => setTraffic(!traffic)}
            >
              <Network size={15} />
            </button>
            <select
              aria-label="Immersive camera mode"
              value={cameraMode}
              onChange={(e) => setCameraMode(e.target.value as CameraMode)}
            >
              <option value="orbit">Free orbit</option>
              <option value="follow">Camera tour</option>
              <option value="top">Plan view</option>
            </select>
            <button
              aria-label="Reset immersive camera"
              onClick={() => {
                setResetKey((n) => n + 1);
                setCameraMode("orbit");
              }}
            >
              <Focus size={16} />
            </button>
          </div>
        </div>
        <div className="fusion-timeline" aria-label="Operation stages">
          {model.phases.map((step, i) => (
            <button
              key={step.title}
              aria-label={`Stage ${i + 1}: ${step.title}`}
              disabled={fault && i > faultPhase}
              aria-current={sequence.index === i ? "step" : undefined}
              className={sequence.index === i ? "current" : ""}
              onClick={() => go(i)}
              style={
                {
                  "--stage-progress":
                    sequence.index === i ? `${sequence.progress * 100}%` : "0%",
                } as CSSProperties
              }
            >
              <span>
                {i < sequence.index ? (
                  <Check size={13} />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </span>
              <div>
                <strong>{step.title}</strong>
                <small>{step.action}</small>
              </div>
              {i < 4 && <ChevronRight size={13} />}
            </button>
          ))}
        </div>
        <div className="fusion-legend">
          <div>
            <span>
              <i style={{ background: model.accent }} />
              {packetNames[system]}
            </span>
            <span>
              <i className="replication" />
              Replica stream
            </span>
            <span>
              <i className="metadata" />
              Metadata / checkpoint
            </span>
            <span>
              <i className="ack" />
              Acknowledgement
            </span>
          </div>
          <span>ANIMATION IS CONCEPTUAL · TIMING IS NOT A BENCHMARK</span>
        </div>
        {status && (
          <p className="fusion-status" role="status">
            {status}
          </p>
        )}
      </div>
      <div className="fusion-operation-card">
        <span className="fusion-kicker">THE WORKED EXAMPLE</span>
        <code>{model.operation}</code>
        <span>
          Trace the operation above. Select any stage or component to go deeper.
        </span>
      </div>
      <div className="fusion-notes-grid">
        <article>
          <span className="fusion-note-icon">
            <GitFork size={19} />
          </span>
          <span className="fusion-kicker">CORE MECHANISM</span>
          <h3>{model.algorithm}</h3>
          <p>{model.description}</p>
          <a href={model.reference.url} target="_blank" rel="noreferrer">
            Primary documentation
            <ArrowUpRight size={15} />
          </a>
        </article>
        <article>
          <span className="fusion-note-icon">
            <ArrowDown size={19} />
          </span>
          <span className="fusion-kicker">WHEN THE DATA GROWS</span>
          <h3>Change the limit, preserve the contract.</h3>
          <p>{model.scaling}</p>
          <div className="fusion-project-links">
            {model.projects.map((name) => (
              <button key={name} onClick={() => onProject(name)}>
                {name}
                <ArrowUpRight size={13} />
              </button>
            ))}
          </div>
        </article>
        <article>
          <span className="fusion-note-icon">
            <Move3d size={19} />
          </span>
          <span className="fusion-kicker">READ THE VISUAL LANGUAGE</span>
          <h3>Shape is the data. Motion is the process.</h3>
          <p>
            Tables expose rows, files expose columns, graphs expand neighbors,
            logs preserve partition order, and vector clouds show candidate
            search. The scene is a teaching projection—not a running deployment.
          </p>
          <button
            className="fusion-guide-link"
            onClick={() => {
              setExploded(true);
              setCameraMode("follow");
              onPlaying(true);
              root.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }}
          >
            Separate the layers & follow
            <ArrowRight size={15} />
          </button>
        </article>
      </div>
    </section>
  );
}
