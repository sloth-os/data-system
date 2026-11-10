# A single immersive systems workspace

DATA / SCALE has one application surface and one WebGL scene. The user changes
questions through contextual tools while preserving the operation, camera,
workload and selected architecture. There is no page router or separate viewer.

## Shared context

`ImmersiveLab` owns the system family, operation stage, playback, component or
exchange selection, scale lens, modeled workload, project reference, challenge
and recovery drill. `WorkspacePanel` receives this state and callbacks; it does
not create another simulation. `ImmersiveScene` receives the same state and
renders its consequences.

The tool rail is part of the world frame. Inspector, Scale, Data paths, Capacity,
Projects, Challenges, Recovery and Sources reveal different aspects of the
current example. Passive tool changes do not recreate the canvas, change the
camera or reset a stage. Choosing a different architecture rebuilds its logical
objects while preserving the camera pose, scale and workload.

## Scale and performance in the world

CPU, server, cluster and multi-cloud lenses add contextual envelopes. They do not
arbitrarily assign an index, table and WAL to different hosts: those logical
components may share a process. Worker markers, replica indicators and a storage
stack visualize capacity assumptions. The numeric model remains independent of
animation timing and of the operation's selected durability contract.

CPU/server contexts use the scale-up model; cluster/regional contexts use the
scale-out model. At 100 billion records, 1 kB each is 100 TB raw and 100 kB each
is 10 PB. Compression and replicas affect physical storage. The scene's spatial
layout and packet count are not measures of resource usage or latency.

## Journeys and implementation references

Transactional, analytical and stream journey presets select an appropriate
system family and use its existing timeline. Component and exchange selection
opens the same inspector. Sixteen project profiles explain deployment, core
algorithms, operation paths and tradeoffs. Choosing a profile brings its family
into the same world; the story is a family example rather than an exact model
of every named project's internals.

## Challenges and recovery

All ten challenge mechanisms are rendered in `worldContext.ts`, using the
current scene and camera. They select relevant architecture/stage/scale context
and remain active when another tool is opened. Clearing a challenge retains the
architecture and workload.

All five recovery runbooks control the same dependency fault and operation
clock. Starting a drill holds the affected stage, disables downstream success,
and locks architecture and workload changes until completion or explicit reset.
The corruption scenario starts at a safe boundary; a 10 PB restore scenario sets
the modeled dataset and regional context. A runbook step is a user-confirmed
simulation milestone, not a measurement of bytes restored or achieved RTO.

## Access and delivery

Projected component and exchange labels use accessible HTML buttons and
collision-aware placement with leader lines. The mobile inspector is a
closeable sheet above the same scene. Fullscreen includes system selection and
all tools. Keyboard controls, reduced-motion startup and a WebGL fallback are
part of the same interaction contract.

The site is a static Vite build. Tests verify shared-canvas continuity,
architecture/data reference integrity, capacity invariants, dependency gating,
all operation stages and tool workflows. See `immersive-lab.md` for interaction
details and `research.md` for technical references.
