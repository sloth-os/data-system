/** Primary-source research checked 2026-11-10. Numbers are conceptual scales,
 * not measured product benchmarks. See docs/research.md for scope and sources. */
export type LevelId = "cpu" | "server" | "cluster" | "multicloud";
export interface Level {
  id: LevelId;
  title: string;
  eyebrow: string;
  description: string;
  bottleneck: string;
  solutions: string[];
  flow: string[];
  metrics: { label: string; value: string }[];
  details: { title: string; body: string }[];
}
export interface Project {
  id: string;
  name: string;
  category: string;
  kind: string;
  summary: string;
  deployment: string;
  algorithm: string;
  process: string[];
  tradeoff: string;
  source: string;
}
export interface Issue {
  id: string;
  title: string;
  category: string;
  summary: string;
  symptom: string;
  mechanism: string;
  solution: string;
  tradeoff: string;
  source: string;
}
export interface DataType {
  id: string;
  name: string;
  example: string;
  storage: string;
  access: string;
  scaling: string;
  projects: string[];
}
export interface RecoveryScenario {
  id: string;
  title: string;
  summary: string;
  rpo: string;
  rto: string;
  steps: string[];
  tradeoff: string;
}

export const levels: Level[] = [
  {
    id: "cpu",
    title: "CPU",
    eyebrow: "01 / WITHIN A PROCESSOR",
    description:
      "Make each byte do more work. Before adding machines, examine cache locality, memory bandwidth, vectorization, and contention inside one process.",
    bottleneck:
      "Memory stalls, branch misprediction, cache-line contention, and the serial fraction of a query.",
    solutions: [
      "Columnar batches + SIMD",
      "Cache-conscious layouts",
      "Partitioned worker ownership",
      "NUMA-local allocation",
    ],
    flow: [
      "Storage page",
      "DRAM buffer",
      "L3 / L2 / L1 cache",
      "SIMD registers",
      "Filtered batch",
    ],
    metrics: [
      { label: "CACHE LINE", value: "64 B typical" },
      { label: "EXECUTION", value: "SIMD batches" },
      { label: "LIMIT", value: "Memory bandwidth" },
    ],
    details: [
      {
        title: "Locality before parallelism",
        body: "Sequential column scans bring useful neighboring values into cache. Pointer-heavy row traversal can spend more time waiting for DRAM than computing. Projection pushdown reads only required columns; predicate pushdown rejects rows before joins.",
      },
      {
        title: "Vectorized execution",
        body: "Operators exchange batches rather than one row at a time, reducing dispatch overhead and enabling SIMD. Compression can improve throughput when saved I/O outweighs decoding CPU. The winning codec depends on values, selectivity, and the bottleneck.",
      },
      {
        title: "Contention and Amdahl’s law",
        body: "A shared counter or latch can serialize many workers. Partition state, batch updates, and reduce synchronization. With serial fraction s and N workers, ideal speedup is bounded by 1 / (s + (1 − s) / N), even before coordination overhead.",
      },
      {
        title: "NUMA is a tiny distributed system",
        body: "On multi-socket machines, remote memory has different cost from local memory. Keep a worker, its partition, and its allocations close; compare throughput while pinning workers and measuring cache misses. More threads can make a bandwidth-bound scan slower.",
      },
    ],
  },
  {
    id: "server",
    title: "Server",
    eyebrow: "02 / WITHIN A MACHINE",
    description:
      "Scale up with more memory, faster disks, better indexes, and disciplined concurrency. One well-tuned server avoids network coordination entirely.",
    bottleneck:
      "Disk IOPS, WAL fsync, buffer-cache misses, lock contention, and background compaction competing with queries.",
    solutions: [
      "B-tree / LSM indexes",
      "WAL + group commit",
      "Buffer pool + NVMe",
      "Connection pooling + admission control",
    ],
    flow: [
      "Client request",
      "Query planner",
      "Buffer pool / index",
      "WAL durability",
      "SSD page / SSTable",
    ],
    metrics: [
      { label: "WORKING SET", value: "RAM + SSD" },
      { label: "DURABILITY", value: "WAL + fsync" },
      { label: "LIMIT", value: "One host" },
    ],
    details: [
      {
        title: "B-tree or LSM?",
        body: "A B-tree keeps ordered pages and supports point reads, range scans, and in-place updates. An LSM buffers writes, flushes sorted immutable files, and merges them later. LSM write efficiency trades against compaction I/O, read amplification, and temporary disk space.",
      },
      {
        title: "Make writes durable",
        body: "Write-ahead logging records a change before the corresponding data page is durable. Group commit shares fsync across transactions. Acknowledgment settings determine whether success means memory, local persistent storage, or synchronous replicas; these promises are not interchangeable.",
      },
      {
        title: "Use memory as a budget",
        body: "The buffer pool, sort and join workspaces, caches, and vector indexes all compete for RAM. Multiply per-query workspace by concurrency. Spilling can prevent failure, but increases I/O and tail latency; admission control often beats unlimited parallel queries.",
      },
      {
        title: "Scale-up has a ceiling",
        body: "A larger instance can be the simplest improvement when the working set fits and a single-writer design is sufficient. The failure domain remains one host unless replicas exist. Vertical scaling cannot remove a hot-row lock or a serial operator.",
      },
    ],
  },
  {
    id: "cluster",
    title: "Cluster",
    eyebrow: "03 / ACROSS MACHINES",
    description:
      "Partition the dataset, replicate for failures, and route work to the data. Scale out turns one machine’s resource limits into a coordination problem.",
    bottleneck:
      "Skew, cross-shard joins, replication traffic, the slowest partition, and recovery under load.",
    solutions: [
      "Hash / range sharding",
      "Replication + quorum",
      "Local aggregation + shuffle",
      "Backpressure + rebalancing",
    ],
    flow: [
      "Ingress / router",
      "Partition leader",
      "Replica acknowledgment",
      "Distributed exchange",
      "Final aggregation",
    ],
    metrics: [
      { label: "SHARDS", value: "Partitioned" },
      { label: "REPLICAS", value: "3 in demo" },
      { label: "LIMIT", value: "Network + skew" },
    ],
    details: [
      {
        title: "Choose the partition key",
        body: "Hash partitioning distributes keys; range partitioning preserves ordered access. Neither guarantees balanced work: one celebrity account can dominate a hash shard, and an increasing timestamp can concentrate writes on the newest range. Measure bytes, QPS, and CPU per partition separately.",
      },
      {
        title: "The cost of an exchange",
        body: "A repartition join hashes rows and sends each row to the worker owning its key. Broadcast joins copy a small relation to every worker. Push filters and partial aggregates before the exchange, colocate frequently joined data, and avoid broadcasting data that no longer fits memory.",
      },
      {
        title: "Follow a packet",
        body: "A client reuses an authenticated TCP/TLS connection to a router or shard owner. The sender serializes records into batches; the OS segments bytes into packets and the receiver acknowledges them. Loss triggers retransmission and congestion control; receiver and application backpressure bound in-flight work. Encryption, serialization, and compression also consume CPU.",
      },
      {
        title: "The fabric is not infinite",
        body: "A many-to-many shuffle can hit rack uplinks or an oversubscribed fabric before any host reaches its NIC limit. Model useful throughput after protocol overhead and competing replication/recovery traffic. Little’s law, L = arrival rate × response time, relates stable average concurrency, throughput, and latency; it does not predict tail latency.",
      },
      {
        title: "Replication is work",
        body: "With three full replicas, each logical write produces approximately two additional copies before protocol and index overhead. Replicas improve fault tolerance and can scale eligible reads; they do not automatically triple write throughput. Consistency depends on acknowledgment and read routing.",
      },
      {
        title: "Recovery competes with users",
        body: "Rebalancing and repairing a failed node consume the same network and disk capacity as normal queries. Keep headroom, bound recovery concurrency, and monitor p95/p99 latency, replication lag, queue depth, and shard imbalance rather than just cluster averages.",
      },
    ],
  },
  {
    id: "multicloud",
    title: "Multi-cloud",
    eyebrow: "04 / ACROSS FAILURE DOMAINS",
    description:
      "Coordinate regions and providers without pretending the WAN is a local bus. At 100 billion records or 10 PB, placement, egress, and recovery are first-class design choices.",
    bottleneck:
      "WAN round-trip time, data movement cost, sovereignty constraints, replication lag, and control-plane dependencies.",
    solutions: [
      "Regional data ownership",
      "Async geo-replication",
      "Object storage + open tables",
      "Immutable backups + tested failover",
    ],
    flow: [
      "Regional write owner",
      "Local quorum",
      "Replication stream",
      "Remote region / cloud",
      "Recovery checkpoint",
    ],
    metrics: [
      { label: "RECORDS", value: "100 billion" },
      { label: "DATASET", value: "Up to 10 PB" },
      { label: "LIMIT", value: "WAN + recovery" },
    ],
    details: [
      {
        title: "Consistency crosses an ocean",
        body: "A synchronous remote quorum adds WAN coordination to commit latency. Asynchronous replication keeps the normal write path local but permits replication lag and a nonzero loss window. During a partition, define whether each operation rejects, waits, or uses an explicitly weaker consistency model.",
      },
      {
        title: "Keep compute near data",
        body: "Move filters and aggregation to the region holding the raw data; exchange smaller results when semantics and policy allow. A full 10 PB transfer over a dedicated 100 Gb/s path takes at least 9.26 days at the theoretical line rate, before overhead, contention, and retries.",
      },
      {
        title: "Records and bytes are independent",
        body: "100 billion records is 100 TB at 1 KB each, or 10 PB at 100 KB each, using decimal units. Size indexes, compression, three-way replication, write amplification, checkpoints, and recovery headroom separately. Three full replicas of a 10 PB logical dataset occupy 30 PB before those other effects.",
      },
      {
        title: "Open tables need a control plane",
        body: "Parquet or ORC stores columns; Iceberg stores snapshots, manifests, and schema/partition evolution. Object storage holds bytes, but an authoritative catalog commits table metadata. Strong object read-after-write consistency does not make a multi-file table transaction atomic by itself.",
      },
      {
        title: "Design recovery, then rehearse it",
        body: "Recovery needs data, catalog metadata, encryption keys, identities, DNS, routing, infrastructure, and application configuration. A replica can faithfully copy corruption. Isolated immutable backups plus restore exercises protect a different failure mode from high availability.",
      },
    ],
  },
];

export const projects: Project[] = [
  {
    id: "postgresql",
    name: "PostgreSQL",
    category: "Relational",
    kind: "Row store · OLTP",
    summary:
      "ACID transactions and rich SQL on a primary, with physical or logical replication for different distribution needs.",
    deployment:
      "Single primary with standby replicas; managed service or VMs/Kubernetes. Native physical replication copies one database cluster; arbitrary write sharding needs an additional layer.",
    algorithm:
      "MVCC snapshots, B-tree indexes, cost-based planning, write-ahead logging, and physical streaming replication.",
    process: [
      "Plan a parameterized SQL query",
      "Find visible tuple versions via index or scan",
      "Append WAL before durable acknowledgment",
      "Replay WAL on standby replicas",
    ],
    tradeoff:
      "Excellent transactional semantics; a write primary and cross-table workloads require careful capacity planning. Async standbys can lag; synchronous acknowledgment increases commit latency.",
    source: "https://www.postgresql.org/docs/current/warm-standby.html",
  },
  {
    id: "redis",
    name: "Redis",
    category: "Key-value",
    kind: "Memory-first · Serving",
    summary:
      "Low-overhead access to keys and data structures, with clustering for partitioned memory and workload distribution.",
    deployment:
      "Single instance, replication with Sentinel, or Redis Cluster with primaries and replicas. Persistence and failover policies must be configured explicitly.",
    algorithm:
      "Redis Cluster maps keys by CRC16 into 16,384 hash slots. Clients route directly, following MOVED/ASK redirects during topology changes; replica propagation is asynchronous.",
    process: [
      "Hash a key to a slot",
      "Route to the owning primary",
      "Execute the data-structure operation",
      "Propagate to replicas; persist per configured policy",
    ],
    tradeoff:
      "Memory capacity and hot keys dominate cost. Multi-key operations generally require co-location in one slot. Async replication can lose acknowledged writes in failure windows.",
    source:
      "https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/",
  },
  {
    id: "cassandra",
    name: "Apache Cassandra",
    category: "Wide-column",
    kind: "Partitioned · Write-heavy",
    summary:
      "Peer-to-peer storage for high write volume and predictable partition-key access across many machines and datacenters.",
    deployment:
      "Nodes in racks and datacenters, using a replication strategy such as NetworkTopologyStrategy. Clients select consistency per operation.",
    algorithm:
      "Token-based consistent hashing, replication, timestamp-based last-write-wins reconciliation, commit log, memtables/SSTables, compaction, and anti-entropy repair.",
    process: [
      "Coordinator selects replicas for a partition key",
      "Replicas append commit log and update memtables",
      "Acknowledge at the requested consistency level",
      "Flush, compact, and repair divergent replicas",
    ],
    tradeoff:
      "Query-first denormalization avoids global joins. Large/hot partitions, tombstones, repair, and clock assumptions need care. Quorum intersection is not a blanket guarantee of serializable transactions.",
    source:
      "https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html",
  },
  {
    id: "mongodb",
    name: "MongoDB",
    category: "Document",
    kind: "BSON · Operational",
    summary:
      "Document-oriented access with indexes, replica sets, and sharding for collections whose size or throughput exceeds one replica set.",
    deployment:
      "A sharded cluster uses mongos routers, config-server metadata, and shards that are replica sets. Managed Atlas and self-managed deployments are available.",
    algorithm:
      "Shard-key ranges or hashed keys distribute chunks/ranges; a balancer migrates ownership. Replica sets elect a primary; read/write concern determines visibility and acknowledgment.",
    process: [
      "Router reads shard-key routing metadata",
      "Target one shard or scatter to many",
      "Replica-set primary applies the operation",
      "Replicate, acknowledge, and merge query results",
    ],
    tradeoff:
      "A targeted query scales more predictably than scatter-gather. Shard-key choice, distributed transactions, resharding, and jumbo/hot ranges can dominate performance.",
    source: "https://www.mongodb.com/docs/manual/sharding/",
  },
  {
    id: "neo4j",
    name: "Neo4j",
    category: "Graph",
    kind: "Property graph · Traversal",
    summary:
      "Nodes, relationships, and properties model connected data; traversal follows relationships instead of repeatedly joining foreign-key tables.",
    deployment:
      "Single server or enterprise clustering with primary database allocations for fault tolerance and secondary allocations for read scaling. Separate databases can have separate placements.",
    algorithm:
      "Native adjacency traversal, Cypher planning, transaction logging, and majority-based primary coordination. Bookmarks support causal read-after-write routing.",
    process: [
      "Match a graph starting point with an index",
      "Expand selected relationship patterns",
      "Filter and aggregate traversal results",
      "Commit on the database writer and replicate",
    ],
    tradeoff:
      "A cluster does not automatically partition a single connected graph into unlimited independent shards. Dense expansions and unbounded path patterns can still explode intermediate work.",
    source:
      "https://github.com/neo4j/docs-operations/blob/dev/modules/ROOT/pages/clustering/introduction.adoc",
  },
  {
    id: "kafka",
    name: "Apache Kafka",
    category: "Streaming",
    kind: "Partitioned log · Transport",
    summary:
      "A durable event log separates producers from consumers, supports replay, and scales ordered processing through partitions.",
    deployment:
      "Brokers host partition leaders and followers; a KRaft controller quorum manages metadata. Consumer groups divide partitions; Connect integrates external systems.",
    algorithm:
      "Append-only segmented logs, leader/follower replication, partition offsets, producer batching, idempotent producer sequences, and transactional consume-transform-produce.",
    process: [
      "Producer chooses a partition and batches records",
      "Leader appends and replicates to in-sync followers",
      "Consumers fetch batches by offset",
      "Commit offsets or output transaction for recovery",
    ],
    tradeoff:
      "Order is per partition, not global. More partitions enable concurrency but add metadata and recovery overhead. Exactly-once external side effects need a cooperating sink; acks=all also needs appropriate min.insync.replicas.",
    source: "https://kafka.apache.org/44/design/design/",
  },
  {
    id: "flink",
    name: "Apache Flink",
    category: "Streaming",
    kind: "Stateful · Event time",
    summary:
      "Continuous computations maintain keyed state and event-time windows while coordinating recoverable checkpoints.",
    deployment:
      "JobManager coordinates TaskManagers; standalone, Kubernetes, or YARN. Durable checkpoint storage and replayable sources underpin fault tolerance.",
    algorithm:
      "Keyed state, watermarks, distributed checkpoint barriers, state snapshots, and source-offset recovery. Unaligned checkpoints can capture in-flight buffers under backpressure.",
    process: [
      "Read a replayable source partition",
      "Key and exchange events to state owners",
      "Update windows/state using event time",
      "Checkpoint offsets and state; coordinate compatible sinks",
    ],
    tradeoff:
      "Exactly-once state recovery does not make every HTTP call exactly once. Large state, skew, late data, and checkpoint duration affect latency and recovery time.",
    source:
      "https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/stateful-stream-processing/",
  },
  {
    id: "spark",
    name: "Apache Spark",
    category: "Analytics",
    kind: "Distributed SQL · Batch",
    summary:
      "Distributed DataFrame and SQL execution for large scans, joins, transformations, and machine-learning preparation.",
    deployment:
      "Driver and executors under Kubernetes, YARN, or standalone; read/write lake storage and table catalogs through connectors.",
    algorithm:
      "DAG stages split at exchanges; partitioned tasks process columnar data. Adaptive Query Execution can coalesce partitions, change join strategies, and mitigate supported skewed joins.",
    process: [
      "Optimize a logical SQL/DataFrame plan",
      "Schedule parallel scan and map tasks",
      "Shuffle or broadcast intermediate data",
      "Reduce and write committed output",
    ],
    tradeoff:
      "The driver is not a place to collect a massive dataset. Shuffle bytes, spills, skew, task sizing, and scheduling overhead can dominate; more executors do not guarantee lower latency.",
    source: "https://spark.apache.org/docs/latest/sql-performance-tuning.html",
  },
  {
    id: "clickhouse",
    name: "ClickHouse",
    category: "Analytics",
    kind: "Columnar · Real-time OLAP",
    summary:
      "Column-oriented storage and vectorized execution optimize analytical filtering and aggregation over large append-heavy datasets.",
    deployment:
      "Single server, sharded/replicated clusters, managed cloud, or separate compute/storage architectures depending on the product and deployment.",
    algorithm:
      "MergeTree-family immutable parts, sorted primary-key granules, sparse indexes, compression, background merging, and parallel vectorized operators.",
    process: [
      "Batch inserts into sorted columnar parts",
      "Prune partitions and index granules",
      "Read required compressed columns",
      "Aggregate partial results across shards",
    ],
    tradeoff:
      "Batching avoids excessive small parts. Sort keys and projections must match access patterns; merges use I/O and CPU. Analytical performance does not make arbitrary row-by-row updates free.",
    source: "https://clickhouse.com/docs/concepts/why-clickhouse-is-so-fast",
  },
  {
    id: "iceberg",
    name: "Apache Iceberg",
    category: "Lakehouse",
    kind: "Open table format · Metadata",
    summary:
      "A table format coordinates snapshots, files, schema evolution, and partition evolution across compatible compute engines.",
    deployment:
      "Parquet/ORC/Avro data files in object or distributed storage, metadata files and manifests, and a catalog with suitable atomic commit semantics. Spark, Flink, and Trino are common engines.",
    algorithm:
      "Immutable snapshots and manifests, metadata pruning, optimistic concurrency, atomic catalog pointer changes, and retry/validation for conflicting commits.",
    process: [
      "Write new immutable data/delete files",
      "Build manifests and new snapshot metadata",
      "Validate concurrent changes",
      "Atomically publish the new table metadata pointer",
    ],
    tradeoff:
      "Iceberg is not a query engine or object store. Small files, catalog availability, concurrent writers, compaction, snapshot retention, and orphan-file cleanup require operational policies.",
    source: "https://iceberg.apache.org/docs/latest/reliability/",
  },
  {
    id: "opensearch",
    name: "OpenSearch",
    category: "Search",
    kind: "Inverted index · Text + vectors",
    summary:
      "Distributed search and aggregation over analyzed text and structured fields, with optional vector search capabilities.",
    deployment:
      "Cluster manager and data nodes; indexes split into primary shards and replica shards, with allocation across failure domains.",
    algorithm:
      "Lucene inverted indexes map terms to postings; immutable segments merge in the background. Queries scatter to shards, then gather ranked or aggregated results.",
    process: [
      "Analyze text into tokens",
      "Index and refresh searchable segments",
      "Execute shard-local search",
      "Merge top hits or aggregation states at the coordinator",
    ],
    tradeoff:
      "Refresh visibility differs from write durability. Too many shards or expensive high-cardinality aggregations waste heap and coordination; replica placement is separate from a restorable snapshot.",
    source: "https://docs.opensearch.org/latest/tuning-your-cluster/",
  },
  {
    id: "milvus",
    name: "Milvus",
    category: "Vector",
    kind: "Similarity search · Embeddings",
    summary:
      "Vector search combines embedding-distance retrieval with metadata filtering for retrieval and recommendation workloads.",
    deployment:
      "Standalone or distributed service with separate coordination, streaming/query/data components and durable storage; exact architecture varies by release.",
    algorithm:
      "Choose exact FLAT scans or approximate indexes such as HNSW, IVF, quantization, and disk-oriented ANN. Index and metric choices depend on dimensions, memory, recall, and query distribution.",
    process: [
      "Embed external content into vectors",
      "Ingest vectors and scalar metadata",
      "Build/load a selected vector index",
      "Filter, retrieve candidates, and optionally rerank",
    ],
    tradeoff:
      "Approximation exchanges recall for latency/memory. A 768-dimension float32 vector alone is 3,072 bytes; at 100 billion vectors that is 307.2 TB before indexes, IDs, replicas, and metadata.",
    source:
      "https://github.com/milvus-io/milvus-docs/blob/v2.6.x/site/en/userGuide/manage-indexes/index-vector-fields.md",
  },
  {
    id: "s3",
    name: "Amazon S3 / object stores",
    category: "Object",
    kind: "Unstructured · Durable storage",
    summary:
      "Objects hold raw media, logs, backups, and lake files independently from query workers; S3-compatible APIs are a common integration boundary.",
    deployment:
      "Managed regional service, or self-managed compatible stores with explicitly different guarantees. Use versioning, lifecycle, access policies, and replication per requirement.",
    algorithm:
      "Key-addressed objects and multipart upload. AWS S3 provides strong read-after-write/list consistency for documented object operations; cross-region replication is asynchronous.",
    process: [
      "Encode and optionally compress an object",
      "Upload parts with integrity verification",
      "Commit object metadata and access policy",
      "Read ranges, lifecycle, or replicate to another region",
    ],
    tradeoff:
      "Objects are not mutable database pages. Small-object requests, metadata/list operations, egress, and restore tiers can dominate. Do not assume every S3-compatible product shares AWS S3 guarantees.",
    source:
      "https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html#ConsistencyModel",
  },
  {
    id: "rocksdb",
    name: "RocksDB",
    category: "Key-value",
    kind: "Embedded · LSM engine",
    summary:
      "An embedded persistent key-value engine used inside services and stateful stream processors; distribution belongs to the surrounding system.",
    deployment:
      "Linked into an application process, with local storage and application-managed replication, snapshots, and ownership.",
    algorithm:
      "WAL, memtables, immutable sorted SST files, Bloom filters, block cache, and selectable compaction strategies such as level and universal compaction.",
    process: [
      "Append WAL and update a memtable",
      "Flush a sorted immutable SST file",
      "Use filters/indexes to locate candidate blocks",
      "Compact files and reclaim obsolete versions",
    ],
    tradeoff:
      "Write, read, and space amplification trade against each other. Background debt can cause stalls; a local engine does not provide a cluster protocol or backup policy by itself.",
    source: "https://github.com/facebook/rocksdb/wiki/Compaction",
  },
  {
    id: "cockroachdb",
    name: "CockroachDB",
    category: "Relational",
    kind: "Distributed SQL · Transactions",
    summary:
      "Distributed relational storage splits a keyspace into replicated ranges while coordinating SQL transactions across those ranges.",
    deployment:
      "A cluster of database nodes; ranges have voting replicas, optional non-voting replicas, and a leaseholder. Locality/placement and survival goals control geographic tradeoffs.",
    algorithm:
      "MVCC over an ordered key-value store, Raft replication per range, range splits/rebalancing, leaseholder reads, and distributed transaction coordination.",
    process: [
      "Translate SQL into scans and key-value operations",
      "Route to range leaseholders",
      "Coordinate writes and replicate range commands through Raft",
      "Commit the transaction and return according to its guarantees",
    ],
    tradeoff:
      "Cross-range transactions and a remote voting quorum add network coordination. Geographic replicas require deliberate leaseholder/replica placement and do not remove WAN latency.",
    source:
      "https://www.cockroachlabs.com/docs/stable/architecture/replication-layer",
  },
  {
    id: "trino",
    name: "Trino",
    category: "Analytics",
    kind: "Federated SQL · Query engine",
    summary:
      "A distributed SQL engine queries compatible external stores through connectors without owning one universal storage format.",
    deployment:
      "Coordinator and worker processes, plus catalogs/connectors for sources such as Iceberg, object stores, and operational databases.",
    algorithm:
      "A distributed plan becomes stages, tasks, splits, and pipelined operators. Exchanges move partial data; connector pushdown can move filters or aggregation closer to storage.",
    process: [
      "Coordinator parses and optimizes SQL",
      "Connector discovers source splits",
      "Workers read splits and exchange intermediate data",
      "Coordinator streams final results to the client",
    ],
    tradeoff:
      "Federated joins can move large amounts of data and may stress an operational source. Connector capabilities, source snapshots, and retry semantics differ; federation alone does not create a global transaction.",
    source: "https://trino.io/docs/current/overview/concepts.html",
  },
];

/** An editorial selection of ten engineering pressure points, not a popularity ranking. */
export const issues: Issue[] = [
  {
    id: "hotspot",
    title: "The hot-partition problem",
    category: "LOAD IMBALANCE",
    summary:
      "One tenant, celebrity key, or timestamp range absorbs most of the traffic while the rest of the cluster is idle.",
    symptom:
      "One shard’s CPU and p99 latency rise even when average utilization looks healthy.",
    mechanism:
      "Partitioning balances key space, not necessarily bytes, request rate, or compute. One indivisible key still has one owner.",
    solution:
      "Measure per-partition load; split tenants, salt write-heavy keys with a read-time merge, use adaptive splits, cache hot reads, and apply per-tenant limits.",
    tradeoff:
      "Salting breaks simple ordered reads and introduces scatter-gather; caching needs an explicit freshness policy.",
    source: "https://www.mongodb.com/docs/manual/sharding/",
  },
  {
    id: "shuffle",
    title: "Shuffle eats the cluster",
    category: "NETWORK AMPLIFICATION",
    summary:
      "A join that looks small in SQL can move terabytes across every worker and spill at the slowest task.",
    symptom:
      "Network saturation, disk spill, long-tail tasks, and a coordinator waiting for one partition.",
    mechanism:
      "A repartition exchange sends intermediate rows to the worker owning a join/group key. Skew concentrates rows and work.",
    solution:
      "Filter and project before exchange; pre-aggregate; broadcast only a genuinely small side; colocate repeated joins; use adaptive plans and skew handling.",
    tradeoff:
      "Broadcast duplicates bytes and memory across workers; pre-aggregation must preserve query semantics.",
    source: "https://spark.apache.org/docs/latest/sql-performance-tuning.html",
  },
  {
    id: "vector",
    title: "The vector memory wall",
    category: "AI RETRIEVAL",
    summary:
      "Embedding search adds a large numerical dataset and an index whose memory and recall must be budgeted separately.",
    symptom:
      "Index loads fail, replicas become expensive, or latency improves only by silently reducing recall.",
    mechanism:
      "100B × 768 × 4 bytes is 307.2 TB of raw float32 vectors, excluding graph edges, metadata, and replicas.",
    solution:
      "Evaluate recall@k against exact ground truth; test scalar/product quantization, disk-oriented ANN, metadata prefilters, tiering, and reranking.",
    tradeoff:
      "Compression and approximate search change quality. Index build cost, freshness, filtered recall, and recovery time matter alongside QPS.",
    source:
      "https://github.com/milvus-io/milvus-docs/blob/v2.6.x/site/en/userGuide/manage-indexes/index-vector-fields.md",
  },
  {
    id: "compaction",
    title: "Background work becomes foreground pain",
    category: "STORAGE AMPLIFICATION",
    summary:
      "Tiny inserts and immutable files build a maintenance backlog until reads slow down or writes stall.",
    symptom:
      "Growing part/SST counts, disk saturation, write stalls, and widening tail latency despite stable ingest.",
    mechanism:
      "LSM and columnar engines merge immutable files. If incoming work exceeds compaction capacity, debt accumulates; lake small files also inflate planning and request overhead.",
    solution:
      "Batch ingestion, size files deliberately, reserve I/O headroom, monitor pending compaction bytes, and schedule bounded rewrites with retention-aware cleanup.",
    tradeoff:
      "Larger batches add freshness latency. More aggressive merging consumes bandwidth and temporary space.",
    source: "https://github.com/facebook/rocksdb/wiki/Compaction",
  },
  {
    id: "stream",
    title: "Exactly once, across which boundary?",
    category: "STREAM CORRECTNESS",
    summary:
      "A correct checkpoint cannot undo an external email, charge, or HTTP side effect that already happened.",
    symptom:
      "Duplicates after restarts, lost late events, or checkpoints that never finish under backpressure.",
    mechanism:
      "Recovery replays a source from captured offsets. End-to-end exactly-once behavior also requires transactional or idempotent outputs and compatible commit coordination.",
    solution:
      "Name the guarantee boundary; use idempotency keys or transactional sinks, durable checkpoints, watermarks/late-event policy, and restart tests with intentional failures.",
    tradeoff:
      "Coordination adds latency and state. Unaligned checkpoints can reduce barrier waiting but persist more in-flight data.",
    source:
      "https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/stateful-stream-processing/",
  },
  {
    id: "governance",
    title: "An open lake still needs ownership",
    category: "METADATA + GOVERNANCE",
    summary:
      "Open files do not solve table commits, schema meaning, lineage, deletion policy, or access control.",
    symptom:
      "Readers see incompatible schemas, catalogs diverge, or snapshots retain data that an operator assumed was deleted.",
    mechanism:
      "Data files, manifests, catalog pointers, engine caches, identity policies, and retention rules form separate control planes.",
    solution:
      "Use an authoritative catalog with atomic commits, schema contracts, lineage and policy checks; coordinate snapshot expiry, delete-file rewrites, and object lifecycle.",
    tradeoff:
      "Long retention makes rollback and time travel easier but increases cost and can conflict with erasure requirements.",
    source: "https://iceberg.apache.org/docs/latest/reliability/",
  },
  {
    id: "egress",
    title: "The petabyte gravity well",
    category: "MULTI-CLOUD ECONOMICS",
    summary:
      "Moving compute is easy; relocating or repeatedly scanning petabytes across provider boundaries is not.",
    symptom:
      "Cross-region bills and WAN queues grow faster than the useful query results.",
    mechanism:
      "Transfer time has a byte / bandwidth lower bound. A full 10 PB transfer on an otherwise idle 100 Gb/s link needs at least 9.26 days at line rate.",
    solution:
      "Place compute near authoritative data, push down filters/aggregates, use regional ownership, transfer changes instead of full copies, and model destination-specific egress pricing.",
    tradeoff:
      "Placement may conflict with residency or availability. More copies improve locality but add consistency, security, and lifecycle work.",
    source:
      "https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html",
  },
  {
    id: "consistency",
    title: "A quorum across an ocean",
    category: "LATENCY + CONSISTENCY",
    summary:
      "Low-latency local writes and synchronous remote durability compete when the network is slow or partitioned.",
    symptom:
      "Commit latency jumps with WAN RTT; a network partition blocks writes or reveals stale regional reads.",
    mechanism:
      "The acknowledgment path must wait for the chosen replica/quorum. Async replication avoids that wait but allows lag; a majority protocol does not make every read automatically current.",
    solution:
      "Define per-operation consistency; place quorum members deliberately, fence former writers, use session/causal routing where appropriate, and expose stale-read policy.",
    tradeoff:
      "Synchronous geographic durability adds latency and may reduce availability during partitions. Async failover accepts an explicitly measured loss window.",
    source: "https://www.postgresql.org/docs/current/warm-standby.html",
  },
  {
    id: "recovery",
    title: "The backup that cannot restore",
    category: "RECOVERY DEBT",
    summary:
      "A green backup job is not evidence that a complete 10 PB application can recover inside its objective.",
    symptom:
      "Restore misses keys, permissions, catalogs, dependencies, or enough bandwidth to meet the deadline.",
    mechanism:
      "Replicas propagate logical corruption; backups can share failure domains. Recovery time includes detection, provisioning, transfer, replay, validation, and traffic switching.",
    solution:
      "Keep isolated immutable/versioned recovery copies; restore into an isolated environment; verify checksums and application invariants; rehearse failover, fencing, and failback.",
    tradeoff:
      "Warm capacity costs more. RTO/RPO are measured objectives, not automatic properties of a replication checkbox.",
    source:
      "https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html",
  },
  {
    id: "replication",
    title: "Replication lag meets failover",
    category: "DURABILITY UNDER LOAD",
    summary:
      "A follower that is healthy but far behind may be the wrong place to send a read or promote after a failure.",
    symptom:
      "Stale reads, missing recent writes after promotion, growing WAL retention, or disks filling on the primary.",
    mechanism:
      "Replication competes with ingest, compaction, reads, and WAN limits. Async acknowledgment can happen before a remote copy is durable or replayed.",
    solution:
      "Measure durable and replay positions separately; cap or alarm retained logs, provision catch-up bandwidth, gate promotions on loss policy, and test recovery while ingest continues.",
    tradeoff:
      "Synchronous acknowledgment shrinks selected loss windows but can place slow replica/network latency on every write. Retaining every log indefinitely risks exhausting storage.",
    source: "https://www.postgresql.org/docs/current/warm-standby.html",
  },
];

export const dataTypes: DataType[] = [
  {
    id: "relational",
    name: "Relational",
    example: "Orders, payments, accounts, inventory",
    storage: "Rows, typed columns, constraints, and B-tree/secondary indexes.",
    access:
      "Transactional point lookups, indexed ranges, joins, and SQL aggregation.",
    scaling:
      "Start with plans/indexes and pooling; then read replicas or deliberate tenant/key partitioning. Cross-shard transactions need explicit coordination.",
    projects: ["PostgreSQL", "CockroachDB"],
  },
  {
    id: "document",
    name: "Document",
    example: "Product catalogs, user profiles, JSON APIs",
    storage: "Nested BSON/JSON documents with field indexes.",
    access:
      "Fetch an aggregate document, filter nested fields, and run aggregations.",
    scaling:
      "Choose a shard key matching routes and cardinality; document growth, scatter-gather, and distributed secondary indexes are real costs.",
    projects: ["MongoDB", "OpenSearch"],
  },
  {
    id: "graph",
    name: "Graph",
    example: "Fraud rings, knowledge graphs, dependencies",
    storage:
      "Nodes, directed relationships, properties, and adjacency structures.",
    access:
      "Pattern matching, bounded traversals, neighborhoods, and path queries; Spark GraphX supports a different distributed graph-computation workflow.",
    scaling:
      "Read replicas scale independent reads; partition connected components carefully. Cross-partition traversals and high-degree nodes create network fan-out.",
    projects: ["Neo4j", "Apache Spark"],
  },
  {
    id: "keyvalue",
    name: "Key-value / wide-column",
    example: "Sessions, counters, telemetry by device",
    storage:
      "Hash-indexed keys or sorted partition/clustering-key records; memory or LSM persistence.",
    access:
      "Point reads/writes and partition-local ranges; typically query-first denormalization.",
    scaling:
      "Hash or token partitioning distributes ownership. A single hot key or oversized partition still needs splitting or workload control.",
    projects: ["Redis", "Apache Cassandra", "RocksDB"],
  },
  {
    id: "timeseries",
    name: "Time-series / events",
    example: "Metrics, clickstreams, logs, sensor readings",
    storage:
      "Append-oriented event records, time-partitioned columns, or compressed time series.",
    access:
      "Time windows, rollups, event replay, out-of-order handling, and retention.",
    scaling:
      "Partition by entity plus time bucket; separate ingest from serving; use downsampling and lifecycle policies while preserving required raw history.",
    projects: ["Apache Kafka", "Apache Flink", "ClickHouse"],
  },
  {
    id: "unstructured",
    name: "Unstructured / binary",
    example: "Images, video, audio, PDFs, model artifacts",
    storage:
      "Immutable objects plus searchable metadata; often multipart and range-readable.",
    access:
      "Key retrieval, streaming/range reads, external extraction, and metadata search.",
    scaling:
      "Object storage separates capacity from compute. Avoid millions of tiny objects where possible; plan lifecycle, integrity checks, bandwidth, and permissions.",
    projects: ["Amazon S3", "OpenSearch", "Apache Iceberg"],
  },
  {
    id: "vector",
    name: "Vector / multimodal",
    example: "Text, image, and audio embeddings",
    storage:
      "Dense/sparse numerical vectors, metadata, and approximate nearest-neighbor indexes.",
    access:
      "Similarity top-k with distance metrics, scalar filtering, hybrid text search, and reranking; PostgreSQL needs a suitable vector extension.",
    scaling:
      "Shard vectors and budget index overhead; quantize or use disk indexes when justified by measured recall. Re-embedding and index rebuilds need capacity too.",
    projects: ["Milvus", "OpenSearch", "PostgreSQL"],
  },
  {
    id: "columnar",
    name: "Analytical / geospatial",
    example: "Fact tables, feature tables, location traces",
    storage:
      "Compressed columnar files and lake snapshots; spatial types and geometry indexes through suitable engines/extensions such as PostGIS for PostgreSQL.",
    access:
      "Selective scans, aggregations, joins, spatial predicates, and training-data reads.",
    scaling:
      "Prune partitions/files/columns, cluster by common predicates, compact small files, and schedule distributed exchanges with skew awareness. Spatial partitioning needs boundary handling for queries crossing cells.",
    projects: ["ClickHouse", "Apache Spark", "Apache Iceberg", "PostgreSQL"],
  },
];

export const recoveryScenarios: RecoveryScenario[] = [
  {
    id: "node",
    title: "Lose one node",
    summary:
      "A server disappears while writes continue. Exercise replica promotion, shard ownership, and degraded-capacity behavior.",
    rpo: "0 for acknowledged writes only under the configured durable replication guarantee",
    rto: "Detection + election + client rerouting; measure in your deployment",
    steps: [
      "Detect the failure: Confirm missed health signals and expired ownership; distinguish an unreachable node from a definitely stopped writer.",
      "Fence the former writer: Revoke its ownership or isolate it before another replica may accept writes.",
      "Select and promote: Choose a replica meeting the durability/loss policy, then complete the protocol’s election or promotion.",
      "Reroute and validate: Refresh client routing, check application invariants, and resume traffic within the surviving capacity.",
      "Rebuild redundancy: Throttle replica recovery and verify storage headroom and p99 latency while users remain active.",
    ],
    tradeoff:
      "A three-replica majority design can tolerate one replica failure only with the expected placement and protocol; degraded operation has less capacity and redundancy.",
  },
  {
    id: "zone",
    title: "Lose an availability zone",
    summary:
      "A rack or zone failure removes multiple replicas and possibly the control plane simultaneously.",
    rpo: "0 only if acknowledged data survives outside the failed zone",
    rto: "Health detection + surviving quorum + routing recovery",
    steps: [
      "Check surviving quorums: Confirm that both data and metadata quorums survive across the remaining failure domains.",
      "Fence and reroute: Block isolated former leaders and route reads/writes only to surviving legitimate owners.",
      "Reduce admission: Apply load shedding or queue limits so the reduced fleet can meet its operating envelope.",
      "Verify dependencies: Confirm that logging, identity, catalog, DNS, and encryption access still operate outside the failed zone.",
      "Restore placement: Re-replicate into a healthy zone without exhausting shared network and storage headroom.",
    ],
    tradeoff:
      "Three copies in one zone do not provide three-zone resilience. Placement and quorum distribution matter as much as replica count.",
  },
  {
    id: "region",
    title: "Lose a region",
    summary:
      "The primary region is unavailable; recover from a remote replica and an independently provisioned control plane.",
    rpo: "Async: bounded by verified replication lag; synchronous: guarantee-dependent",
    rto: "Provision or activate + replay + validation + global routing",
    steps: [
      "Declare and assess: Compare remote durable and replay positions against the accepted recovery-point objective before selecting a target.",
      "Fence the old region: Prevent the previous regional writer from accepting writes if it returns during recovery.",
      "Activate the standby: Start remote compute and verify identities, encryption access, catalogs, and required credentials.",
      "Promote and validate: Activate the selected recovery point, then test critical queries and application writes.",
      "Switch and reconcile: Move traffic gradually; preserve evidence, reconcile accepted changes, and rehearse controlled failback.",
    ],
    tradeoff:
      "A warm standby reduces provisioning time but costs more. Cross-region replication lag is a loss window, not a promise that the latest write is safe.",
  },
  {
    id: "corruption",
    title: "Recover from corruption",
    summary:
      "An accidental delete, malicious write, or application bug spreads through healthy replicas.",
    rpo: "Point-in-time recovery target before the corrupting operation",
    rto: "Restore + WAL/event replay + integrity checks + application validation",
    steps: [
      "Contain the damage: Stop the damaging writer and preserve incident evidence before changing recovery artifacts.",
      "Select a safe copy: Choose an isolated immutable or versioned backup from before the corrupting operation.",
      "Restore dependencies: Recover data, table/catalog metadata, and access to the required encryption keys and identities.",
      "Replay to the boundary: Apply retained logs only to the chosen safe point, then audit that boundary explicitly.",
      "Validate before routing: Check checksums, row/domain invariants, and application reads before admitting production traffic.",
    ],
    tradeoff:
      "Replication protects availability; it can replicate the mistake. A safe older restore point deliberately discards or separately reconciles later valid changes.",
  },
  {
    id: "petabyte",
    title: "Restore a 10 PB estate",
    summary:
      "Bandwidth and dependency order dominate large-scale restore. Restore the critical serving slice first rather than waiting for every cold byte.",
    rpo: "Latest verified recoverable checkpoint plus retained logs",
    rto: "At least bytes ÷ useful bandwidth, plus all recovery stages",
    steps: [
      "Inventory the estate: Prioritize critical tables, objects, catalogs, keys, and the dependency graph needed for the first useful service.",
      "Rehearse throughput: Verify useful restore bandwidth, storage quotas, archive access, and rate limits in an isolated representative exercise.",
      "Recover the serving slice: Restore metadata and high-priority serving data first, then admit bounded traffic if the service contract permits it.",
      "Hydrate the remainder: Transfer remaining partitions concurrently within measured network and storage limits.",
      "Verify and record: Check integrity and application invariants, reconcile replay logs, and record the achieved recovery time and point.",
    ],
    tradeoff:
      "10 PB over 100 Gb/s is at least 9.26 days at line rate. Compression, parallel paths, tier access, and partial recovery alter the plan; nominal bandwidth is not measured useful throughput.",
  },
];

export const sources = [
  {
    title: "PostgreSQL — Log-shipping standby servers",
    url: "https://www.postgresql.org/docs/current/warm-standby.html",
    note: "Streaming replication, synchronous acknowledgment, replication slots, and failover limits.",
  },
  {
    title: "PostgreSQL — Index types",
    url: "https://www.postgresql.org/docs/current/indexes-types.html",
    note: "B-tree, hash, GiST, SP-GiST, GIN, and BRIN access-method roles.",
  },
  {
    title: "Redis — Cluster specification",
    url: "https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/",
    note: "16,384 hash slots, routing, replica behavior, and write-safety windows; checked via official source repository.",
  },
  {
    title: "Apache Cassandra — Dynamo architecture",
    url: "https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html",
    note: "Consistent hashing, tunable consistency, timestamp reconciliation, and replication.",
  },
  {
    title: "MongoDB — Sharding",
    url: "https://www.mongodb.com/docs/manual/sharding/",
    note: "Routers, config servers, replica-set shards, shard keys, ranges, and balancing.",
  },
  {
    title: "Neo4j — Clustering introduction",
    url: "https://github.com/neo4j/docs-operations/blob/dev/modules/ROOT/pages/clustering/introduction.adoc",
    note: "Primary/secondary database allocations and majority availability; checked via official docs source.",
  },
  {
    title: "Apache Kafka — Design",
    url: "https://kafka.apache.org/44/design/design/",
    note: "Batching, page cache, replication, ordering, producer idempotence, and transaction boundaries.",
  },
  {
    title: "Apache Flink — Stateful stream processing",
    url: "https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/stateful-stream-processing/",
    note: "State, recovery, source replay, and end-to-end semantics.",
  },
  {
    title: "Apache Flink — Checkpoints",
    url: "https://nightlies.apache.org/flink/flink-docs-stable/docs/ops/state/checkpoints/",
    note: "Checkpoint configuration and operational concerns.",
  },
  {
    title: "Apache Flink — Savepoints",
    url: "https://nightlies.apache.org/flink/flink-docs-stable/docs/ops/state/savepoints/",
    note: "Operational state snapshots for upgrades and rescaling; distinct from automatic checkpoints.",
  },
  {
    title: "Apache Spark — SQL performance tuning",
    url: "https://spark.apache.org/docs/latest/sql-performance-tuning.html",
    note: "Partition sizing, broadcast joins, statistics, AQE, and skew handling.",
  },
  {
    title: "ClickHouse — Why ClickHouse is fast",
    url: "https://clickhouse.com/docs/concepts/why-clickhouse-is-so-fast",
    note: "Immutable parts, merges, pruning, compression, SIMD, and parallel execution; checked via official docs source.",
  },
  {
    title: "Apache Iceberg — Reliability",
    url: "https://iceberg.apache.org/docs/latest/reliability/",
    note: "Snapshot metadata, atomic commits, concurrent writers, retries, and isolation. Historic comparisons to S3 eventual consistency do not describe current AWS S3 object consistency.",
  },
  {
    title: "OpenSearch — Managing your cluster",
    url: "https://docs.opensearch.org/latest/tuning-your-cluster/",
    note: "Shard placement, recovery, replication, and resource control.",
  },
  {
    title: "Milvus — Vector indexes",
    url: "https://github.com/milvus-io/milvus-docs/blob/v2.6.x/site/en/userGuide/manage-indexes/index-vector-fields.md",
    note: "Official Milvus source for vector metrics and exact/approximate index families. This legacy overview links index-specific pages; verify release-specific tuning guidance.",
  },
  {
    title: "Amazon S3 — Data consistency model",
    url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html#ConsistencyModel",
    note: "Strong read-after-write/list guarantees for documented AWS S3 object operations.",
  },
  {
    title: "Amazon S3 — Replication",
    url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html",
    note: "Cross-region/same-region replication, existing-object replication, and asynchronous behavior.",
  },
  {
    title: "RocksDB — Compaction",
    url: "https://github.com/facebook/rocksdb/wiki/Compaction",
    note: "Leveled/tiered strategies and read/write/space amplification.",
  },
  {
    title: "AWS — Disaster recovery strategies",
    url: "https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html",
    note: "Backup/restore, pilot light, warm standby, active/active, and recovery objectives. Strategy concepts apply beyond AWS; provider guarantees do not.",
  },
  {
    title: "CockroachDB — Replication layer",
    url: "https://www.cockroachlabs.com/docs/stable/architecture/replication-layer",
    note: "Per-range Raft, voting/non-voting replicas, leases, and range repair/rebalancing.",
  },
  {
    title: "Trino — Concepts",
    url: "https://trino.io/docs/current/overview/concepts.html",
    note: "Coordinator/worker roles, stages, tasks, splits, operators, and connectors; checked via official source repository.",
  },
];
