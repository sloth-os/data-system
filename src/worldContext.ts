import * as THREE from "three";
import type { LevelId } from "./content";
import type { ModelInput } from "./model";

export interface WorldState {
  scale: LevelId;
  load: ModelInput;
  issue?: string;
  fault: boolean;
  recovery?: { kind: string; step: number; steps: number };
}
interface Anchor {
  def: { id: string };
  root: THREE.Group;
  endpoint: THREE.Vector3;
}

function caption(text: string, color = "#78999d", width = 5) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 96;
  const ctx = canvas.getContext("2d")!;
  ctx.font = "500 25px monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = color;
  ctx.fillText(text, 384, 55);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    }),
  );
  sprite.scale.set(width, width / 8, 1);
  return sprite;
}

/** Context envelopes and challenge mechanisms share the operation's scene/camera. */
export function createWorldContext(
  scene: THREE.Scene,
  nodes: Anchor[],
  accent: string,
) {
  const root = new THREE.Group();
  scene.add(root);
  const lime = new THREE.MeshBasicMaterial({
    color: accent,
    transparent: true,
    opacity: 0.6,
  });
  const amber = new THREE.MeshBasicMaterial({ color: "#ffb37d" });
  const blue = new THREE.MeshBasicMaterial({ color: "#7ecfff" });
  const shell = new THREE.MeshStandardMaterial({
    color: "#254b50",
    metalness: 0.4,
    roughness: 0.5,
  });
  const glass = new THREE.MeshBasicMaterial({
    color: accent,
    transparent: true,
    opacity: 0.055,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const lineMat = new THREE.LineBasicMaterial({
    color: "#6c9694",
    transparent: true,
    opacity: 0.28,
  });
  const box = (
    group: THREE.Group,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material = shell,
  ) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    group.add(m);
    return m;
  };
  const outline = (
    group: THREE.Group,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    color = "#527773",
  ) => {
    const m = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.3 }),
    );
    m.position.set(x, y, z);
    group.add(m);
    return m;
  };
  const ring = (group: THREE.Group, r: number, y: number, color = accent) => {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.018, 5, 72),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45 }),
    );
    m.rotation.x = Math.PI / 2;
    m.position.y = y;
    group.add(m);
    return m;
  };
  const scopes: Record<LevelId, THREE.Group> = {
    cpu: new THREE.Group(),
    server: new THREE.Group(),
    cluster: new THREE.Group(),
    multicloud: new THREE.Group(),
  };
  Object.values(scopes).forEach((g) => root.add(g));
  outline(scopes.cpu, 21, 0.2, 11, 0, -0.05, 0, "#abc77b");
  for (let i = 0; i < 24; i++)
    box(
      scopes.cpu,
      0.55,
      0.12,
      0.5,
      -9.3 + (i % 12) * 1.68,
      0.03,
      i < 12 ? -5.2 : 5.2,
      i % 3 === 0 ? lime : shell,
    );
  const cpuText = caption(
    "CPU CONTEXT / CACHE → MEMORY · LOGICAL OPERATORS",
    "#96b675",
    8,
  );
  cpuText.position.set(0, 0.2, -6);
  scopes.cpu.add(cpuText);
  outline(scopes.server, 22, 3.8, 13, 0, 1.65, 0);
  box(scopes.server, 22, 0.1, 13, 0, -0.1, 0, glass);
  const hostText = caption("ONE HOST / MEMORY · STORAGE · I/O", "#80a7a0", 7);
  hostText.position.set(0, 0.2, -6.3);
  scopes.server.add(hostText);
  for (let i = 0; i < 8; i++)
    box(
      scopes.server,
      0.8,
      0.25,
      0.7,
      -8 + i * 2.3,
      0.1,
      5.7,
      i % 2 ? lime : shell,
    );

  const workerGeo = new THREE.BoxGeometry(0.32, 0.2, 0.32);
  const workers = new THREE.InstancedMesh(
    workerGeo,
    new THREE.MeshStandardMaterial({
      color: "#81a897",
      emissive: "#315f52",
      emissiveIntensity: 0.3,
    }),
    128,
  );
  const matrix = new THREE.Matrix4();
  for (let i = 0; i < 128; i++) {
    matrix.makeTranslation(
      -10.2 + (i % 32) * 0.65,
      0.08,
      5.2 + Math.floor(i / 32) * 0.48,
    );
    workers.setMatrixAt(i, matrix);
  }
  root.add(workers);
  const workerText = caption(
    "DEPLOYMENT UNITS / MODELED WORKERS",
    "#638d85",
    7,
  );
  workerText.position.set(0, 0.18, 7.2);
  root.add(workerText);
  const replicas = Array.from({ length: 5 }, (_, i) =>
    box(root, 0.24, 0.35, 0.48, -10.4, 0.22, -2.2 + i * 0.8, lime),
  );
  const replicaText = caption("COPIES", "#749a90", 2.2);
  replicaText.position.set(-10.4, 0.3, 2.6);
  root.add(replicaText);
  const volume = new THREE.Group();
  volume.position.set(10.5, 0, 3);
  root.add(volume);
  const slabs = Array.from({ length: 10 }, (_, i) =>
    box(volume, 0.8, 0.16, 1, 0, 0.22 + i * 0.24, 0, i % 3 ? shell : lime),
  );
  const volumeText = caption("PHYSICAL CAPACITY / LOG SCALE", "#789a94", 4);
  volumeText.position.set(10.4, 0.3, 5);
  root.add(volumeText);
  outline(scopes.cluster, 23, 0.15, 15, 0, -0.05, 0);
  const clusterText = caption(
    "CLUSTER / CAPACITY & FAILURE DOMAINS",
    "#6f9a8d",
    7,
  );
  clusterText.position.set(0, 0.3, -7);
  scopes.cluster.add(clusterText);

  const regional: {
    group: THREE.Group;
    mark: THREE.Mesh;
    curve: THREE.QuadraticBezierCurve3;
    packets: THREE.Mesh[];
  }[] = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Group();
    g.position.set((i - 1) * 9, 0, -8);
    scopes.multicloud.add(g);
    ring(g, 3, 0.07, "#679fa8");
    outline(g, 5.8, 0.12, 4.2, 0, 0.0, 0, "#679fa8");
    const mark = box(g, 1.1, 0.8, 1, 0, 0.45, 0, shell.clone());
    box(g, 1.12, 0.06, 1.02, 0, 0.9, 0, blue);
    const t = caption(
      `DOMAIN ${String.fromCharCode(65 + i)} / ILLUSTRATIVE`,
      "#6a9ba3",
      4.5,
    );
    t.position.set(0, 0.18, -2.5);
    g.add(t);
    const a = new THREE.Vector3((i - 1) * 9, 1, -8),
      b = new THREE.Vector3(i === 2 ? -9 : i * 9, 1, -8),
      middle = a.clone().lerp(b, 0.5);
    middle.y = 5.2;
    const curve = new THREE.QuadraticBezierCurve3(a, middle, b);
    scopes.multicloud.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(60)),
        lineMat,
      ),
    );
    const packets = Array.from({ length: 3 }, () => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), blue);
      scopes.multicloud.add(m);
      return m;
    });
    regional.push({ group: g, mark, curve, packets });
  }
  const effects: Record<
    string,
    { group: THREE.Group; update: (time: number, state: WorldState) => void }
  > = {};
  const add = (
    id: string,
    make: (g: THREE.Group) => (time: number, state: WorldState) => void,
  ) => {
    const group = new THREE.Group();
    root.add(group);
    effects[id] = { group, update: make(group) };
  };
  const anchor = (id: string) =>
    nodes.find((n) => n.def.id === id) || nodes[Math.min(2, nodes.length - 1)];

  add("hotspot", (g) => {
    const queue = Array.from({ length: 14 }, () =>
      box(g, 0.18, 0.18, 0.18, 0, 0, 0, amber),
    );
    const halo = ring(g, 1.8, 0.2, "#ffae79");
    return (time) => {
      const a = nodes[0].root.position;
      halo.position.set(a.x, 0.2, a.z);
      halo.scale.setScalar(1 + Math.sin(time * 2) * 0.12);
      queue.forEach((m, i) =>
        m.position.set(
          a.x + Math.sin(i * 0.5) * 0.4,
          1.2 + i * 0.12,
          a.z + 0.8 + ((time * 0.25 + i * 0.15) % 1),
        ),
      );
    };
  });
  add("shuffle", (g) => {
    const paths: {
      curve: THREE.QuadraticBezierCurve3;
      packet: THREE.Mesh;
      from: Anchor;
      to: Anchor;
      line: THREE.Line;
    }[] = [];
    nodes.forEach((from, i) =>
      nodes.slice(i + 1).forEach((to) => {
        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(),
          new THREE.Vector3(),
          new THREE.Vector3(),
        );
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(curve.getPoints(30)),
          new THREE.LineBasicMaterial({
            color: accent,
            transparent: true,
            opacity: 0.22,
          }),
        );
        g.add(line);
        paths.push({
          curve,
          line,
          from,
          to,
          packet: box(g, 0.13, 0.13, 0.13, 0, 0, 0, lime),
        });
      }),
    );
    const sample = new THREE.Vector3();
    return (time) =>
      paths.forEach((p, i) => {
        p.curve.v0.copy(p.from.root.position).y += 1.1;
        p.curve.v2.copy(p.to.root.position).y += 1.1;
        p.curve.v1.copy(p.curve.v0).lerp(p.curve.v2, 0.5);
        p.curve.v1.y = 4.2;
        const attribute = p.line.geometry.getAttribute(
          "position",
        ) as THREE.BufferAttribute;
        for (let j = 0; j < 31; j++) {
          p.curve.getPoint(j / 30, sample);
          attribute.setXYZ(j, sample.x, sample.y, sample.z);
        }
        attribute.needsUpdate = true;
        p.line.geometry.computeBoundingSphere();
        p.packet.position.copy(p.curve.getPoint((time * 0.2 + i * 0.13) % 1));
      });
  });
  add("vector", (g) => {
    const waves = Array.from({ length: 3 }, () => ring(g, 1.8, 1, accent));
    return (time) => {
      const a = anchor("index").root.position;
      waves.forEach((m, i) => {
        m.position.set(a.x, 0.5 + ((time * 0.6 + i) % 3), a.z);
        m.scale.setScalar(0.6 + ((time * 0.2 + i * 0.3) % 1));
      });
    };
  });
  add("compaction", (g) => {
    const layers = Array.from({ length: 7 }, (_, i) =>
      box(g, 2.1, 0.1, 0.8, 0, 1 + i * 0.24, 0, i % 2 ? lime : shell),
    );
    return (time) => {
      const a = anchor("files").root.position;
      layers.forEach((m, i) => {
        m.position.set(
          a.x,
          1 + i * 0.28 * (0.5 + Math.sin(time) * 0.2),
          a.z + 0.4,
        );
        m.scale.x = 1 + Math.sin(time + i) * 0.12;
      });
    };
  });
  add("stream", (g) => {
    const wall = box(
      g,
      4,
      4,
      0.06,
      0,
      2,
      0,
      new THREE.MeshBasicMaterial({
        color: "#9adcc9",
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
      }),
    );
    outline(g, 4, 4, 0.08, 0, 2, 0, "#9adcc9");
    const queue = Array.from({ length: 12 }, () =>
      box(g, 0.18, 0.15, 0.18, 0, 0, 0, amber),
    );
    return (time) => {
      const a = anchor("state").root.position;
      g.position.copy(a);
      wall.material = glass;
      queue.forEach((m, i) =>
        m.position.set(
          ((i % 4) - 1.5) * 0.35,
          1 + Math.floor(i / 4) * 0.25,
          1.3 + Math.sin(time + i) * 0.05,
        ),
      );
    };
  });
  add("governance", (g) => {
    for (let i = 0; i < 3; i++) {
      outline(g, 6, 4, 6, (i - 1) * 7, 1.8, -2, "#ae91d0");
      box(
        g,
        6,
        4,
        0.04,
        (i - 1) * 7,
        1.8,
        -2,
        new THREE.MeshBasicMaterial({
          color: "#ae91d0",
          transparent: true,
          opacity: 0.045,
          depthWrite: false,
        }),
      );
    }
    const c = caption("PLACEMENT / SOVEREIGNTY BOUNDARIES", "#ae91d0", 8);
    c.position.set(0, 4.3, -2);
    g.add(c);
    return (time) => {
      g.children.forEach((m, i) => {
        if (m.type === "Mesh") m.scale.y = 1 + Math.sin(time + i) * 0.02;
      });
    };
  });
  add("egress", (g) => {
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-9, 1, -8),
      new THREE.Vector3(0, 9, -4),
      new THREE.Vector3(9, 1, -8),
    );
    g.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(70)),
        new THREE.LineBasicMaterial({
          color: "#eeb57c",
          transparent: true,
          opacity: 0.8,
        }),
      ),
    );
    const payloads = Array.from({ length: 5 }, () =>
      box(g, 0.38, 0.2, 0.38, 0, 0, 0, amber),
    );
    const t = caption("WAN / BULK DATA MOVEMENT", "#d6a77c", 6);
    t.position.set(0, 6, -5);
    g.add(t);
    return (time) =>
      payloads.forEach((m, i) =>
        m.position.copy(curve.getPoint((time * 0.12 + i / 5) % 1)),
      );
  });
  add("consistency", (g) => {
    const votes = Array.from({ length: 3 }, () =>
      box(g, 0.25, 0.25, 0.25, 0, 0, 0, blue.clone()),
    );
    const text = caption(
      "ILLUSTRATIVE ACK / QUORUM COORDINATION",
      "#9bbcc6",
      7,
    );
    g.add(text);
    return (time) => {
      const a = anchor("wal").root.position;
      text.position.copy(a).add(new THREE.Vector3(0, 3.8, 0));
      votes.forEach((m, i) => {
        const angle = time * 0.4 + (i * Math.PI * 2) / 3;
        m.position.set(
          a.x + Math.cos(angle) * 1.6,
          2.6,
          a.z + Math.sin(angle) * 1.6,
        );
        (m.material as THREE.MeshBasicMaterial).color.set(
          Math.floor(time) % 3 !== i ? "#c5f360" : "#4f6d73",
        );
      });
    };
  });
  add("recovery", (g) => {
    const chunks = Array.from({ length: 8 }, () =>
      box(g, 0.45, 0.3, 0.5, 0, 0, 0, blue),
    );
    const t = caption("SNAPSHOT / VERIFY · REBUILD", "#80b9d8", 6);
    g.add(t);
    return (time, state) => {
      const a = nodes[nodes.length - 1].root.position;
      const progress = state.recovery
        ? (state.recovery.step + 1) / state.recovery.steps
        : (time * 0.1) % 1;
      chunks.forEach((m, i) => {
        m.position.set(
          a.x + ((i % 4) - 1.5) * 0.55,
          0.5 + Math.floor(i / 4) * 0.45,
          a.z,
        );
        m.scale.y = i / 8 < progress ? 1 : 0.1;
      });
      t.position.copy(a).add(new THREE.Vector3(0, 3.4, 0));
    };
  });
  add("replication", (g) => {
    const primary = box(g, 0.3, 2.8, 0.3, 0, 1.4, 0, lime),
      lag = box(g, 0.3, 1, 0.3, 1, 1, 0, amber);
    const t = caption("DURABLE POSITION ≠ REPLAY POSITION", "#d4b17f", 7);
    g.add(t);
    return (time) => {
      const a = anchor("replica").root.position;
      primary.position.set(a.x - 0.55, 1.5, a.z);
      lag.position.set(a.x + 0.55, 0.8, a.z);
      lag.scale.y = 0.5 + (Math.sin(time * 0.7) + 1) * 0.35;
      t.position.copy(a).add(new THREE.Vector3(0, 3.5, 0));
    };
  });

  return {
    update(state: WorldState, time: number) {
      Object.entries(scopes).forEach(([id, g]) => {
        g.visible = id === state.scale;
      });
      workers.count =
        state.scale === "cpu" || state.scale === "server"
          ? 1
          : state.load.nodes;
      workers.visible = state.scale !== "cpu";
      workerText.visible = workers.visible;
      replicas.forEach((m, i) => {
        m.visible = state.scale !== "cpu" && i < state.load.replicas;
      });
      replicaText.visible = state.scale !== "cpu";
      const raw =
          ((state.load.records * state.load.bytesPerRecord) /
            state.load.compression) *
          state.load.replicas,
        height = Math.max(0.15, Math.min(1, (Math.log10(raw) - 8) / 9));
      slabs.forEach((m, i) => {
        m.visible = i < Math.ceil(height * 10);
      });
      regional.forEach((region, i) => {
        const failed = !!state.recovery && i === 2;
        (region.mark.material as THREE.MeshStandardMaterial).color.set(
          failed ? "#885f50" : "#254b50",
        );
        region.packets.forEach((m, j) => {
          m.position.copy(
            region.curve.getPoint(
              (time * (0.05 + Math.log2(state.load.linkGbps + 1) * 0.025) +
                j / 3) %
                1,
            ),
          );
          m.visible = !failed;
        });
      });
      Object.entries(effects).forEach(([id, effect]) => {
        effect.group.visible =
          state.issue === id ||
          (id === "hotspot" && state.load.skew >= 0.3) ||
          (id === "recovery" && !!state.recovery);
        if (effect.group.visible) effect.update(time, state);
      });
    },
  };
}
