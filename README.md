# DATA / SCALE

One immersive 3D workspace and playable systems-engineering game, from CPU and memory to multi-cloud deployments, up to 100 billion records and 10 PB. It is a static React/TypeScript/Three.js website with no backend or required credentials.

Choose one of 12 system families and follow its operation through five stages. The component inspector, scale, data-path, capacity, project, challenge, recovery and source tools all operate beside the same scene. Opening a tool preserves the camera, current operation and workload. There are no separate application pages or additional 3D viewers.

## Play Packet Runner

Launch a contract from **Mission control** or **Play missions**. Pilot a 3D field engineer through the existing architecture, carry a record between stations, and solve engineering decisions. Twelve contracts include 62 objectives covering all twelve data-system families. The 10 PB contract requires tuning the actual capacity model to satisfy storage, durability, worker and I/O bounds.

- **WASD / arrows:** move relative to the camera; **Shift:** boost; **E:** interact near a station; **Space / Escape:** pause or resume.
- Click the floor or a component to walk there. **Walk to beacon** finds a collision-aware route to the current objective. The golden ring and sector map show your destination.
- Avoid moving red rogue packets; green repair chips restore training integrity and budget. Console reading and research tools pause the contract clock.
- Correct engineering actions progress the mission; mistakes cost resources and provide feedback. Failed runs can be retried. Completed contracts award stars and XP; each contract's best result is saved on the device without repeat XP farming.
- Mobile offers a direction pad, navigation assist and station buttons. Without WebGL, the sector map runs the same movement, collision and mission rules.

Budgets, hazards, integrity, stars and contract seconds are fictional game mechanics. They do not represent measured production reliability or performance. See [game design](docs/game-design.md) for the campaign and interaction rules.

## Explore the workspace

- **Inspector:** select a 3D component or labeled exchange to see its role, sample data and correctness boundary.
- **Scale:** surround the logical operation with CPU, host, cluster or regional context. The envelope does not claim a specific physical placement of every logical component.
- **Data paths:** trace transactional writes, distributed analytical queries or stateful event streams using the same operation timeline.
- **Capacity:** model records, record size, compression, replicas, workers, network and skew. Workload markers and storage volume respond in the world; assumptions remain explicit.
- **Projects:** search 16 profiles, inspect deployment/algorithm/process/tradeoffs, and bring the project's system family into the scene.
- **Challenges:** activate ten researched engineering mechanisms as scene overlays. These are editorial selections, not a measured popularity ranking.
- **Recovery:** run any of five failure/restore playbooks. The operation stays blocked until the required runbook steps are confirmed or the drill is explicitly reset.
- **Sources:** inspect the primary references in context.

The 12 families are relational, document, key-value, wide-column/LSM, graph, vector, streaming, time-series, lakehouse, full-text search, object storage and geospatial systems. A family story is an architectural example, not a claim that all projects in that family have an identical topology.

Drag to orbit, scroll/pinch to zoom, or choose camera tracking and close-ups. Layer separation, labels, packets and fullscreen are available without leaving the workspace. On mobile the tools open as sheets over the same scene. Reduced-motion preferences start playback paused; a selectable component fallback works without WebGL.

## Run and validate

Use Node.js 22.12+ and npm:

```sh
npm ci
npm run dev -- --host 0.0.0.0
npm run typecheck
npm run test:unit
npm run build
```

Browser tests use real WebGL, verify that contextual tools preserve the canvas/camera, and exercise all 60 stages, scale lenses, capacity inputs, project search, challenges, recovery gating, fallback, fullscreen and mobile tools. Game checks cover physical movement, a completed transaction mission, saved progress, failure/retry, the 10 PB contract, mobile controls and sector-map navigation:

```sh
npx playwright install chromium
npm run test:e2e
```

Production files are generated in `dist/`. Use `npm run preview -- --host 0.0.0.0` to inspect a local build.

## Implementation and evidence

- `src/App.tsx`: compact workspace shell; no page router.
- `src/ImmersiveLab.tsx`: shared operation, selection, scale, workload, project, challenge and recovery state.
- `src/ImmersiveScene.tsx`: the single WebGL renderer and architecture-specific geometry.
- `src/worldContext.ts`: deployment envelopes, capacity markers and challenge/recovery effects in that same scene.
- `src/game.ts`: twelve contracts, objective decisions, deterministic game rules and campaign records.
- `src/GameWorld.ts`, `src/navigation.ts`: the 3D engineer, collision-aware A\* navigation, hazards, pickups and mission telemetry.
- `src/GameHUD.tsx`, `src/GamePanel.tsx`: in-world controls, sector map, mission consoles and campaign progress.
- `src/WorkspacePanel.tsx`: contextual tools sharing the lab's state.
- `src/systemModels.ts`: twelve component graphs and sixty operation stages.
- `src/content.ts`: scale lessons, data representations, project profiles, challenges, recovery runbooks and references.
- `src/model.ts`, `src/playback.ts`, `src/labelLayout.ts`: capacity math, dependency-aware progression and projected label placement.
- `docs/design.md`, `docs/immersive-lab.md`, `docs/research.md`: interaction contracts, architecture and technical evidence.

Animation timing and capacity estimates are educational models, not measured benchmarks or production sizing guarantees. The capacity model assumes a scan-and-transfer path with explicit storage, bandwidth and skew limits; local pushdown can avoid much of that transfer. Physical placement, provider guarantees, durability policy and real workload measurements require separate verification.

## GitHub Pages

Set **Settings → Pages → GitHub Actions** as the deployment source. Push to `main` or run **Deploy systems atlas to GitHub Pages** manually. The workflow installs locked dependencies, checks types, runs unit tests, builds, uploads `dist/` and deploys the `github-pages` environment. Relative asset paths support a project subdirectory.

Website deployments are independent of cloud environment publication.
