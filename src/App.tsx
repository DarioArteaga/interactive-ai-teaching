import { useState, useEffect } from "react";
import RAGRecap from "./modules/rag-pipeline";
import AgentOpsRecap from "./modules/agentops";

const modules = [
  {
    id: "rag",
    label: "RAG Pipeline",
    description: "End-to-End RAG Engineering",
    icon: "⬡",
    accent: "var(--accent-cyan)",
    component: RAGRecap,
    stages: 8,
    concepts: 45,
  },
  {
    id: "agentops",
    label: "AgentOps",
    description: "Agent Lifecycle Management",
    icon: "◎",
    accent: "var(--accent-orange)",
    component: AgentOpsRecap,
    stages: 5,
    concepts: 33,
  },
];

export default function App() {
  const [activeModule, setActiveModule] = useState<string | null>(null);

  // Historial del navegador (Back/Forward)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      setActiveModule(event.state?.module || null);
    };
    window.addEventListener("popstate", handlePopState);
    
    // Al cargar la página por primera vez
    const initialModule = window.location.hash.replace("#", "");
    if (initialModule && modules.find(m => m.id === initialModule)) {
      setActiveModule(initialModule);
    }

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const selectModule = (id: string | null) => {
    setActiveModule(id);
    if (id) {
      window.history.pushState({ module: id }, "", `#${id}`);
    } else {
      window.history.pushState(null, "", window.location.pathname);
    }
  };

  const ActiveComponent = modules.find(m => m.id === activeModule)?.component;

  if (ActiveComponent) {
    return (
      <div>
        <button
          className="back-btn mono"
          onClick={() => selectModule(null)}
        >
          ← MÓDULOS
        </button>
        <ActiveComponent />
      </div>
    );
  }

  return (
    <div className="landing">
      <div className="landing__ambient" />

      {/* Header */}
      <header className="landing__header">
        <div className="mono landing__eyebrow">
          AI Engineering — Knowledge Platform
        </div>
        <h1 className="landing__title">Interactive Learning</h1>
        <p className="landing__subtitle">
          Mapas interactivos de conceptos curados sobre ingeniería de sistemas de IA en producción.
        </p>
      </header>

      {/* Module cards */}
      <div
        className="landing__grid"
        style={{
          gridTemplateColumns: `repeat(${modules.length}, minmax(300px, 400px))`,
        }}
      >
        {modules.map((mod, i) => (
          <div
            key={mod.id}
            className="module-card"
            role="button"
            tabIndex={0}
            onClick={() => selectModule(mod.id)}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") selectModule(mod.id); }}
            style={{
              "--card-accent": mod.accent,
              animation: `fadeUp 0.6s var(--ease-out) ${i * 0.12}s both`,
            } as React.CSSProperties}
          >
            <div
              className="module-card__icon"
              style={{ animation: `float 4s ease-in-out ${i * 0.5}s infinite` }}
            >
              {mod.icon}
            </div>

            <div className="mono module-card__label">
              {mod.label.toUpperCase()}
            </div>

            <div className="module-card__title">
              {mod.description}
            </div>

            <div className="module-card__stats">
              <span className="mono module-card__stat">
                {mod.stages} etapas
              </span>
              <span className="mono module-card__stat">
                {mod.concepts} conceptos
              </span>
            </div>

            <div className="module-card__hint">
              <span className="module-card__hint-line" />
              Explorar
            </div>

            <div className="module-card__corner" />
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="landing__footer">
        <div className="mono landing__footer-label">
          CURATED KNOWLEDGE MAPS — AI ENGINEERING
        </div>
        <div className="landing__footer-links">
          <a
            href="https://github.com/DarioArteaga"
            target="_blank"
            rel="noopener noreferrer"
            className="mono landing__link"
          >
            GITHUB
          </a>
          <span className="landing__link-sep">/</span>
          <a
            href="https://www.linkedin.com/in/darioarteaga"
            target="_blank"
            rel="noopener noreferrer"
            className="mono landing__link"
          >
            LINKEDIN
          </a>
        </div>
      </footer>
    </div>
  );
}
