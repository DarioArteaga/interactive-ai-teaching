import { useState, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════ */

const stages = [
  {
    id: "infra", num: "00", label: "INFRAESTRUCTURA", tag: "QDRANT", sub: "Vector DB", color: "#F57F17",
    short: "Qdrant como vector DB de producción",
    description: "No es una etapa del pipeline en tiempo de query — es la base que habilita las decisiones del resto. Payload filtering nativo en HNSW: filtra antes de que opere el ranker de similitud, no después.",
    concepts: [
      { name: "Payload Filtering Pre-Retrieval", status: "best", def: "Filtra por metadata antes de que el HNSW opere. Chroma y PgVector filtran post-retrieval, desperdiciando slots del top-k." },
      { name: "Sparse + Dense en una colección", status: "best", def: "Qdrant almacena ambos vectores en la misma colección. No necesitas dos sistemas separados para hybrid search. El RRF interno simplifica la arquitectura." },
      { name: "Anisotropía", status: "concept", def: "Los vectores de transformers se agrupan en un cono estrecho del espacio. Alta anisotropía → los thresholds de similitud coseno pierden significado. El espacio efectivo es más bajo-dimensional de lo que sugiere el tamaño del vector." },
      { name: "Colisión Semántica", status: "concept", def: "Dos chunks semánticamente distintos convergen al mismo vecindario vectorial. Origen: chunks heterogéneos, ambigüedad léxica, o modelos sin desambiguación contextual." },
      { name: "Lost-in-the-Middle", status: "concept", def: "Los LLMs degradan su atención a chunks en posiciones intermedias del contexto. El chunk más relevante debe ir primero o último, nunca al centro." },
    ]
  },
  {
    id: "chunking", num: "01", label: "CHUNKING", tag: "CHUNKING", sub: "Corpus", color: "#00838F",
    short: "Construcción del corpus indexable",
    description: "La base del RAG. No es un problema de tamaño — es un problema de coherencia semántica y densidad informacional. Un reranker excelente no rescata chunks mal construidos.",
    concepts: [
      { name: "Fixed-Size", status: "avoid", def: "Corte por N tokens con overlap. Predecible en costo, pero parte oraciones y mezcla temas. El overlap es un parche que introduce redundancia sin resolver el problema de fondo." },
      { name: "Structure-Aware", status: "good", def: "Corte por estructura natural del documento (headers, tags, secciones). Óptimo cuando el corpus tiene estructura explícita y confiable. No funciona en PDFs escaneados ni transcripciones de voz." },
      { name: "Semantic Chunking", status: "good", def: "Detecta saltos semánticos entre oraciones consecutivas via distancia coseno. Chunks coherentes por construcción. Umbral crítico y calibrable por corpus." },
      { name: "Parent-Child (Small-to-Big)", status: "best", def: "Children pequeños (~100t) para retrieval preciso. Parents grandes (~800t) para contexto al LLM. El payload de Qdrant guarda el vínculo. Múltiples children del mismo parent = señal de boosting." },
      { name: "Contextual Embedding", status: "best", def: "El LLM genera una oración de contexto por chunk antes del embedding. Sitúa el chunk en su posición documental. Ataca directamente la brecha de registro formal/coloquial. Costo: una llamada LLM por chunk en indexación." },
    ]
  },
  {
    id: "query", num: "02", label: "QUERY ENGINEERING", tag: "QUERY ENG.", sub: "Transform", color: "#6A1B9A",
    short: "Transformación de la query antes del retrieval",
    description: "La query cruda es frecuentemente el peor input posible. El corpus está en el lenguaje del autor; la query llega en el lenguaje del usuario. Cada capa de transformación reduce esa brecha.",
    concepts: [
      { name: "Classification / Routing", status: "best", def: "Primera decisión del pipeline. Clasifica por intención (informacional, procedimental, factual) y enruta a la colección correcta. Latencia muy baja. Factual → BM25; conceptual → vector." },
      { name: "Query Rewriting", status: "good", def: "Reformula la query al registro del corpus. Resuelve referencias implícitas conversacionales. Normaliza errores de STT. Crítico para WhatsApp y Voice." },
      { name: "Query Expansion", status: "good", def: "Genera N variantes paralelas. Cada variante ataca una zona diferente del espacio semántico. Los resultados se fusionan con RRF. Costo: una llamada LLM + N búsquedas adicionales." },
      { name: "HyDE", status: "good", def: "Embeds un documento hipotético generado por el LLM en lugar de la query. El vector resultante vive en el mismo vecindario que el corpus real. Evitar en queries con datos exactos desconocidos — la alucinación aleja el vector." },
      { name: "Step-Back Prompting", status: "good", def: "Busca primero el concepto general antes que la respuesta específica. Recupera contexto conceptual que mejora el razonamiento posterior del LLM." },
      { name: "Query Decomposition", status: "good", def: "Descompone queries compuestas en sub-preguntas con retrieval independiente. Least-to-Most: resuelve primero las independientes y usa sus respuestas como contexto para las dependientes." },
    ]
  },
  {
    id: "retrieval", num: "03", label: "RETRIEVAL", tag: "RETRIEVAL", sub: "Hybrid", color: "#2E7D32",
    short: "Recuperación de candidatos del índice",
    description: "Optimizado para velocidad y recall — recupera candidatos plausibles de un índice enorme en milisegundos. BM25 y vector search tienen perfiles de error complementarios: combinarlos es cobertura, no redundancia.",
    concepts: [
      { name: "Dense Search (Vector)", status: "best", def: "Retrieval por similitud semántica en espacio vectorial. Fuerte en paráfrasis y sinónimos. Débil en términos exactos, IDs y valores numéricos específicos." },
      { name: "Sparse Search (BM25)", status: "best", def: "Retrieval léxico por frecuencia de términos. Fuerte en términos exactos, nombres propios, claves de producto. Débil en semántica difusa. Nativo en Qdrant v1.7+." },
      { name: "Hybrid Search", status: "best", def: "Combinación de dense + sparse en una sola query. Los scores no son comparables en escala — la fusión opera sobre rankings, no sobre valores absolutos." },
      { name: "RRF (Reciprocal Rank Fusion)", status: "best", def: "Fusión por posición en ranking, no por score absoluto. Elimina el problema de escala entre BM25 (no acotado) y coseno (−1 a 1). Empíricamente robusto. Nativo en Qdrant." },
      { name: "Instruction Embeddings", status: "good", def: "E5: prefijos fijos (query/passage). Nomic: prefijos por intención (search_document, clustering). Qwen3 Embedding: instrucción arbitraria en lenguaje natural — la más poderosa del stack." },
    ]
  },
  {
    id: "reranking", num: "04", label: "RERANKING", tag: "RERANKING", sub: "Cross-Enc.", color: "#E65100",
    short: "Precisión sobre el top-k del retrieval",
    description: "Recibe ~20 candidatos y tiene una sola responsabilidad: ordenarlos correctamente. Última línea de defensa antes del contexto. El retrieval no puede rescatar chunks que el reranker no recibió.",
    concepts: [
      { name: "Cross-Encoder", status: "best", def: "Lee el par (query, chunk) de forma conjunta en una sola pasada. Captura interacciones finas entre términos de ambos. Más preciso que coseno pero O(k) por query — solo viable sobre el top-k del retrieval." },
      { name: "Qwen3-Reranker-0.6B", status: "best", def: "Cross-encoder local. Comparte arquitectura base con Qwen3 Embedding — coherencia de espacio de representaciones. A 0.6B en GGUF, latencia manejable en CPU con k=20." },
      { name: "Score Threshold Mínimo", status: "best", def: "Sin threshold, el sistema siempre devuelve top-k aunque ninguno sea relevante — el LLM alucina sobre contexto irrelevante. Con threshold, el sistema puede detectar que no tiene respuesta y declinarlo explícitamente." },
      { name: "Parent Frequency Boosting", status: "good", def: "Si múltiples children del mismo parent están en el top-k, esa frecuencia es señal de relevancia. Multiplicador sobre el score del reranker antes del corte final." },
      { name: "Top-3 vs Top-5", status: "concept", def: "Top-3 para queries factuales: la respuesta está en 1-2 chunks. Top-5 para queries de síntesis: reduce riesgo de dejar fuera chunks complementarios necesarios." },
    ]
  },
  {
    id: "assembly", num: "05", label: "CONTEXT ASSEMBLY", tag: "ASSEMBLY", sub: "Context", color: "#C2185B",
    short: "Cómo se presenta la información al LLM",
    description: "El reranker eligió los chunks correctos. Context assembly determina si esa información se aprovecha o se pierde. El LLM no lee el contexto como una base de datos — lo lee como texto continuo con atención no uniforme.",
    concepts: [
      { name: "Lost-in-the-Middle Mitigation", status: "best", def: "Mayor score del reranker → posición 1. Segundo mayor → última posición. Intermedios en orden descendente. El impacto en precisión de respuesta es medible empíricamente." },
      { name: "Parent Retrieval", status: "best", def: "El child hace match en retrieval; el parent entra al contexto del LLM. Si dos children tienen el mismo parent, se recupera una sola vez. Si el parent es demasiado extenso, se usa el child + ventana expandida." },
      { name: "Deduplicación Semántica", status: "good", def: "Con hybrid search + query expansion, chunks redundantes pueden llegar al top-k. Pasada de coseno entre chunks seleccionados: si similitud > 0.92, conserva el de mayor score del reranker." },
      { name: "Metadata como Contexto", status: "good", def: "Fuente, sección, fecha y tipo del documento como prefijo de cada chunk. Le da al LLM señales de procedencia que mejoran la calibración de la respuesta. Especialmente útil con corpus mixtos." },
      { name: "Presupuesto de Tokens", status: "concept", def: "La ventana de contexto es finita. Compiten: system prompt, chunks, historial de conversación, query actual. En sistemas conversacionales, historial reciente > historial antiguo; chunks de alta relevancia > chunks de cobertura." },
    ]
  },
  {
    id: "generation", num: "06", label: "LLM GENERATION", tag: "LLM GEN.", sub: "Prompt", color: "#7B1FA2",
    short: "Prompt, parámetros y output engineering",
    description: "El LLM está decidido. Lo que queda bajo control del ingeniero son las decisiones que determinan si produce respuestas confiables, consistentes y operables en producción.",
    concepts: [
      { name: "System Prompt Architecture", status: "best", def: "Identidad + dominio + instrucción de uso del contexto + formato de output + manejo de ambigüedad. 'Responde exclusivamente con información del contexto. Si no está presente, indícalo explícitamente' no es semántico — es técnico." },
      { name: "Prompt Structure Order", status: "best", def: "System prompt → contexto recuperado → historial → query actual. El contexto antes del historial establece el marco semántico dentro del cual se interpreta todo lo que sigue." },
      { name: "Parámetros de Inferencia", status: "good", def: "Temperature 0.0–0.2 para RAG factual. Top-p 0.85–0.90. Max tokens consciente por tipo de query — un techo demasiado alto incentiva al LLM a rellenar con contenido marginal." },
      { name: "Streaming para Voice", status: "good", def: "Buffer de oración: acumula tokens hasta completar una oración, pasa inmediatamente al TTS. El usuario empieza a escuchar mientras el LLM sigue generando. La latencia percibida cae drásticamente." },
      { name: "Output Validation", status: "good", def: "Capa post-generación: structured output parsing, grounding citations, detección de respuesta fuera de dominio con LLM juez binario. Segunda línea de defensa contra alucinación." },
      { name: "Fallback y Degradación", status: "best", def: "Contexto vacío → rama explícita en system prompt, no silencio. Timeout de inferencia → respuesta estructurada + reintento asíncrono. Sin fallback definido, el comportamiento en edge cases es no determinístico." },
    ]
  },
  {
    id: "evaluation", num: "07", label: "EVALUATION", tag: "EVAL.", sub: "RAGAS", color: "#00695C",
    short: "Cerrar el loop — medir, atribuir, mejorar",
    description: "Sin evaluación el pipeline es una caja negra. No opera al final — opera en paralelo continuo. El valor real de las métricas no es el número: es su capacidad de señalar en qué capa del pipeline está el problema.",
    concepts: [
      { name: "Context Precision", status: "best", def: "¿Qué fracción de los chunks recuperados es realmente relevante? Precision baja con recall alto → el reranker no filtra suficientemente o el threshold es demasiado permisivo." },
      { name: "Context Recall", status: "best", def: "¿Está presente en los chunks toda la información necesaria para responder? Recall bajo → el chunk correcto no llegó al top-k. Diagnóstica pérdidas upstream: retrieval, chunking o embeddings." },
      { name: "Faithfulness", status: "best", def: "¿Cada afirmación de la respuesta está respaldada por el contexto? RAGAS la calcula descomponiendo la respuesta en afirmaciones atómicas. Faithfulness baja → el LLM usa conocimiento paramétrico, no el contexto." },
      { name: "Answer Relevance", status: "best", def: "¿La respuesta responde la pregunta que se hizo? Diferente a Faithfulness: puedes ser fiel al contexto y responder algo distinto. Relevance baja → problema de query engineering o retrieval, no de generación." },
      { name: "Golden Dataset", status: "best", def: "Conjunto fijo de pares (query, respuesta esperada, chunks relevantes esperados). El activo de ingeniería más valioso. 50-100 pares bien seleccionados > 1000 generados sin criterio. Bootstrapping viable con LLM sobre el corpus." },
      { name: "LLM-as-Judge", status: "good", def: "Claude Haiku vía API: mejor balance calidad/costo para evaluación asíncrona en producción. Mistral 7B local: suficiente para desarrollo y debugging sin costo. El juez evalúa sin ground truth manual." },
      { name: "Evaluación Continua", status: "good", def: "10-20% de interacciones reales pasan por el evaluador asíncrono. Detecta drift temporal — el corpus y las queries cambian, y un pipeline que funcionaba hace tres meses puede haber degradado silenciosamente." },
      { name: "Context Relevance", status: "concept", def: "Versión gradual de Context Precision. Si ya tienes Precision y Recall, añade poco diagnóstico adicional. La métrica más prescindible del conjunto RAGAS." },
    ]
  },
];

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  best:    { label: "Recomendado",    color: "#2E7D32", icon: "◆" },
  good:    { label: "Situacional",    color: "#F57F17", icon: "▲" },
  avoid:   { label: "Evitar en prod", color: "#C62828", icon: "✕" },
  concept: { label: "Concepto base",  color: "#00838F", icon: "○" },
};

const diagMap = [
  { metric: "Context Recall ↓",    layer: "Retrieval híbrido, chunking, instruction embeddings", color: "#2E7D32", stages: ["retrieval","chunking"] },
  { metric: "Context Precision ↓",  layer: "Reranker, score threshold mínimo",                   color: "#E65100", stages: ["reranking"] },
  { metric: "Faithfulness ↓",       layer: "System prompt, instrucción de uso del contexto",      color: "#7B1FA2", stages: ["generation"] },
  { metric: "Answer Relevance ↓",   layer: "Query engineering, routing, context assembly",        color: "#C2185B", stages: ["query","assembly"] },
  { metric: "Answer Correctness ↓", layer: "Pipeline completo — requiere análisis por caso",      color: "#00695C", stages: ["evaluation"] },
];

/* ═══════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════ */

export default function RAGRecap() {
  const [activeStage, setActiveStage] = useState("infra");
  const [activeConcept, setActiveConcept] = useState<number | null>(null);
  const [showDiag, setShowDiag] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { 
    setMounted(true); 
    
    const container = scrollContainerRef.current;
    if (container) {
      const handleScroll = () => {
        const { scrollLeft, scrollWidth, clientWidth } = container;
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          setShowScrollHint(false);
        } else {
          setShowScrollHint(true);
        }
      };
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, []);

  const current = stages.find(s => s.id === activeStage)!;
  const activeIdx = stages.findIndex(s => s.id === activeStage);

  const selectStage = (id: string) => {
    setActiveStage(id);
    setActiveConcept(null);
  };

  const totalConcepts = stages.reduce((a, s) => a + s.concepts.length, 0);

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-base)",
      color: "var(--text-primary)",
      fontFamily: "var(--font-sans)",
      overflow: "hidden",
    }}>

      {/* ═══ AMBIENT GLOW ═══ */}
      <div style={{
        position: "fixed", top: "-30%", left: "50%", transform: "translateX(-50%)",
        width: "120vw", height: "60vh",
        background: `radial-gradient(ellipse at center, ${current.color}0A 0%, transparent 60%)`,
        pointerEvents: "none", transition: "background 0.8s ease",
        zIndex: 0,
      }} />

      {/* ═══ HEADER ═══ */}
      <header className="module-header" style={{
        padding: "40px 48px 32px",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex", justifyContent: "space-between", alignItems: "flex-end",
        position: "relative", zIndex: 1,
        opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(-10px)",
        transition: "all 0.6s ease",
      }}>
        <div>
          <div className="mono" style={{
            fontSize: "12px", letterSpacing: "6px", color: "var(--text-tertiary)",
            marginBottom: "12px", textTransform: "uppercase", fontWeight: 700,
          }}>
            Interactive AI Knowledge Map — RAG Pipeline
          </div>
          <h1 style={{
            fontSize: "32px", fontWeight: 800, letterSpacing: "-1px",
            color: "var(--text-primary)", lineHeight: 1.1, marginBottom: "10px",
          }}>
            End-to-End RAG Engineering
          </h1>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <span className="mono" style={{
              fontSize: "13px", color: current.color, fontWeight: 700,
              background: `${current.color}10`, border: `1px solid ${current.color}25`,
              padding: "6px 14px", borderRadius: "24px",
              transition: "all 0.4s ease",
            }}>
              {stages.length} etapas
            </span>
            <span className="mono" style={{
              fontSize: "13px", color: "var(--text-secondary)",
              background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
              padding: "6px 14px", borderRadius: "24px", fontWeight: 600,
            }}>
              {totalConcepts} conceptos
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowDiag(!showDiag)}
          className="mono"
          style={{
            background: showDiag ? "rgba(0,105,92,0.08)" : "var(--bg-surface)",
            border: `1px solid ${showDiag ? "#00695C40" : "var(--border-subtle)"}`,
            color: showDiag ? "#00695C" : "var(--text-secondary)",
            padding: "12px 24px", borderRadius: "8px", fontWeight: 600,
            cursor: "pointer", fontSize: "13px", letterSpacing: "2px",
            fontFamily: "inherit", transition: "all 0.3s ease",
            boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
          }}
        >
          {showDiag ? "✕  CERRAR" : "◈  DIAGNÓSTICO"}
        </button>
      </header>

      {/* ═══ DIAGNOSTIC PANEL ═══ */}
      {showDiag && (
        <div style={{
          padding: "32px 48px",
          borderBottom: "1px solid rgba(0,105,92,0.15)",
          background: "linear-gradient(180deg, rgba(0,105,92,0.05) 0%, rgba(0,105,92,0.01) 100%)",
          animation: "fadeUp 0.4s ease",
        }}>
          <div className="mono" style={{
            fontSize: "13px", letterSpacing: "4px", color: "#00695C",
            marginBottom: "24px", fontWeight: 700,
          }}>
            MAPA DE DIAGNÓSTICO
          </div>
          <div style={{ fontSize: "15px", color: "var(--text-secondary)", marginBottom: "24px", maxWidth: "700px", lineHeight: 1.7 }}>
            Cuando una métrica degrada, este mapa señala directamente la capa del pipeline responsable.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {diagMap.map((d, i) => (
              <div key={i} className="diag-row" style={{
                display: "flex", alignItems: "center",
                padding: "14px 20px", borderRadius: "10px",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                animation: "slideIn 0.4s ease",
                animationDelay: `${i * 0.08}s`,
                animationFillMode: "both",
              }}
              onClick={() => selectStage(d.stages[0])}
              >
                <div style={{
                  width: "10px", height: "10px", borderRadius: "50%",
                  background: d.color, boxShadow: `0 0 12px ${d.color}60`,
                  flexShrink: 0, marginRight: "20px",
                  animation: "pulseGlow 2.5s ease-in-out infinite",
                  animationDelay: `${i * 0.4}s`,
                }} />
                <div className="mono" style={{
                  fontSize: "14px", color: d.color, width: "240px",
                  flexShrink: 0, fontWeight: 700, letterSpacing: "0.5px",
                }}>
                  {d.metric}
                </div>
                <div style={{
                  flex: 1, height: "2px", margin: "0 24px",
                  background: `linear-gradient(90deg, ${d.color}30, transparent)`,
                  borderRadius: "1px", position: "relative", overflow: "hidden",
                }}>
                  <div style={{
                    position: "absolute", width: "24px", height: "2px",
                    background: `linear-gradient(90deg, transparent, ${d.color}, transparent)`,
                    animation: "flowDot 2s linear infinite",
                    animationDelay: `${i * 0.3}s`,
                  }} />
                </div>
                <div style={{ fontSize: "14px", color: "var(--text-secondary)", fontWeight: 500, letterSpacing: "0.2px" }}>
                  {d.layer}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ PIPELINE FLOW ═══ */}
      <div style={{
        padding: "36px 48px 32px",
        borderBottom: "1px solid var(--border-subtle)",
        position: "relative", zIndex: 1,
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: "24px"
        }}>
          <div className="mono" style={{
            fontSize: "12px", letterSpacing: "4px", color: "var(--text-tertiary)", fontWeight: 700
          }}>
            PIPELINE FLOW
          </div>
          {showScrollHint && (
            <div className="scroll-hint mono" style={{
              fontSize: "10px", color: current.color, fontWeight: 700,
              display: "flex", alignItems: "center", gap: "6px"
            }}>
              <span>DESLIZA</span>
              <span style={{ fontSize: "14px" }}>→</span>
            </div>
          )}
        </div>
        <div 
          ref={scrollContainerRef}
          style={{
            display: "flex", alignItems: "center",
            overflowX: "auto", padding: "12px 0",
          }}
        >
          {stages.map((stage, i) => {
            const isActive = activeStage === stage.id;
            const isHovered = hoveredNode === stage.id;
            const isPast = i < activeIdx;
            return (
              <div key={stage.id} style={{
                display: "flex", alignItems: "center", flexShrink: 0,
                animation: "fadeUp 0.5s ease",
                animationDelay: `${i * 0.06}s`,
                animationFillMode: "both",
              }}>
                <div
                  className="pipeline-node"
                  onClick={() => selectStage(stage.id)}
                  onMouseEnter={() => setHoveredNode(stage.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  style={{
                    cursor: "pointer",
                    padding: "16px 20px",
                    border: `1.5px solid ${isActive ? stage.color + "80" : isHovered ? stage.color + "50" : "var(--border-subtle)"}`,
                    borderRadius: "12px",
                    background: isActive
                      ? `linear-gradient(145deg, ${stage.color}15 0%, ${stage.color}05 100%)`
                      : isHovered
                        ? "var(--bg-surface-hover)"
                        : "var(--bg-surface)",
                    textAlign: "center",
                    minWidth: "135px",
                    position: "relative",
                    boxShadow: isActive
                      ? `0 6px 20px ${stage.color}20, 0 0 0 1px ${stage.color}20`
                      : "0 2px 8px rgba(0,0,0,0.02)",
                  }}
                >
                  {/* Big number */}
                  <div className="mono" style={{
                    fontSize: "28px", fontWeight: 900,
                    color: isActive ? stage.color : isPast ? stage.color + "55" : "var(--text-muted)",
                    lineHeight: 1, marginBottom: "8px",
                    transition: "color 0.3s",
                  }}>
                    {stage.num}
                  </div>
                  <div className="mono" style={{
                    fontSize: "12px", fontWeight: 800, letterSpacing: "2px",
                    color: isActive ? stage.color : isHovered ? stage.color + "BB" : "var(--text-secondary)",
                    marginBottom: "4px", transition: "color 0.3s",
                  }}>
                    {stage.tag}
                  </div>
                  <div style={{
                    fontSize: "12px", color: isActive ? stage.color + "99" : "var(--text-tertiary)",
                    fontWeight: 600, transition: "color 0.3s",
                  }}>
                    {stage.sub}
                  </div>
                  {/* Active dot */}
                  {isActive && (
                    <div style={{
                      position: "absolute", bottom: "-10px", left: "50%",
                      transform: "translateX(-50%)",
                      width: "6px", height: "6px", borderRadius: "50%",
                      background: stage.color,
                      boxShadow: `0 0 10px ${stage.color}99`,
                      animation: "pulseGlow 2s ease-in-out infinite",
                    }} />
                  )}
                </div>
                {/* Connector line */}
                {i < stages.length - 1 && (
                  <div style={{
                    width: "32px", height: "3px", flexShrink: 0,
                    position: "relative", overflow: "hidden",
                    borderRadius: "2px",
                    background: stage.id === "infra"
                      ? "rgba(0,0,0,0.06)"
                      : isPast || isActive
                        ? `linear-gradient(90deg, ${stage.color}50, ${stages[i+1].color}40)`
                        : "rgba(0,0,0,0.06)",
                    transition: "background 0.4s",
                  }}>
                    {(isPast || isActive) && stage.id !== "infra" && (
                      <div style={{
                        position: "absolute", width: "10px", height: "3px",
                        borderRadius: "2px",
                        background: `linear-gradient(90deg, transparent, ${stages[i+1].color}99, transparent)`,
                        animation: "flowDot 1.5s linear infinite",
                        animationDelay: `${i * 0.15}s`,
                      }} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="module-main-layout" style={{
        display: "flex", minHeight: "calc(100vh - 380px)",
        position: "relative", zIndex: 1,
      }}>

        {/* ─── LEFT PANEL ─── */}
        <div className="module-left-panel" style={{
          width: "380px", flexShrink: 0,
          padding: "36px 36px",
          borderRight: "1px solid var(--border-subtle)",
          background: "var(--bg-surface)",
          display: "flex", flexDirection: "column",
          animation: "fadeUp 0.5s ease",
        }}>
          {/* Number + Title */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "18px", marginBottom: "28px" }}>
            <div className="mono" style={{
              fontSize: "56px", fontWeight: 900, lineHeight: 0.85,
              color: current.color + "30",
              transition: "color 0.4s",
            }}>
              {current.num}
            </div>
            <div>
              <div className="mono" style={{
                fontSize: "13px", letterSpacing: "3px", fontWeight: 700,
                color: current.color, marginBottom: "8px",
                transition: "color 0.4s",
              }}>
                {current.label}
              </div>
              <div style={{
                fontSize: "20px", fontWeight: 800,
                color: "var(--text-primary)", lineHeight: 1.3,
              }}>
                {current.short}
              </div>
            </div>
          </div>

          {/* Description */}
          <div style={{
            fontSize: "15px", color: "var(--text-secondary)", lineHeight: 1.85, fontWeight: 400,
            borderLeft: `4px solid ${current.color}40`,
            paddingLeft: "18px", marginBottom: "32px",
            transition: "border-color 0.4s",
          }}>
            {current.description}
          </div>

          {/* Stats */}
          <div style={{
            display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "32px",
          }}>
            {Object.entries(
              current.concepts.reduce((acc: Record<string, number>, c) => {
                acc[c.status] = (acc[c.status] || 0) + 1;
                return acc;
              }, {})
            ).map(([status, count]) => {
              const st = statusConfig[status];
              return (
                <div key={status} style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "8px 14px", borderRadius: "8px",
                  background: `${st.color}10`,
                  border: `1px solid ${st.color}25`,
                }}>
                  <span style={{ fontSize: "14px", color: st.color }}>{st.icon}</span>
                  <span className="mono" style={{ fontSize: "14px", color: st.color, fontWeight: 700 }}>
                    {count}
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600 }}>
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{
            marginTop: "auto", paddingTop: "24px",
            borderTop: "1px solid var(--border-subtle)",
          }}>
            <div className="mono" style={{
              fontSize: "12px", letterSpacing: "3px", color: "var(--text-tertiary)",
              marginBottom: "16px", fontWeight: 700,
            }}>
              CLASIFICACIÓN
            </div>
            {Object.entries(statusConfig).map(([key, val]) => (
              <div key={key} style={{
                display: "flex", alignItems: "center", gap: "12px",
                marginBottom: "12px",
              }}>
                <span style={{
                  fontSize: "14px", color: val.color, width: "18px", textAlign: "center",
                }}>
                  {val.icon}
                </span>
                <span style={{ fontSize: "14px", color: "var(--text-secondary)", fontWeight: 500 }}>
                  {val.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ─── RIGHT: CONCEPTS ─── */}
        <div className="module-right-content" style={{
          flex: 1, padding: "36px 40px",
          overflowY: "auto", background: "var(--bg-base)"
        }}>
          <div className="mono" style={{
            fontSize: "12px", letterSpacing: "4px", color: "var(--text-tertiary)", fontWeight: 700,
            marginBottom: "24px",
            display: "flex", alignItems: "center", gap: "12px",
          }}>
            <div style={{
              width: "20px", height: "3px", borderRadius: "2px",
              background: `linear-gradient(90deg, ${current.color}60, transparent)`,
              transition: "background 0.4s",
            }} />
            {current.concepts.length} CONCEPTOS
          </div>

          <div className="concept-card-grid" style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
            gap: "18px",
          }}>
            {current.concepts.map((c, i) => {
              const st = statusConfig[c.status];
              const isOpen = activeConcept === i;
              return (
                <div
                  key={`${current.id}-${i}`}
                  className="concept-card"
                  onClick={() => setActiveConcept(isOpen ? null : i)}
                  style={{
                    border: `1px solid ${isOpen ? st.color + "45" : "var(--border-subtle)"}`,
                    borderRadius: "12px",
                    padding: "20px 24px",
                    cursor: "pointer",
                    background: isOpen
                      ? `linear-gradient(145deg, var(--bg-surface) 0%, ${st.color}05 100%)`
                      : "var(--bg-surface)",
                    animation: "fadeUp 0.4s ease",
                    animationDelay: `${i * 0.05}s`,
                    animationFillMode: "both",
                    boxShadow: isOpen ? `0 8px 32px ${st.color}15` : "0 2px 10px rgba(0,0,0,0.02)",
                  }}
                >
                  {/* Top accent */}
                  {isOpen && (
                    <div style={{
                      position: "absolute", top: 0, left: "24px", right: "24px",
                      height: "3px", borderRadius: "0 0 3px 3px",
                      background: `linear-gradient(90deg, transparent, ${st.color}80, transparent)`,
                    }} />
                  )}

                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", gap: "16px",
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", flex: 1 }}>
                      <span style={{
                        fontSize: "18px",
                        color: isOpen ? st.color : st.color + "99",
                        marginTop: "1px",
                        transition: "all 0.3s",
                        flexShrink: 0,
                      }}>
                        {st.icon}
                      </span>
                      <div style={{
                        fontSize: "16px", fontWeight: 700,
                        color: isOpen ? "var(--text-primary)" : "var(--text-secondary)",
                        lineHeight: 1.4, transition: "color 0.3s",
                      }}>
                        {c.name}
                      </div>
                    </div>
                    <div className="mono" style={{
                      fontSize: "10px", letterSpacing: "1.5px",
                      color: st.color, fontWeight: 700,
                      background: `${st.color}15`,
                      border: `1px solid ${st.color}25`,
                      padding: "5px 12px", borderRadius: "6px",
                      flexShrink: 0, whiteSpace: "nowrap",
                    }}>
                      {st.label.toUpperCase()}
                    </div>
                  </div>

                  {isOpen && (
                     <div style={{
                      fontSize: "15px", color: "var(--text-secondary)",
                      lineHeight: 1.85, marginTop: "16px",
                      paddingTop: "16px",
                      borderTop: `1px solid var(--border-subtle)`,
                      animation: "fadeUp 0.3s ease",
                    }}>
                      {c.def}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ FOOTER ═══ */}
      <footer className="mono" style={{
        padding: "20px 48px",
        borderTop: "1px solid var(--border-subtle)",
        fontSize: "12px", color: "var(--text-tertiary)", letterSpacing: "1.5px",
        display: "flex", justifyContent: "space-between",
        flexWrap: "wrap", gap: "12px",
        background: "var(--bg-surface-hover)",
        position: "relative", zIndex: 1,
        fontWeight: 600
      }}>
        <span>STACK  Qwen3 Embedding · Nomic Embed · E5 Base · Qwen3-Reranker-0.6B · Qdrant</span>
        <span>EVAL  RAGAS · LLM-as-Judge · Golden Dataset · Drift Detection</span>
      </footer>
    </div>
  );
}
