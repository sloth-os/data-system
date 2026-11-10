import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { placeLabels } from "./labelLayout";
import type { LabelAnchor } from "./labelLayout";
import type { Glyph, SystemModel, SystemRoute } from "./systemModels";

export type CameraMode = "orbit" | "follow" | "top";
interface Props {
  model: SystemModel;
  phase: number;
  progress: number;
  playing: boolean;
  speed: number;
  selected: string | null;
  onSelect: (id: string) => void;
  exploded: boolean;
  onFlowSelect: (route: SystemRoute) => void;
  annotations: boolean;
  traffic: boolean;
  fault: boolean;
  cameraMode: CameraMode;
  resetKey: number;
}
type GlyphObject = {
  group: THREE.Group;
  update: (time: number, active: boolean, progress: number) => void;
};
const routeKey = (r: SystemRoute) => `${r.from}:${r.to}:${r.kind}`;
const routeColors = {
  data: "#c5f360",
  ack: "#effbdc",
  replica: "#76caff",
  metadata: "#bea1ff",
};

function panel(lines: string[], accent: string, width = 2.35, height = 1.7) {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 448;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#15282d";
  ctx.strokeStyle = `${accent}80`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(3, 3, 634, 442, 22);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.fillRect(28, 30, 9, 9);
  ctx.font = "500 25px monospace";
  ctx.fillText(lines[0] || "DATA", 54, 54);
  ctx.fillStyle = "#6d8c91";
  ctx.fillRect(28, 80, 580, 2);
  lines.slice(1).forEach((line, i) => {
    ctx.fillStyle = i === 1 ? accent : "#9fb6b7";
    ctx.font = "24px monospace";
    ctx.fillText(line.slice(0, 32), 30, 125 + i * 48);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    }),
  );
}

function glyph(kind: Glyph, color: string): GlyphObject {
  const group = new THREE.Group();
  const accent = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.28,
    metalness: 0.35,
    roughness: 0.3,
  });
  const shell = new THREE.MeshStandardMaterial({
    color: "#386169",
    emissive: "#1b3d43",
    emissiveIntensity: 0.18,
    metalness: 0.4,
    roughness: 0.36,
  });
  const pale = new THREE.MeshStandardMaterial({
    color: "#b7cecb",
    metalness: 0.3,
    roughness: 0.35,
  });
  const glass = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.09,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const stroke = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.68,
  });
  const movers: THREE.Object3D[] = [];
  const addBox = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material = shell,
  ) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };
  const connect = (a: THREE.Vector3, b: THREE.Vector3) =>
    group.add(
      new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), stroke),
    );
  const addPanel = (
    lines: string[],
    x = 0,
    y = 1.5,
    z = -0.3,
    w = 2.35,
    h = 1.7,
  ) => {
    const m = panel(lines, color, w, h);
    m.position.set(x, y, z);
    group.add(m);
    return m;
  };
  if (kind === "client" || kind === "router") {
    const hex = new THREE.Mesh(
      new THREE.CylinderGeometry(0.84, 1.05, 0.55, 6),
      shell,
    );
    hex.position.y = 0.8;
    group.add(hex);
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.78, 0.78, 0.07, 6),
      accent,
    );
    cap.position.y = 1.12;
    group.add(cap);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.13, 0.022, 6, 64),
      accent,
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1.2;
    group.add(ring);
    movers.push(ring);
    if (kind === "client")
      addPanel(
        ["REQUEST", "key: 42", "payload →", "authenticated"],
        0,
        2.1,
        0,
        1.9,
        1.3,
      );
    else
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        connect(
          new THREE.Vector3(Math.cos(angle) * 0.8, 1, Math.sin(angle) * 0.8),
          new THREE.Vector3(Math.cos(angle) * 1.4, 1, Math.sin(angle) * 1.4),
        );
      }
  } else if (kind === "btree") {
    const rows = [[0], [-0.7, 0.7], [-1.08, -0.36, 0.36, 1.08]];
    rows.forEach((xs, level) =>
      xs.forEach((x, i) => {
        const y = 2.2 - level * 0.72;
        const b = addBox(
          x,
          y,
          0,
          level === 2 ? 0.5 : 0.72,
          0.29,
          0.38,
          i === 0 ? accent : shell,
        );
        movers.push(b);
        if (level)
          connect(
            new THREE.Vector3(x, y + 0.15, 0),
            new THREE.Vector3(rows[level - 1][Math.floor(i / 2)], y + 0.58, 0),
          );
      }),
    );
    addPanel(
      ["INDEX", "root → branch → leaf", "candidate tuple IDs"],
      0,
      0.35,
      0.35,
      2.2,
      0.7,
    );
  } else if (kind === "table" || kind === "column") {
    const isColumn = kind === "column";
    for (let x = 0; x < 5; x++)
      for (let z = 0; z < 5; z++) {
        const box = addBox(
          (x - 2) * 0.44,
          0.6 + (isColumn ? (x % 3) * 0.15 : 0),
          (z - 2) * 0.3,
          0.39,
          isColumn ? 1.0 + (x % 3) * 0.3 : 0.19,
          0.25,
          (isColumn ? x === 1 || x === 3 : z === 2) ? accent : shell,
        );
        movers.push(box);
      }
    addPanel(
      isColumn
        ? [
            "COLUMN BATCH",
            "region  amount  time",
            "north   80      …",
            "south   20      …",
          ]
        : [
            "ROW VERSIONS",
            "id   value   version",
            "42   80      7",
            "43   20      3",
          ],
      0,
      2.0,
      -0.35,
      2.25,
      1.35,
    );
  } else if (kind === "document" || kind === "search") {
    if (kind === "document") {
      for (let i = 2; i >= 0; i--) {
        const sheet = addPanel(
          i === 0
            ? [
                "{ DOCUMENT }",
                "id: 42,",
                "profile: {",
                '  region: "north"',
                "}",
              ]
            : ["DOCUMENT", "nested fields", "typed values"],
          (i - 1) * 0.22,
          1.45 + i * 0.11,
          -i * 0.28,
          1.9,
          2.2,
        );
        movers.push(sheet);
      }
    } else {
      ["term: data", "term: scale", "term: system"].forEach((term, i) => {
        const sheet = addPanel(
          [term, "→ [4, 9, 42, …]", "postings + score"],
          0,
          0.65 + i * 0.65,
          -0.3 + i * 0.25,
          2.2,
          0.56,
        );
        movers.push(sheet);
      });
      for (let i = 0; i < 5; i++)
        addBox(
          (i - 2) * 0.38,
          0.25,
          0.9,
          0.3,
          0.13,
          0.3,
          i % 2 ? accent : shell,
        );
    }
  } else if (kind === "cache") {
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const m = addBox(
        Math.cos(angle) * 0.98,
        0.85,
        Math.sin(angle) * 0.98,
        0.38,
        0.9,
        0.38,
        i === 2 ? accent : shell,
      );
      movers.push(m);
    }
    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.46, 1.0, 6),
      accent,
    );
    core.position.y = 0.9;
    group.add(core);
    addPanel(
      ["HASH SLOT", "key → value", "TTL: configured"],
      0,
      2.15,
      0,
      1.8,
      0.9,
    );
  } else if (kind === "lsm") {
    for (let level = 0; level < 4; level++)
      for (let run = 0; run <= level; run++) {
        const m = addBox(
          (run - level / 2) * 0.66,
          2.05 - level * 0.48,
          0,
          0.58,
          0.22,
          1.25,
          level === 0 ? accent : shell,
        );
        movers.push(m);
      }
    addPanel(
      ["SORTED RUNS", "L0 → L1 → L2", "merge / compact"],
      0,
      0.2,
      0.75,
      2.1,
      0.8,
    );
  } else if (kind === "graph") {
    const positions = Array.from(
      { length: 10 },
      (_, i) =>
        new THREE.Vector3(
          Math.cos(i * 2.4) * (i === 0 ? 0.18 : 1.15),
          1.35 + Math.sin(i * 1.6) * 0.75,
          Math.sin(i * 2.4) * 1.1,
        ),
    );
    positions.forEach((pos, i) => {
      const m = new THREE.Mesh(
        new THREE.IcosahedronGeometry(i === 0 ? 0.28 : 0.17, 1),
        i === 0 ? accent : pale,
      );
      m.position.copy(pos);
      group.add(m);
      movers.push(m);
      if (i) connect(pos, positions[Math.floor((i - 1) / 2)]);
      if (i > 4) connect(pos, positions[i - 3]);
    });
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.014, 6, 80),
      accent,
    );
    halo.position.y = 1.25;
    halo.rotation.x = Math.PI / 2;
    group.add(halo);
  } else if (kind === "vector") {
    const data = new Float32Array(180 * 3);
    const colors = new Float32Array(180 * 3);
    const c = new THREE.Color(color);
    for (let i = 0; i < 180; i++) {
      const t = i * 2.39996;
      const y = 1 - i / 90;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      data.set(
        [Math.cos(t) * r * 1.35, y * 1.3 + 1.55, Math.sin(t) * r * 1.35],
        i * 3,
      );
      c.clone()
        .multiplyScalar(i % 7 === 0 ? 1.2 : 0.45)
        .toArray(colors, i * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(data, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const cloud = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size: 0.055,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
      }),
    );
    group.add(cloud);
    movers.push(cloud);
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.4 - i * 0.26, 0.012, 5, 64),
        accent,
      );
      ring.rotation.x = Math.PI / 2 + i * 0.2;
      ring.position.y = 0.6 + i * 0.7;
      group.add(ring);
    }
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(0.65, 2.5, 24, 1, true),
      glass,
    );
    beam.rotation.z = -0.7;
    beam.position.set(0.6, 1.8, 0.3);
    group.add(beam);
  } else if (kind === "log") {
    for (let lane = 0; lane < 3; lane++) {
      addBox(0, 0.48, (lane - 1) * 0.6, 2.6, 0.08, 0.43);
      for (let i = 0; i < 6; i++) {
        const m = addBox(
          (i - 2.5) * 0.38,
          0.68,
          (lane - 1) * 0.6,
          0.27,
          0.24,
          0.34,
          lane === 1 ? accent : pale,
        );
        m.userData.lane = lane;
        m.userData.offset = i;
        movers.push(m);
      }
    }
    addPanel(
      ["APPEND-ONLY LOG", "P0  41 42 43 →", "P1  18 19 20 →", "P2   7  8  9 →"],
      0,
      1.9,
      -0.6,
      2.4,
      1.2,
    );
  } else if (kind === "window") {
    const face = new THREE.Mesh(
      new THREE.CylinderGeometry(1.25, 1.25, 0.1, 48),
      shell,
    );
    face.position.y = 0.5;
    group.add(face);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.024, 6, 72),
      accent,
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.58;
    group.add(ring);
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const b = addBox(
        Math.cos(angle) * 0.85,
        0.9,
        Math.sin(angle) * 0.85,
        0.22,
        0.3 + (i % 3) * 0.26,
        0.22,
        i < 3 ? accent : shell,
      );
      movers.push(b);
    }
    const hand = new THREE.Group();
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.035, 1.1),
      accent,
    );
    arm.position.z = 0.5;
    hand.add(arm);
    hand.position.y = 1.8;
    group.add(hand);
    movers.push(hand);
    addPanel(
      ["EVENT TIME", "key × time bucket", "watermark →"],
      0,
      2.4,
      -0.4,
      2.1,
      0.8,
    );
  } else if (kind === "object") {
    for (let i = 0; i < 6; i++) {
      const m = addBox(
        ((i % 3) - 1) * 0.7,
        0.8 + Math.floor(i / 3) * 0.9,
        (i % 2) * 0.18,
        0.58,
        0.73,
        0.63,
        i === 1 || i === 5 ? accent : shell,
      );
      movers.push(m);
    }
    addPanel(
      ["BINARY / OBJECT", "key · version · bytes", "checksum ✓"],
      0,
      2.7,
      -0.3,
      2.25,
      0.85,
    );
  } else if (kind === "spatial") {
    for (let x = 0; x < 5; x++)
      for (let z = 0; z < 5; z++) {
        const height = 0.15 + Math.abs(Math.sin(x * 3 + z * 1.7)) * 0.65;
        const m = addBox(
          (x - 2) * 0.48,
          0.5 + height / 2,
          (z - 2) * 0.48,
          0.42,
          height,
          0.42,
          x === 2 || z === 2 ? accent : shell,
        );
        movers.push(m);
      }
    const viewport = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.4, 1.5, 1.4)),
      new THREE.LineBasicMaterial({ color: "#e4fff7" }),
    );
    viewport.position.y = 1.25;
    group.add(viewport);
    movers.push(viewport);
  } else if (kind === "catalog") {
    const disk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.85, 0.18, 36),
      accent,
    );
    disk.position.y = 2.1;
    group.add(disk);
    for (let i = 0; i < 3; i++) {
      const m = addBox((i - 1) * 0.85, 0.7, 0, 0.6, 0.55, 0.5);
      connect(
        new THREE.Vector3(0, 2, 0),
        new THREE.Vector3((i - 1) * 0.85, 0.97, 0),
      );
      movers.push(m);
    }
    addPanel(
      ["SNAPSHOT 12", "metadata → manifests", "atomic pointer"],
      0,
      1.5,
      0.5,
      2.1,
      1.0,
    );
  } else {
    for (let i = 0; i < 2; i++) {
      addBox((i - 0.5) * 1.05, 1.1, 0, 0.8, 1.65, 0.95);
      addBox((i - 0.5) * 1.05, 1.98, 0, 0.82, 0.08, 0.96, accent);
      for (let j = 0; j < 4; j++)
        addBox((i - 0.5) * 1.05, 0.55 + j * 0.32, 0.5, 0.6, 0.035, 0.035, pale);
    }
  }
  return {
    group,
    update(time, active, progress) {
      accent.emissiveIntensity = active
        ? 0.55 + Math.sin(time * 3) * 0.12
        : 0.16;
      if (kind === "client" || kind === "router")
        movers.forEach((m) => {
          m.rotation.z = active ? time * 0.2 : 0;
        });
      if (kind === "btree")
        movers.forEach((m, i) => {
          (m as THREE.Mesh).material =
            [0, 1, 3].slice(0, 1 + Math.floor(progress * 3)).includes(i) &&
            active
              ? accent
              : shell;
        });
      if (kind === "graph")
        movers.forEach((m, i) => {
          m.scale.setScalar(active && i <= Math.floor(progress * 10) ? 1.3 : 1);
        });
      if (kind === "vector") movers[0].rotation.y = active ? time * 0.13 : 0;
      if (kind === "log")
        movers.forEach((m) => {
          m.position.x = active
            ? ((m.userData.offset * 0.38 + time * 0.4) % 2.28) - 1.14
            : (m.userData.offset - 2.5) * 0.38;
        });
      if (kind === "window")
        movers[movers.length - 1].rotation.y = active ? -time * 0.7 : 0;
      if (kind === "spatial")
        movers[movers.length - 1].position.x = active
          ? Math.sin(time * 0.6) * 0.5
          : 0;
      if (kind === "lsm")
        movers.forEach((m, i) => {
          m.position.z = active ? Math.sin(time * 1.3 + i) * 0.12 : 0;
        });
      if (kind === "table" || kind === "column")
        movers.forEach((m, i) => {
          m.scale.y =
            active && i % 5 === Math.floor(progress * 5) % 5 ? 1.35 : 1;
        });
    },
  };
}

export default function ImmersiveScene(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const annotations = useRef<Record<string, HTMLButtonElement | null>>({});
  const flowLabels = useRef<Record<string, HTMLButtonElement | null>>({});
  const leaders = useRef<Record<string, SVGLineElement | null>>({});
  const live = useRef(props);
  live.current = props;
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const element = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      setFallback(true);
      return;
    }
    setFallback(false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    renderer.setClearColor("#0c171c", 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = "fusion-webgl";
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute("tabindex", "0");
    renderer.domElement.setAttribute(
      "aria-label",
      `${props.model.name}: animated architecture. Use the labeled component buttons to inspect the system.`,
    );
    element.prepend(renderer.domElement);
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2("#0c171c", 0.014);
    const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 130);
    const overview = new THREE.Vector3(10.5, 13, 19);
    camera.position.copy(overview);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.minDistance = 8;
    controls.maxDistance = 46;
    controls.minPolarAngle = 0.07;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.enablePan = false;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 0.75;
    controls.update();
    scene.add(new THREE.AmbientLight("#b9d6de", 1.3));
    const sun = new THREE.DirectionalLight("#e7f6ff", 3.5);
    sun.position.set(-5, 16, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, {
      left: -14,
      right: 14,
      top: 10,
      bottom: -10,
      near: 1,
      far: 45,
    });
    sun.shadow.bias = -0.0006;
    scene.add(sun);
    const rim = new THREE.PointLight(props.model.accent, 32, 28, 1.8);
    rim.position.set(4, 4, -7);
    scene.add(rim);
    const blue = new THREE.PointLight("#6e98ff", 25, 25, 1.8);
    blue.position.set(-7, 3, 4);
    scene.add(blue);
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(15.5, 80),
      new THREE.MeshStandardMaterial({
        color: "#0e2127",
        metalness: 0.45,
        roughness: 0.55,
        transparent: true,
        opacity: 0.9,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.17;
    floor.receiveShadow = true;
    scene.add(floor);
    const grid = new THREE.GridHelper(30, 30, "#31454a", "#23373d");
    grid.position.y = -0.12;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.5;
    scene.add(grid);
    [13.5, 15.5].forEach((radius) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.012, 5, 120),
        new THREE.MeshBasicMaterial({
          color: "#4d7779",
          transparent: true,
          opacity: 0.4,
        }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -0.1;
      scene.add(ring);
    });

    const nodes = props.model.nodes.map((def) => {
      const item = glyph(def.kind, props.model.accent);
      const root = new THREE.Group();
      root.position.set(...def.position);
      root.add(item.group);
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(1.65, 1.7, 0.13, 48),
        new THREE.MeshStandardMaterial({
          color: "#173038",
          metalness: 0.5,
          roughness: 0.5,
        }),
      );
      base.position.y = 0.05;
      base.receiveShadow = true;
      root.add(base);
      const edgeMat = new THREE.MeshBasicMaterial({
        color: props.model.accent,
        transparent: true,
        opacity: 0.2,
      });
      const edge = new THREE.Mesh(
        new THREE.TorusGeometry(1.66, 0.017, 5, 64),
        edgeMat,
      );
      edge.rotation.x = Math.PI / 2;
      edge.position.y = 0.13;
      root.add(edge);
      const halo = new THREE.Mesh(
        new THREE.CylinderGeometry(1.55, 1.55, 0.08, 48, 1, true),
        new THREE.MeshBasicMaterial({
          color: props.model.accent,
          transparent: true,
          opacity: 0.06,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      halo.position.y = 0.17;
      root.add(halo);
      root.traverse((obj) => {
        obj.userData.nodeId = def.id;
      });
      scene.add(root);
      return { def, root, item, edgeMat, halo, endpoint: new THREE.Vector3() };
    });
    const nodeMap = new Map(nodes.map((node) => [node.def.id, node]));
    const allRoutes = [
      ...new Map(
        props.model.phases
          .flatMap((phase) => phase.routes)
          .map((route) => [routeKey(route), route]),
      ).values(),
    ];
    const paths = allRoutes.map((def, index) => {
      const mat = new THREE.LineBasicMaterial({
        color: def.kind === "data" ? props.model.accent : routeColors[def.kind],
        transparent: true,
        opacity: 0.12,
      });
      const positions = new Float32Array(43 * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const line = new THREE.Line(geo, mat);
      line.frustumCulled = false;
      scene.add(line);
      line.userData.flowKey = routeKey(def);
      const curve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
      );
      const particleMat = new THREE.MeshBasicMaterial({
        color: def.kind === "data" ? props.model.accent : routeColors[def.kind],
      });
      const shape =
        props.model.glyph === "vector"
          ? new THREE.OctahedronGeometry(0.13)
          : props.model.glyph === "graph"
            ? new THREE.IcosahedronGeometry(0.13, 0)
            : new THREE.BoxGeometry(0.19, 0.16, 0.19);
      const particles = Array.from({ length: 4 }, () => {
        const mesh = new THREE.Mesh(shape, particleMat);
        mesh.userData.flowKey = routeKey(def);
        scene.add(mesh);
        return mesh;
      });
      return { def, index, mat, line, curve, particles, particleMat };
    });
    let width = 0,
      height = 0,
      inView = true,
      dirty = true;
    const labelSizes = new Map<string, { width: number; height: number }>();
    document.fonts.ready.then(() => {
      labelSizes.clear();
      dirty = true;
    });
    const resize = () => {
      width = element.clientWidth;
      height = element.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.zoom = Math.min(
        1,
        Math.max(width < 480 ? 0.76 : 0.46, camera.aspect / 1.34),
      );
      camera.updateProjectionMatrix();
      labelSizes.clear();
      dirty = true;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    const visible = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      dirty = true;
    });
    visible.observe(element);
    let lastInteraction = -10000,
      previousCameraMode = props.cameraMode,
      previousSelection = props.selected;
    controls.addEventListener("start", () => {
      lastInteraction = performance.now();
    });
    controls.addEventListener("change", () => {
      dirty = true;
    });
    const pointer = new THREE.Vector2();
    const ray = new THREE.Raycaster();
    ray.params.Line.threshold = 0.16;
    let down = { x: 0, y: 0 };
    let hovered: string | null = null;
    const pick = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      ray.setFromCamera(pointer, camera);
      const activeKeys = new Set(
        live.current.model.phases[live.current.phase].routes.map(routeKey),
      );
      const objects = [
        ...nodes.map((n) => n.root),
        ...paths
          .filter((p) => activeKeys.has(routeKey(p.def)))
          .flatMap((p) => [
            p.line,
            ...p.particles.filter((particle) => particle.visible),
          ]),
      ];
      const hit = ray
        .intersectObjects(objects, true)
        .find(
          (hit) => hit.object.userData.nodeId || hit.object.userData.flowKey,
        );
      return hit?.object.userData as
        | { nodeId?: string; flowKey?: string }
        | undefined;
    };
    const pointerDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY };
    };
    const pointerMove = (e: PointerEvent) => {
      const hit = pick(e);
      const next = hit?.nodeId || hit?.flowKey || null;
      if (next !== hovered) {
        hovered = next;
        dirty = true;
      }
      renderer.domElement.style.cursor = hovered ? "pointer" : "grab";
    };
    const pointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6) {
        const hit = pick(e);
        if (hit?.nodeId) live.current.onSelect(hit.nodeId);
        else if (hit?.flowKey) {
          const route = allRoutes.find((r) => routeKey(r) === hit.flowKey);
          if (route) live.current.onFlowSelect(route);
        }
      }
    };
    const lost = (e: Event) => {
      e.preventDefault();
      setFallback(true);
    };
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointermove", pointerMove);
    renderer.domElement.addEventListener("pointerup", pointerUp);
    renderer.domElement.addEventListener("webglcontextlost", lost);
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let intro = reducedMotion || !props.playing ? 2 : 0;
    let frame = 0,
      previous = performance.now(),
      time = 0,
      exploded = 0,
      prevKey = "";
    const point = new THREE.Vector3(),
      projection = new THREE.Vector3(),
      center = new THREE.Vector3();
    const animate = (now: number) => {
      frame = requestAnimationFrame(animate);
      const dt = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      if (!inView || document.hidden) return;
      const state = live.current;
      const phase = state.model.phases[state.phase];
      if (
        state.cameraMode !== previousCameraMode ||
        (state.selected !== previousSelection && state.cameraMode === "follow")
      )
        lastInteraction = -10000;
      previousCameraMode = state.cameraMode;
      previousSelection = state.selected;
      const key = `${state.phase}:${state.selected}:${state.playing}:${state.exploded}:${state.annotations}:${state.traffic}:${state.fault}:${state.cameraMode}:${state.progress}`;
      if (key !== prevKey) {
        dirty = true;
        prevKey = key;
      }
      if (state.playing) {
        time += dt * state.speed;
        intro = Math.min(2, intro + dt);
      }
      const explosionTarget = state.exploded ? 1 : 0;
      const moving = Math.abs(exploded - explosionTarget) > 0.001;
      if (moving) {
        exploded = THREE.MathUtils.damp(exploded, explosionTarget, 5, dt);
        dirty = true;
      }
      nodes.forEach((node, nodeIndex) => {
        const enter = Math.max(
          0.001,
          Math.min(1, (intro - nodeIndex * 0.075) / 0.8),
        );
        const appear = 1 - Math.pow(1 - enter, 3);
        node.root.scale.setScalar(appear);
        const active = phase.active.includes(node.def.id),
          selected = state.selected === node.def.id,
          failed = state.fault && state.model.fault.node === node.def.id;
        node.root.position.set(
          node.def.position[0] * (1 + exploded * 0.17),
          node.def.position[1] - (1 - appear) * 1.2,
          node.def.position[2] * (1 + exploded * 0.3),
        );
        node.item.group.position.y =
          state.playing && active
            ? Math.sin(time * 1.2 + node.def.position[0]) * 0.06
            : 0;
        node.item.group.rotation.y =
          exploded * (node.def.position[0] > 0 ? -0.12 : 0.12);
        node.item.update(time, active && !failed, state.progress);
        node.edgeMat.color.set(failed ? "#ff926f" : state.model.accent);
        node.edgeMat.opacity =
          selected || hovered === node.def.id ? 1 : active ? 0.75 : 0.14;
        (node.halo.material as THREE.MeshBasicMaterial).color.set(
          failed ? "#ff926f" : state.model.accent,
        );
        (node.halo.material as THREE.MeshBasicMaterial).opacity = failed
          ? 0.2 + Math.sin(time * 4) * 0.08
          : active
            ? 0.12
            : 0.025;
        node.halo.scale.y = failed ? 9 : active ? 5 : 1;
        node.endpoint
          .copy(node.root.position)
          .add(new THREE.Vector3(0, 1.1, 0));
        const label = annotations.current[node.def.id];
        if (label) {
          label.style.opacity =
            state.annotations || selected || active ? String(appear) : "0";
          label.style.pointerEvents =
            state.annotations || selected || active ? "auto" : "none";
          label.dataset.active = String(active);
          label.dataset.failed = String(failed);
        }
      });
      const activeRoutes = new Set(phase.routes.map(routeKey));
      paths.forEach((path) => {
        const a = nodeMap.get(path.def.from)!.endpoint,
          b = nodeMap.get(path.def.to)!.endpoint;
        const self = path.def.from === path.def.to;
        const on = activeRoutes.has(routeKey(path.def));
        const blocked =
          state.fault &&
          (path.def.from === state.model.fault.node ||
            path.def.to === state.model.fault.node);
        path.curve.v0.copy(a);
        path.curve.v3.copy(b);
        if (self) {
          path.curve.v1.copy(a).add(new THREE.Vector3(-2.5, 3, 1));
          path.curve.v2.copy(b).add(new THREE.Vector3(2.5, 3, 1));
        } else {
          const arch = 1.3 + a.distanceTo(b) * 0.15;
          path.curve.v1
            .copy(a)
            .lerp(b, 0.3)
            .add(
              new THREE.Vector3(0, arch, path.def.kind === "ack" ? 1.2 : -0.3),
            );
          path.curve.v2
            .copy(a)
            .lerp(b, 0.7)
            .add(
              new THREE.Vector3(0, arch, path.def.kind === "ack" ? 1.2 : -0.3),
            );
        }
        const attribute = path.line.geometry.getAttribute(
          "position",
        ) as THREE.BufferAttribute;
        for (let i = 0; i < 43; i++) {
          path.curve.getPoint(i / 42, point);
          attribute.setXYZ(i, point.x, point.y, point.z);
        }
        attribute.needsUpdate = true;
        path.line.geometry.computeBoundingSphere();
        path.mat.opacity = on ? (blocked ? 0.75 : 0.82) : 0.045;
        path.mat.color.set(
          blocked
            ? "#ff926f"
            : path.def.kind === "data"
              ? state.model.accent
              : routeColors[path.def.kind],
        );
        path.particleMat.color.copy(path.mat.color);
        path.particles.forEach((particle, i) => {
          let progress =
            (time * (path.def.kind === "ack" ? 0.3 : 0.17) +
              i / 4 +
              path.index * 0.07) %
            1;
          if (blocked) progress = Math.min(progress, 0.64 + i * 0.045);
          particle.position.copy(path.curve.getPoint(progress));
          particle.rotation.set(time + i, time * 0.7, 0);
          particle.visible = on && state.traffic;
          particle.scale.setScalar(
            blocked ? 1.25 : path.def.kind === "ack" ? 0.65 : 1,
          );
        });
        const label = flowLabels.current[routeKey(path.def)];
        if (label) {
          label.dataset.blocked = String(blocked);
        }
      });
      if (now - lastInteraction > 5500 && state.cameraMode !== "orbit") {
        center.set(0, 1, 0);
        if (state.cameraMode === "follow") {
          center.set(0, 0, 0);
          if (state.selected)
            center.copy(nodeMap.get(state.selected)!.root.position);
          else {
            phase.active.forEach((id) =>
              center.add(nodeMap.get(id)!.root.position),
            );
            center.divideScalar(phase.active.length);
          }
          center.y = 1;
        }
        const desired =
          state.cameraMode === "top"
            ? new THREE.Vector3(0, 26, 0.01)
            : center
                .clone()
                .add(
                  state.selected
                    ? new THREE.Vector3(5, 7, 9)
                    : new THREE.Vector3(8, 11, 16),
                );
        if (
          camera.position.distanceTo(desired) > 0.015 ||
          controls.target.distanceTo(center) > 0.015
        ) {
          camera.position.lerp(desired, 1 - Math.exp(-dt * 1.3));
          controls.target.lerp(center, 1 - Math.exp(-dt * 1.5));
          dirty = true;
        }
      }
      const targetZoom =
        state.selected && state.cameraMode === "follow"
          ? 1
          : Math.min(
              1,
              Math.max(width < 480 ? 0.76 : 0.46, camera.aspect / 1.34),
            );
      if (Math.abs(camera.zoom - targetZoom) > 0.001) {
        camera.zoom = THREE.MathUtils.damp(camera.zoom, targetZoom, 5, dt);
        camera.updateProjectionMatrix();
        dirty = true;
      }
      const changed = controls.update();
      const shouldRender = dirty || state.playing || changed;
      if (shouldRender) {
        const anchors: LabelAnchor[] = [];
        const labelElements = new Map<
          string,
          { element: HTMLButtonElement; anchorX: number; anchorY: number }
        >();
        const collectLabel = (
          id: string,
          label: HTMLButtonElement | null,
          position: THREE.Vector3,
          priority: number,
          enabled: boolean,
        ) => {
          if (!label) return;
          projection.copy(position).project(camera);
          const visible =
            enabled &&
            projection.z < 1 &&
            Math.abs(projection.x) < 1.12 &&
            projection.y < 1.2 &&
            projection.y > -1.3;
          label.style.visibility = visible ? "visible" : "hidden";
          const leader = leaders.current[id];
          if (leader) leader.style.visibility = visible ? "visible" : "hidden";
          if (!visible) return;
          let size = labelSizes.get(id);
          if (!size) {
            size = { width: label.offsetWidth, height: label.offsetHeight };
            labelSizes.set(id, size);
          }
          const x = (projection.x * 0.5 + 0.5) * width,
            y = (-projection.y * 0.5 + 0.5) * height;
          anchors.push({ id, x, y, ...size, priority });
          labelElements.set(id, {
            element: label,
            anchorX: x,
            anchorY: y + 18,
          });
        };
        nodes.forEach((node) => {
          point.copy(node.root.position).add(new THREE.Vector3(0, 3.2, 0));
          const selected = state.selected === node.def.id,
            active = phase.active.includes(node.def.id);
          collectLabel(
            `node-${node.def.id}`,
            annotations.current[node.def.id],
            point,
            selected ? 0 : active ? 1 : 3,
            state.annotations || selected || active,
          );
        });
        paths.forEach((path) => {
          path.curve.getPoint(0.5, point);
          point.y += 0.35;
          collectLabel(
            `flow-${routeKey(path.def)}`,
            flowLabels.current[routeKey(path.def)],
            point,
            2,
            activeRoutes.has(routeKey(path.def)),
          );
        });
        for (const placed of placeLabels(anchors, {
          width,
          height,
          top: 64,
          bottom: 126,
          margin: 10,
        })) {
          const item = labelElements.get(placed.id)!;
          item.element.style.transform = `translate3d(${placed.x}px,${placed.y}px,0)`;
          const leader = leaders.current[placed.id];
          if (leader) {
            leader.setAttribute("x1", String(item.anchorX));
            leader.setAttribute("y1", String(item.anchorY));
            leader.setAttribute(
              "x2",
              String(
                Math.max(
                  placed.x + 7,
                  Math.min(placed.x + placed.width - 7, item.anchorX),
                ),
              ),
            );
            leader.setAttribute(
              "y2",
              String(
                item.anchorY >= placed.y + placed.height / 2
                  ? placed.y + placed.height
                  : placed.y,
              ),
            );
          }
        }
      }
      if (
        shouldRender &&
        width &&
        height &&
        !renderer.getContext().isContextLost()
      ) {
        renderer.render(scene, camera);
        dirty = false;
      }
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      visible.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("pointermove", pointerMove);
      renderer.domElement.removeEventListener("pointerup", pointerUp);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>(),
        textures = new Set<THREE.Texture>();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) geometries.add(mesh.geometry);
        if (mesh.material)
          (Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material]
          ).forEach((mat) => {
            materials.add(mat);
            const map = (mat as THREE.MeshBasicMaterial).map;
            if (map) textures.add(map);
          });
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [props.model.id, props.resetKey]);

  return (
    <div
      ref={host}
      className={`fusion-world ${fallback ? "fusion-fallback" : ""}`}
      data-system={props.model.id}
      data-phase={props.phase}
      data-exploded={props.exploded}
    >
      {!fallback && (
        <svg className="fusion-leaders" aria-hidden="true">
          {props.model.nodes.map((node) => (
            <line
              key={node.id}
              ref={(el) => {
                leaders.current[`node-${node.id}`] = el;
              }}
              data-active={props.model.phases[props.phase].active.includes(
                node.id,
              )}
            />
          ))}
          {props.model.phases[props.phase].routes.map((route) => (
            <line
              key={routeKey(route)}
              ref={(el) => {
                leaders.current[`flow-${routeKey(route)}`] = el;
              }}
              className="flow-leader"
            />
          ))}
        </svg>
      )}
      <div
        className={fallback ? "fusion-fallback-nodes" : "fusion-label-layer"}
        aria-label="Architecture components"
      >
        {props.model.nodes.map((node, i) => (
          <button
            key={`${props.model.id}-${node.id}`}
            ref={(el) => {
              annotations.current[node.id] = el;
            }}
            className={`fusion-node-label ${props.selected === node.id ? "is-selected" : ""}`}
            data-active={props.model.phases[props.phase].active.includes(
              node.id,
            )}
            data-failed={props.fault && props.model.fault.node === node.id}
            onClick={() => props.onSelect(node.id)}
            aria-label={`Inspect ${node.label}`}
            aria-pressed={props.selected === node.id}
          >
            <span className="fusion-node-index">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>
              <strong>{node.label}</strong>
              <small>{node.role}</small>
            </span>
            <i />
          </button>
        ))}
      </div>
      {!fallback && (
        <div className="fusion-flow-layer" aria-label="Active data exchanges">
          {props.model.phases[props.phase].routes.map((route) => (
            <button
              key={routeKey(route)}
              ref={(el) => {
                flowLabels.current[routeKey(route)] = el;
              }}
              className={`fusion-flow-label flow-${route.kind}`}
              aria-label={`Inspect exchange: ${route.label}`}
              onClick={() => props.onFlowSelect(route)}
            >
              <span>
                {route.kind === "ack"
                  ? "ACK"
                  : route.kind === "replica"
                    ? "REPLICA"
                    : route.kind === "metadata"
                      ? "META"
                      : "DATA"}
              </span>
              {route.label}
              <span aria-hidden="true">→</span>
            </button>
          ))}
        </div>
      )}
      {fallback && (
        <p className="fusion-fallback-message">
          3D is unavailable in this browser. The labeled architecture and
          complete stage walkthrough remain interactive.
        </p>
      )}
    </div>
  );
}
