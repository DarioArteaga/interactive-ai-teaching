# Changelog

Fuente de verdad de todos los cambios realizados al proyecto.

---

## 2026-03-26

### Migración a Light Theme y Fix de Build (AgentOps & RAG Pipeline)

- Migración completa de los módulos interactivos (`agentops.tsx` y `rag-pipeline.tsx`) hacia un esquema **Light Theme**.
- **Accesibilidad y Legibilidad**: 
  - Transición del fondo de página a Off-White (`var(--bg-base): #F8F9FA`) y superficies limpias (`var(--bg-surface): #FFFFFF`).
  - Textos actualizados para estricto contraste (`--text-primary: #111827`, `--text-secondary: #4B5563`).
  - Escala tipográfica incrementada globalmente para mitigar la fatiga visual (textos pequeños previamente de 9px-10px subidos a un mínimo de 12px con un mayor peso de fuente).
- **Paleta de Estado (WCAG)**: Los colores neón de estado fueron reemplazados por variantes desaturadas legibles sobre fondos claros (`#2E7D32`, `#F57F17`, `#C62828`, `#00838F`).
- **Fix Crítico de Framework (Vite/TypeScript)**: 
  - Se eliminaron archivos `.js` residuales en el directorio `src/` que `tsc` compilaba sin querer y que Vite priorizaba sobre los `.tsx`, bloqueando el Hot-Reloading.
  - `tsconfig.json` fortificado con `"noEmit": true`.
  - Comando build en `package.json` corregido a `tsc --noEmit && vite build` para evitar nuevas colisiones transpiladas en el entorno local.

### Refactorización UX/UI del landing page

- Rediseño completo de la paleta de colores para cumplir WCAG AA:
  - Fondo base de `#07070C` → `#0E0F14` (dark mode menos agresivo).
  - Textos con ratios de contraste adecuados: primario `#E8E8F0` (~14:1), secundario `#9A9AB0` (~5.5:1), terciario `#6B6B80` (~3.8:1).
  - Acentos desaturados: cyan `#5EC4D4` (antes `#00E5FF`), orange `#D4895E` (antes `#FF6D00`).
- Tamaño mínimo de texto elevado a 12px (antes 10-11px en footer, eyebrow y stats).
- Introducido sistema de design tokens en CSS custom properties: `--bg-*`, `--text-*`, `--accent-*`, `--space-*`, `--radius-*`, `--text-*` (tipografía), `--ease-out`, `--duration-*`.
- Eliminadas ~200 líneas de inline styles de `App.tsx` — migradas a clases BEM en `shared.css`.
- Hover y focus states migrados de JavaScript (`onMouseEnter`/`onMouseLeave`) a CSS puro (`:hover`, `:focus-visible`).
- Uso de `color-mix(in srgb, ...)` para variantes de opacidad de accent sin concatenación de hex strings.
- Accesibilidad: `role="button"`, `tabIndex={0}`, `onKeyDown` en module cards; `outline` en `:focus-visible` para navegación por teclado; tag semántico `<header>`.
- Media query responsive para `max-width: 768px` (grid colapsa a 1 columna, padding y tipografía reducidos).

---

## 2025-03-26

### Integración del módulo AgentOps y arquitectura multi-módulo

- Creado `src/modules/agentops.tsx` — módulo interactivo del lifecycle de AgentOps (5 fases, 33 conceptos), portado y adaptado al design system del proyecto.
- Creado `src/App.tsx` — landing page con navegación entre módulos. Cards con hover animado, stats por módulo, botón flotante de retorno. Preparado para escalar a N módulos.
- Creado `src/modules/rag-pipeline.tsx` — módulo RAG como componente independiente dentro de la nueva estructura (consolidando el trabajo previo sobre el componente original).
- Creado `src/shared.css` — estilos globales compartidos: tipografía (Inter + JetBrains Mono via Google Fonts), animaciones (`fadeUp`, `pulseGlow`, `flowDot`, `slideIn`, `float`, `shimmer`), clases utilitarias (`.mono`, `.pipeline-node`, `.concept-card`, `.diag-row`, `.module-card`), scrollbar custom.
- Actualizado `src/main.tsx` — entry point ahora monta `App` e importa `shared.css`.
- Eliminados bloques `<style>` duplicados de `rag-pipeline.tsx` y `App.tsx` (ahora centralizados en `shared.css`).

### Refactorización visual del módulo RAG Pipeline

- Reescritura completa del componente RAG con mejoras visuales significativas:
  - Tipografía: Inter (sans-serif) + JetBrains Mono (monospace), tamaños base de 13-15px (antes 8-11px).
  - Título principal: 32px bold (antes 20px). Números del pipeline: 28px en nodos, 56px en panel lateral.
  - Grid de conceptos: mínimo 340px por card (antes 240px). Panel lateral: 380px (antes 280px).
  - Pipeline nodes con hover lift (`translateY(-3px)`), glow ambiental por etapa activa, dot indicator animado.
  - Conectores con partículas animadas (`flowDot`) en etapas ya visitadas.
  - Concept cards con glassmorphism, accent line superior al expandir, iconos por status (`◆` recomendado, `▲` situacional, `✕` evitar, `○` concepto).
  - Stats bar en panel izquierdo con conteo por clasificación.
  - Panel de diagnóstico con filas clickeables que navegan a la etapa responsable, dots con glow y líneas animadas.
  - Eliminada la fila duplicada de tabs (el pipeline flow ya es clickeable).
  - Agregados campos `num`, `tag`, `sub` a los stage data (eliminados ternarios inline).
  - Semántica HTML mejorada (`header`, `footer`).
- Todo el contenido (8 etapas, 44 conceptos, textos, definiciones) conservado intacto.

## 2025-03-25

### Scaffold del proyecto

- Inicializado proyecto manualmente con Vite + React + TypeScript (sin `create-vite` por conflicto con archivos existentes).
- Creado `package.json` con scripts `dev`, `build`, `preview`.
- Instaladas dependencias: `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`, `@types/react-dom`.
- Creado `vite.config.ts` con plugin React.
- Creado `tsconfig.json` con target ES2020, JSX react-jsx, strict mode.
- Creado `index.html` con meta viewport, título y mount point `#root`.
- Creado `src/main.tsx` como entry point inicial.

### Origen del contenido

El contenido de los módulos proviene de dos conversaciones en Claude Web sobre AI engineering. Los artifacts y transcripciones originales fueron usados como fuente durante el desarrollo y no forman parte del repositorio.

- **RAG Pipeline** — originado en una sesión sobre optimización de pipelines RAG con data engineering. Cubre anisotropía, colisión semántica, chunking strategies, query engineering, hybrid search, reranking, context assembly, LLM generation y evaluation con RAGAS. Derivó en `src/modules/rag-pipeline.tsx`.
- **AgentOps** — originado en una sesión sobre el concepto emergente de AgentOps y su ciclo de vida end-to-end. Cubre las 4 fases (Diseño, Desarrollo, Deployment, Optimización) y los 4 pilares transversales (Tool Governance, Cost Tracking, HITL, Seguridad). Derivó en `src/modules/agentops.tsx`.
