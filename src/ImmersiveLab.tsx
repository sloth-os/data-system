import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Boxes,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Cpu,
  Database,
  Expand,
  Eye,
  EyeOff,
  FileJson,
  Focus,
  Gamepad2,
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
import WorkspacePanel from "./WorkspacePanel";
import { findSystem, systemModels, projectSystem } from "./systemModels";
import type { SystemId, SystemRoute } from "./systemModels";
import { advanceOperation } from "./playback";
import { capacityModel, formatBytes } from "./model";
import type { ModelInput } from "./model";
import { issues, levels, projects, recoveryScenarios } from "./content";
import type { LevelId } from "./content";
import {
  initialLoad,
  issueContexts,
  journeyContexts,
  scaleMode,
} from "./workspace";
import type { RecoveryDrill, WorkspaceTool } from "./workspace";
import "./immersive.css";
import "./workspace.css";
import "./game.css";
import GamePanel from "./GamePanel";
import GameHUD from "./GameHUD";
import {
  campaignKey,
  currentObjective,
  idleGame,
  isGameActive,
  missionFor,
  parseCampaign,
  recordVictory,
  reduceGame,
  startGame,
} from "./game";
import type { GameEvent, GameState, Campaign } from "./game";
import { initialPlayer } from "./GameWorld";
import type { PlayerTelemetry, GameView } from "./GameWorld";
import { playGameTone } from "./gameAudio";

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
const tools = [
  { id: "game", label: "Mission", icon: Gamepad2 },
  { id: "story", label: "Inspector", icon: Focus },
  { id: "scale", label: "Scale", icon: Cpu },
  { id: "paths", label: "Data paths", icon: Network },
  { id: "capacity", label: "Capacity", icon: Activity },
  { id: "projects", label: "Projects", icon: Boxes },
  { id: "issues", label: "Challenges", icon: Zap },
  { id: "recovery", label: "Recovery", icon: ShieldCheck },
  { id: "sources", label: "Sources", icon: BookOpen },
] as const;
const titles: Record<WorkspaceTool, string> = {
  game: "Mission control",
  story: "Operation inspector",
  scale: "Scale context",
  paths: "Data paths",
  capacity: "Capacity model",
  projects: "Project architecture",
  issues: "Engineering challenges",
  recovery: "Recovery drill",
  sources: "Sources & methodology",
  guide: "Explore this world",
};
interface Props {
  playing: boolean;
  onPlaying: (playing: boolean) => void;
  speed: number;
  onSpeed: (speed: number) => void;
  tool: WorkspaceTool;
  onTool: (tool: WorkspaceTool) => void;
  toolRequest: number;
}

export default function ImmersiveLab({
  playing,
  onPlaying,
  speed,
  onSpeed,
  tool,
  onTool,
  toolRequest,
}: Props) {
  const [game, setGame] = useState<GameState>(idleGame);
  const [player, setPlayer] = useState<PlayerTelemetry>(initialPlayer);
  const [stored] = useState(() => {
    try {
      return {
        campaign: parseCampaign(localStorage.getItem(campaignKey)),
        saved: true,
      };
    } catch {
      return { campaign: {} as Campaign, saved: false };
    }
  });
  const [campaign, setCampaign] = useState<Campaign>(stored.campaign);
  const [campaignSaved, setCampaignSaved] = useState(stored.saved);
  const [sound, setSound] = useState(false);
  const [followEngineer, setFollowEngineer] = useState(true);
  const [navigation, setNavigation] = useState<GameView["navigation"]>(null);
  const [touch, setTouch] = useState({ forward: 0, right: 0, boost: false });
  const navigationSerial = useRef(0),
    runSerial = useRef(0);
  const explorePreferences = useRef<{
    annotations: boolean;
    cameraMode: CameraMode;
    exploded: boolean;
  } | null>(null);
  const previousGame = useRef<GameState>(idleGame);
  const campaignRef = useRef(campaign);
  campaignRef.current = campaign;
  const [system, setSystem] = useState<SystemId>("relational");
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
  const [status, setStatus] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scale, setScale] = useState<LevelId>("cluster");
  const [load, setLoad] = useState<ModelInput>(initialLoad);
  const [projectSearch, setProjectSearch] = useState("");
  const [projectCategory, setProjectCategory] = useState("All");
  const [project, setProject] = useState<string | null>(null);
  const [issue, setIssue] = useState<string | null>(null);
  const [drill, setDrill] = useState<RecoveryDrill>({
    scenario: 2,
    step: 0,
    status: "idle",
  });
  const root = useRef<HTMLElement>(null),
    picker = useRef<(HTMLButtonElement | null)[]>([]);
  const model = findSystem(system),
    phase = model.phases[sequence.index];
  const node = selected ? model.nodes.find((n) => n.id === selected) : null;
  const gamePresent = game.status !== "idle",
    gameActive = isGameActive(game),
    gameObjective = currentObjective(game);
  const capacityUnlocked = gameActive && !!gameObjective?.capacity;
  const drillRunning = drill.status === "running";
  const locked = drillRunning || gamePresent;
  const faultPhase =
    drillRunning && recoveryScenarios[drill.scenario].id === "corruption"
      ? 0
      : Math.max(
          0,
          model.phases.findIndex((p) => p.active.includes(model.fault.node)),
        );
  const held = fault && sequence.index >= faultPhase;
  const output = held ? "Blocked · no completed output" : phase.after;
  const effectiveLoad = { ...load, mode: scaleMode(scale) },
    estimate = capacityModel(effectiveLoad);
  const scaleTitle = levels.find((l) => l.id === scale)!.title;
  const activeIssue = issues.find((i) => i.id === issue),
    scenario = recoveryScenarios[drill.scenario];

  useEffect(() => {
    if (!playing || gamePresent) return;
    const timer = window.setInterval(() => {
      if (!document.hidden)
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
  }, [
    playing,
    speed,
    system,
    fault,
    faultPhase,
    model.phases.length,
    gamePresent,
  ]);
  useEffect(() => {
    const fn = () => setFullscreen(document.fullscreenElement === root.current);
    document.addEventListener("fullscreenchange", fn);
    return () => document.removeEventListener("fullscreenchange", fn);
  }, []);
  useEffect(() => {
    setSelected(null);
    setFlow(null);
  }, [sequence.index]);
  useEffect(() => {
    if (tool !== "story" || toolRequest > 0) setMobileOpen(true);
  }, [tool, toolRequest]);
  useEffect(() => {
    if (tool !== "game")
      setGame((g) =>
        g.status === "playing" ? reduceGame(g, { type: "pause" }) : g,
      );
  }, [tool, toolRequest]);
  useEffect(() => {
    if (game.status === "terminal") {
      onTool("game");
      setMobileOpen(true);
    }
  }, [game.status, onTool]);
  function openTool(next: WorkspaceTool) {
    if (game.status === "playing" && next !== "game")
      setGame((g) => reduceGame(g, { type: "pause" }));
    onTool(next);
    setMobileOpen(true);
  }
  function chooseSystem(id: SystemId) {
    if (locked) return;
    if (id !== system) {
      setSystem(id);
      setProject(null);
      setSequence({ index: 0, progress: 0 });
      setSelected(null);
      setFlow(null);
      setFault(false);
      setIssue(null);
      setDrill((d) => ({ ...d, status: "idle", step: 0 }));
    }
    setStatus("");
  }
  function go(index: number) {
    if (gamePresent) return;
    if (fault && index > faultPhase) return;
    setSequence({ index, progress: 0 });
    setSelected(null);
    setFlow(null);
    onPlaying(false);
  }
  function selectNode(id: string) {
    if (gamePresent) {
      navigateEngineer(id);
      return;
    }
    setSelected(id);
    setFlow(null);
    onPlaying(false);
    openTool("story");
  }
  function selectFlow(route: SystemRoute) {
    if (gamePresent) {
      openTool("story");
      return;
    }
    setFlow(route);
    setSelected(null);
    onPlaying(false);
    openTool("story");
  }
  async function focus() {
    if (document.fullscreenElement) await document.exitFullscreen();
    else
      await root.current
        ?.requestFullscreen?.()
        .catch(() =>
          setStatus(
            "Fullscreen is unavailable here. Orbit and zoom remain available.",
          ),
        );
  }
  function injectFault() {
    if (gamePresent) {
      openTool("game");
      return;
    }
    if (!fault) {
      setSequence({ index: faultPhase, progress: 0 });
      setSelected(null);
      setFlow(null);
    }
    setFault(!fault);
  }
  function chooseJourney(id: keyof typeof journeyContexts) {
    if (locked) return;
    chooseSystem(journeyContexts[id].system);
    setSequence({ index: 0, progress: 0 });
    setIssue(null);
    openTool("paths");
  }
  function chooseProject(id: string) {
    if (locked) return;
    chooseSystem(projectSystem[id]);
    setProject(id);
    openTool("projects");
  }
  function chooseIssue(id: string | null) {
    if (locked) return;
    if (id) {
      const binding = issueContexts[id];
      if (binding.system) chooseSystem(binding.system);
      setScale(binding.scale);
      setSequence({ index: binding.phase, progress: 0 });
      setFault(false);
      setSelected(null);
      setFlow(null);
      onPlaying(true);
    }
    setIssue(id);
  }
  function startDrill() {
    if (gamePresent) return;
    setIssue(null);
    setFault(true);
    setSelected(null);
    setFlow(null);
    setSequence({
      index: scenario.id === "corruption" ? 0 : faultPhase,
      progress: 0,
    });
    setDrill((d) => ({ ...d, status: "running", step: 0 }));
    setScale(
      scenario.id === "region" || scenario.id === "petabyte"
        ? "multicloud"
        : scenario.id === "corruption"
          ? "server"
          : "cluster",
    );
    if (scenario.id === "petabyte")
      setLoad((l) => ({ ...l, records: 1e11, bytesPerRecord: 100000 }));
  }
  function nextDrill() {
    if (!drillRunning || gamePresent) return;
    if (drill.step + 1 >= scenario.steps.length) {
      setDrill((d) => ({
        ...d,
        status: "complete",
        step: scenario.steps.length,
      }));
      setFault(false);
    } else setDrill((d) => ({ ...d, step: d.step + 1 }));
  }
  function resetDrill() {
    setFault(false);
    setDrill((d) => ({ ...d, status: "idle", step: 0 }));
  }

  useEffect(() => {
    if (game.status !== "won") return;
    const next = recordVictory(campaignRef.current, game);
    campaignRef.current = next;
    setCampaign(next);
    try {
      localStorage.setItem(campaignKey, JSON.stringify(next));
      setCampaignSaved(true);
    } catch {
      setCampaignSaved(false);
    }
  }, [game.status, game.run]);
  useEffect(() => {
    if (gamePresent && game.mission) {
      const objective = currentObjective(game)!;
      setSequence({
        index: objective.phase,
        progress: Math.min(
          0.95,
          game.objective / missionFor(game.mission).objectives.length,
        ),
      });
    }
    if (game.status !== "playing")
      setTouch({ forward: 0, right: 0, boost: false });
    const prev = previousGame.current;
    if (game.status === "playing" && prev.status === "terminal")
      setMobileOpen(false);
    if (sound && game.run === prev.run) {
      if (game.score > prev.score)
        playGameTone(game.status === "won" ? "win" : "success");
      else if (game.mistakes > prev.mistakes || game.hits > prev.hits)
        playGameTone("wrong");
    }
    previousGame.current = game;
  }, [
    game.status,
    game.objective,
    game.run,
    game.score,
    game.mistakes,
    game.hits,
    sound,
    gamePresent,
    game.mission,
  ]);
  function sendGame(event: GameEvent) {
    setGame((g) => reduceGame(g, event));
  }
  function launchMission(id: SystemId) {
    if (drillRunning) {
      setStatus(
        "Finish or reset the recovery drill before launching a contract.",
      );
      return;
    }
    if (!explorePreferences.current)
      explorePreferences.current = { annotations, cameraMode, exploded };
    const mission = missionFor(id);
    setSystem(id);
    setProject(null);
    setSelected(null);
    setFlow(null);
    setFault(false);
    setIssue(mission.issue || null);
    setScale(mission.scale);
    setLoad(
      id === "lakehouse"
        ? {
            ...initialLoad,
            records: 1e11,
            bytesPerRecord: 100000,
            nodes: 16,
            linkGbps: 10,
            skew: 0.5,
          }
        : { ...initialLoad },
    );
    setAnnotations(false);
    setExploded(false);
    setCameraMode("orbit");
    setFollowEngineer(true);
    setPlayer(initialPlayer);
    setNavigation(null);
    setTouch({ forward: 0, right: 0, boost: false });
    setSequence({ index: mission.objectives[0].phase, progress: 0 });
    setGame(startGame(id, ++runSerial.current));
    onPlaying(true);
    onTool("game");
    setMobileOpen(false);
    setStatus("");
    if (sound) playGameTone("start");
    requestAnimationFrame(() =>
      root.current
        ?.querySelector<HTMLCanvasElement>(".fusion-webgl")
        ?.focus({ preventScroll: true }),
    );
  }
  function quitMission() {
    setGame((g) => reduceGame(g, { type: "quit" }));
    setIssue(null);
    setNavigation(null);
    setTouch({ forward: 0, right: 0, boost: false });
    onPlaying(false);
    if (explorePreferences.current) {
      setAnnotations(explorePreferences.current.annotations);
      setExploded(explorePreferences.current.exploded);
      setCameraMode(explorePreferences.current.cameraMode);
      explorePreferences.current = null;
    }
    onTool("game");
    setMobileOpen(true);
  }
  function navigateEngineer(id?: string) {
    if (game.status === "paused") sendGame({ type: "resume" });
    if (game.status === "terminal") sendGame({ type: "close" });
    if (!gameActive) return;
    const node = id || gameObjective?.node;
    if (node) setNavigation({ serial: ++navigationSerial.current, node });
  }
  function interactEngineer() {
    sendGame({
      type: "interact",
      node: player.near || "",
      distance: player.distance,
    });
    openTool("game");
  }
  function answerGame(choice: string) {
    sendGame({ type: "answer", choice, load: effectiveLoad });
  }
  const gameView: GameView = {
    state: game,
    follow: followEngineer,
    navigation,
    touch,
  };

  return (
    <section
      ref={root}
      className={`fusion-lab unified-workspace ${gamePresent ? "game-present" : ""}`}
      data-game-present={gamePresent}
      style={{ "--system-accent": model.accent } as CSSProperties}
      aria-label="Immersive systems workspace"
    >
      <div className="fusion-picker-heading">
        <span>
          <span className="fusion-live-dot" /> CHOOSE A DATA SYSTEM
        </span>
        <span>12 architectures · one continuous workspace</span>
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
              disabled={locked}
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
      <div className="fusion-stage">
        <header className="fusion-stage-heading">
          <div>
            <span className="fusion-scene-mark">
              <Network size={20} />
            </span>
            <div>
              <span className="fusion-kicker">
                {scaleTitle.toUpperCase()} CONTEXT / {model.category}
              </span>
              <h2>{model.name}</h2>
            </div>
          </div>
          <div className="fusion-stage-header-actions">
            <span className="fusion-model-note">
              ONE SCENE · SHARED CONTEXT
              <br />
              <strong>LOGICAL COMPONENTS · SYNTHETIC DATA</strong>
            </span>
            <button
              aria-label="How to explore the workspace"
              onClick={() => openTool("guide")}
            >
              <BookOpen size={17} />
            </button>
            <button
              aria-label="Open stage inspector"
              onClick={() => openTool("story")}
            >
              <Focus size={17} />
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
        <div className="fusion-stage-grid">
          <nav className="workspace-toolrail" aria-label="Scene tools">
            {tools.map((t) => (
              <button
                key={t.id}
                aria-label={`Open ${t.label} tool`}
                aria-pressed={tool === t.id}
                data-active={
                  (t.id === "issues" && !!issue) ||
                  (t.id === "recovery" && drillRunning)
                }
                onClick={() => openTool(t.id)}
                title={t.label}
              >
                <t.icon size={18} />
                <span>{t.label}</span>
              </button>
            ))}
          </nav>
          <div className="fusion-viewport">
            <GameHUD
              state={game}
              player={player}
              model={model}
              sound={sound}
              follow={followEngineer}
              onSound={() => {
                setSound((v) => !v);
                if (!sound) playGameTone("start");
              }}
              onFollow={() => setFollowEngineer((v) => !v)}
              onControl={() => openTool("game")}
              onPause={() => sendGame({ type: "pause" })}
              onResume={() => sendGame({ type: "resume" })}
              onWalk={() => navigateEngineer()}
              onInteract={interactEngineer}
              onTouch={(forward, right, boost) =>
                setTouch({ forward, right, boost })
              }
            />
            <ImmersiveScene
              model={model}
              phase={sequence.index}
              progress={sequence.progress}
              playing={playing && (!gamePresent || game.status === "playing")}
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
              game={gameView}
              onGameEvent={sendGame}
              onGameTelemetry={setPlayer}
              onGameNavigate={navigateEngineer}
              scale={scale}
              load={effectiveLoad}
              issue={issue || undefined}
              recovery={
                drillRunning
                  ? {
                      kind: scenario.id,
                      step: drill.step,
                      steps: scenario.steps.length,
                    }
                  : undefined
              }
            />
            <div
              className="workspace-world-metrics"
              aria-label="Modeled workload"
            >
              <span>MODELED · {scaleTitle.toUpperCase()}</span>
              <button onClick={() => openTool("capacity")}>
                <strong>{formatBytes(estimate.rawBytes)}</strong> raw <i />
                {estimate.workers} workers <i />
                RF {load.replicas}
              </button>
            </div>
            {issue && (
              <button
                className="workspace-active-issue"
                onClick={() => openTool("issues")}
              >
                CHALLENGE · {activeIssue?.title}
              </button>
            )}
            {drillRunning && (
              <div className="workspace-active-drill">
                RECOVERY RUNBOOK · {drill.step + 1} / {scenario.steps.length}
              </div>
            )}
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
                STEP <b>{String(sequence.index + 1).padStart(2, "0")}</b> / 05
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
            className={`fusion-inspector workspace-inspector ${mobileOpen ? "mobile-open" : "mobile-closed"}`}
            aria-label="Contextual scene inspector"
          >
            <div className="workspace-inspector-heading">
              <span>{titles[tool]}</span>
              <button
                className="workspace-mobile-close"
                aria-label="Close scene inspector"
                onClick={() => setMobileOpen(false)}
              >
                <X size={17} />
              </button>
            </div>
            <div className="workspace-inspector-content">
              {tool === "story" ? (
                <div className="workspace-story">
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
                    <h3>
                      {node ? node.label : flow ? flow.label : phase.action}
                    </h3>
                    <p>{node ? node.detail : phase.detail}</p>
                    {node && (
                      <button
                        className="fusion-closeup"
                        onClick={() => {
                          setCameraMode("follow");
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
                        This drill holds at the unresolved dependency. Restore
                        the healthy path to continue; no downstream success is
                        assumed.
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
                    onClick={
                      gamePresent
                        ? () => openTool("game")
                        : drillRunning
                          ? () => openTool("recovery")
                          : injectFault
                    }
                  >
                    {fault ? <RotateCcw size={14} /> : <Zap size={14} />}
                    {gamePresent
                      ? "Return to mission"
                      : drillRunning
                        ? "Continue the recovery drill"
                        : fault
                          ? "Restore the healthy path"
                          : model.fault.label}
                    <span>{fault ? "RESET" : "WHAT IF?"}</span>
                  </button>

                  <details>
                    <summary>Core algorithm & scaling</summary>
                    <h4>{model.algorithm}</h4>
                    <p>{model.scaling}</p>
                    <div className="fusion-project-links">
                      {model.projects.map((name) => (
                        <button
                          key={name}
                          onClick={() => {
                            const match = projects.find((p) => p.name === name);
                            if (match) chooseProject(match.id);
                          }}
                        >
                          {name}
                          <ArrowUpRight size={12} />
                        </button>
                      ))}
                    </div>
                    <a
                      className="workspace-link"
                      href={model.reference.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Primary documentation
                      <ArrowUpRight size={12} />
                    </a>
                  </details>
                </div>
              ) : tool === "game" ? (
                <GamePanel
                  blocked={drillRunning}
                  state={game}
                  campaign={campaign}
                  saved={campaignSaved}
                  player={player}
                  model={model}
                  load={effectiveLoad}
                  onStart={launchMission}
                  onWalk={() => navigateEngineer()}
                  onInteract={interactEngineer}
                  onAnswer={answerGame}
                  onPause={() => sendGame({ type: "pause" })}
                  onResume={() => {
                    sendGame({ type: "resume" });
                    setMobileOpen(false);
                  }}
                  onQuit={quitMission}
                  onClose={() => {
                    sendGame({ type: "close" });
                    setMobileOpen(false);
                  }}
                  onCapacity={() => openTool("capacity")}
                />
              ) : (
                <WorkspacePanel
                  gameLocked={gamePresent}
                  capacityUnlocked={capacityUnlocked}
                  search={projectSearch}
                  onSearch={setProjectSearch}
                  category={projectCategory}
                  onCategory={setProjectCategory}
                  blockedAt={fault ? faultPhase : null}
                  tool={tool}
                  model={model}
                  phase={sequence.index}
                  scale={scale}
                  onScale={(s) => {
                    if (!drillRunning && (!gamePresent || capacityUnlocked))
                      setScale(s);
                  }}
                  load={effectiveLoad}
                  onLoad={(patch) => {
                    if (!drillRunning && (!gamePresent || capacityUnlocked))
                      setLoad((l) => ({ ...l, ...patch }));
                  }}
                  onPhase={go}
                  onJourney={chooseJourney}
                  project={project}
                  onProject={chooseProject}
                  issue={issue}
                  onIssue={chooseIssue}
                  recovery={drill}
                  onScenario={(scenario) => {
                    if (!locked) {
                      setDrill({ scenario, status: "idle", step: 0 });
                      setFault(false);
                    }
                  }}
                  onDrillStart={startDrill}
                  onDrillNext={nextDrill}
                  onDrillReset={resetDrill}
                  onTool={openTool}
                />
              )}
            </div>
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
              disabled={gamePresent || sequence.index === 0}
              onClick={() => go(sequence.index - 1)}
            >
              <ChevronLeft size={17} />
            </button>
            <button
              aria-label="Next immersive stage"
              disabled={
                gamePresent ||
                sequence.index === 4 ||
                (fault && sequence.index >= faultPhase)
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
              disabled={locked}
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
              disabled={gamePresent}
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
              disabled={gamePresent || (fault && i > faultPhase)}
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
        <div className="workspace-operation">
          <span>WORKED EXAMPLE</span>
          <code>{model.operation}</code>
          <button onClick={() => openTool("paths")}>
            Follow the operation
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </section>
  );
}
