# Data Systems Atlas: research and modeling notes

Research checked **2026-11-10**. This is a systems-design learning tool, not a
product benchmark, procurement guide, or report of a production deployment. The
ten pressure points are an editorial selection of important engineering issues;
they are not an externally measured popularity ranking. Source documentation can
change independently of this repository. Version-specific features should be
checked against the exact release being deployed.

## Scope and units

The atlas follows the same workload from a CPU cache through a server, a cluster,
and multiple regions/clouds. These are different optimization boundaries, not a
mandatory migration sequence. A well-tuned single server can be preferable to a
distributed system when it meets capacity, latency, durability, and availability
requirements.

The demonstration reaches **100 billion records** and **10 PB**. These are
independent dimensions: count is not capacity. Decimal units are used for storage
and networking unless explicitly marked otherwise.

- 100 billion × 1,000 bytes = 100 TB of logical record payload.
- 100 billion × 100,000 bytes = 10 PB of logical record payload.
- Three full replicas of 10 PB = 30 PB before indexes, logs, headroom, or
  compression. Erasure coding has a different storage and repair cost; do not
  interpret the replica model as an implementation claim about an object service.
- 100 billion × 768 float32 dimensions × 4 bytes = **307.2 TB** of raw vectors.
  IDs, metadata, graph edges/centroids, allocator overhead, and replicas are extra.
- Capacity depends on the distribution of record sizes, not only an average;
  large individual objects/partitions also affect limits and latency.

## Requirements at each boundary

| Boundary | Important questions | Useful observations | Common interventions |
| --- | --- | --- | --- |
| CPU/process | Is the work compute-bound or memory-bound? Can it run in batches? | cycles, cache misses, branch misses, memory bandwidth, contention | columnar layout, SIMD, fewer allocations, partitioned ownership |
| Server | Does the working set fit? Where does durability wait? | buffer hit rate, fsync latency, IOPS, queue depth, spill bytes, lock waits | indexes, query plans, WAL/group commit, NVMe, memory budget, pooling |
| Cluster | Is ownership balanced? Which operations cross shards? | per-shard QPS/bytes/CPU, p99, shuffle bytes, lag, recovery bandwidth | sharding, colocated joins, partial aggregation, replicas, admission control |
| Region/cloud | What can fail together? What must remain local? | WAN RTT, useful throughput, egress, durable/replay lag, achieved RPO/RTO | regional ownership, explicit consistency, independent recovery, immutable backups |

Requirements must be explicit: availability objective, p95/p99 latency, useful
throughput, read/write mix, transaction scope, freshness, ordering, retention,
residency, security, cost, RPO, and RTO. A system cannot be compared meaningfully
using QPS alone when another candidate guarantees a different durability or
consistency boundary.

## An end-to-end data transformation

A representative architecture uses an operational database, a replayable log,
stream transformations, lake tables, and serving indexes. These are separable
choices rather than a recommendation to deploy every named component.

1. **Capture.** An order is validated and written transactionally to PostgreSQL.
   WAL supports recovery and can feed change-data capture. A robust CDC contract
   specifies transaction ordering, schema version, deletes, replay position, and
   how a bootstrap snapshot meets the change stream.
2. **Exchange.** A producer serializes an event with a schema and stable key and
   writes to a Kafka partition. Batches reduce per-request overhead; compression
   reduces bytes if its CPU cost is acceptable. Partition order is not global
   order. Broker durability depends on acks, in-sync replicas, and minimum ISR.
3. **Transform.** Flink keys events by order/customer, maintains state, and applies
   windows using an explicit event-time/watermark policy. Late events, correction
   records, and replay are normal design concerns. A checkpoint captures state
   plus source positions; end-to-end effects also need compatible sink semantics.
4. **Persist.** An Iceberg writer creates immutable columnar files and manifests,
   validates concurrent changes, then commits new table metadata through a
   suitable catalog. Writing a Parquet file alone is not a table transaction.
5. **Analyze.** Spark or Trino plans scans, prunes files and columns, and distributes
   work. A hash exchange repartitions by key; a broadcast duplicates a small
   relation. A partial aggregate can shrink intermediate data before a shuffle.
6. **Serve.** ClickHouse serves analytical aggregates; OpenSearch serves text
   queries; Milvus serves vector candidates. PostgreSQL remains an appropriate
   operational source when transactional constraints matter. Derived indexes
   need explicit freshness, rebuild, and deletion contracts.
7. **Recover.** Source data, log positions, table metadata, serving indexes,
   encryption access, and identities are restored in dependency order. A serving
   index may be rebuildable, but its rebuild time still belongs in the RTO.

Every boundary should name a versioned data contract and an owner. Avoid relying
on a vague claim of “exactly once” across a source, network, state store, and an
external side effect that cannot participate in the protocol.

## What happens to network traffic

Application bytes pass through several layers: serialization, optional
compression, authenticated connection reuse, TLS encryption, TCP segmentation,
NIC queues, switches, remote TCP reassembly, TLS decryption, and application
decoding. TLS handshakes and authentication are not repeated per row when
connections are pooled. TCP acknowledgment confirms transport receipt, not
database commit, durable replication, or business-level processing.

Loss, congestion, receiver pressure, and application queues affect useful
throughput. TCP flow control protects a receiver; congestion control reacts to
network conditions; application backpressure prevents an upstream producer from
overrunning downstream processing. These mechanisms operate at different layers.

A cluster generates more than client traffic:

- **Replication:** a logical write is copied to followers, possibly compressed or
  transformed into log/segment records. Three full copies imply roughly two
  additional payload copies, before protocol/index/maintenance costs.
- **Shuffle:** many workers send partitioned intermediate data to many other
  workers. Rack uplink capacity and bisection bandwidth may be the bottleneck
  even when each machine has a fast NIC.
- **Broadcast:** a relation of size B sent to N workers moves about B × (N − 1)
  inter-worker bytes in a simple model; actual topology and placement vary.
- **Repair/rebalance:** failed or moved ownership requires snapshots, logs,
  catch-up, and checks. These transfers compete with user traffic.
- **Control plane:** metadata, health, election, and catalog messages are smaller
  but may sit on the critical path. Saturating data-plane links can harm them.

Useful techniques include projection/filter pushdown, partial aggregation,
partition-local joins, batching, compression, caching with a freshness policy,
and bounded concurrency. Every technique has conditions: broadcasting a relation
that outgrows memory or applying an invalid partial aggregation can make a system
slower or incorrect.

## Performance model: bounds rather than invented benchmarks

The website uses illustrative calculations so that assumptions are inspectable.
They cannot predict measured product performance, tail latency, scaling
efficiency, or dollar cost in an actual deployment.

For payload D bytes and link rate R bits/second, ideal transfer time is:

```
T_line_rate = (8 × D) / R
T_useful = (8 × D) / (R × utilization)
```

For 10 PB over 100 Gb/s, this is 800,000 seconds, or **9.26 days**, at 100%
line-rate use. The time grows with protocol overhead, shared links, retries,
storage I/O, encryption, and service quotas. Multiple independent paths can
change the bound; one nominal NIC does not establish end-to-end throughput.

For an approximately decomposable workload with serial fraction s and N workers:

```
S_Amdahl = 1 / (s + (1 − s) / N)
```

This ideal bound excludes coordination, shuffle, skew, saturation, and recovery.
With a 5% serial fraction, even unlimited workers cannot exceed 20× speedup for
that fixed workload. Weak scaling (growing the dataset with the fleet) answers a
different question from strong scaling (holding the workload fixed).

Little’s law relates stable long-run averages:

```
average in-flight work = arrival rate × average response time
```

It is not a p99 predictor and does not justify running an overloaded queue. Near
saturation, queues grow and tail latency can deteriorate before average
throughput stops rising.

For every real comparison, hold constant dataset distribution, query semantics,
hardware, indexes, compression, cache temperature, concurrency, consistency,
durability, and failure conditions. Report latency percentiles and errors as well
as throughput. A cold-cache range scan and a warm-cache point lookup are not a
fair race. Re-run under a node failure and background repair to measure resilience.

The numerical lab uses deliberately inspectable demonstration constants:
2 GB/s sequential storage per scale-out worker, a 16 GB/s larger-server ceiling,
a 40 GB/s local path for that server, and 65% of selected NIC line rate for the
distributed fabric. Its user-controlled skew penalty simply multiplies modeled
throughput by (1 − penalty); it is not a measured skew distribution. An optional
exchange example moves 40% of the compressed logical bytes. The scan/transfer
path is the minimum of storage and path capacity, so that calculation assumes
every scanned byte traverses the modeled path. A shard-local filtered aggregate
can send far fewer bytes and needs a different network model. Replica count
affects storage footprint; it does not automatically multiply scan throughput or
model a write-commit critical path. No dollar prices or product QPS are invented.

## Ten current engineering pressure points

These topics were selected because they connect correctness, cost, scale, and
recovery. Each has an interactive animation and source link in the site.

1. **Hot partitions:** key-space balance does not guarantee work balance.
   Adaptive ranges, salting, caching, and tenant isolation each alter routing or
   read complexity. Measure the worst owner, not just fleet averages.
2. **Shuffle amplification:** filtered/pruned input is often more valuable than
   more executors. Use a bounded small-side broadcast, not an unexamined hint.
   Adaptive plans can help supported skew patterns, not every application.
3. **The vector memory wall:** ANN quality and cost depend on the query/data
   distribution. Compare recall@k to exact ground truth; report filtered recall,
   build/rebuild cost, ingestion freshness, and memory beyond the vector payload.
4. **Compaction debt and small files:** background maintenance is not free.
   Buffering and sorted immutable files shift work in time; insufficient
   maintenance capacity creates stalls and read amplification later.
5. **Exactly-once boundaries:** replayable inputs and durable operator snapshots
   do not deduplicate an arbitrary external API call. Use transactional or
   idempotent effects and deliberately fail the pipeline to test the promise.
6. **Lakehouse governance:** open storage formats still need an authoritative
   catalog, atomic commits, compatible engines, access policy, schema contracts,
   and coordinated retention. Time travel and erasure requirements can conflict.
7. **Petabyte gravity and egress:** compute placement is a query-planning and
   economics choice. Moving incremental changes or reduced aggregates can avoid
   a repeated full cross-cloud scan, subject to policy and semantics.
8. **WAN consistency:** synchronous remote acknowledgment consumes WAN time;
   asynchronous replication accepts lag. Define reads, writes, partitions,
   ownership, and failover independently rather than selecting one slogan.
9. **Recovery debt:** green backup jobs and healthy replicas can coexist with an
   unrecoverable application. Test catalog/identity/key/dependency recovery and
   data integrity in an isolated restore.
10. **Replication lag under failure:** distinguish received, persisted, and
    replayed positions. A replica that can be promoted is not necessarily one
    that satisfies the business’s accepted data-loss objective.

## Disaster recovery: operational sequence

**RPO** is the maximum acceptable data-loss window. **RTO** is the maximum
acceptable time to restore the required service. They are objectives validated by
rehearsal; neither is supplied automatically by a replica count. Zero RPO must
name the failures covered and the acknowledgment/durability guarantee.

| Strategy | Retained state | Recovery work | Main tradeoff |
| --- | --- | --- | --- |
| Backup and restore | isolated backup + retained replay logs | provision, restore, replay, validate, route | lowest idle compute; longest restore path |
| Pilot light | critical data/control components alive | scale app capacity, validate, route | lower standby cost; activation still necessary |
| Warm standby | smaller working deployment + data | scale out, replay to accepted point, route | faster activation; continuous standby cost |
| Active/active | multiple traffic-serving sites | isolate/fence, rebalance, reconcile | complex conflict/consistency and split-brain behavior |

Recommended exercise order:

1. Define the incident: node, zone, region, credentials/control plane, logical
   corruption, or malicious deletion. Avoid treating all failures as one case.
2. Identify the last verified durable and replayable point. An async lag metric
   is evidence about a potential loss window, not proof that all backups work.
3. Fence the previous writer before promotion; update ownership/routing safely.
4. Restore identities, encryption access, catalogs, schemas, and serving data in
   dependency order. Confirm DNS, logging, monitoring, and secret access.
5. Validate checksums plus application invariants. Row counts alone cannot prove
   correctness; test balances, referential/domain conditions, and critical reads.
6. Admit limited traffic and watch p99, error rate, lag, and queue depth. A
   surviving half-size fleet may need load shedding.
7. Rebuild redundancy with bounded transfer concurrency while users are active.
8. Rehearse failback. Reconcile post-incident changes and prevent two writers
   from accepting conflicting data.

For 10 PB, recovery prioritization is often essential: restore the catalog and
critical serving partitions first; hydrate colder partitions afterward if the
service contract permits. Cold archive retrieval tiers, rate limits, and key
access can dominate time even when raw link capacity looks sufficient.

## Primary sources and retrieval notes

These sources were read directly during implementation. Official source
repositories were used when documentation frontends denied automated access.
No TLS verification was disabled. Access failures were not interpreted as a
claim that the underlying project or documentation was unavailable to users.
The final link audit verified HTTP 200 for every source linked by the application;
Neo4j uses its official GitHub documentation source after a frontend HTTP 403,
and Milvus uses its official GitHub source after the documentation frontend
entered a redirect loop. The Milvus overview identifies itself as a legacy page;
its index families are used conceptually, not as a release-specific tuning guide.

| Project/topic | Source | Evidence used |
| --- | --- | --- |
| PostgreSQL replication | [Standby servers](https://www.postgresql.org/docs/current/warm-standby.html) | async loss windows, WAL streaming, synchronous replication, slots |
| PostgreSQL indexes | [Index types](https://www.postgresql.org/docs/current/indexes-types.html) | access methods and intended query shapes |
| Redis Cluster | [Docs](https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/) · [official source read](https://github.com/redis/docs/blob/main/content/operate/oss_and_stack/reference/cluster-spec.md) | 16,384 slots, redirects, async replication, acknowledged-write loss windows |
| Cassandra | [Dynamo architecture](https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html) | partitioning, quorum intersection, LWW, datacenter replication |
| MongoDB | [Sharding](https://www.mongodb.com/docs/manual/sharding/) | shard-key routing, ranges/chunks, balancer, architecture |
| Neo4j | [Clustering](https://neo4j.com/docs/operations-manual/current/clustering/introduction/) · [official source read](https://github.com/neo4j/docs-operations/blob/dev/modules/ROOT/pages/clustering/introduction.adoc) | primary/secondary database allocations and majority availability |
| Kafka | [Design](https://kafka.apache.org/44/design/design/) | batches, zero-copy/page cache, partition ordering, idempotent producers and transactions |
| Flink correctness | [Stateful stream processing](https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/stateful-stream-processing/) | consistent checkpoints, source replay, output boundary |
| Flink operations | [Checkpoints](https://nightlies.apache.org/flink/flink-docs-stable/docs/ops/state/checkpoints/) · [Savepoints](https://nightlies.apache.org/flink/flink-docs-stable/docs/ops/state/savepoints/) | operational state and rescaling distinctions |
| Spark SQL | [Performance tuning](https://spark.apache.org/docs/latest/sql-performance-tuning.html) | AQE, skew mitigation, broadcast, partitions, statistics |
| ClickHouse | [Architecture explanation](https://clickhouse.com/docs/concepts/why-clickhouse-is-so-fast) · [official source read](https://github.com/ClickHouse/clickhouse-docs/blob/main/docs/concepts/why-clickhouse-is-so-fast.mdx) | immutable parts, merges, pruning, compression, vectorization |
| Iceberg | [Reliability](https://iceberg.apache.org/docs/latest/reliability/) | optimistic concurrency and atomic metadata publication |
| OpenSearch | [Managing a cluster](https://docs.opensearch.org/latest/tuning-your-cluster/) | shard placement, recovery, resource limits, replication |
| Milvus | [Vector index overview](https://milvus.io/docs/index-vector-fields.md) · [official source read](https://github.com/milvus-io/milvus-docs/blob/v2.6.x/site/en/userGuide/manage-indexes/index-vector-fields.md) | index families and metrics; page is a legacy overview, use current linked index pages for deployment tuning |
| S3 consistency | [Data consistency model](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html#ConsistencyModel) | strong object read/write/list model and scope |
| S3 replication | [Replication](https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html) | async geographic copies, live versus existing-object replication |
| RocksDB | [Compaction](https://github.com/facebook/rocksdb/wiki/Compaction) | leveled/tiered tradeoffs and read/write/space amplification |
| Disaster recovery | [AWS strategy whitepaper](https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html) | backup/restore, pilot light, warm standby, active/active |
| CockroachDB | [Replication layer](https://www.cockroachlabs.com/docs/stable/architecture/replication-layer) | Raft per range, leases, voting/non-voting replicas, balancing |
| Trino | [Concepts](https://trino.io/docs/current/overview/concepts.html) · [official source read](https://github.com/trinodb/trino/blob/master/docs/src/main/sphinx/overview/concepts.md) | coordinator, workers, stages, tasks, splits, connectors |

One important documentation caveat: older Iceberg explanations compare against
historic eventually consistent S3 listing behavior. Current AWS S3 documentation
states strong consistency for the documented object operations. That does **not**
replace Iceberg’s need to atomically publish multi-file table metadata, nor does
it make cross-region replication synchronous. S3-compatible services can have
different guarantees and must be evaluated separately.
