# The immersive systems lab

The lab makes the explanation part of the visualization. The components are
logical roles, not a fleet inventory: an index, a table, and a log may share one
process and one physical host. Space in the scene separates responsibilities;
it does not assert geographic placement, network distance or measured latency.

## Architecture coverage

| System | Visible structures | Worked operation |
| --- | --- | --- |
| Relational | B-tree levels, row versions, append log, standby, data pages | Index seek → new version → durable WAL → synchronous acknowledgement → commit/checkpoint |
| Document | Nested documents, routing metadata, selected and skipped shards, replica set | Document request → ownership lookup → targeted shard → indexed update → requested acknowledgement |
| Key-value | Hash-slot hub, memory cells, backing row store, asynchronous replica | Route → cache probe → application-owned miss fetch → refill with TTL → async propagation |
| Wide-column/LSM | Memtable rows, append log, SSTable run levels, replica owners | Partition → log → buffer and acknowledge → flush → background compaction |
| Graph | Start-node index, adjacency neighborhoods, cross-partition bridge, result paths | Anchor → expand → exchange frontier → filter → return |
| Vector | Query embedding, metadata predicate, projected point cloud/index layers, candidate merge | Encode → filter → approximate navigation → rerank → top-k |
| Event streaming | Ordered log lanes, keyed event-time buckets, checkpoint objects, sink rows | Append → consume → window → snapshot → compatible sink commit |
| Time-series | Ingest lanes, entity/time buckets, compressed columns, mergeable rollup state | Collect → bucket → encode → roll up → range query |
| Lakehouse | Snapshot metadata tree, columnar files, scan tasks, exchange hub, final rows | Resolve → prune → local aggregation → shuffle → merge |
| Full-text search | Query document, token/posting lists, shard-local candidates, merge table | Analyze → postings lookup → shard scoring → gather → response |
| Object storage | Logical upload parts, object/version metadata, binary blocks, range reader | Initiate → transfer → checksum/complete → catalog → range read |
| Geospatial | Bounding-index tree, spatial tiles, candidate geometry, exact-test viewport | Normalize → prune bounds → route → exact predicate → return |

The vector cloud is a teaching projection; a 3D distance is not the distance in
a real 768-dimensional embedding. The spatial SQL example requires PostGIS.
Object blocks are logical multipart-upload units, not a representation of
undocumented provider erasure coding or physical placement. The graph's remote
subgraph is a general distributed-graph example, not a claim that every named
graph project automatically shards a single traversal.

## Synchronization and motion

The selected system defines a graph of components and five operation stages.
Each stage specifies highlighted components, directed routes, the input/output
representation, a correctness boundary, and a bottleneck. The timeline,
inspector, projected labels and active 3D paths all read the same stage.

Playback advances an illustrative stage in 14 seconds at 1× speed. This timing
has no relationship to request latency, throughput or a product benchmark.
Particles encode direction and representation. Pale return pulses indicate
acknowledgements; blue marks replica streams; purple marks metadata/checkpoints.
The selected architecture's accent marks the data path.

Geometry reinforces the mechanism: B-tree levels highlight a seek path; graph
vertices reveal a frontier; log tiles move along ordered lanes; window clocks
advance; vector points rotate within an index projection; spatial bounds move
over candidate tiles. An entry sequence and layer separation use eased motion.

## Interaction contract

- Choosing a system resets its stage, selection and injected fault while
  preserving the user's playback, speed and view preferences.
- Selecting a stage or component pauses playback so the explanation stays
  stable while it is read. The inspector can also be reached through a standard
  component selector, which is useful on touch devices.
- Both component labels and active exchange labels are real keyboard-focusable
  buttons. Raycasting also supports the 3D geometry and active paths.
- The system picker supports arrow keys, Home and End with a roving tab stop.
- The camera can orbit freely, track the active operation or selected component,
  or move to a top-down plan view. A manual camera interaction temporarily takes
  priority over tracking.
- Layer separation changes spacing without changing logical connections.
- Fault injection moves to a relevant stage, marks the affected dependency,
  stalls its illustrative packets, and explains a system-specific recovery
  response. Automatic progress and downstream stage controls are held at the
  dependency until it is restored, so a required-but-unavailable replica cannot
  be followed by a successful commit. This is a conservative drill; degraded
  or partial-result policies are described, not silently performed. It never
  changes actual infrastructure.
- Replay clears the fault and restarts the operation. Restoring the healthy path
  removes the fault without changing the chosen data system.

## Rendering and accessibility

Three.js renders procedural geometry, canvas-textured data panels and curved
connections. HTML labels are projected from 3D coordinates to preserve readable
text and accessible controls. Collision-aware screen-space placement separates
labels, with SVG leader lines retaining their connection to the 3D component or
exchange. Small viewports can use a compact shelf layout rather than overlapping
annotations. The renderer caps device pixel ratio, observes
container size and visibility, skips unnecessary paused renders, and disposes
geometry, textures, materials, controls and its WebGL context on replacement.

Reduced-motion preferences start the lab paused and skip the entry sequence.
The native fullscreen view is optional. If WebGL cannot initialize, component
cards, the inspector, the operation timeline and fault explanations remain
available. On narrow screens the inspector stacks below the scene and exposes
full-sized component selection instead of relying on small spatial labels.

## Verification

Model tests check graph referential integrity, active route endpoints, fault
reachability, project links and substantive content. Browser tests exercise all
60 stages in real WebGL, inspect both components and exchanges, compare rendered
frames during playback, pause and advance the operation, inject faults for all
12 systems, use the fallback, and check keyboard/touch layouts.
