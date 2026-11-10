import { capacityModel } from "./model";
import type { ModelInput } from "./model";
import type { LevelId } from "./content";
import type { SystemId } from "./systemModels";

export interface Choice {
  id: string;
  label: string;
  explanation: string;
}
export interface Objective {
  node: string;
  phase: number;
  title: string;
  brief: string;
  action: string;
  choices?: Choice[];
  correct?: string;
  capacity?: boolean;
  lesson: string;
}
export interface Mission {
  id: SystemId;
  title: string;
  subtitle: string;
  difficulty: string;
  scale: LevelId;
  issue?: string;
  hazardCount: number;
  seconds: number;
  objectives: Objective[];
}
const choice = (id: string, label: string, explanation: string): Choice => ({
  id,
  label,
  explanation,
});
const step = (
  node: string,
  phase: number,
  title: string,
  brief: string,
  action: string,
  lesson: string,
  choices?: Choice[],
  correct?: string,
): Objective => ({
  node,
  phase,
  title,
  brief,
  action,
  lesson,
  choices,
  correct,
});
export const missions: Mission[] = [
  {
    id: "relational",
    title: "The first commit",
    subtitle: "Deliver a transaction without breaking its durability promise.",
    difficulty: "Initiate",
    scale: "server",
    hazardCount: 0,
    seconds: 210,
    objectives: [
      step(
        "client",
        0,
        "Collect the transaction",
        "Reach the client station and pick up account 42’s update. Follow the bright objective beacon.",
        "Pick up the record",
        "A stable key identifies the record through the operation.",
      ),
      step(
        "index",
        0,
        "Find the row",
        "The row is indexed. Choose the route that avoids scanning every account.",
        "Open the index console",
        "An index narrows candidates; MVCC visibility is still checked.",
        [
          choice(
            "scan",
            "Scan every row",
            "A scan can work, but ignores the available selective index for this lookup.",
          ),
          choice(
            "seek",
            "Seek the B-tree by account ID",
            "The selective equality predicate can follow the ordered index path.",
          ),
          choice(
            "replica",
            "Broadcast to every replica",
            "Replicas do not replace the local index lookup.",
          ),
        ],
        "seek",
      ),
      step(
        "rows",
        1,
        "Create a version",
        "Bring the record to the row store and create the new visible version under the transaction rules.",
        "Write a new row version",
        "MVCC readers can retain a prior snapshot; a dirty row is not yet a durable commit.",
      ),
      step(
        "wal",
        2,
        "Make the log durable",
        "A dirty page is in memory. What must precede a durable data-page write?",
        "Inspect the log contract",
        "Write-ahead logging protects recovery before data pages are flushed.",
        [
          choice(
            "page",
            "Flush the data page first",
            "WAL must precede the corresponding durable page.",
          ),
          choice(
            "cache",
            "Treat the cache as the durable copy",
            "Volatile cache contents do not satisfy the selected durability contract.",
          ),
          choice(
            "wal",
            "Persist the required WAL record",
            "The log records the change before the associated page must be durable.",
          ),
        ],
        "wal",
      ),
      step(
        "replica",
        3,
        "Honor the synchronous promise",
        "This transaction is configured to wait for a durable synchronous standby.",
        "Verify the acknowledgement",
        "A TCP receipt is not an application durability acknowledgement.",
        [
          choice(
            "durable",
            "Wait for the configured durable standby ACK",
            "This meets the stated synchronous acknowledgement policy.",
          ),
          choice(
            "tcp",
            "Accept a TCP ACK as a commit ACK",
            "TCP confirms byte delivery, not the database durability condition.",
          ),
          choice(
            "local",
            "Return after local memory changes",
            "That silently weakens the selected synchronous promise.",
          ),
        ],
        "durable",
      ),
      step(
        "client",
        4,
        "Return the committed result",
        "Carry the acknowledgement back to the client. The data-page checkpoint can happen later.",
        "Deliver COMMIT OK",
        "Success reflects the selected acknowledgement policy; checkpoints are a separate process.",
      ),
    ],
  },
  {
    id: "document",
    title: "The right shard",
    subtitle: "Route one tenant’s document without scatter-gather.",
    difficulty: "Operator",
    scale: "cluster",
    hazardCount: 2,
    seconds: 210,
    objectives: [
      step(
        "client",
        0,
        "Collect the document",
        "Pick up the nested product document for tenant north and SKU 42.",
        "Collect the document",
        "A flexible document model still needs schema and index discipline.",
      ),
      step(
        "catalog",
        1,
        "Read ownership",
        "Retrieve the current shard-key ownership map from the metadata station.",
        "Resolve routing metadata",
        "Ownership changes need current metadata; directory names do not define ownership.",
      ),
      step(
        "router",
        1,
        "Choose a targeted route",
        "The query includes tenant and SKU, matching the illustrated shard key.",
        "Choose a routing policy",
        "Routing keys determine which shard must participate.",
        [
          choice(
            "all",
            "Send the request to every shard",
            "Scatter-gather wastes work for a request with a usable shard key.",
          ),
          choice(
            "target",
            "Target the shard owning the key",
            "The routing map can choose the relevant owner.",
          ),
          choice(
            "random",
            "Choose the least busy shard regardless of ownership",
            "A different shard may not own the requested document.",
          ),
        ],
        "target",
      ),
      step(
        "shardB",
        2,
        "Update the owner",
        "Deliver the document to Shard B. Shard A is outside this targeted request.",
        "Apply the nested-field update",
        "Secondary index maintenance is part of the update cost.",
      ),
      step(
        "replica",
        4,
        "Meet write concern",
        "Collect the requested acknowledgements before completing the document operation.",
        "Confirm the configured write concern",
        "Write acknowledgement and later read visibility are separate settings.",
      ),
    ],
  },
  {
    id: "keyvalue",
    title: "Cache avalanche",
    subtitle: "Protect the source of truth during a cache miss.",
    difficulty: "Operator",
    scale: "cluster",
    issue: "hotspot",
    hazardCount: 2,
    seconds: 210,
    objectives: [
      step(
        "client",
        0,
        "Collect the key",
        "Pick up session:42 and bring it to the slot owner.",
        "Collect the lookup",
        "Hashing many keys does not guarantee balanced request rates.",
      ),
      step(
        "router",
        0,
        "Resolve the hash slot",
        "Resolve the slot owner from the current routing map.",
        "Resolve key ownership",
        "Redis Cluster uses 16,384 hash slots; ownership can move.",
      ),
      step(
        "cache",
        1,
        "Handle the miss",
        "Many clients want the same missing value. Keep the database safe.",
        "Choose a miss policy",
        "Coalescing same-key misses prevents a thundering herd.",
        [
          choice(
            "duplicate",
            "Send every miss to the database independently",
            "That amplifies the herd on the backing store.",
          ),
          choice(
            "empty",
            "Cache an empty value forever",
            "That changes application results and freshness semantics.",
          ),
          choice(
            "coalesce",
            "Coalesce the same-key fetch and bound fallback",
            "A single-flight style fetch reduces duplicate backend work.",
          ),
        ],
        "coalesce",
      ),
      step(
        "store",
        2,
        "Fetch authoritative data",
        "Read the real session from the backing store. The application owns this cache-aside fetch.",
        "Read the authoritative record",
        "A cache owner is not automatically the source of truth.",
      ),
      step(
        "cache",
        3,
        "Refill with expiry",
        "Return the value to the cache with a deliberate TTL and invalidation policy.",
        "Refill the cache",
        "Expiry limits residence; it does not guarantee immediate freshness after updates.",
      ),
    ],
  },
  {
    id: "widecolumn",
    title: "The compaction shift",
    subtitle: "Keep a write path healthy while sorted files merge.",
    difficulty: "Operator",
    scale: "cluster",
    issue: "compaction",
    hazardCount: 3,
    seconds: 220,
    objectives: [
      step(
        "client",
        0,
        "Collect a partition mutation",
        "Pick up a reading for device 42 and its timestamp.",
        "Collect the mutation",
        "Partition keys define ownership and query shape.",
      ),
      step(
        "log",
        1,
        "Append before loss",
        "Make the illustrated commit-log append under the selected durability policy.",
        "Append the mutation",
        "A log append avoids rewriting sorted files for every update.",
      ),
      step(
        "memory",
        2,
        "Buffer and acknowledge",
        "Place the mutation in ordered memory; replica acknowledgements follow the configured consistency level.",
        "Update the memtable",
        "A memtable flush and a compaction are different operations.",
      ),
      step(
        "files",
        3,
        "Create the sorted run",
        "Flush the memtable into a new immutable file.",
        "Flush a sorted run",
        "Reads may consult several runs until consolidation.",
      ),
      step(
        "files",
        4,
        "Make room for the merge",
        "Compaction is competing with writes and temporary disk space is tight.",
        "Choose a pressure response",
        "Compaction needs headroom and admission control.",
        [
          choice(
            "unbounded",
            "Accept unlimited writes until memory runs out",
            "Unbounded admission cannot create storage or compaction capacity.",
          ),
          choice(
            "throttle",
            "Throttle ingest and reserve merge headroom",
            "This gives the background work time and space to recover.",
          ),
          choice(
            "skip",
            "Discard unmerged files to save space",
            "Those files can contain live data.",
          ),
        ],
        "throttle",
      ),
    ],
  },
  {
    id: "graph",
    title: "Follow the money",
    subtitle: "Traverse a bounded neighborhood without exploding the frontier.",
    difficulty: "Operator",
    scale: "cluster",
    hazardCount: 2,
    seconds: 210,
    objectives: [
      step(
        "query",
        0,
        "Collect the graph pattern",
        "Start from account 42 and look at most two transfers away.",
        "Collect the bounded query",
        "Traversal semantics include direction, types and depth.",
      ),
      step(
        "index",
        0,
        "Find the anchor",
        "Use the account index to find the starting vertex.",
        "Anchor account 42",
        "The index selects the start; adjacency drives later expansion.",
      ),
      step(
        "graph",
        1,
        "Control the frontier",
        "A high-degree account can expand into many paths.",
        "Set traversal limits",
        "Depth and degree controls keep expansion deliberate.",
        [
          choice(
            "unbounded",
            "Expand all paths without a depth bound",
            "That can grow combinatorially.",
          ),
          choice(
            "bounded",
            "Keep the requested depth and predicates",
            "This preserves the query contract while limiting work.",
          ),
          choice(
            "drop",
            "Silently drop all high-degree accounts",
            "That changes the result rather than implementing the query.",
          ),
        ],
        "bounded",
      ),
      step(
        "remote",
        2,
        "Cross the ownership boundary",
        "Carry frontier IDs to the remote neighborhood in this distributed example.",
        "Exchange the frontier",
        "Connected data partitioning can turn local expansion into network fan-out.",
      ),
      step(
        "result",
        4,
        "Return complete bounded paths",
        "Deliver eligible paths with the requested multiplicity and completeness.",
        "Return the bounded result",
        "A partial subgraph must not be silently presented as complete.",
      ),
    ],
  },
  {
    id: "vector",
    title: "Find the signal",
    subtitle: "Retrieve an eligible candidate set and rerank it.",
    difficulty: "Architect",
    scale: "cluster",
    issue: "vector",
    hazardCount: 3,
    seconds: 220,
    objectives: [
      step(
        "query",
        0,
        "Collect the query vector",
        "Carry the embedding into the same model, dimension and metric space as the index.",
        "Collect the embedding",
        "The point cloud is a 3D teaching projection of a high-dimensional space.",
      ),
      step(
        "filter",
        1,
        "Preserve tenant eligibility",
        "The query is restricted to tenant north.",
        "Apply the metadata predicate",
        "Filtering and ANN interact with recall.",
        [
          choice(
            "ignore",
            "Ignore the tenant filter for better recall",
            "That violates the eligibility and authorization contract.",
          ),
          choice(
            "compatible",
            "Use a compatible filtered search strategy",
            "The search must retain the required predicate.",
          ),
          choice(
            "all",
            "Assume post-filtering one candidate always yields top-k",
            "Selective filtering can starve a tiny shortlist.",
          ),
        ],
        "compatible",
      ),
      step(
        "index",
        2,
        "Navigate the approximate index",
        "Explore candidates without pretending to exhaustively compare every stored vector.",
        "Search the ANN structure",
        "Recall and latency must be measured together.",
      ),
      step(
        "segments",
        2,
        "Gather the searchable domain",
        "Collect candidates from the required segments. Missing segments affect completeness.",
        "Gather candidate IDs",
        "Index build, loading and updates need resource headroom.",
      ),
      step(
        "rank",
        3,
        "Rerank the shortlist",
        "A relevant item was never returned by ANN. Can reranking recover it?",
        "Choose the quality response",
        "A reranker only sees retrieved candidates.",
        [
          choice(
            "rerank",
            "Rerank the same missing candidate into existence",
            "Reranking cannot see an item absent from its input.",
          ),
          choice(
            "scores",
            "Change only the displayed score",
            "That does not retrieve a missing item.",
          ),
          choice(
            "breadth",
            "Improve candidate recall, then rerank",
            "A wider or better candidate stage can recover eligible items before reranking.",
          ),
        ],
        "breadth",
      ),
    ],
  },
  {
    id: "stream",
    title: "Hold the barrier",
    subtitle: "Carry events through state and a recoverable checkpoint.",
    difficulty: "Architect",
    scale: "cluster",
    issue: "stream",
    hazardCount: 3,
    seconds: 220,
    objectives: [
      step(
        "producer",
        0,
        "Collect the keyed event",
        "Pick up an order event with its event timestamp and stable identity.",
        "Collect the event",
        "Event time and arrival time can differ.",
      ),
      step(
        "log",
        1,
        "Preserve partition order",
        "Append and consume within an assigned ordered partition.",
        "Record the source offset",
        "Offsets identify source progress, not completed external effects.",
      ),
      step(
        "state",
        2,
        "Update the keyed window",
        "Add the event to the correct keyed event-time window.",
        "Update window state",
        "Watermarks need explicit lateness and retention policies.",
      ),
      step(
        "snapshot",
        3,
        "Capture a recovery boundary",
        "What must the checkpoint tie together?",
        "Verify the snapshot",
        "Recovery ties operator state to source positions.",
        [
          choice(
            "state",
            "Only the aggregate value, with no source position",
            "Replay cannot reliably reconstruct progress from that alone.",
          ),
          choice(
            "both",
            "Operator state and source positions",
            "A consistent recovery boundary connects state with replay progress.",
          ),
          choice(
            "clock",
            "Only the wall-clock time of the last message",
            "A timestamp alone does not identify all source offsets and state.",
          ),
        ],
        "both",
      ),
      step(
        "sink",
        4,
        "Commit end-to-end effects",
        "The job checkpoints. What else is required for exactly-once external effects here?",
        "Choose the sink contract",
        "Exactly-once effects depend on the whole source/state/sink protocol.",
        [
          choice(
            "compatible",
            "A compatible transactional or idempotent sink",
            "The sink must participate in the promised end-to-end effect.",
          ),
          choice(
            "http",
            "Any arbitrary HTTP endpoint becomes exactly-once",
            "A checkpoint cannot impose that guarantee on an arbitrary endpoint.",
          ),
          choice(
            "fast",
            "A faster consumer alone",
            "Throughput does not establish delivery semantics.",
          ),
        ],
        "compatible",
      ),
    ],
  },
  {
    id: "timeseries",
    title: "A matter of time",
    subtitle: "Keep time buckets and rollups mathematically correct.",
    difficulty: "Architect",
    scale: "cluster",
    hazardCount: 2,
    seconds: 210,
    objectives: [
      step(
        "sensors",
        0,
        "Collect the measurement",
        "Carry a device ID, event timestamp and value through the ingest path.",
        "Collect the sample",
        "Retain identity and event time through encoding.",
      ),
      step(
        "buffer",
        1,
        "Validate and batch",
        "Batch valid samples before routing them to bounded time buckets.",
        "Build an ingest batch",
        "Batching amortizes I/O; arbitrary accumulation is not free.",
      ),
      step(
        "window",
        1,
        "Choose the partition dimensions",
        "An increasing timestamp is concentrating writes.",
        "Choose a bucket key",
        "Time and entity dimensions can distribute a bounded workload.",
        [
          choice(
            "time",
            "Use only the newest timestamp range for every entity",
            "That can leave all current writes on one hot range.",
          ),
          choice(
            "entity",
            "Use entity plus a bounded time bucket",
            "This supports locality while distributing entity ownership.",
          ),
          choice(
            "one",
            "Put every series into one forever-growing partition",
            "That creates an unbounded partition.",
          ),
        ],
        "entity",
      ),
      step(
        "chunks",
        2,
        "Encode ordered history",
        "Create a compressed chunk of nearby times and values.",
        "Seal the history chunk",
        "Compression ratios depend on actual distributions.",
      ),
      step(
        "rollup",
        3,
        "Merge averages correctly",
        "Two windows have different sample counts.",
        "Choose mergeable aggregate state",
        "A weighted average needs its sum and count.",
        [
          choice(
            "mean",
            "Average the two averages without their counts",
            "Unequal window sizes make that wrong.",
          ),
          choice(
            "sumcount",
            "Merge sums and counts, then divide",
            "This preserves the weights of the underlying samples.",
          ),
          choice(
            "last",
            "Keep only the most recent average for the whole interval",
            "That drops the older window from the query.",
          ),
        ],
        "sumcount",
      ),
    ],
  },
  {
    id: "lakehouse",
    title: "The 10 PB contract",
    subtitle: "Meet a real I/O-model constraint without shrinking the dataset.",
    difficulty: "Architect",
    scale: "cluster",
    issue: "shuffle",
    hazardCount: 3,
    seconds: 240,
    objectives: [
      step(
        "query",
        0,
        "Collect the analytical contract",
        "The estate contains 100 billion 100 kB records: 10 PB raw. Deliver the same dataset under the stated bounds.",
        "Accept the 10 PB contract",
        "Record count and record size are independent dimensions.",
      ),
      step(
        "catalog",
        0,
        "Resolve the snapshot",
        "Read one coherent table snapshot and its manifests.",
        "Resolve snapshot 12",
        "An object PUT is not an atomic multi-file table commit.",
      ),
      step(
        "files",
        1,
        "Prune before reading",
        "Avoid unrelated partitions and columns while preserving the query.",
        "Apply compatible pruning",
        "Bytes never read are often the cheapest optimization.",
      ),
      {
        ...step(
          "workers",
          2,
          "Engineer the capacity plan",
          "Use the Capacity tool: retain 10 PB, at least three replicas, no more than 96 workers, at most 150 TB physical per worker, and an eight-hour scan + transfer floor. Return here to validate.",
          "Validate the capacity plan",
          "This is an optimistic disaggregated I/O model, not a measured query-runtime guarantee.",
        ),
        capacity: true,
      },
      step(
        "exchange",
        3,
        "Reduce the shuffle",
        "The query groups rows by region. What can reduce network exchange?",
        "Choose the exchange plan",
        "Mergeable partial aggregates can be formed near the scan.",
        [
          choice(
            "partial",
            "Filter and partially aggregate before exchange",
            "This reduces transmitted states when query semantics permit.",
          ),
          choice(
            "raw",
            "Always transmit every raw column to every worker",
            "That needlessly multiplies traffic for this query.",
          ),
          choice(
            "ignore",
            "Drop heavy keys from the result",
            "That changes the answer rather than solving skew.",
          ),
        ],
        "partial",
      ),
      step(
        "result",
        4,
        "Deliver the merged result",
        "Bring the small final answer home without confusing result size with bytes scanned.",
        "Deliver the analytical result",
        "A tiny result can require a large scan, exchange and spill budget.",
      ),
    ],
  },
  {
    id: "search",
    title: "Every shard counts",
    subtitle: "Turn terms into a complete, honest ranked response.",
    difficulty: "Operator",
    scale: "cluster",
    hazardCount: 2,
    seconds: 210,
    objectives: [
      step(
        "query",
        0,
        "Collect the search request",
        "Take a text query and tenant filter to the analyzer.",
        "Collect the query",
        "Query analysis is part of the matching contract.",
      ),
      step(
        "analyzer",
        0,
        "Normalize compatible terms",
        "Use token rules compatible with the indexed fields.",
        "Analyze the text",
        "Full-text search is not a raw substring scan over every document.",
      ),
      step(
        "postings",
        1,
        "Visit the inverted index",
        "Retrieve candidate document IDs from the postings lists.",
        "Read term postings",
        "A candidate ID is different from the full source document.",
      ),
      step(
        "shard",
        2,
        "Handle a missing shard",
        "One required shard cannot answer and no eligible replica is available.",
        "Choose an honest response",
        "Completeness must be part of the result contract.",
        [
          choice(
            "hide",
            "Return other shards and silently claim completeness",
            "Those hits do not prove a complete global top-k.",
          ),
          choice(
            "explicit",
            "Fail or explicitly flag partial results by policy",
            "The application must know whether the response is incomplete.",
          ),
          choice(
            "zero",
            "Invent an empty result for the missing shard",
            "That substitutes unknown data with an unsupported conclusion.",
          ),
        ],
        "explicit",
      ),
      step(
        "merge",
        4,
        "Merge and return",
        "Merge shard-local candidates, fetch the requested fields and preserve result status.",
        "Deliver ranked hits",
        "Search refresh visibility and durable write acknowledgement are different boundaries.",
      ),
    ],
  },
  {
    id: "object",
    title: "The archive rescue",
    subtitle: "Complete and verify an object, then plan a safe recovery.",
    difficulty: "Resilience lead",
    scale: "multicloud",
    hazardCount: 4,
    seconds: 230,
    objectives: [
      step(
        "client",
        0,
        "Collect the binary asset",
        "Carry the video object key, bytes and metadata into the upload path.",
        "Collect the asset",
        "Object metadata and encryption access matter during recovery too.",
      ),
      step(
        "parts",
        1,
        "Transfer logical parts",
        "Upload bounded parts and retain their identities for selective retry.",
        "Transfer the upload parts",
        "Multipart API parts do not disclose a provider’s physical storage stripes.",
      ),
      step(
        "metadata",
        2,
        "Verify the completed object",
        "Which integrity rule is safe across supported multipart behavior?",
        "Choose a checksum rule",
        "Use the documented integrity mechanism.",
        [
          choice(
            "etag",
            "Assume every ETag is a full-object MD5",
            "That assumption is not universal for multipart or service configurations.",
          ),
          choice(
            "size",
            "Use byte count alone as proof of integrity",
            "Equal length does not prove equal contents.",
          ),
          choice(
            "checksum",
            "Validate the documented checksum and completion",
            "The supported integrity metadata is the proper verification boundary.",
          ),
        ],
        "checksum",
      ),
      step(
        "objects",
        4,
        "Recover after an accidental delete",
        "The deletion propagated to a live replica.",
        "Choose a recovery source",
        "Replication and backup protect different failure modes.",
        [
          choice(
            "replica",
            "Trust that a live replica always undoes deletes",
            "A replica can faithfully copy the damaging operation.",
          ),
          choice(
            "backup",
            "Use a verified version or isolated recoverable backup",
            "Recovery needs a safe data version plus metadata, access and verification.",
          ),
          choice(
            "index",
            "Use the search index as a complete binary backup",
            "An index is not necessarily a copy of the original object bytes.",
          ),
        ],
        "backup",
      ),
      step(
        "consumer",
        4,
        "Verify the restored read",
        "Retrieve the required range with metadata, permissions and integrity intact.",
        "Deliver the verified asset",
        "A restored object is useful only when the application can read and validate it.",
      ),
    ],
  },
  {
    id: "spatial",
    title: "Beyond the bounding box",
    subtitle: "Separate broad-phase candidates from exact spatial truth.",
    difficulty: "Operator",
    scale: "cluster",
    hazardCount: 2,
    seconds: 210,
    objectives: [
      step(
        "query",
        0,
        "Collect the viewport",
        "Carry the query geometry in the required coordinate reference system.",
        "Collect the spatial query",
        "Degrees and metric distances are not interchangeable.",
      ),
      step(
        "index",
        1,
        "Prune by bounds",
        "Use the spatial index to reject non-overlapping regions.",
        "Read bounding candidates",
        "A bounding-box hit is only a candidate.",
      ),
      step(
        "tiles",
        2,
        "Preserve boundary ownership",
        "Bring candidate geometries from the relevant spatial partitions.",
        "Route candidate geometries",
        "Border-crossing shapes and dense-region skew need explicit handling.",
      ),
      step(
        "exact",
        3,
        "Test the real geometry",
        "A bounding rectangle overlaps the viewport. Is that sufficient to return the polygon?",
        "Choose the exact test",
        "Broad-phase pruning must be followed by the requested exact predicate.",
        [
          choice(
            "bounds",
            "Return every bounding-box hit as an exact match",
            "Bounds can overlap while the actual geometries do not.",
          ),
          choice(
            "exact",
            "Evaluate the exact geometry predicate",
            "This removes broad-phase false positives under the query semantics.",
          ),
          choice(
            "center",
            "Return only shapes whose center lies inside",
            "That implements a different spatial condition.",
          ),
        ],
        "exact",
      ),
      step(
        "result",
        4,
        "Deliver matching features",
        "Return the required geometry resolution and attributes.",
        "Deliver the spatial result",
        "Payload simplification can trade detail; it must preserve application needs.",
      ),
    ],
  },
];

export type GameStatus =
  | "idle"
  | "playing"
  | "terminal"
  | "paused"
  | "won"
  | "lost";
export interface GameState {
  mission: SystemId | null;
  run: number;
  status: GameStatus;
  objective: number;
  integrity: number;
  credits: number;
  elapsed: number;
  mistakes: number;
  hits: number;
  score: number;
  carrying: boolean;
  pickups: string[];
  message: string;
}
export const idleGame: GameState = {
  mission: null,
  run: 0,
  status: "idle",
  objective: 0,
  integrity: 100,
  credits: 120,
  elapsed: 0,
  mistakes: 0,
  hits: 0,
  score: 0,
  carrying: false,
  pickups: [],
  message: "",
};
export type GameEvent =
  | { type: "tick"; seconds: number }
  | { type: "interact"; node: string; distance: number }
  | { type: "answer"; choice?: string; load: ModelInput }
  | { type: "hit" }
  | { type: "pickup"; id: string }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "close" }
  | { type: "quit" };
export const missionFor = (id: SystemId) => missions.find((m) => m.id === id)!;
export function currentObjective(state: GameState) {
  return state.mission
    ? missionFor(state.mission).objectives[
        Math.min(
          state.objective,
          missionFor(state.mission).objectives.length - 1,
        )
      ]
    : null;
}
export const isGameActive = (state: GameState) =>
  ["playing", "paused", "terminal"].includes(state.status);
export function startGame(id: SystemId, run: number): GameState {
  return {
    ...idleGame,
    pickups: [],
    mission: id,
    run,
    status: "playing",
    message:
      "Follow the objective beacon. Move close and press E to open a station.",
  };
}
export function capacityGoal(load: ModelInput) {
  const result = capacityModel(load);
  return [
    {
      label: "Retain the 10 PB / 100 billion-record dataset",
      pass: load.records === 1e11 && load.bytesPerRecord === 100000,
    },
    {
      label: "Scale out with at least three copies",
      pass: load.mode === "out" && load.replicas >= 3,
    },
    { label: "Use no more than 96 workers", pass: load.nodes <= 96 },
    {
      label: "At most 150 TB physical per worker",
      pass: result.physicalBytes / result.workers <= 150e12,
    },
    {
      label: "At most 8 hours for the modeled I/O floor",
      pass: result.scanSeconds <= 8 * 3600,
    },
  ];
}
const checkLoss = (state: GameState): GameState =>
  state.integrity <= 0 || state.credits <= 0
    ? {
        ...state,
        status: "lost",
        message:
          state.integrity <= 0
            ? "Training integrity exhausted. Review the route and retry."
            : "Engineering budget exhausted. Review the tradeoffs and retry.",
      }
    : state;
export function reduceGame(state: GameState, event: GameEvent): GameState {
  if (event.type === "quit") return { ...idleGame, run: state.run };
  if (!state.mission) return state;
  const mission = missionFor(state.mission),
    objective = currentObjective(state)!;
  if (event.type === "pause" && ["playing", "terminal"].includes(state.status))
    return {
      ...state,
      status: "paused",
      message: "Mission paused. Your cargo and objectives are retained.",
    };
  if (event.type === "resume" && state.status === "paused")
    return {
      ...state,
      status: "playing",
      message: "Mission resumed. Follow the beacon.",
    };
  if (event.type === "close" && state.status === "terminal")
    return {
      ...state,
      status: "playing",
      message: "Console closed. The objective is still pending.",
    };
  if (event.type === "tick" && state.status === "playing") {
    const elapsed = state.elapsed + Math.max(0, Math.min(1, event.seconds));
    return elapsed >= mission.seconds
      ? {
          ...state,
          elapsed,
          status: "lost",
          message:
            "The contract window elapsed. Retry with a more deliberate route.",
        }
      : { ...state, elapsed };
  }
  if (event.type === "hit" && state.status === "playing")
    return checkLoss({
      ...state,
      integrity: Math.max(0, state.integrity - 12),
      credits: Math.max(0, state.credits - 5),
      hits: state.hits + 1,
      message:
        "Rogue packet impact: −12 integrity, −5 budget. Avoid the moving red trails.",
    });
  if (
    event.type === "pickup" &&
    state.status === "playing" &&
    !state.pickups.includes(event.id)
  )
    return {
      ...state,
      integrity: Math.min(100, state.integrity + 12),
      credits: Math.min(120, state.credits + 4),
      pickups: [...state.pickups, event.id],
      message: "Repair chip recovered: integrity and budget replenished.",
    };
  if (event.type === "interact" && state.status === "playing") {
    if (event.distance > 2.85)
      return {
        ...state,
        message: "Move within interaction range of the station.",
      };
    if (event.node !== objective.node)
      return {
        ...state,
        message: "This is not the current objective. Follow the bright beacon.",
      };
    return { ...state, status: "terminal", message: "" };
  }
  if (event.type === "answer" && state.status === "terminal") {
    const valid = objective.capacity
      ? capacityGoal(event.load).every((g) => g.pass)
      : objective.choices
        ? event.choice === objective.correct
        : event.choice === "confirm";
    if (!valid) {
      const selected = objective.choices?.find((c) => c.id === event.choice);
      return checkLoss({
        ...state,
        credits: Math.max(0, state.credits - (objective.capacity ? 8 : 22)),
        integrity: Math.max(0, state.integrity - (objective.capacity ? 0 : 15)),
        mistakes: state.mistakes + 1,
        message: objective.capacity
          ? "The plan misses a contract constraint. Inspect the checklist and tune the Capacity tool."
          : selected?.explanation ||
            "Choose an action that meets the stated contract.",
      });
    }
    const won = state.objective + 1 >= mission.objectives.length;
    const credits = state.credits - 8;
    if (credits <= 0) return checkLoss({ ...state, credits: 0 });
    const base = {
      ...state,
      objective: state.objective + 1,
      credits,
      status: won ? ("won" as const) : ("playing" as const),
      carrying: !won,
      score: state.score + 100,
      message: objective.lesson,
    };
    return won
      ? {
          ...base,
          score:
            base.score +
            base.integrity * 2 +
            credits +
            (base.mistakes === 0 ? 250 : 0) +
            Math.max(0, Math.round(120 - base.elapsed / 2)),
        }
      : base;
  }
  return state;
}
export const starsFor = (state: GameState) =>
  state.mistakes === 0 && state.hits === 0
    ? 3
    : state.mistakes <= 1 && state.integrity >= 60
      ? 2
      : 1;
export interface MissionRecord {
  score: number;
  stars: number;
  seconds: number;
}
export type Campaign = Partial<Record<SystemId, MissionRecord>>;
export const campaignKey = "data-scale.campaign.v1";
export function recordVictory(campaign: Campaign, state: GameState): Campaign {
  if (state.status !== "won" || !state.mission) return campaign;
  const old = campaign[state.mission];
  return {
    ...campaign,
    [state.mission]: {
      score: Math.max(old?.score || 0, state.score),
      stars: Math.max(old?.stars || 0, starsFor(state)),
      seconds: Math.min(old?.seconds ?? Infinity, state.elapsed),
    },
  };
}
export function parseCampaign(raw: string | null): Campaign {
  try {
    const data = JSON.parse(raw || "{}");
    const out: Campaign = {};
    for (const m of missions) {
      const r = data?.[m.id];
      if (
        r &&
        Number.isFinite(r.score) &&
        r.score >= 0 &&
        r.score <= 5000 &&
        [1, 2, 3].includes(r.stars) &&
        Number.isFinite(r.seconds) &&
        r.seconds >= 0 &&
        r.seconds <= 10000
      )
        out[m.id] = {
          score: Math.floor(r.score),
          stars: r.stars,
          seconds: r.seconds,
        };
    }
    return out;
  } catch {
    return {};
  }
}
export const campaignXP = (campaign: Campaign) =>
  Object.values(campaign).reduce(
    (total, record) => total + (record?.score || 0),
    0,
  );
export const campaignRank = (campaign: Campaign) =>
  campaignXP(campaign) >= 7000
    ? "Resilience lead"
    : campaignXP(campaign) >= 3000
      ? "Systems architect"
      : campaignXP(campaign) >= 1000
        ? "Operator"
        : "Initiate";
