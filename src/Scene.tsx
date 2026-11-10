import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export type SceneLevel = "cpu" | "server" | "cluster" | "multicloud";
export interface SceneProps {
  level: SceneLevel;
  playing: boolean;
  speed: number;
  failure: boolean;
  issue?: string;
  onSelect: (name: string) => void;
  resetKey: number;
}

type NodeDefinition = {
  name: string;
  x: number;
  z: number;
  group: number;
  role?: string;
  height?: number;
};
type SceneNode = {
  definition: NodeDefinition;
  mesh: THREE.Group;
  cover: THREE.Mesh;
  led: THREE.Mesh;
  materials: THREE.MeshStandardMaterial[];
  top: THREE.Vector3;
};
type Connection = {
  curve: THREE.QuadraticBezierCurve3;
  rerouted: THREE.QuadraticBezierCurve3;
  line: THREE.Line;
  alternateLine: THREE.Line;
  particles: THREE.Mesh[];
  from: number;
  to: number;
  seed: number;
};

const LIME = new THREE.Color("#c5f360");
const AMBER = new THREE.Color("#edab67");
const GRAPHITE = new THREE.Color("#323b36");
const MUTED = new THREE.Color("#626a60");
const BLACK = new THREE.Color("#000000");
const LINK = new THREE.Color("#9eac91");

function definitions(level: SceneLevel): NodeDefinition[] {
  if (level === "cpu")
    return [
      {
        name: "L3 shared cache",
        x: 0,
        z: 0,
        group: 0,
        role: "32 MB SHARED",
        height: 0.65,
      },
      ...Array.from({ length: 8 }, (_, i) => ({
        name: `Core ${String(i + 1).padStart(2, "0")} · L1 / L2`,
        x: ((i % 4) - 1.5) * 3.1,
        z: i < 4 ? -3.5 : 3.5,
        group: i < 4 ? 1 : 2,
        height: 1.15,
      })),
      {
        name: "Memory controller",
        x: 6.5,
        z: 0,
        group: 3,
        role: "DRAM BUS",
        height: 0.85,
      },
    ];
  if (level === "server")
    return [
      {
        name: "CPU socket 01",
        x: -2,
        z: -2.7,
        group: 0,
        role: "NUMA NODE 0",
        height: 1.65,
      },
      {
        name: "CPU socket 02",
        x: 2,
        z: -2.7,
        group: 0,
        role: "NUMA NODE 1",
        height: 1.65,
      },
      { name: "DRAM bank 01", x: -5.1, z: -0.5, group: 1, height: 0.8 },
      { name: "DRAM bank 02", x: 5.1, z: -0.5, group: 1, height: 0.8 },
      {
        name: "NVMe 01 · write-ahead log",
        x: -3.8,
        z: 3.2,
        group: 2,
        height: 0.7,
      },
      { name: "NVMe 02 · data pages", x: 0, z: 3.2, group: 2, height: 0.7 },
      {
        name: "NVMe 03 · column segments",
        x: 3.8,
        z: 3.2,
        group: 2,
        height: 0.7,
      },
      {
        name: "Network interface · 100 GbE",
        x: 0,
        z: 0.1,
        group: 3,
        height: 1.0,
      },
    ];
  const clouds = level === "multicloud";
  const perGroup = clouds ? 4 : 3;
  return Array.from({ length: perGroup * 3 }, (_, i) => {
    const group = Math.floor(i / perGroup);
    const local = i % perGroup;
    return {
      name: clouds
        ? `${["US East", "EU West", "Asia Pacific"][group]} · ${["query coordinator", "compute pool", "object storage", "catalog"][local]}`
        : `Shard ${String(group + 1).padStart(2, "0")} · ${local === 0 ? "leader" : `replica ${local}`}`,
      x:
        (group - 1) * (clouds ? 6.5 : 5.1) +
        (clouds
          ? ((local % 2) - 0.5) * 2.15
          : local === 0
            ? 0
            : (local === 1 ? -1 : 1) * 1.1),
      z:
        (clouds
          ? (Math.floor(local / 2) - 0.5) * 3.65
          : local === 0
            ? -1.8
            : 1.7) + (clouds && group === 1 ? -2 : 0),
      group,
      role: clouds
        ? ["COORDINATOR", "COMPUTE", "OBJECTS", "CATALOG"][local]
        : local === 0
          ? "LEADER"
          : "REPLICA",
      height: local === 0 ? 1.85 : 1.45,
    };
  });
}

function label(text: string, width = 3.6, color = "#63705f"): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, 768, 96);
    ctx.font = '500 28px "Arial", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    ctx.fillText(text, 384, 48);
  }
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

function roundedSlab(
  width: number,
  depth: number,
  height: number,
  radius = 0.13,
) {
  const shape = new THREE.Shape();
  const x = -width / 2,
    y = -depth / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + depth - radius);
  shape.quadraticCurveTo(x + width, y + depth, x + width - radius, y + depth);
  shape.lineTo(x + radius, y + depth);
  shape.quadraticCurveTo(x, y + depth, x, y + depth - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.025,
    bevelThickness: 0.025,
    curveSegments: 4,
  });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

function addNode(
  scene: THREE.Scene,
  d: NodeDefinition,
  index: number,
): SceneNode {
  const group = new THREE.Group();
  group.position.set(d.x, 0.12, d.z);
  const height = d.height ?? 1.5;
  const bodyMat = new THREE.MeshStandardMaterial({
    color: "#36413a",
    roughness: 0.63,
    metalness: 0.15,
  });
  const topMat = new THREE.MeshStandardMaterial({
    color: LIME,
    roughness: 0.7,
    metalness: 0.05,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: "#475247",
    roughness: 0.6,
  });
  const ledMat = new THREE.MeshStandardMaterial({
    color: LIME,
    emissive: LIME,
    emissiveIntensity: 0.65,
  });
  const body = new THREE.Mesh(roundedSlab(1.56, 1.76, height), bodyMat);
  body.castShadow = true;
  body.receiveShadow = true;
  body.userData = { nodeIndex: index, name: d.name };
  group.add(body);
  const cover = new THREE.Mesh(roundedSlab(1.57, 1.77, 0.11, 0.13), topMat);
  cover.position.y = height + 0.025;
  cover.castShadow = true;
  cover.userData = { nodeIndex: index, name: d.name };
  group.add(cover);
  // Inset front panels give the modules a readable server-like silhouette.
  for (let row = 0; row < Math.max(2, Math.floor(height * 3)); row++) {
    const front = new THREE.Mesh(
      new THREE.BoxGeometry(1.25, 0.07, 0.03),
      trimMat,
    );
    front.position.set(0, 0.25 + row * 0.25, 0.896);
    group.add(front);
  }
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.035), ledMat);
  led.position.set(0.53, height - 0.14, 0.92);
  group.add(led);
  // Subtle slots on the top surface catch the directional light.
  for (let slot = 0; slot < 5; slot++) {
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.012, 0.025),
      new THREE.MeshStandardMaterial({
        color: "#9dbd58",
        transparent: true,
        opacity: 0.6,
      }),
    );
    line.position.set(-0.13, height + 0.145, -0.45 + slot * 0.15);
    group.add(line);
  }
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.045, 12), ledMat);
  dot.rotation.x = -Math.PI / 2;
  dot.position.set(0.49, height + 0.15, 0.52);
  group.add(dot);
  scene.add(group);
  return {
    definition: d,
    mesh: group,
    cover,
    led,
    materials: [bodyMat, topMat, trimMat, ledMat],
    top: new THREE.Vector3(d.x, height + 0.32, d.z),
  };
}

function pairings(
  level: SceneLevel,
  nodes: NodeDefinition[],
): [number, number][] {
  if (level === "cpu")
    return [
      ...Array.from({ length: 8 }, (_, i): [number, number] => [i + 1, 0]),
      [0, 9],
    ];
  if (level === "server")
    return [
      [0, 1],
      [0, 2],
      [1, 3],
      [0, 7],
      [1, 7],
      [0, 4],
      [0, 5],
      [1, 6],
    ];
  const pairs: [number, number][] = [];
  const leaders = nodes.flatMap((node, i) =>
    nodes.findIndex((n) => n.group === node.group) === i ? [i] : [],
  );
  nodes.forEach((node, i) => {
    const leader = leaders.find((j) => nodes[j].group === node.group);
    if (leader !== undefined && leader !== i) pairs.push([leader, i]);
  });
  leaders.forEach((leader, i) =>
    pairs.push([leader, leaders[(i + 1) % leaders.length]]),
  );
  return pairs;
}

function makeCurve(a: THREE.Vector3, b: THREE.Vector3, arc = 1.8) {
  const middle = a.clone().lerp(b, 0.5);
  middle.y += arc + a.distanceTo(b) * 0.08;
  return new THREE.QuadraticBezierCurve3(a.clone(), middle, b.clone());
}

type ModeEffect = { group: THREE.Group; update: (time: number) => void };

function addIssueEffects(
  scene: THREE.Scene,
  nodes: SceneNode[],
): Record<string, ModeEffect> {
  const effects: Record<string, ModeEffect> = {};
  const add = (
    id: string,
    title: string,
    update: (time: number) => void = () => {},
  ) => {
    const group = new THREE.Group();
    group.visible = false;
    const caption = label(title, 6.8, "#7c845e");
    caption.position.set(0, 0.2, 5.9);
    group.add(caption);
    scene.add(group);
    effects[id] = { group, update };
    return group;
  };
  const ringGeometry = new THREE.TorusGeometry(1.2, 0.035, 6, 48);
  const orange = new THREE.MeshBasicMaterial({
    color: "#df9b4d",
    transparent: true,
    opacity: 0.7,
  });
  const green = new THREE.MeshBasicMaterial({
    color: "#a7c964",
    transparent: true,
    opacity: 0.8,
  });
  const beadGeometry = new THREE.SphereGeometry(0.09, 8, 6);
  // 01: skew concentrates requests at one partition while its peers stay idle.
  const hotRings: THREE.Mesh[] = [];
  const hotspot = add("hotspot", "SKEWED LOAD → ONE HOT PARTITION", (time) => {
    hotRings.forEach((ring, i) => {
      ring.scale.setScalar(0.9 + ((time * 0.32 + i / 3) % 1) * 1.25);
      (ring.material as THREE.MeshBasicMaterial).opacity =
        0.65 * (1 - ((time * 0.32 + i / 3) % 1));
    });
  });
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(ringGeometry, orange.clone());
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(nodes[0].top.x, 0.13 + i * 0.015, nodes[0].top.z);
    hotRings.push(ring);
    hotspot.add(ring);
  }
  // 02: extra all-to-all edges make the cost of distributed repartition visible.
  const shuffleCurves: THREE.QuadraticBezierCurve3[] = [];
  const shuffleDots: THREE.Mesh[] = [];
  const shuffle = add("shuffle", "ALL-TO-ALL REPARTITION · SHUFFLE", (time) => {
    shuffleDots.forEach((dot, i) =>
      dot.position.copy(
        shuffleCurves[Math.floor(i / 2)].getPoint((time * 0.28 + i * 0.19) % 1),
      ),
    );
  });
  nodes.forEach((node, i) => {
    for (let j = 1; j <= 2; j++) {
      const curve = makeCurve(
        node.top,
        nodes[(i + j * 3 + 1) % nodes.length].top,
        0.7 + j * 0.3,
      );
      shuffleCurves.push(curve);
      shuffle.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(curve.getPoints(32)),
          new THREE.LineBasicMaterial({
            color: "#a7bc8e",
            transparent: true,
            opacity: 0.38,
          }),
        ),
      );
      for (let k = 0; k < 2; k++) {
        const dot = new THREE.Mesh(beadGeometry, green);
        shuffleDots.push(dot);
        shuffle.add(dot);
      }
    }
  });
  // 03: the moving neighborhood wave represents candidate-vector exploration.
  const vectorPositions = new Float32Array(96 * 3);
  const vectorGeometry = new THREE.BufferGeometry();
  vectorGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(vectorPositions, 3),
  );
  const vectorCloud = new THREE.Points(
    vectorGeometry,
    new THREE.PointsMaterial({
      color: "#7fa84b",
      size: 0.12,
      transparent: true,
      opacity: 0.65,
    }),
  );
  const vector = add(
    "vector",
    "VECTOR NEIGHBORHOODS · MEMORY PRESSURE",
    (time) => {
      for (let i = 0; i < 96; i++) {
        vectorPositions[i * 3] = ((i % 16) - 7.5) * 1.05;
        vectorPositions[i * 3 + 1] =
          2.8 + Math.sin((i % 16) * 0.48 - time * 2) * 0.7;
        vectorPositions[i * 3 + 2] = (Math.floor(i / 16) - 2.5) * 1.25;
      }
      vectorGeometry.attributes.position.needsUpdate = true;
    },
  );
  vector.add(vectorCloud);
  // 04: small immutable files merge into one larger sorted output run.
  const layers: THREE.Mesh[] = [];
  const compaction = add(
    "compaction",
    "IMMUTABLE RUNS → MERGED SEGMENT",
    (time) => {
      layers.forEach((layer, i) => {
        const progress = (time * 0.17 + i * 0.12) % 1;
        layer.position.y =
          nodes[0].top.y + 0.25 + (1 - progress) * (1 + i * 0.38);
        layer.scale.setScalar(0.8 + progress * 0.2);
        (layer.material as THREE.MeshBasicMaterial).opacity =
          0.35 + progress * 0.5;
      });
    },
  );
  for (let i = 0; i < 4; i++) {
    const layer = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.08, 1.9),
      (i % 2 ? orange : green).clone(),
    );
    layer.position.set(nodes[0].top.x, 3 + i * 0.4, nodes[0].top.z);
    layers.push(layer);
    compaction.add(layer);
  }
  // 05: checkpoint barriers periodically hold a visible queue before releasing it.
  const queues: THREE.Mesh[] = [];
  const barrierMat = new THREE.MeshBasicMaterial({
    color: "#dda762",
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
  });
  const stream = add(
    "stream",
    "CHECKPOINT BARRIER · BACKPRESSURE QUEUE",
    (time) => {
      const waiting = time % 6 < 3.5;
      barrierMat.opacity = waiting ? 0.14 + Math.sin(time * 4) * 0.025 : 0.03;
      queues.forEach((box, i) => {
        box.position.set(
          -4.4 + i * 0.55,
          0.5,
          waiting ? 3.75 : 3.75 - ((time % 6) - 3.5) * 2,
        );
        box.visible = waiting || box.position.z > -1;
      });
    },
  );
  const barrier = new THREE.Mesh(
    new THREE.BoxGeometry(18, 3.8, 0.045),
    barrierMat,
  );
  barrier.position.set(0, 1.9, 0);
  stream.add(barrier);
  const checkpoint = label("CHECKPOINT", 3.4, "#a4773e");
  checkpoint.position.set(0, 4.1, 0);
  stream.add(checkpoint);
  for (let i = 0; i < 12; i++) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), orange);
    queues.push(box);
    stream.add(box);
  }
  // 06: explicit regional boundaries and gates illustrate policy-constrained movement.
  const gates: THREE.Mesh[] = [];
  const governance = add(
    "governance",
    "REGIONAL OWNERSHIP · POLICY GATES",
    (time) => {
      gates.forEach((gate, i) => {
        gate.scale.y = 0.7 + Math.sin(time * 1.5 + i) * 0.12;
      });
    },
  );
  [0, 1, 2].forEach((group) => {
    const groupNodes = nodes.filter((n) => n.definition.group === group);
    if (!groupNodes.length) return;
    const centerX =
      groupNodes.reduce((a, n) => a + n.definition.x, 0) / groupNodes.length;
    const centerZ =
      groupNodes.reduce((a, n) => a + n.definition.z, 0) / groupNodes.length;
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(4.65, 3.4, 6.8)),
      new THREE.LineBasicMaterial({
        color: "#9aa882",
        transparent: true,
        opacity: 0.62,
      }),
    );
    edges.position.set(centerX, 1.75, centerZ);
    governance.add(edges);
  });
  [-2.6, 2.6].forEach((x) => {
    for (let i = 0; i < 3; i++) {
      const gate = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 1.2, 0.08),
        orange,
      );
      gate.position.set(x + (i - 1) * 0.2, 2.8, 0);
      gates.push(gate);
      governance.add(gate);
    }
  });
  // 07: long amber WAN arcs and bulky payloads expose cross-region transfer.
  const egressCurves: THREE.QuadraticBezierCurve3[] = [];
  const payloads: THREE.Mesh[] = [];
  const egress = add("egress", "WAN TRANSFER · DATA GRAVITY", (time) => {
    payloads.forEach((payload, i) =>
      payload.position.copy(
        egressCurves[Math.floor(i / 4)].getPoint((time * 0.075 + i * 0.21) % 1),
      ),
    );
  });
  for (let i = 0; i < 3; i++) {
    const curve = makeCurve(
      nodes[i % nodes.length].top,
      nodes[nodes.length - 1 - i].top,
      5.4 + i * 0.6,
    );
    egressCurves.push(curve);
    egress.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(curve, 48, 0.025, 5, false),
        orange,
      ),
    );
    for (let j = 0; j < 4; j++) {
      const payload = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.16, 0.16),
        orange,
      );
      payloads.push(payload);
      egress.add(payload);
    }
  }
  // 08: a write fans out and acknowledgments return before a quorum commits.
  const acknowledgments: THREE.Mesh[] = [];
  const consistency = add(
    "consistency",
    "QUORUM · REQUEST → ACKNOWLEDGMENT",
    (time) => {
      acknowledgments.forEach((ring, i) => {
        const phase = (time * 0.35) % 1;
        ring.visible = phase > i * 0.19;
        ring.scale.setScalar(0.86 + Math.sin(time * 4 - i) * 0.08);
        (ring.material as THREE.MeshBasicMaterial).color.copy(
          i < 2 ? LIME : AMBER,
        );
      });
    },
  );
  nodes.slice(0, 3).forEach((node) => {
    const ring = new THREE.Mesh(ringGeometry, green.clone());
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(node.top).add(new THREE.Vector3(0, 0.15, 0));
    acknowledgments.push(ring);
    consistency.add(ring);
  });
  // 09: snapshot segments are replayed incrementally into a recovering destination.
  const snapshots: THREE.Mesh[] = [];
  const restoreCurve = makeCurve(
    new THREE.Vector3(-10.2, 1.2, 1.5),
    nodes[nodes.length - 1].top,
    4,
  );
  const restoredBlocks: THREE.Mesh[] = [];
  const recovery = add(
    "recovery",
    "SNAPSHOT → LOG REPLAY → REBUILD",
    (time) => {
      snapshots.forEach((slab, i) => {
        (slab.material as THREE.MeshBasicMaterial).opacity =
          0.35 + ((Math.floor(time * 1.5) + i) % 5) * 0.1;
      });
      restoredBlocks.forEach((block, i) =>
        block.position.copy(restoreCurve.getPoint((time * 0.1 + i * 0.2) % 1)),
      );
    },
  );
  for (let i = 0; i < 5; i++) {
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.15, 1.4),
      green.clone(),
    );
    slab.position.set(-10.2, 0.3 + i * 0.23, 1.5);
    snapshots.push(slab);
    recovery.add(slab);
  }
  recovery.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(restoreCurve.getPoints(48)),
      new THREE.LineBasicMaterial({
        color: "#c4a577",
        transparent: true,
        opacity: 0.6,
      }),
    ),
  );
  for (let i = 0; i < 5; i++) {
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.15, 0.15),
      orange,
    );
    restoredBlocks.push(block);
    recovery.add(block);
  }
  // 10: asynchronous replica watermarks deliberately trail the leader's watermark.
  const lagBars: THREE.Mesh[] = [];
  const replication = add(
    "replication",
    "LEADER WATERMARK → ASYNC REPLICA LAG",
    (time) => {
      lagBars.forEach((bar, i) => {
        const groupStart = nodes.findIndex(
          (n) => n.definition.group === nodes[i].definition.group,
        );
        const offset = i - groupStart;
        const watermark = (((time * 0.18 - offset * 0.2) % 1) + 1) % 1;
        bar.scale.y = 0.15 + watermark * 1.8;
        bar.position.y = nodes[i].top.y + bar.scale.y * 0.42;
      });
    },
  );
  nodes.forEach((node, i) => {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.8, 0.22),
      (i === 0 ? green : orange).clone(),
    );
    bar.position.set(node.top.x + 0.45, node.top.y + 0.5, node.top.z);
    lagBars.push(bar);
    replication.add(bar);
  });
  return effects;
}

export default function Scene(props: SceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const live = useRef(props);
  live.current = props;
  const [fallback, setFallback] = useState(false);
  const [focusedNode, setFocusedNode] = useState<string | null>(null);
  const selectedNodeRef = useRef(-1);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    selectedNodeRef.current = -1;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
      });
    } catch {
      setFallback(true);
      return;
    }
    setFallback(false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
    renderer.setClearColor("#f5f7f0", 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.domElement.style.cssText =
      "display:block;width:100%;height:100%;touch-action:none;outline:none";
    renderer.domElement.setAttribute(
      "aria-label",
      `${props.level} data topology. Drag to rotate, scroll to zoom, or select a component.`,
    );
    renderer.domElement.setAttribute("role", "img");
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog("#f4f6ef", 40, 85);
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 150);
    const defaultPosition =
      props.level === "multicloud"
        ? new THREE.Vector3(17, 16, 22)
        : new THREE.Vector3(13.5, 14, 18);
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const introPosition = defaultPosition.clone().multiplyScalar(1.1);
    camera.position.copy(reducedMotion ? defaultPosition : introPosition);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.55, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.maxPolarAngle = Math.PI * 0.43;
    controls.minPolarAngle = Math.PI * 0.09;
    controls.minDistance = 12;
    controls.maxDistance = 55;
    controls.enablePan = false;
    controls.rotateSpeed = 0.55;
    controls.zoomSpeed = 0.8;
    controls.update();
    scene.add(new THREE.HemisphereLight("#ffffff", "#a2ad97", 3));
    const sun = new THREE.DirectionalLight("#ffffff", 4);
    sun.position.set(-8, 20, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, {
      left: -18,
      right: 18,
      top: 14,
      bottom: -14,
      near: 0.5,
      far: 60,
    });
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.05;
    sun.shadow.radius = 4;
    scene.add(sun);
    const rim = new THREE.DirectionalLight("#e7f2d5", 1.4);
    rim.position.set(8, 9, -10);
    scene.add(rim);

    const floor = new THREE.Mesh(
      roundedSlab(25, 14, 0.09, 0.55),
      new THREE.MeshStandardMaterial({
        color: "#e9ede3",
        roughness: 1,
        metalness: 0,
      }),
    );
    floor.position.y = -0.12;
    floor.receiveShadow = true;
    scene.add(floor);
    const gridPoints: THREE.Vector3[] = [];
    for (let x = -12; x <= 12; x++)
      gridPoints.push(
        new THREE.Vector3(x, 0.01, -6.8),
        new THREE.Vector3(x, 0.01, 6.8),
      );
    for (let z = -6; z <= 6; z++)
      gridPoints.push(
        new THREE.Vector3(-12.3, 0.01, z),
        new THREE.Vector3(12.3, 0.01, z),
      );
    scene.add(
      new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(gridPoints),
        new THREE.LineBasicMaterial({
          color: "#d3dcc9",
          transparent: true,
          opacity: 0.67,
        }),
      ),
    );

    const defs = definitions(props.level);
    const nodes = defs.map((d, i) => addNode(scene, d, i));
    if (props.level === "cluster" || props.level === "multicloud") {
      for (let i = 0; i < 3; i++) {
        const centerX = (i - 1) * (props.level === "multicloud" ? 6.5 : 5.1);
        const z = props.level === "multicloud" && i === 1 ? -2 : 0;
        const plinth = new THREE.Mesh(
          roundedSlab(4.7, 7.1, 0.035, 0.22),
          new THREE.MeshStandardMaterial({
            color: i % 2 === 0 ? "#e0e7d8" : "#e4eadd",
            roughness: 1,
          }),
        );
        plinth.position.set(centerX, 0.035, z);
        plinth.receiveShadow = true;
        scene.add(plinth);
        const tag = label(
          props.level === "multicloud"
            ? ["US EAST", "EU WEST", "ASIA PACIFIC"][i]
            : `SHARD ${String(i + 1).padStart(2, "0")}`,
          3.6,
        );
        tag.position.set(centerX, 0.16, z + 4.3);
        scene.add(tag);
      }
    } else {
      const tag = label(
        props.level === "cpu"
          ? "CACHE-COHERENT INTERCONNECT"
          : "MEMORY · COMPUTE · STORAGE",
        7,
      );
      tag.position.set(0, 0.12, 5.4);
      scene.add(tag);
    }

    const dotGeometry = new THREE.SphereGeometry(0.075, 8, 6);
    const dotMaterial = new THREE.MeshBasicMaterial({ color: "#a8d448" });
    const connections: Connection[] = pairings(props.level, defs).map(
      ([from, to], index) => {
        const curve = makeCurve(
          nodes[from].top,
          nodes[to].top,
          defs[from].group !== defs[to].group ? 3.0 : 1.1,
        );
        const alternateTarget =
          nodes[to].definition.group === 2 ? nodes[0] : nodes[to];
        const alternateStart =
          nodes[from].definition.group === 2
            ? nodes.find((n) => n.definition.group === 1) || nodes[0]
            : nodes[from];
        const rerouted = makeCurve(
          alternateStart.top,
          alternateTarget.top,
          3.0,
        );
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(curve.getPoints(48)),
          new THREE.LineBasicMaterial({
            color: index < 9 ? "#9eac91" : "#8da77a",
            transparent: true,
            opacity: 0.55,
          }),
        );
        const alternateLine = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(rerouted.getPoints(48)),
          new THREE.LineBasicMaterial({
            color: "#e3a25c",
            transparent: true,
            opacity: 0.75,
          }),
        );
        alternateLine.visible = false;
        scene.add(line, alternateLine);
        const particles = Array.from({ length: 3 }, () => {
          const particle = new THREE.Mesh(dotGeometry, dotMaterial);
          scene.add(particle);
          return particle;
        });
        return {
          curve,
          rerouted,
          line,
          alternateLine,
          particles,
          from,
          to,
          seed: index * 0.137,
        };
      },
    );
    const issueEffects = addIssueEffects(scene, nodes);
    // Small surface markers reinforce the scale of the virtual machine room.
    [-10.5, 10.5].forEach((x) => {
      const cross = new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(x - 0.2, 0.03, 5.6),
          new THREE.Vector3(x + 0.2, 0.03, 5.6),
          new THREE.Vector3(x, 0.03, 5.4),
          new THREE.Vector3(x, 0.03, 5.8),
        ]),
        new THREE.LineBasicMaterial({ color: "#94a184" }),
      );
      scene.add(cross);
    });

    let width = 0,
      height = 0;
    let dirty = true;
    const resize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.zoom = Math.min(1, Math.max(0.44, camera.aspect / 1.45));
      camera.updateProjectionMatrix();
      dirty = true;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDown = { x: 0, y: 0 };
    let selected = -1;
    const pick = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        (-(event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(
        nodes.flatMap((n) => [n.mesh.children[0], n.cover]),
        false,
      )[0];
    };
    const down = (event: PointerEvent) => {
      pointerDown = { x: event.clientX, y: event.clientY };
    };
    const move = (event: PointerEvent) => {
      renderer.domElement.style.cursor = pick(event) ? "pointer" : "grab";
    };
    const up = (event: PointerEvent) => {
      if (
        Math.hypot(
          event.clientX - pointerDown.x,
          event.clientY - pointerDown.y,
        ) > 6
      )
        return;
      const hit = pick(event);
      if (hit) {
        selected = hit.object.userData.nodeIndex as number;
        selectedNodeRef.current = selected;
        live.current.onSelect(hit.object.userData.name as string);
        dirty = true;
      }
    };
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("pointerup", up);
    controls.addEventListener("change", () => {
      dirty = true;
    });

    let introProgress = reducedMotion ? 1 : 0;
    controls.addEventListener("start", () => {
      introProgress = 1;
    });
    let frame = 0;
    let last = performance.now();
    let elapsed = 0;
    let previousState = "";
    const animate = (now: number) => {
      frame = requestAnimationFrame(animate);
      const state = live.current;
      selected = selectedNodeRef.current;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (state.playing) elapsed += dt * Math.max(0.1, state.speed);
      if (introProgress < 1) {
        introProgress = Math.min(1, introProgress + dt * 0.9);
        const ease = 1 - Math.pow(1 - introProgress, 3);
        camera.position.lerpVectors(introPosition, defaultPosition, ease);
        dirty = true;
      }
      const issue = (state.issue || "").toLowerCase();
      const mode = issue.startsWith("recovery") ? "recovery" : issue;
      const hotspot = mode === "hotspot";
      const shuffle = mode === "shuffle";
      const compaction = mode === "compaction";
      const replication = mode === "replication";
      const consistency = mode === "consistency";
      const vector = mode === "vector";
      const recovery = mode === "recovery";
      const stream = mode === "stream";
      const governance = mode === "governance";
      const egress = mode === "egress";
      const stateKey = `${state.failure}:${issue}:${selected}:${state.playing}`;
      const changed = stateKey !== previousState;
      if (changed) {
        dirty = true;
        previousState = stateKey;
      }
      const isFailed = (index: number) => {
        if (!state.failure) return false;
        if (issue === "recovery-node") return index === nodes.length - 1;
        if (issue === "recovery-corruption") return true;
        return defs[index].group === 2;
      };
      const pulse = (Math.sin(elapsed * 2.5) + 1) / 2;
      Object.entries(issueEffects).forEach(([id, effect]) => {
        effect.group.visible = id === mode;
        if (effect.group.visible) effect.update(elapsed);
      });
      dotMaterial.color.copy(egress || stream || replication ? AMBER : LIME);
      nodes.forEach((node, index) => {
        const failed = isFailed(index);
        const activeHotspot = hotspot && index === 0;
        const selectedNode = selected === index;
        const groupLeader = defs.findIndex(
          (n) => n.group === node.definition.group,
        );
        const local = index - groupLeader;
        const rebuild = recovery && (failed || index === nodes.length - 1);
        const restoreProgress = Math.max(
          0,
          Math.min(1, ((elapsed * 0.12) % 1.4) - local * 0.08),
        );
        node.materials[0].color.copy(failed ? MUTED : GRAPHITE);
        node.materials[1].color.copy(failed || activeHotspot ? AMBER : LIME);
        if (rebuild)
          node.materials[1].color.copy(AMBER).lerp(LIME, restoreProgress);
        node.materials[1].emissive.copy(
          selectedNode ? LIME : activeHotspot ? AMBER : BLACK,
        );
        node.materials[1].emissiveIntensity = selectedNode
          ? 0.15
          : activeHotspot
            ? 0.08 + pulse * 0.14
            : 0;
        node.materials[3].color.copy(
          failed || (replication && local > 0) ? AMBER : LIME,
        );
        node.materials[3].emissive.copy(
          failed || (replication && local > 0) ? AMBER : LIME,
        );
        node.materials[3].emissiveIntensity = failed
          ? pulse * 0.6
          : 0.4 +
            Math.sin(elapsed * 3 - (replication ? local * 2 : index)) * 0.2;
        node.mesh.position.y =
          0.12 + (vector ? Math.sin(elapsed * 1.8 + index * 0.55) * 0.18 : 0);
        node.mesh.scale.y = rebuild ? 0.3 + restoreProgress * 0.7 : 1;
        node.cover.scale.y = compaction
          ? 1 + pulse * (index % 3 === 0 ? 1.1 : 0.08)
          : 1;
      });
      connections.forEach((connection, index) => {
        const affected = isFailed(connection.from) || isFailed(connection.to);
        const crossRegion =
          defs[connection.from].group !== defs[connection.to].group;
        const blocked = governance && crossRegion;
        if (affected && changed) {
          const healthy = nodes.map((_, i) => i).filter((i) => !isFailed(i));
          const start = !isFailed(connection.from)
            ? connection.from
            : (healthy.find((i) => i !== connection.to) ?? connection.from);
          const end = !isFailed(connection.to)
            ? connection.to
            : (healthy.find(
                (i) =>
                  i !== start && defs[i].group === defs[connection.to].group,
              ) ??
              healthy.find((i) => i !== start) ??
              start);
          connection.rerouted = makeCurve(nodes[start].top, nodes[end].top, 3);
          connection.alternateLine.geometry.dispose();
          connection.alternateLine.geometry =
            new THREE.BufferGeometry().setFromPoints(
              connection.rerouted.getPoints(48),
            );
        }
        connection.line.visible = !affected;
        connection.alternateLine.visible = affected;
        (connection.line.material as THREE.LineBasicMaterial).opacity = blocked
          ? 0.18
          : hotspot && connection.from !== 0 && connection.to !== 0
            ? 0.18
            : 0.55;
        (connection.line.material as THREE.LineBasicMaterial).color.copy(
          egress && crossRegion ? AMBER : LINK,
        );
        const curve = affected ? connection.rerouted : connection.curve;
        const rate =
          (shuffle
            ? 0.28
            : replication
              ? 0.12
              : consistency
                ? 0.16
                : recovery
                  ? 0.08
                  : egress
                    ? 0.065
                    : 0.15) *
          (hotspot && (connection.from === 0 || connection.to === 0) ? 2.5 : 1);
        connection.particles.forEach((particle, i) => {
          let progress = (elapsed * rate + i / 3 + connection.seed) % 1;
          if (hotspot && connection.from === 0) progress = 1 - progress;
          if (consistency)
            progress =
              progress < 0.45
                ? progress / 0.45
                : progress < 0.9
                  ? 1 - (progress - 0.45) / 0.45
                  : 0;
          if (replication)
            progress =
              progress < 0.65
                ? (progress / 0.65) * 0.84
                : progress < 0.88
                  ? 0.84
                  : 0.84 + ((progress - 0.88) / 0.12) * 0.16;
          if (stream && elapsed % 6 < 3.5)
            progress = Math.min(progress, 0.39 + i * 0.025);
          if (blocked) progress = Math.min(progress, 0.44 - i * 0.035);
          particle.position.copy(curve.getPoint(progress));
          particle.scale.setScalar(
            hotspot && (connection.from === 0 || connection.to === 0)
              ? 1.6
              : recovery || egress
                ? 1.4
                : 1,
          );
          particle.visible =
            (!compaction || (i + index) % 3 !== 0 || pulse > 0.5) &&
            (!hotspot ||
              connection.from === 0 ||
              connection.to === 0 ||
              i === 0);
          if (recovery && issue === "recovery-corruption")
            particle.visible = false;
        });
      });
      const moved = controls.update();
      if ((state.playing || dirty || moved) && width && height) {
        renderer.render(scene, camera);
        dirty = false;
      }
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerup", up);
      controls.dispose();
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene.traverse((object) => {
        const renderable = object as THREE.Mesh;
        if (renderable.geometry) geometries.add(renderable.geometry);
        const objectMaterials = renderable.material
          ? Array.isArray(renderable.material)
            ? renderable.material
            : [renderable.material]
          : [];
        objectMaterials.forEach((material) => materials.add(material));
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => {
        const map = (material as THREE.MeshBasicMaterial).map;
        if (map) map.dispose();
        material.dispose();
      });
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [props.level, props.resetKey]);

  return (
    <div
      ref={host}
      style={{ position: "absolute", inset: 0, overflow: "hidden" }}
    >
      {!fallback && (
        <div
          role="group"
          aria-label="Inspect topology components with keyboard"
          style={{ position: "absolute", left: 14, bottom: 82, zIndex: 8 }}
        >
          {definitions(props.level).map((node, index) => {
            const focused = focusedNode === node.name;
            return (
              <button
                key={node.name}
                type="button"
                aria-label={`Inspect ${node.name}`}
                onFocus={() => setFocusedNode(node.name)}
                onBlur={() => setFocusedNode(null)}
                onClick={() => {
                  selectedNodeRef.current = index;
                  props.onSelect(node.name);
                }}
                style={{
                  position: "absolute",
                  left: 0,
                  bottom: 0,
                  width: focused ? "max-content" : 1,
                  maxWidth: "min(340px, 75vw)",
                  height: focused ? "auto" : 1,
                  padding: focused ? "10px 14px" : 0,
                  overflow: "hidden",
                  clipPath: focused ? undefined : "inset(50%)",
                  whiteSpace: focused ? "normal" : "nowrap",
                  border: 0,
                  borderRadius: 7,
                  color: "#303b32",
                  background: "#fafff2",
                  outline: focused ? "2px solid #89ad4b" : "none",
                  boxShadow: focused ? "0 6px 20px #303b3220" : "none",
                  fontSize: 12,
                  textAlign: "left",
                }}
              >
                Inspect {node.name}
              </button>
            );
          })}
        </div>
      )}
      {fallback && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 28,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 56px)",
              gap: 23,
              transform: "rotateX(35deg) rotateZ(-28deg)",
              padding: 30,
            }}
          >
            {definitions(props.level).map((node, i) => (
              <button
                key={node.name}
                type="button"
                aria-label={`Inspect ${node.name}`}
                onClick={() => props.onSelect(node.name)}
                style={{
                  width: 56,
                  height: 56,
                  border: 0,
                  borderRadius: 5,
                  background:
                    props.failure && node.group === 2 ? "#d8a56c" : "#c5f360",
                  boxShadow:
                    "0 9px 0 #465143, 0 18px 0 #303b32, 8px 22px 16px #26352022",
                  cursor: "pointer",
                  fontSize: 10,
                  color: "#36412d",
                  fontWeight: 700,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </button>
            ))}
          </div>
          <span
            style={{
              color: "#65715e",
              fontSize: 11,
              textAlign: "center",
              padding: "0 20px",
            }}
          >
            Interactive topology · select a component
            <br />
            3D rendering is unavailable in this browser.
          </span>
        </div>
      )}
    </div>
  );
}
