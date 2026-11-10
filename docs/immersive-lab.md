# Immersive workspace interaction contract

The workbench combines one renderer, twelve logical architecture graphs and
contextual tools. A B-tree, table, log, metadata catalog or replica is a logical
role, not necessarily a separate host. Envelopes and spatial separation explain
responsibility and scale without asserting a provider's deployment topology.

The Mission tool turns these same components into playable stations. Twelve
contracts and 62 objectives combine movement, record delivery, engineering
decisions, collision, hazards and a constrained 10 PB capacity puzzle. Controls,
rules and accessibility behavior are documented in `game-design.md`. Missions
drive the existing operation phase and pause when research tools are opened.

## Operation stories

Each family defines five stages: highlighted components, directed exchanges,
input/output representations, a correctness boundary and a bottleneck.

| Family          | Operation                                                                 |
| --------------- | ------------------------------------------------------------------------- |
| Relational      | Index seek → row version → WAL → synchronous ACK → commit/checkpoint      |
| Document        | Describe → route → target shard → indexed update → acknowledgement        |
| Key-value       | Hash → memory probe → application-owned miss fetch → refill → async copy  |
| Wide-column/LSM | Partition → log → buffer/ACK → flush → background compaction              |
| Graph           | Anchor → expand → remote frontier → filter → bounded result               |
| Vector          | Encode → metadata filter → approximate navigation → rerank → top-k        |
| Streaming       | Append → consume → keyed window → checkpoint → compatible sink commit     |
| Time-series     | Collect → bucket → compress → mergeable rollup → range query              |
| Lakehouse       | Resolve snapshot → prune → scan/aggregate → shuffle → merge               |
| Search          | Analyze → postings → shard scoring → gather → response                    |
| Object          | Initiate multipart → transfer → checksum/complete → metadata → range read |
| Spatial         | Normalize → bounds pruning → candidate routing → exact test → return      |

The vector cloud is a projection, not a faithful map of high-dimensional
similarity. The spatial SQL example requires PostGIS. Object parts are logical
upload units, not undocumented physical stripes. The graph partition crossing
is a general pattern, not a claim that every graph product shards a traversal.

## Tool continuity

Opening a tool leaves the canvas, stage and camera intact. Scale, workload,
project selection, search and challenge state belong to the lab rather than to
independent tool pages. Component or exchange selection pauses playback and
opens the operation inspector. A standard component selector is also provided.

- **Scale** reveals CPU/cache, host, cluster and regional envelopes around the
  current operation. It also selects the matching capacity-model boundary.
- **Data paths** provides three journey presets and the current family's stage
  controls, plus transport, exchange and representation explanations.
- **Capacity** exposes record count/size, compression, replicas, workers, network
  and skew, with live results and a scale-up/out comparison. World markers and
  the storage stack reflect the same settings.
- **Projects** searches and filters sixteen profiles; a selection switches to
  the matching family in place. Search and selected references survive passive
  tool changes.
- **Challenges** adds one of ten mechanisms to this same scene. Selecting a
  challenge can choose a relevant family, scale and operation stage. Clearing
  it preserves those choices.
- **Recovery** runs five failure/restore playbooks over the same operation and
  dependency fault. Architecture/workload changes and replay are locked while
  a drill is active. Cancel/reset is explicit. Only confirmed completion restores
  the healthy dependency; downstream successes cannot be animated prematurely.
- **Sources** keeps evidence and assumptions in the inspector.

The camera can orbit freely, track the current stage or selected component,
or use a plan view. User camera interaction temporarily takes priority over
tracking. Layer separation changes spacing while retaining logical connections.
Native fullscreen includes the architecture picker and all contextual tools.

## Timing and failure semantics

At 1×, the teaching clock advances a healthy stage in 14 seconds. This has no
relationship to query latency, throughput or benchmark performance. Data paths,
replica streams, metadata and ACKs have distinct visual encodings. The active
stage drives the timeline, annotations, inspector and geometry together.

Faults hold at the required dependency and mark uncompleted output. A recovery
runbook step is a simulated verification milestone, not a physical restore
percentage. Degraded/partial-result alternatives are explained rather than
silently performed. Capacity estimates do not change the story's durability
policy or include actual failure-related capacity loss.

## Rendering, access and checks

The one renderer owns procedural geometry, textured data panels, paths,
deployment envelopes and challenge effects. Labels are projected into HTML and
separated in screen space, with SVG leaders. Small viewports can use shelves
rather than overlapping labels. DPR is capped, paused renders are skipped,
visibility/size are observed, and resources/context are disposed when replaced.

On mobile, tools open as closeable sheets over the world. Reduced-motion
preferences begin paused and skip entry motion. When WebGL is unavailable,
selectable component cards, capacity calculations, tool content and recovery
controls remain usable.

Tests cover canvas/camera continuity, all sixty stages, four scale lenses,
capacity invariants, sixteen project profiles, ten challenge bindings, all five
recovery playbooks, motion/pause, keyboard controls, fullscreen, fallback and
mobile sheet behavior.
