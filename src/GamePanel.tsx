import {
  ArrowRight,
  Check,
  ChevronRight,
  Gamepad2,
  MapPin,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Star,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import {
  campaignRank,
  campaignXP,
  capacityGoal,
  currentObjective,
  missionFor,
  missions,
  starsFor,
} from "./game";
import type { Campaign, GameState } from "./game";
import type { ModelInput } from "./model";
import type { SystemId, SystemModel } from "./systemModels";
import type { PlayerTelemetry } from "./GameWorld";

interface Props {
  blocked: boolean;
  state: GameState;
  campaign: Campaign;
  saved: boolean;
  player: PlayerTelemetry;
  model: SystemModel;
  load: ModelInput;
  onStart: (id: SystemId) => void;
  onWalk: () => void;
  onInteract: () => void;
  onAnswer: (choice: string) => void;
  onPause: () => void;
  onResume: () => void;
  onQuit: () => void;
  onClose: () => void;
  onCapacity: () => void;
}
function Stars({ count }: { count: number }) {
  return (
    <span className="game-stars" aria-label={`${count} of 3 stars`}>
      {[1, 2, 3].map((n) => (
        <Star
          key={n}
          size={13}
          fill={n <= count ? "currentColor" : "none"}
          className={n <= count ? "earned" : ""}
        />
      ))}
    </span>
  );
}
export default function GamePanel(p: Props) {
  const { state } = p;
  const mission = state.mission ? missionFor(state.mission) : null,
    objective = currentObjective(state);
  const complete = Object.keys(p.campaign).length;
  return (
    <div className="game-panel">
      <div className="game-pilot-record">
        <span>
          <Gamepad2 size={17} />
          <strong>{campaignRank(p.campaign)}</strong>
        </span>
        <b>{campaignXP(p.campaign).toLocaleString()} XP</b>
        <small>
          {complete} / 12 certifications ·{" "}
          {p.saved ? "saved on this device" : "session progress"}
        </small>
      </div>
      {!mission || state.status === "idle" ? (
        <>
          <span className="workspace-eyebrow">
            PACKET RUNNER / SYSTEMS ENGINEER
          </span>
          <h3>
            Build the promise.
            <br />
            Deliver the packet.
          </h3>
          <p className="game-intro">
            Pilot a field engineer through the data plane. Carry records to
            stations, choose sound engineering actions, and keep the system
            alive.
          </p>
          <div className="game-controls-note">
            <span>W A S D / arrows</span> move · <span>E</span> interact
            <br />
            <span>Shift</span> boost · <span>Space</span> pause
            <br />
            Click the floor to walk. Mobile: use the direction pad or tap “Walk
            to objective”.
            <br />
            Red rogue packets damage integrity; green chips repair it.
          </div>
          {p.blocked && (
            <p className="workspace-note">
              Finish or reset the active recovery drill before launching a
              contract.
            </p>
          )}
          <div className="game-campaign-list">
            {missions.map((m, i) => (
              <article key={m.id}>
                <div className="game-contract-index">
                  {String(i + 1).padStart(2, "0")}
                  <span>{m.difficulty}</span>
                  <Stars count={p.campaign[m.id]?.stars || 0} />
                </div>
                <h4>{m.title}</h4>
                <p>{m.subtitle}</p>
                <button
                  className="game-primary"
                  disabled={p.blocked}
                  aria-label={`Start mission: ${m.title}`}
                  onClick={() => p.onStart(m.id)}
                >
                  <Play size={13} />
                  {p.campaign[m.id] ? "Replay contract" : "Launch contract"}
                  <ArrowRight size={13} />
                </button>
              </article>
            ))}
          </div>
          <p className="workspace-note">
            Training budgets, hazards and scores are game mechanics. The
            engineering lessons use the atlas's architectural sources; game
            seconds are not production latency.
          </p>
        </>
      ) : (
        <>
          <span className="workspace-eyebrow">
            {mission.difficulty.toUpperCase()} CONTRACT
          </span>
          <h3>{mission.title}</h3>
          <p>{mission.subtitle}</p>
          <p className="workspace-note">
            {mission.hazardCount
              ? "Avoid red rogue packets. Green repair chips restore integrity and budget."
              : "Training route: no roaming hazards."}{" "}
            Station consoles pause the active-time window.
          </p>
          {state.status === "won" || state.status === "lost" ? (
            <div className={`game-outcome ${state.status}`} role="status">
              {state.status === "won" ? (
                <Trophy size={38} />
              ) : (
                <ShieldCheck size={38} />
              )}
              <h4>
                {state.status === "won"
                  ? "System certified."
                  : "Contract interrupted."}
              </h4>
              {state.status === "won" ? (
                <>
                  <Stars count={starsFor(state)} />
                  <strong className="game-final-score">
                    {state.score.toLocaleString()} XP
                  </strong>
                  <p>
                    {state.mistakes} decision mistakes · {state.hits} packet
                    impacts
                    <br />
                    {Math.round(state.elapsed)} active seconds · {state.credits}{" "}
                    budget left
                  </p>
                  <p>{state.message}</p>
                  <button
                    className="game-primary"
                    onClick={() =>
                      p.onStart(
                        missions[
                          (missions.findIndex((m) => m.id === mission.id) + 1) %
                            missions.length
                        ].id,
                      )
                    }
                  >
                    Next contract
                    <ChevronRight size={14} />
                  </button>
                </>
              ) : (
                <p>{state.message}</p>
              )}
              <button
                className="game-secondary"
                onClick={() => p.onStart(mission.id)}
              >
                <RotateCcw size={13} />
                Retry this contract
              </button>
              <button className="game-secondary" onClick={p.onQuit}>
                Return to free exploration
                <ArrowRight size={13} />
              </button>
            </div>
          ) : state.status === "paused" ? (
            <div className="game-pause-card">
              <Pause size={28} />
              <h4>Mission paused</h4>
              <p>
                Your cargo, budget and objective are retained. Research tools
                remain available.
              </p>
              <button className="game-primary" onClick={p.onResume}>
                <Play size={14} />
                Resume mission
              </button>
              <button className="game-secondary" onClick={p.onQuit}>
                <X size={13} />
                End this run
              </button>
            </div>
          ) : (
            objective && (
              <>
                <div className="game-objective-count">
                  <span>
                    OBJECTIVE {state.objective + 1} /{" "}
                    {mission.objectives.length}
                  </span>
                  <strong>{state.integrity}% integrity</strong>
                </div>
                <div className="game-current-objective">
                  <span>
                    <MapPin size={15} />
                    {p.model.nodes.find((n) => n.id === objective.node)?.label}
                  </span>
                  <h4>{objective.title}</h4>
                  <p>{objective.brief}</p>
                </div>
                {state.status === "terminal" ? (
                  <div
                    className="game-terminal"
                    aria-label="Mission station console"
                  >
                    <span className="game-console-label">
                      <Zap size={12} />
                      STATION LINK ESTABLISHED
                    </span>
                    {objective.capacity ? (
                      <>
                        <div className="game-capacity-checks">
                          {capacityGoal(p.load).map((g) => (
                            <div
                              key={g.label}
                              className={g.pass ? "passed" : ""}
                            >
                              {g.pass ? (
                                <Check size={13} />
                              ) : (
                                <span className="game-unmet" />
                              )}
                              {g.label}
                            </div>
                          ))}
                        </div>
                        <button
                          className="game-secondary"
                          onClick={p.onCapacity}
                        >
                          Open Capacity controls
                          <ArrowRight size={13} />
                        </button>
                        <p className="workspace-note">
                          One workable starting point: 4:1 compression, 64
                          workers, 25 Gbit/s and low skew. Other plans can
                          satisfy the same bounds; CPU costs are outside this
                          I/O model.
                        </p>
                        <button
                          className="game-primary"
                          onClick={() => p.onAnswer("confirm")}
                        >
                          Validate the capacity plan
                          <Check size={13} />
                        </button>
                      </>
                    ) : objective.choices ? (
                      <div className="game-answer-list">
                        {[...objective.choices]
                          .sort(
                            (a, b) =>
                              ((a.id.charCodeAt(0) + state.objective * 7) %
                                13) -
                              ((b.id.charCodeAt(0) + state.objective * 7) % 13),
                          )
                          .map((c) => (
                            <button key={c.id} onClick={() => p.onAnswer(c.id)}>
                              {c.label}
                              <ChevronRight size={14} />
                            </button>
                          ))}
                      </div>
                    ) : (
                      <button
                        className="game-primary"
                        onClick={() => p.onAnswer("confirm")}
                      >
                        {objective.action}
                        <Check size={14} />
                      </button>
                    )}
                    {state.message && (
                      <p className="game-answer-feedback" role="status">
                        {state.message}
                      </p>
                    )}
                    <small>
                      Successful action: 8 training credits. Incorrect decisions
                      cost 22 credits and 15 integrity; a failed capacity
                      validation costs 8 credits.
                    </small>
                    <button className="game-console-close" onClick={p.onClose}>
                      Close console and keep moving
                    </button>
                  </div>
                ) : (
                  <>
                    <button className="game-primary" onClick={p.onWalk}>
                      <MapPin size={14} />
                      Walk to objective
                      <ArrowRight size={13} />
                    </button>
                    <button
                      className="game-secondary"
                      disabled={p.player.targetDistance > 2.85}
                      onClick={p.onInteract}
                    >
                      E · Interact with station
                    </button>
                    <p className="game-range-note">
                      {p.player.targetDistance <= 2.85
                        ? "In range. Press E or use the station button."
                        : `${p.player.targetDistance.toFixed(1)} world units from the objective. Follow the golden beacon.`}
                    </p>
                  </>
                )}
                <ol className="game-task-list">
                  {mission.objectives.map((o, i) => (
                    <li
                      className={
                        i < state.objective
                          ? "complete"
                          : i === state.objective
                            ? "current"
                            : ""
                      }
                      key={`${o.node}-${i}`}
                    >
                      <span>
                        {i < state.objective ? (
                          <Check size={11} />
                        ) : (
                          String(i + 1).padStart(2, "0")
                        )}
                      </span>
                      {o.title}
                    </li>
                  ))}
                </ol>
                <button className="game-secondary" onClick={p.onPause}>
                  <Pause size={13} />
                  Pause mission
                </button>
              </>
            )
          )}
        </>
      )}
    </div>
  );
}
