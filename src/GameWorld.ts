import * as THREE from "three";
import { currentObjective, missionFor } from "./game";
import type { GameEvent, GameState } from "./game";
import { distance, findPath, movePlayer, stationApproach } from "./navigation";
import type { Point, Obstacle } from "./navigation";
import type { SystemModel } from "./systemModels";

export interface PlayerTelemetry {
  x: number;
  z: number;
  near: string | null;
  distance: number;
  targetDistance: number;
  stamina: number;
  hazards: Point[];
  walking: boolean;
}
export const initialPlayer: PlayerTelemetry = {
  x: -8,
  z: 5.5,
  near: null,
  distance: 99,
  targetDistance: 99,
  stamina: 100,
  hazards: [],
  walking: false,
};
export interface GameView {
  state: GameState;
  follow: boolean;
  navigation: { serial: number; node: string } | null;
  touch: { forward: number; right: number; boost: boolean };
}
export interface GameBridge {
  get: () => GameView;
  event: (event: GameEvent) => void;
  telemetry: (data: PlayerTelemetry) => void;
}

/** A playable actor, collision/navigation and hazards inside the existing scene. */
export function createGameWorld(
  scene: THREE.Scene,
  camera: THREE.Camera,
  model: SystemModel,
  bridge: GameBridge,
) {
  const group = new THREE.Group();
  scene.add(group);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: "#e0eee4",
    metalness: 0.45,
    roughness: 0.35,
    emissive: "#163b31",
    emissiveIntensity: 0.2,
  });
  const trimMaterial = new THREE.MeshStandardMaterial({
    color: "#263f44",
    metalness: 0.5,
    roughness: 0.4,
  });
  const glowMaterial = new THREE.MeshBasicMaterial({ color: "#c5f360" });
  const redMaterial = new THREE.MeshBasicMaterial({ color: "#ff7969" });
  const goldMaterial = new THREE.MeshBasicMaterial({ color: "#f4d17b" });
  const pawn = new THREE.Group();
  group.add(pawn);
  const mesh = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Group = pawn,
  ) => {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  };
  mesh(new THREE.CapsuleGeometry(0.25, 0.28, 4, 10), bodyMaterial, 0, 0.69, 0);
  const head = mesh(
    new THREE.SphereGeometry(0.29, 16, 10),
    bodyMaterial,
    0,
    1.12,
    0,
  );
  head.scale.set(1, 0.82, 1);
  mesh(new THREE.BoxGeometry(0.4, 0.12, 0.12), trimMaterial, 0, 1.13, 0.25);
  mesh(
    new THREE.BoxGeometry(0.09, 0.045, 0.03),
    glowMaterial,
    -0.095,
    1.14,
    0.32,
  );
  mesh(
    new THREE.BoxGeometry(0.09, 0.045, 0.03),
    glowMaterial,
    0.095,
    1.14,
    0.32,
  );
  mesh(new THREE.BoxGeometry(0.3, 0.35, 0.18), trimMaterial, 0, 0.76, -0.29);
  mesh(new THREE.BoxGeometry(0.14, 0.14, 0.05), glowMaterial, 0, 0.78, -0.4);
  const left = mesh(
    new THREE.BoxGeometry(0.14, 0.26, 0.16),
    trimMaterial,
    -0.15,
    0.28,
    0,
  );
  const right = mesh(
    new THREE.BoxGeometry(0.14, 0.26, 0.16),
    trimMaterial,
    0.15,
    0.28,
    0,
  );
  mesh(new THREE.BoxGeometry(0.1, 0.27, 0.12), bodyMaterial, -0.32, 0.75, 0);
  mesh(new THREE.BoxGeometry(0.1, 0.27, 0.12), bodyMaterial, 0.32, 0.75, 0);
  const cargo = mesh(
    new THREE.OctahedronGeometry(0.18),
    goldMaterial,
    0,
    1.72,
    0,
  );
  const shadow = mesh(
    new THREE.CircleGeometry(0.42, 32),
    new THREE.MeshBasicMaterial({
      color: "#b8ee9a",
      transparent: true,
      opacity: 0.17,
      depthWrite: false,
    }),
    0,
    0.11,
    0,
  );
  shadow.rotation.x = -Math.PI / 2;
  const beacon = new THREE.Group();
  group.add(beacon);
  const beaconRing = mesh(
    new THREE.TorusGeometry(1.92, 0.045, 6, 72),
    goldMaterial,
    0,
    0.18,
    0,
    beacon,
  );
  beaconRing.rotation.x = Math.PI / 2;
  const pillar = mesh(
    new THREE.CylinderGeometry(0.18, 0.5, 4.2, 16, 1, true),
    new THREE.MeshBasicMaterial({
      color: "#f1d285",
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    0,
    2.2,
    0,
    beacon,
  );
  const arrow = mesh(
    new THREE.ConeGeometry(0.24, 0.38, 5),
    goldMaterial,
    0,
    4.3,
    0,
    beacon,
  );
  arrow.rotation.x = Math.PI;
  const trail = Array.from({ length: 12 }, () =>
    mesh(
      new THREE.SphereGeometry(0.06, 6, 5),
      new THREE.MeshBasicMaterial({
        color: "#8fcfa5",
        transparent: true,
        opacity: 0.3,
      }),
      0,
      0.18,
      0,
      group,
    ),
  );
  const hazards = Array.from({ length: 4 }, (_, i) => {
    const m = mesh(
      new THREE.IcosahedronGeometry(0.21, 0),
      redMaterial,
      0,
      0.4,
      0,
      group,
    );
    const halo = mesh(
      new THREE.TorusGeometry(0.35, 0.018, 4, 24),
      redMaterial,
      0,
      0,
      0,
      new THREE.Group(),
    );
    m.add(halo);
    halo.rotation.x = Math.PI / 2;
    return { mesh: m, phase: i * 1.8 };
  });
  const pickupPositions: Point[] = [
    { x: -10.7, z: 2.8 },
    { x: 9.5, z: 4.8 },
    { x: 0, z: -6 },
  ];
  const pickups = pickupPositions.map((p) =>
    mesh(
      new THREE.OctahedronGeometry(0.17),
      glowMaterial,
      p.x,
      0.4,
      p.z,
      group,
    ),
  );
  const pathGeometry = new THREE.BufferGeometry();
  pathGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(600 * 3), 3),
  );
  pathGeometry.setDrawRange(0, 0);
  const pathLine = new THREE.Line(
    pathGeometry,
    new THREE.LineDashedMaterial({
      color: "#7fae91",
      dashSize: 0.2,
      gapSize: 0.15,
      transparent: true,
      opacity: 0.5,
    }),
  );
  pathLine.frustumCulled = false;
  group.add(pathLine);
  const celebration = new THREE.Group();
  group.add(celebration);
  const sparks = Array.from({ length: 36 }, (_, i) =>
    mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.08),
      i % 2 ? goldMaterial : glowMaterial,
      0,
      0,
      0,
      celebration,
    ),
  );
  const obstacles: Obstacle[] = model.nodes.map((n) => ({
    x: n.position[0],
    z: n.position[2],
    radius: 1.64,
  }));
  const planningObstacles = obstacles.map((o) => ({
    ...o,
    radius: o.radius + 0.12,
  }));
  let position: Point = { x: -8, z: 5.5 },
    velocity: Point = { x: 0, z: 0 },
    path: Point[] = [],
    destination: Point | null = null;
  let previousRun = -1,
    lastNavigation = -1,
    clock = 0,
    report = 0,
    tick = 0,
    stamina = 100,
    hitCooldown = 0,
    winTime = 0,
    previousStatus = "idle",
    lastTrail = 0;
  const keys = new Set<string>();
  const forward = new THREE.Vector3(),
    cameraRight = new THREE.Vector3();
  const nearest = () => {
    const target = currentObjective(bridge.get().state);
    const node = target ? model.nodes.find((n) => n.id === target.node) : null;
    const targetDistance = node
      ? distance(position, { x: node.position[0], z: node.position[2] })
      : 99;
    if (node && targetDistance <= 2.85)
      return { node: node.id, distance: targetDistance, targetDistance };
    const candidates = model.nodes
      .map((n) => ({
        node: n.id,
        distance: distance(position, { x: n.position[0], z: n.position[2] }),
      }))
      .sort((a, b) => a.distance - b.distance);
    return { ...candidates[0], targetDistance };
  };
  const typing = (target: EventTarget | null) =>
    target instanceof HTMLElement &&
    !!target.closest("input,textarea,select,[contenteditable=true]");
  const keydown = (e: KeyboardEvent) => {
    const view = bridge.get();
    if (
      !view.state.mission ||
      ["idle", "won", "lost"].includes(view.state.status) ||
      typing(e.target)
    )
      return;
    if (
      [
        "KeyW",
        "KeyA",
        "KeyS",
        "KeyD",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "ShiftLeft",
        "ShiftRight",
      ].includes(e.code)
    ) {
      if (view.state.status === "playing") {
        e.preventDefault();
        keys.add(e.code);
        path = [];
        destination = null;
      }
    }
    if (e.repeat) return;
    if (e.code === "KeyE" && view.state.status === "playing") {
      e.preventDefault();
      const near = nearest();
      bridge.event({
        type: "interact",
        node: near.node,
        distance: near.distance,
      });
    }
    if (
      (e.code === "Space" &&
        !(e.target instanceof HTMLElement && e.target.closest("button"))) ||
      e.code === "Escape"
    ) {
      e.preventDefault();
      keys.clear();
      bridge.event({
        type: view.state.status === "paused" ? "resume" : "pause",
      });
    }
  };
  const keyup = (e: KeyboardEvent) => keys.delete(e.code);
  const blur = () => {
    keys.clear();
    velocity = { x: 0, z: 0 };
    if (bridge.get().state.status === "playing")
      bridge.event({ type: "pause" });
  };
  window.addEventListener("keydown", keydown);
  window.addEventListener("keyup", keyup);
  window.addEventListener("blur", blur);
  const routeTo = (goal: Point) => {
    destination = goal;
    path = findPath(position, goal, planningObstacles);
    velocity = { x: 0, z: 0 };
  };
  return {
    navigateWorld(goal: Point) {
      if (bridge.get().state.status === "playing") routeTo(goal);
    },
    update(dt: number): { dirty: boolean; position: THREE.Vector3 } {
      const view = bridge.get(),
        state = view.state,
        active = !!state.mission && state.status !== "idle";
      group.visible = active;
      if (!active)
        return {
          dirty: false,
          position: new THREE.Vector3(position.x, 0.6, position.z),
        };
      const mission = missionFor(state.mission!),
        objective = currentObjective(state)!;
      if (state.run !== previousRun) {
        previousRun = state.run;
        position = { x: -8, z: 5.5 };
        velocity = { x: 0, z: 0 };
        path = [];
        destination = null;
        keys.clear();
        stamina = 100;
        clock = 0;
        tick = 0;
        hitCooldown = 0;
        winTime = 0;
        lastNavigation = -1;
        trail.forEach((m) => (m.visible = false));
      }
      if (
        view.navigation &&
        view.navigation.serial !== lastNavigation &&
        state.status === "playing"
      ) {
        lastNavigation = view.navigation.serial;
        const target = model.nodes.find((n) => n.id === view.navigation!.node);
        if (target)
          routeTo(
            stationApproach(
              { x: target.position[0], z: target.position[2] },
              position,
              planningObstacles,
            ),
          );
      }
      let moved = false;
      if (state.status === "playing") {
        clock += dt;
        hitCooldown = Math.max(0, hitCooldown - dt);
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        cameraRight
          .crossVectors(forward, new THREE.Vector3(0, 1, 0))
          .normalize();
        const f =
          (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) -
          (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) +
          view.touch.forward;
        const r =
          (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
          (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0) +
          view.touch.right;
        let dx = forward.x * f + cameraRight.x * r,
          dz = forward.z * f + cameraRight.z * r;
        const manual = Math.hypot(dx, dz) > 0.01;
        if (manual) {
          path = [];
          destination = null;
        }
        if (!manual && path.length) {
          while (path.length && distance(position, path[0]) < 0.2) path.shift();
          if (path.length) {
            dx = path[0].x - position.x;
            dz = path[0].z - position.z;
          }
        }
        const length = Math.hypot(dx, dz);
        if (length > 0) {
          dx /= length;
          dz /= length;
        }
        const boost =
          (keys.has("ShiftLeft") ||
            keys.has("ShiftRight") ||
            view.touch.boost) &&
          stamina > 3 &&
          length > 0;
        stamina = Math.max(0, Math.min(100, stamina + (boost ? -25 : 13) * dt));
        const speed = boost ? 6.2 : 4.1;
        velocity.x = THREE.MathUtils.damp(
          velocity.x,
          dx * speed,
          manual ? 12 : 25,
          dt,
        );
        velocity.z = THREE.MathUtils.damp(
          velocity.z,
          dz * speed,
          manual ? 12 : 25,
          dt,
        );
        const next = movePlayer(
          position,
          { x: velocity.x * dt, z: velocity.z * dt },
          obstacles,
        );
        moved = distance(next, position) > 0.001;
        position = next;
        if (!moved && path.length && destination) {
          routeTo(destination);
        }
        if (Math.hypot(velocity.x, velocity.z) > 0.1)
          pawn.rotation.y = Math.atan2(velocity.x, velocity.z);
        tick += dt;
        if (tick >= 0.2) {
          bridge.event({ type: "tick", seconds: tick });
          tick = 0;
        }
        pickups.forEach((_, i) => {
          if (
            !state.pickups.includes(`chip-${i}`) &&
            distance(position, pickupPositions[i]) < 0.65
          )
            bridge.event({ type: "pickup", id: `chip-${i}` });
        });
      } else {
        velocity = { x: 0, z: 0 };
        keys.clear();
      }
      pawn.position.set(position.x, Math.sin(clock * 4) * 0.025, position.z);
      cargo.visible = state.carrying;
      cargo.rotation.y = clock * 1.8;
      left.rotation.x = moved ? Math.sin(clock * 15) * 0.55 : 0;
      right.rotation.x = -left.rotation.x;
      bodyMaterial.emissive.set(hitCooldown > 0.9 ? "#dc6752" : "#163b31");
      const target = model.nodes.find((n) => n.id === objective.node)!;
      beacon.position.set(target.position[0], 0, target.position[2]);
      beacon.visible = state.status !== "won" && state.status !== "lost";
      beaconRing.scale.setScalar(1 + Math.sin(clock * 3) * 0.035);
      arrow.position.y = 4.15 + Math.sin(clock * 2) * 0.13;
      pillar.rotation.y = clock * 0.15;
      const hazardPoints: Point[] = [];
      hazards.forEach((hazard, i) => {
        hazard.mesh.visible = i < mission.hazardCount;
        if (i >= mission.hazardCount) return;
        const p = {
          x:
            Math.sin(clock * (0.27 + i * 0.04) + hazard.phase) *
            (7.4 - i * 0.5),
          z: Math.cos(clock * (0.38 + i * 0.03) + hazard.phase) * 4.7,
        };
        hazardPoints.push(p);
        hazard.mesh.position.set(
          p.x,
          0.48 + Math.sin(clock * 3 + i) * 0.13,
          p.z,
        );
        hazard.mesh.rotation.y = clock * 2;
        if (
          state.status === "playing" &&
          hitCooldown === 0 &&
          distance(position, p) < 0.66
        ) {
          hitCooldown = 1.5;
          bridge.event({ type: "hit" });
        }
      });
      pickups.forEach((m, i) => {
        m.visible = !state.pickups.includes(`chip-${i}`);
        m.rotation.y = clock;
        m.position.y = 0.42 + Math.sin(clock * 2 + i) * 0.1;
      });
      if (moved && clock - lastTrail > 0.08) {
        lastTrail = clock;
        for (let i = trail.length - 1; i > 0; i--)
          trail[i].position.copy(trail[i - 1].position);
        trail[0].position.set(position.x, 0.15, position.z);
        trail.forEach((m, i) => {
          m.visible = true;
          m.scale.setScalar(1 - (i / trail.length) * 0.7);
        });
      }
      const vertices = pathGeometry.getAttribute(
        "position",
      ) as THREE.BufferAttribute;
      vertices.setXYZ(0, position.x, 0.13, position.z);
      path
        .slice(0, 598)
        .forEach((p, i) => vertices.setXYZ(i + 1, p.x, 0.13, p.z));
      vertices.needsUpdate = true;
      pathGeometry.setDrawRange(
        0,
        path.length ? Math.min(599, path.length + 1) : 0,
      );
      pathLine.computeLineDistances();
      if (state.status === "won") {
        if (previousStatus !== "won") winTime = 0;
        winTime += dt;
      } else winTime = 0;
      celebration.visible =
        state.status === "won" &&
        winTime < 3 &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      celebration.position.copy(pawn.position);
      sparks.forEach((m, i) => {
        const angle = i * 2.399;
        m.position.set(
          Math.cos(angle) * winTime * 1.6,
          1 + winTime * 2 - winTime * winTime * 0.8 + (i % 3) * 0.3,
          Math.sin(angle) * winTime * 1.6,
        );
        m.rotation.y = winTime * 3;
      });
      report += dt;
      if (report > 0.12 || state.status !== previousStatus) {
        report = 0;
        const near = nearest();
        bridge.telemetry({
          x: position.x,
          z: position.z,
          near: near.distance <= 2.85 ? near.node : null,
          distance: near.distance,
          targetDistance: near.targetDistance,
          stamina,
          hazards: hazardPoints,
          walking: moved,
        });
      }
      previousStatus = state.status;
      return {
        dirty: state.status === "playing" || celebration.visible,
        position: new THREE.Vector3(position.x, 0.7, position.z),
      };
    },
    dispose() {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", blur);
    },
  };
}
