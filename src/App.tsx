import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Github,
  Layers3,
  Sparkles,
} from "lucide-react";
import ImmersiveLab from "./ImmersiveLab";
import type { WorkspaceTool } from "./workspace";

export default function App() {
  const [tool, setTool] = useState<WorkspaceTool>("story");
  const [toolRequest, setToolRequest] = useState(0);
  function openTool(next: WorkspaceTool) {
    setTool(next);
    setToolRequest((n) => n + 1);
  }
  const [playing, setPlaying] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [speed, setSpeed] = useState(1);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (
        event.code === "Space" &&
        (event.target === document.body ||
          (event.target as HTMLElement).tagName === "CANVAS")
      ) {
        event.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  return (
    <div className="app-shell immersive-mode single-workspace">
      <header className="workspace-app-header">
        <a
          className="workspace-brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            openTool("story");
          }}
          aria-label="Data Scale workspace"
        >
          <span>
            <Layers3 size={23} />
          </span>
          <strong>
            DATA / SCALE<small>THE IMMERSIVE SYSTEMS ATLAS</small>
          </strong>
        </a>
        <div className="workspace-header-context">
          <i />
          ONE WORLD. EVERY TRADEOFF.
          <span>12 architectures · up to 100B records / 10 PB</span>
        </div>
        <div className="workspace-header-actions">
          <button onClick={() => openTool("guide")}>
            <Sparkles size={16} />
            <span>Explore the world</span>
          </button>
          <button
            aria-label="Sources and methodology"
            onClick={() => openTool("sources")}
          >
            <BookOpen size={17} />
          </button>
          <a
            href="https://github.com/sloth-os/data-system"
            target="_blank"
            rel="noreferrer"
            aria-label="Source on GitHub"
          >
            <Github size={17} />
            <ArrowUpRight size={12} />
          </a>
        </div>
      </header>
      <main id="main-content">
        <h1 className="sr-only">
          DATA / SCALE — one immersive systems workspace
        </h1>
        <ImmersiveLab
          toolRequest={toolRequest}
          tool={tool}
          onTool={setTool}
          playing={playing}
          onPlaying={setPlaying}
          speed={speed}
          onSpeed={setSpeed}
        />
      </main>
    </div>
  );
}
