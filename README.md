# DATA / SCALE

An interactive systems atlas for understanding how data-intensive systems scale from CPU caches to servers, distributed clusters, and multiple clouds—up to 100 billion records and 10 PB.

Explore animated 3D topologies, data movement and network traffic, workload-dependent performance tradeoffs, open-source architectures, contemporary engineering issues, and disaster recovery. The site is a static application; it needs no database, service credentials, or backend.

The home view is an immersive systems lab with **12 distinct architectures and 60 staged operations**: relational, document, key-value, wide-column/LSM, graph, vector, event streaming, time-series, lakehouse, full-text search, object storage, and geospatial systems. Geometry represents the data structure rather than using the same server boxes for every workload.

Select a component or a labeled exchange to inspect it. Play or step through the operation to see active paths, payload transformations, acknowledgements, replica streams, and metadata traffic. Use **Explode** to separate the layout, **Camera tour** or **Plan view** to change perspective, and **Inspect in close-up** for a component view. Each architecture has a fault scenario and an explicit recovery response. The lab also supports fullscreen focus, keyboard system selection, reduced-motion preferences, and a selectable fallback when WebGL is unavailable.

## Run locally

Use Node.js 22.12 or newer and npm:

```sh
npm ci
npm run dev -- --host 0.0.0.0
```

Open the development server address printed by Vite. Drag the visualization to orbit, use the wheel to zoom, select a node to inspect it, and use the on-screen controls to change scale or explore failure scenarios. WebGL is used for the 3D visualization, with a fallback when unavailable.

## Validate and build

```sh
npm run typecheck
npm run test:unit
npm run build
```

Browser tests exercise the application interactions:

```sh
npx playwright install chromium
npm run test:e2e
```

The production output is in `dist/`. To inspect it locally:

```sh
npm run preview -- --host 0.0.0.0
```

## Architecture and research

- React and TypeScript provide the application interface and interactive state.
- Three.js renders the topology and animated data movement.
- Vite builds a static website with relative asset paths, suitable for a GitHub Pages project subdirectory.
- `src/content.ts` contains the atlas's structured research content and source references.
- `src/Scene.tsx` contains the 3D visualization.
- `src/ImmersiveScene.tsx` renders architecture-specific data structures, projected component/exchange labels, stage-linked motion, camera tracking, and fault paths.
- `src/ImmersiveLab.tsx` coordinates the immersive controls, inspector, and operation timeline.
- `src/systemModels.ts` describes the 12 executable stories: components, directed exchanges, transformations, correctness boundaries, faults, and references.
- `docs/immersive-lab.md` explains the visual and interaction contracts.
- `docs/research.md` documents research scope and primary sources.

Performance figures and capacity estimates are educational models, not measured benchmarks or production sizing guarantees. Hardware, record sizes, skew, indexes, compaction, replication, compression, network contention, and workload shape all change real results. The site distinguishes formulas and assumptions from architectural claims. Its ten hot issues are an editorial selection of important engineering problems, not a measured popularity ranking. Consult the linked primary documentation and benchmark your own workload before choosing a deployment.

## Publish with GitHub Pages

1. In the repository, open **Settings → Pages** and select **GitHub Actions** as the build and deployment source.
2. Push the site to `main`, or run **Deploy systems atlas to GitHub Pages** from the Actions tab.
3. The workflow installs locked dependencies, checks types, runs unit tests, builds the site, uploads `dist/`, and deploys through the `github-pages` environment.

The deployment job has `pages: write` and `id-token: write`; repository access is read-only. If the repository has environment protection rules, approve the deployment through GitHub when requested. Repository visibility, account plan, and organization policy must permit GitHub Pages. The deployment URL appears on the successful workflow run and in **Settings → Pages**.

Workflow deployments are independent of cloud development environment publication. No cloud environment settings or snapshots need to be published to build this website.
