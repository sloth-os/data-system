# DATA / SCALE: interaction and visualization design

## A systems atlas, from local work to global coordination

The interface combines a persistent workspace sidebar, editorial introductions,
an orbitable 3D topology, and a contextual architecture inspector. The four scale
levels are always explicit: CPU, server, cluster, and multi-cloud. A visual level
is a representative teaching topology, not a dynamically provisioned system.

The graphite modules, lime activity surfaces, curved exchange paths, and grid
plane establish a consistent visual language. Amber indicates pressure or a
simulated failure, not a measured production alarm. Animation speed changes the
illustration; it does not change the quantitative capacity model.

## Six interconnected views

1. **Explore systems** introduces requirements, constraints, techniques and
   processing paths at each scale. Eight data models connect access patterns to
   suitable project profiles.
2. **Data in motion** traces five steps each for writes, analytical queries, and
   event streams. The inspector explains acknowledgement, durability, exchange,
   state and end-to-end delivery boundaries.
3. **Performance lab** separates record counts, record sizes, compression,
   replication, worker parallelism, bandwidth and skew. All results are derived
   from a visible model rather than invented project benchmarks.
4. **Project atlas** supports category filtering, full-text search and detailed
   project notes on deployment, algorithms, operation paths and tradeoffs.
5. **Hot issues** connects ten editorially selected engineering challenges to
   distinct topology animations and primary-source explanations.
6. **Resilience & recovery** provides five simulated fault and restore drills.
   Users advance explicit verification steps; no real infrastructure changes.

The guided tour changes the underlying view and scale while explaining what to
explore next. Source and detail dialogs use native modal behavior, including
Escape dismissal and focus management.

## Quantitative model contract

The maximum workload is 100 billion records at 100 kB each, or 10 PB raw in
decimal units. These are independent dimensions: 100 billion 1 kB records is
100 TB, not 10 PB. Compression precedes replication in the storage estimate.

The lab models a scan plus transfer over a disaggregated storage/compute path.
It assumes every compressed logical byte crosses that path, with useful
throughput limited by storage, network and a specified skew penalty. Shard-local
computation and aggregation can avoid much of that traffic. The model does not
estimate transaction latency, QPS, provider bills or real project rankings.

The Three.js scene and numeric model have separate responsibilities: the scene
explains relationships, while the lab exposes calculations. Twelve drawn
modules must never be interpreted as twelve measured workers. Replication does
not multiply scan bytes when reading one logical copy, and replica counts do
not imply equivalent write-throughput scaling.

## Accessibility, resilience and delivery

- The layout adapts to a mobile drawer, stacked inspector, single-column cards
  and touch-sized main controls.
- Animation begins paused for users who prefer reduced motion. Playback and
  camera controls remain available; keyboard node inspection accompanies the
  canvas.
- If WebGL cannot initialize, selectable CSS topology modules preserve access
  to the educational material.
- The application is static, with no backend, credentials or remote data
  services required at runtime. Fonts have local system fallbacks.
- Relative build assets support GitHub Pages project paths. The deployment
  workflow validates types, model/content tests and the production build before
  uploading an artifact and deploying it through GitHub Pages.

## Validation

Unit tests check physical and unit invariants rather than asserting arbitrary
UI snapshots. Browser tests exercise real WebGL, its fallback, data exploration,
the 10 PB capacity setting, project filtering, issue animation selection,
recovery progression, dialogs, and responsive navigation. See README.md for the
commands and research.md for technical sources and caveats.
