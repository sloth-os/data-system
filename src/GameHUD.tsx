import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Focus,
  Gamepad2,
  MapPin,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { currentObjective, missionFor } from "./game";
import type { GameState } from "./game";
import type { SystemModel } from "./systemModels";
import type { PlayerTelemetry } from "./GameWorld";
interface Props {
  state: GameState;
  player: PlayerTelemetry;
  model: SystemModel;
  sound: boolean;
  follow: boolean;
  onSound: () => void;
  onFollow: () => void;
  onControl: () => void;
  onPause: () => void;
  onResume: () => void;
  onWalk: () => void;
  onInteract: () => void;
  onTouch: (forward: number, right: number, boost: boolean) => void;
}
export default function GameHUD(p: Props) {
  const { state, player } = p;
  if (!state.mission || state.status === "idle") return null;
  const mission = missionFor(state.mission),
    objective = currentObjective(state)!;
  const remaining = Math.max(0, Math.ceil(mission.seconds - state.elapsed));
  const mapX = (x: number) => ((x + 13) / 26) * 140 + 5,
    mapZ = (z: number) => ((z + 7) / 14) * 80 + 5;
  return (
    <div
      className="game-hud"
      data-status={state.status}
      data-player-x={player.x.toFixed(2)}
      data-player-z={player.z.toFixed(2)}
    >
      <div className="game-top-status">
        <span>
          <Gamepad2 size={14} />
          FIELD ENGINEER
        </span>
        <div>
          <small>INTEGRITY</small>
          <strong>{state.integrity}%</strong>
          <i
            role="progressbar"
            aria-label="Training integrity"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={state.integrity}
          >
            <b style={{ width: `${state.integrity}%` }} />
          </i>
        </div>
        <div>
          <small>BUDGET</small>
          <strong>{state.credits}</strong>
        </div>
        <div>
          <small>CONTRACT</small>
          <strong>
            {Math.floor(remaining / 60)}:
            {String(remaining % 60).padStart(2, "0")}
          </strong>
        </div>
      </div>
      <button className="game-quest-card" onClick={p.onControl}>
        <span>CONTRACT / {mission.title}</span>
        <strong>
          {state.status === "won"
            ? "System certified"
            : state.status === "lost"
              ? "Retry the contract"
              : state.status === "paused"
                ? "Mission paused"
                : state.status === "terminal"
                  ? "Station console open"
                  : objective.title}
        </strong>
        <small>
          {state.status === "playing"
            ? `OBJECTIVE ${state.objective + 1}/${mission.objectives.length} · ${p.model.nodes.find((n) => n.id === objective.node)?.label}`
            : "Open mission control"}
          <ArrowRight size={12} />
        </small>
      </button>
      <div className="game-minimap">
        <span>SECTOR MAP</span>
        <svg viewBox="0 0 150 90" aria-label="Mission sector map">
          <path
            d="M5 5H145V85H5Z"
            fill="#10282d"
            stroke="#385453"
            strokeWidth=".5"
          />
          {p.model.nodes.map((n) => (
            <g key={n.id}>
              <circle
                cx={mapX(n.position[0])}
                cy={mapZ(n.position[2])}
                r={n.id === objective.node ? 6 : 4}
                fill={n.id === objective.node ? "#ecce82" : "#3d6464"}
                opacity=".75"
              />
            </g>
          ))}
          {player.hazards.map((h, i) => (
            <circle
              key={i}
              cx={mapX(h.x)}
              cy={mapZ(h.z)}
              r="2"
              fill="#f68b76"
            />
          ))}
          <circle
            cx={mapX(player.x)}
            cy={mapZ(player.z)}
            r="3"
            fill="#c5f360"
            stroke="#e4f7cc"
            strokeWidth="1"
          />
        </svg>
        <small>
          {player.x.toFixed(1)} / {player.z.toFixed(1)}
        </small>
      </div>
      <div className="game-hud-buttons">
        <button
          aria-label={p.sound ? "Mute game audio" : "Enable game audio"}
          onClick={p.onSound}
        >
          {p.sound ? <Volume2 size={15} /> : <VolumeX size={15} />}
        </button>
        <button
          aria-label="Follow field engineer"
          aria-pressed={p.follow}
          onClick={p.onFollow}
        >
          <Focus size={15} />
        </button>
        {state.status === "playing" ? (
          <button aria-label="Pause mission" onClick={p.onPause}>
            <Pause size={15} />
          </button>
        ) : state.status === "paused" ? (
          <button aria-label="Resume mission" onClick={p.onResume}>
            <Play size={15} />
          </button>
        ) : null}
      </div>
      {state.status === "playing" && (
        <div className="game-interaction-bar">
          <button aria-label="Navigate to objective" onClick={p.onWalk}>
            <MapPin size={14} />
            Walk to beacon
          </button>
          <button
            aria-label="Interact with objective"
            disabled={player.targetDistance > 2.85}
            onClick={p.onInteract}
          >
            <kbd>E</kbd>
            {player.targetDistance <= 2.85 ? "Use station" : "Approach station"}
          </button>
          <div className="game-stamina">
            <Zap size={12} />
            <i>
              <b style={{ width: `${player.stamina}%` }} />
            </i>
          </div>
        </div>
      )}
      {state.status === "playing" && (
        <div className="game-touch-controls" aria-label="Movement pad">
          {(
            [
              [1, 0, ArrowUp, "Move forward"],
              [0, -1, ArrowLeft, "Move left"],
              [0, 1, ArrowRight, "Move right"],
              [-1, 0, ArrowDown, "Move backward"],
            ] as const
          ).map(([f, r, Icon, label]) => {
            return (
              <button
                key={label}
                aria-label={label}
                className={`direction-${f}-${r}`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  p.onTouch(f, r, false);
                }}
                onPointerUp={() => p.onTouch(0, 0, false)}
                onPointerCancel={() => p.onTouch(0, 0, false)}
                onLostPointerCapture={() => p.onTouch(0, 0, false)}
              >
                <Icon size={18} />
              </button>
            );
          })}
        </div>
      )}
      {state.message && state.status === "playing" && (
        <p className="game-world-message" role="status">
          {state.message}
        </p>
      )}
      <div className="game-keyboard-hint">
        WASD / arrows · E interact · Shift boost · Space pause · click floor to
        walk
      </div>
    </div>
  );
}
