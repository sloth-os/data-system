# Packet Runner: systems engineer

The game lives in the atlas's existing scene. The architecture is the level:
the client, index, log, replica, operator and object store become stations in a
playable delivery and engineering puzzle. No second canvas or game page is
created. Free exploration remains available from the same tool rail.

## Campaign

| Contract                | System            | Core decision                                                               |
| ----------------------- | ----------------- | --------------------------------------------------------------------------- |
| The first commit        | Relational        | Selective index access, WAL ordering and configured durable acknowledgement |
| The right shard         | Document          | Metadata ownership, targeted routing and shard responsibility               |
| Cache avalanche         | Key-value         | Hot-key ownership and coalescing concurrent cache misses                    |
| The compaction shift    | Wide-column / LSM | Durable log, memory buffer, sorted files and compaction debt                |
| Follow the money        | Graph             | Indexed anchors, partition crossings and bounded expansion                  |
| Find the signal         | Vector            | Compatible filters, candidate recall and reranking limits                   |
| Hold the barrier        | Streaming         | State/source checkpoints and compatible sink effects                        |
| A matter of time        | Time-series       | Bounded entity/time partitions and mergeable sum/count state                |
| The 10 PB contract      | Lakehouse         | Snapshot/pruning, real capacity constraints and partial aggregation         |
| Every shard counts      | Full-text search  | Inverted index and honest partial-result policy                             |
| The archive rescue      | Object storage    | Documented checksums, versions and isolated recoverable backup              |
| Beyond the bounding box | Spatial           | Coordinate semantics, bounds pruning and exact predicates                   |

All twelve contracts are available immediately. They contain 62 station
objectives, so players can choose a relevant system without grinding unrelated
levels. Architecture sources remain available through the Sources and Projects
tools. These are architectural examples, not replicas of a product deployment.

## Play loop

1. Launch a contract. The existing world adopts its architecture, scale and
   relevant challenge overlay. The field engineer begins at the spawn point.
2. Move using camera-relative keys, a touch pad, a floor click or navigation
   assist. Component footprints block movement. A golden ring, overhead beacon,
   task list and sector map identify the objective.
3. Approach within 2.85 world units and interact. The station console pauses
   movement, hazards and contract time while the player reads and decides.
4. A successful action costs eight training credits and earns 100 base XP.
   Incorrect decisions cost 22 credits and 15 integrity, keep the same objective
   open and explain the error. Capacity validation costs eight credits when
   invalid and does not damage integrity.
5. Carry the record through the remaining stations. Native operation phases,
   components, data representations and directed exchanges follow the objective.
6. Complete the final contract to earn one to three stars and a score including
   remaining integrity, budget, active time and a no-mistake bonus. Retry, start
   another contract or return to free exploration in place.

There is a limited active-time window and a starting budget of 120. Exhausting
time, integrity or budget ends the run with a retry. Rogue packet contacts cost
12 integrity and five credits, with a 1.5-second hit cooldown. Each of three
repair chips can restore 12 integrity and four credits once per run. The first
contract has no moving hazards; later contracts add two to four. Boosting spends
recoverable stamina. These are fictional training mechanics, not a reliability
or latency model.

Best score, stars and active time per contract are saved in local storage under
`data-scale.campaign.v1`. XP is the sum of the best contract scores; repeating a
win does not accumulate duplicate XP. Malformed records are ignored. Unavailable
storage leaves session progress usable. There are no accounts or leaderboard
services.

## The 10 PB engineering puzzle

The objective uses `capacityModel`, also used by the atlas's Capacity tool. A
successful plan must retain 100 billion 100 kB records, scale out with at least
three copies, use no more than 96 workers, store at most 150 TB physical per
worker and achieve a modeled scan/transfer floor of at most eight hours.

One feasible plan uses 4:1 compression, 64 workers, three replicas, 25 Gbit/s per
worker and 10% skew. Changing record count, removing replication, exceeding the
worker budget or leaving insufficient storage/bandwidth fails validation. The
player can explore alternative valid plans. This optimistic disaggregated I/O
floor excludes CPU, indexes, decompression, scheduling and queueing; it is not a
claim that a real query will finish within eight hours.

## One world and accessible controls

`game.ts` holds the pure rules. `GameWorld` adds the procedural engineer, cargo,
beacon, path, hazards and pickups to `ImmersiveScene`'s existing `THREE.Scene`.
Grid A\* avoids component footprints; physical sliding collision checks still
apply while following the route. Walking assistance follows the world over
time and remains subject to hazards and the contract clock.

Opening a research tool pauses a moving mission. Architecture changes and
separate recovery drills remain locked until the run ends or is explicitly
quit; capacity inputs unlock during the capacity objective. Research remains
readable. The game phase controls replace automatic stage playback, and the
existing camera can follow the engineer or orbit freely. Camera reset retains
the same renderer, player position and mission progress.

Mobile has a direction pad and one-tap objective routing; consoles open in the
existing inspector sheet. Keyboard input ignores form fields. Optional audio
uses synthesized tones and begins disabled. Reduced-motion preferences skip
entry effects and victory particles; explicit launch starts gameplay. Without
WebGL the same controller drives the sector map and accessible station cards,
including physical movement, collision, hazards and scoring.

Unit checks cover every mission's references and completion, proximity/order,
pause, resource failures, repair idempotency, capacity invariants, saved records
and routes through every campaign station. Browser checks exercise real input,
navigation, consoles, victory/save, failure/retry, the modeled capacity puzzle,
mobile and fallback.
