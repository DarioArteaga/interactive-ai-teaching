import { useState, useEffect, useRef } from "react";

const stages = [
  {
    id: "pilares", num: "00", label: "PILARES TRANSVERSALES", tag: "PILARES", sub: "Transversal", color: "#F57F17",
    short: "Fundamentos que atraviesan todo el ciclo",
    description: "No son una fase del lifecycle — son la capa de gobernanza que opera en paralelo permanente. Sin estos pilares, las cuatro fases técnicas no producen un sistema operable en producción empresarial.",
    concepts: [
      { name: "Tool Governance", status: "best", def: "Cada herramienta que el agente puede invocar debe estar explícitamente autorizada, documentada y auditada. Ninguna herramienta implícita, ningún acceso heredado. El perímetro de acción del agente está definido por su Tool Manifest, no por lo que técnicamente es posible invocar." },
      { name: "MCP Servers", status: "good", def: "Model Context Protocol como patrón estandarizado de exposición de recursos empresariales. Proporciona autenticación, autorización y controles de política por herramienta. Permite reutilización de herramientas entre agentes de forma controlada y consistente." },
      { name: "Cost Tracking", status: "best", def: "Cada acción del agente tiene un costo real: tokens de input/output, llamadas a APIs externas, cómputo de infraestructura. Un agente que duplica su consumo de tokens por sesión no tiene un problema de costos — tiene un problema de razonamiento que se manifiesta en el gasto." },
      { name: "Human-in-the-Loop", status: "best", def: "Mecanismo que define qué decisiones requieren intervención humana, bajo qué condiciones y con qué urgencia. Tres modalidades: aprobación síncrona (el agente espera), asíncrona (propuesta en diferido) y override automático (detiene ejecución ante umbral de riesgo). No es un fallback — es diseño." },
      { name: "Seguridad y Auditoría", status: "best", def: "Identidad de servicio acotada por agente. Principio de mínimo privilegio desde el diseño. Trazabilidad completa de cada decisión, cada tool call, cada output. Capacidad de replay: reconstruir exactamente qué hizo el agente, en qué orden y por qué. En entornos regulados, no es opcional." },
      { name: "Least-Privilege", status: "best", def: "El agente opera solo con los permisos mínimos necesarios para cumplir su objetivo. En arquitecturas multi-agente, cada nodo de la cadena tiene su propio scope de permisos. La cadena no acumula privilegios: el orquestador no transfiere su nivel de acceso a los sub-agentes." },
    ]
  },
  {
    id: "diseno", num: "01", label: "DISEÑO", tag: "DISEÑO", sub: "Scope", color: "#00838F",
    short: "Decisiones más costosas de revertir",
    description: "El diseño no es 'qué hace el agente'. Es la fase donde se toman las decisiones que más caro se pagan si se equivocan. Un agente con scope difuso, herramientas sin límite o memoria sin arquitectura se vuelve impredecible e ingobernable en producción.",
    concepts: [
      { name: "Scope Definition", status: "best", def: "Define los límites de autonomía del agente: hasta dónde puede decidir solo y cuándo debe escalar. Un scope ambiguo produce un agente que hace demasiado o demasiado poco. El scope es la frontera entre agente confiable y agente riesgoso." },
      { name: "Agent Card", status: "best", def: "Artefacto de diseño formal: propósito del agente, inputs esperados, outputs esperados, restricciones explícitas. Es el contrato del agente con el sistema que lo orquesta. Debe existir antes de escribir una sola línea de código." },
      { name: "Tool Manifest", status: "best", def: "Lista de herramientas autorizadas con justificación de cada una. Principio de mínimo privilegio aplicado desde diseño. Un agente con demasiadas herramientas tiende a usarlas innecesariamente: dispara costos y se vuelve impredecible." },
      { name: "Memory Architecture", status: "concept", def: "Decisión de arquitectura crítica: ¿el agente necesita memoria dentro de una sesión, entre sesiones, o ninguna? In-session state, vector retrieval, external key-value store, o sin memoria. La elección afecta todo el stack y el comportamiento de continuidad." },
      { name: "Autonomía vs. Control", status: "concept", def: "Tensión central del diseño. Más autonomía = más velocidad, menos previsibilidad. La respuesta no es la misma para un agente de atención a clientes que para uno que ejecuta transacciones financieras. El punto de equilibrio es una decisión de producto, no solo técnica." },
      { name: "Failure Modes Map", status: "best", def: "Enumeración explícita de qué puede salir mal y cuál es el comportamiento esperado ante cada falla. Herramienta que falla, contexto vacío, loop de razonamiento que no converge, respuesta fuera de dominio. Sin failure modes definidos, el comportamiento en edge cases es no determinístico." },
      { name: "HITL Map", status: "best", def: "Mapa de decisiones que requieren aprobación humana: cuáles son de alto impacto irreversible, cuáles pueden ejecutarse con logging, cuáles requieren revisión diferida. Definido en diseño, implementado en deployment. Su ausencia no simplifica el sistema — lo hace ingobernable." },
    ]
  },
  {
    id: "desarrollo", num: "02", label: "DESARROLLO", tag: "DESARROLLO", sub: "Build", color: "#6A1B9A",
    short: "Construir para ser operable, no solo funcional",
    description: "Si el diseño define qué hace el agente, el desarrollo define cómo se construye de forma que sea mantenible, evaluable y depurable en producción. Un agente funcional en sandbox puede ser una caja negra opaca una vez desplegado.",
    concepts: [
      { name: "System Prompt como Código", status: "best", def: "El system prompt no es configuración informal — es código. Debe tener versión, historial de cambios y justificación de cada modificación. Un cambio en el system prompt puede alterar el comportamiento en producción de formas tan radicales como un cambio en la lógica de negocio." },
      { name: "Versioning del Agente", status: "best", def: "La versión del agente es la combinación de: versión del modelo base, versión del system prompt, versión del conjunto de herramientas, versión de la knowledge base. Cambiar cualquiera de estos cuatro elementos constituye una nueva versión y debe documentarse como tal." },
      { name: "Tool Schema", status: "best", def: "Para cada herramienta: schema de entrada/salida, comportamiento ante falla (timeout, retry, fallback, escalación), límites de invocación (rate limits, costos, umbrales de alerta). Una herramienta mal documentada en desarrollo es una caja negra opaca en producción." },
      { name: "Unit Testing de Herramientas", status: "best", def: "Las herramientas de forma aislada con mocks. Este es el único componente del sistema agéntico que sí es determinístico y puede cubrirse con asserts clásicos. Debe ser exhaustivo antes de cualquier prueba de razonamiento." },
      { name: "Testing de Razonamiento", status: "best", def: "Evalúa si el agente toma la decisión correcta ante un conjunto de escenarios definidos. No se puede hacer assert de 'output exacto' — se usa un juez (LLM o humano) para evaluar calidad de decisión, no exactitud literal. Requiere golden dataset de escenarios." },
      { name: "Adversarial Testing", status: "good", def: "Prueba deliberada con inputs malformados, contradictorios o diseñados para manipular al agente: prompt injection, jailbreak attempts, inputs ambiguos, secuencias que buscan escalar privilegios. Equivalente agéntico del penetration testing." },
      { name: "Observabilidad desde día 1", status: "best", def: "Cada llamada al LLM se loguea con su input, output, tokens y latencia. Cada invocación de herramienta genera un span rastreable. Las decisiones de razonamiento intermedias se capturan, no solo el output final. Agregar observabilidad post-incidente es llegar tarde." },
    ]
  },
  {
    id: "deployment", num: "03", label: "DEPLOYMENT", tag: "DEPLOYMENT", sub: "Prod", color: "#2E7D32",
    short: "Sobrevivir al contacto con la realidad",
    description: "Si el desarrollo garantiza que el agente funciona, el deployment garantiza que sobrevive al contacto con datos y usuarios reales. No es un evento binario: es una progresión controlada donde cada etapa filtra un tipo diferente de riesgo.",
    concepts: [
      { name: "Escalera de Entornos", status: "best", def: "Sandbox (datos sintéticos, herramientas mockeadas) → Staging (datos reales, permisos restringidos) → Canary / Shadow (tráfico real, sin efectos, comparación contra sistema anterior) → Producción (rollout gradual). Nunca al 100% de golpe." },
      { name: "CI/CD Agéntico", status: "best", def: "El pipeline no puede limitarse a compilar y desplegar. Debe incluir evaluación automática de comportamiento antes del merge, regresión agéntica (la nueva versión no rompe lo que funcionaba) y gate de costo: si la nueva versión consume significativamente más tokens por sesión, el pipeline bloquea." },
      { name: "Gate de Costo en CI/CD", status: "best", def: "Un cambio en el system prompt que pasa todos los tests técnicos puede triplicar el costo por conversación. Eso es una regresión en AgentOps aunque el agente sea funcionalmente correcto. El gate compara tokens promedio por sesión entre versión candidata y versión en producción." },
      { name: "Serverless vs. Containerizado", status: "concept", def: "Serverless (Cloud Run, Lambda): ideal para carga variable, pago por uso. Problema: cold starts pueden ser inaceptables en flujos conversacionales, y el estado no persiste. Containerizado (Docker + K8s): control total, ideal para alta concurrencia y agentes stateful. Mayor overhead operativo." },
      { name: "Identity de Servicio", status: "best", def: "Cada agente opera bajo una identidad de servicio con permisos explícitos y acotados. No hereda permisos del sistema orquestador. En multi-agente: cada nodo tiene su propio scope, la cadena no acumula privilegios. La identidad es el límite de lo que el agente puede hacer en runtime." },
      { name: "HITL en Producción", status: "best", def: "El diseño definió qué decisiones requieren aprobación humana. El deployment implementa ese mecanismo: aprobación síncrona (el agente espera), asíncrona (propuesta en diferido) u override automático (detiene ejecución). Sin este mecanismo implementado, el HITL Map del diseño no existe." },
      { name: "Rollback Probado", status: "best", def: "El mecanismo de rollback debe estar probado antes del primer deploy a producción, no después del primer incidente. Incluye: rollback del modelo base, del system prompt, del conjunto de herramientas y de la knowledge base de forma independiente." },
    ]
  },
  {
    id: "optimizacion", num: "04", label: "OPTIMIZACIÓN", tag: "OPTIMIZ.", sub: "Iterate", color: "#E65100",
    short: "El ciclo que no tiene fin, solo iteraciones",
    description: "La fase más continua: no termina, solo madura. En software tradicional, si algo funciona hoy generalmente funciona mañana. En sistemas agénticos no hay esa garantía. El mundo cambia, los datos cambian, y el agente puede derivar silenciosamente sin que nadie lo detecte.",
    concepts: [
      { name: "Drift Detection", status: "best", def: "El fenómeno central de esta fase: el agente deriva hacia comportamientos no deseados sin que nadie lo note de inmediato. Se detecta mediante evaluación continua sobre muestras de sesiones reales. Un agente sin drift detection es un agente que funciona hasta que deja de funcionar, sin señal de cuándo ni por qué." },
      { name: "Evaluación Continua", status: "best", def: "Pipeline que corre permanentemente sobre muestras de sesiones reales: ¿el agente completó la tarea que el usuario intentaba resolver? ¿Tomó el camino de herramientas más eficiente? ¿Sus respuestas se mantienen alineadas con las restricciones del diseño? El juez puede ser un LLM, un humano, o ambos." },
      { name: "Señales Implícitas", status: "good", def: "Comportamiento observable del usuario como proxy de calidad: ¿reformuló la pregunta inmediatamente después de una respuesta? ¿Abandonó la sesión? ¿Escaló a soporte humano? Más confiables que feedback explícito porque no dependen de que el usuario decida calificar. Evaluación de costo cero." },
      { name: "Ajuste Operativo vs. Fine-Tuning", status: "concept", def: "Ajuste operativo (system prompt, herramientas, temperatura, knowledge base): rápido, reversible, no requiere reentrenar el modelo. Fine-tuning (modificar pesos del modelo base): costoso, lento, difícil de revertir. La mayoría de los problemas de un agente en producción se resuelven en la capa operativa. Saltar al fine-tuning es casi siempre prematuro." },
      { name: "Prompt Compression", status: "good", def: "Reducir el tamaño del context window sin perder información crítica. Técnicas: instrucciones más concisas, compresión de historial de conversación, summarización de contexto previo. El impacto en costo es lineal: reducir el prompt 30% reduce el costo de input tokens 30%." },
      { name: "Model Routing", status: "good", def: "Para tareas simples dentro de un flujo complejo, usar un modelo más ligero en lugar del modelo principal. Un agente de clasificación de intención no necesita el mismo modelo que el agente de razonamiento. El routing reduce costo y latencia sin sacrificar calidad en los pasos que lo permiten." },
      { name: "Knowledge Base Freshness", status: "best", def: "Un agente que opera con información desactualizada produce respuestas correctas en forma pero incorrectas en contenido. Los documentos en la knowledge base tienen fechas de expiración implícitas que deben gestionarse explícitamente. La obsolescencia del contexto es una forma de drift." },
      { name: "Loop de Retroalimentación", status: "best", def: "Los outputs de Optimización alimentan de vuelta las fases anteriores: drift detectado → rediseño de constraints; tool failure recurrente → refactor en Desarrollo; edge case peligroso → nuevo trigger de HITL en Deployment. AgentOps no es un pipeline lineal que termina — es un ciclo que madura." },
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
  { signal: "Behavior drift silencioso ↑",  layer: "Optimización: evaluación continua, señales implícitas, drift detection",    color: "#E65100", stage: "optimizacion" },
  { signal: "Tool failure recurrente ↑",    layer: "Desarrollo: tool schema, error handling, unit testing de herramientas",      color: "#6A1B9A", stage: "desarrollo" },
  { signal: "Costo por sesión ↑",           layer: "Optimización: cost tracking, prompt compression, model routing",             color: "#F57F17", stage: "optimizacion" },
  { signal: "Incidente de seguridad",       layer: "Pilares: auditoría, least-privilege, tool governance, identity de servicio", color: "#C62828", stage: "pilares" },
  { signal: "Regresión post-deploy",        layer: "Deployment: CI/CD gate, canary, rollback probado",                          color: "#2E7D32", stage: "deployment" },
  { signal: "Scope creep / misalignment",   layer: "Diseño: Agent Card, constraints, Tool Manifest, redefinición de scope",     color: "#00838F", stage: "diseno" },
];

export default function AgentOpsRecap() {
  const [activeStage, setActiveStage] = useState("pilares");
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
      {/* Ambient glow */}
      <div style={{
        position: "fixed", top: "-30%", left: "50%", transform: "translateX(-50%)",
        width: "120vw", height: "60vh",
        background: `radial-gradient(ellipse at center, ${current.color}0A 0%, transparent 60%)`,
        pointerEvents: "none", transition: "background 0.8s ease", zIndex: 0,
      }} />

      {/* Header */}
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
            Interactive AI Knowledge Map — AgentOps
          </div>
          <h1 style={{
            fontSize: "32px", fontWeight: 800, letterSpacing: "-1px",
            color: "var(--text-primary)", lineHeight: 1.1, marginBottom: "10px",
          }}>
            End-to-End Agent Lifecycle
          </h1>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <span className="mono" style={{
              fontSize: "13px", color: current.color, fontWeight: 700,
              background: `${current.color}10`, border: `1px solid ${current.color}25`,
              padding: "6px 14px", borderRadius: "24px", transition: "all 0.4s ease",
            }}>
              {stages.length} fases
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
            background: showDiag ? "rgba(198, 40, 40, 0.08)" : "var(--bg-surface)",
            border: `1px solid ${showDiag ? "#C6282840" : "var(--border-subtle)"}`,
            color: showDiag ? "#C62828" : "var(--text-secondary)",
            padding: "12px 24px", borderRadius: "8px", fontWeight: 600,
            cursor: "pointer", fontSize: "13px", letterSpacing: "2px",
            fontFamily: "inherit", transition: "all 0.3s ease",
            boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
          }}
        >
          {showDiag ? "✕  CERRAR" : "◈  DIAGNÓSTICO"}
        </button>
      </header>

      {/* Diagnostic Panel */}
      {showDiag && (
        <div style={{
          padding: "32px 48px",
          borderBottom: "1px solid rgba(198, 40, 40, 0.15)",
          background: "linear-gradient(180deg, rgba(198, 40, 40, 0.05) 0%, rgba(198, 40, 40, 0.01) 100%)",
          animation: "fadeUp 0.4s ease",
        }}>
          <div className="mono" style={{
            fontSize: "13px", letterSpacing: "4px", color: "#C62828",
            marginBottom: "24px", fontWeight: 700,
          }}>
            MAPA DE DIAGNÓSTICO — SEÑAL → FASE
          </div>
          <div style={{ fontSize: "15px", color: "var(--text-secondary)", marginBottom: "24px", maxWidth: "700px", lineHeight: 1.7 }}>
            Cuando una señal aparece en producción, este mapa indica directamente la fase y componentes responsables.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {diagMap.map((d, i) => (
              <div key={i} className="diag-row" onClick={() => selectStage(d.stage)} style={{
                display: "flex", alignItems: "center",
                padding: "14px 20px", borderRadius: "10px",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                animation: "slideIn 0.4s ease",
                animationDelay: `${i * 0.08}s`,
                animationFillMode: "both",
              }}>
                <div style={{
                  width: "10px", height: "10px", borderRadius: "50%",
                  background: d.color, boxShadow: `0 0 12px ${d.color}60`,
                  flexShrink: 0, marginRight: "20px",
                  animation: "pulseGlow 2.5s ease-in-out infinite",
                  animationDelay: `${i * 0.4}s`,
                }} />
                <div className="mono" style={{
                  fontSize: "14px", color: d.color, width: "280px",
                  flexShrink: 0, fontWeight: 700, letterSpacing: "0.5px",
                }}>
                  {d.signal}
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

      {/* Pipeline Flow */}
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
            LIFECYCLE FLOW
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
                    cursor: "pointer", padding: "16px 20px",
                    border: `1.5px solid ${isActive ? stage.color + "80" : isHovered ? stage.color + "50" : "var(--border-subtle)"}`,
                    borderRadius: "12px",
                    background: isActive
                      ? `linear-gradient(145deg, ${stage.color}15 0%, ${stage.color}05 100%)`
                      : isHovered ? "var(--bg-surface-hover)" : "var(--bg-surface)",
                    textAlign: "center", minWidth: "135px", position: "relative",
                    boxShadow: isActive ? `0 6px 20px ${stage.color}20, 0 0 0 1px ${stage.color}20` : "0 2px 8px rgba(0,0,0,0.02)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                >
                  <div className="mono" style={{
                    fontSize: "28px", fontWeight: 900,
                    color: isActive ? stage.color : isPast ? stage.color + "55" : "var(--text-muted)",
                    lineHeight: 1, marginBottom: "8px", transition: "color 0.3s",
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
                  {isActive && (
                    <div style={{
                      position: "absolute", bottom: "-10px", left: "50%",
                      transform: "translateX(-50%)",
                      width: "6px", height: "6px", borderRadius: "50%",
                      background: stage.color, boxShadow: `0 0 10px ${stage.color}99`,
                      animation: "pulseGlow 2s ease-in-out infinite",
                    }} />
                  )}
                </div>
                {i < stages.length - 1 && (
                  <div style={{
                    width: stage.id === "pilares" ? "20px" : "32px",
                    height: "3px", flexShrink: 0,
                    position: "relative", overflow: "hidden", borderRadius: "2px",
                    background: stage.id === "pilares"
                      ? "rgba(0,0,0,0.06)"
                      : isPast || isActive
                        ? `linear-gradient(90deg, ${stage.color}50, ${stages[i+1].color}40)`
                        : "rgba(0,0,0,0.06)",
                    transition: "background 0.4s",
                  }}>
                    {(isPast || isActive) && stage.id !== "pilares" && (
                      <div style={{
                        position: "absolute", width: "10px", height: "3px", borderRadius: "2px",
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

      {/* Main Content */}
      <div className="module-main-layout" style={{
        display: "flex", minHeight: "calc(100vh - 380px)",
        position: "relative", zIndex: 1,
      }}>
        {/* Left Panel */}
        <div className="module-left-panel" style={{
          width: "380px", flexShrink: 0, padding: "36px",
          borderRight: "1px solid var(--border-subtle)",
          background: "var(--bg-surface)",
          display: "flex", flexDirection: "column",
          animation: "fadeUp 0.5s ease",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "18px", marginBottom: "28px" }}>
            <div className="mono" style={{
              fontSize: "56px", fontWeight: 900, lineHeight: 0.85,
              color: current.color + "30", transition: "color 0.4s",
            }}>
              {current.num}
            </div>
            <div>
              <div className="mono" style={{
                fontSize: "13px", letterSpacing: "3px", fontWeight: 700,
                color: current.color, marginBottom: "8px", transition: "color 0.4s",
              }}>
                {current.label}
              </div>
              <div style={{
                fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.3,
              }}>
                {current.short}
              </div>
            </div>
          </div>

          <div style={{
            fontSize: "15px", color: "var(--text-secondary)", lineHeight: 1.85, fontWeight: 400,
            borderLeft: `4px solid ${current.color}40`,
            paddingLeft: "18px", marginBottom: "32px", transition: "border-color 0.4s",
          }}>
            {current.description}
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "32px" }}>
            {Object.entries(
              current.concepts.reduce((acc: Record<string, number>, c) => {
                acc[c.status] = (acc[c.status] || 0) + 1; return acc;
              }, {})
            ).map(([status, count]) => {
              const st = statusConfig[status];
              return (
                <div key={status} style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "8px 14px", borderRadius: "8px",
                  background: `${st.color}10`, border: `1px solid ${st.color}25`,
                }}>
                  <span style={{ fontSize: "14px", color: st.color }}>{st.icon}</span>
                  <span className="mono" style={{ fontSize: "14px", color: st.color, fontWeight: 700 }}>{count}</span>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600 }}>{st.label}</span>
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
              fontSize: "12px", letterSpacing: "3px", color: "var(--text-tertiary)", marginBottom: "16px", fontWeight: 700
            }}>
              CLASIFICACIÓN
            </div>
            {Object.entries(statusConfig).map(([key, val]) => (
              <div key={key} style={{
                display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px",
              }}>
                <span style={{
                  fontSize: "14px", color: val.color, width: "18px", textAlign: "center",
                }}>{val.icon}</span>
                <span style={{ fontSize: "14px", color: "var(--text-secondary)", fontWeight: 500 }}>{val.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Concepts */}
        <div className="module-right-content" style={{ flex: 1, padding: "36px 40px", overflowY: "auto", background: "var(--bg-base)" }}>
          <div className="mono" style={{
            fontSize: "12px", letterSpacing: "4px", color: "var(--text-tertiary)", fontWeight: 700,
            marginBottom: "24px", display: "flex", alignItems: "center", gap: "12px",
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
                    borderRadius: "12px", padding: "20px 24px",
                    cursor: "pointer",
                    background: isOpen
                      ? `linear-gradient(145deg, var(--bg-surface) 0%, ${st.color}05 100%)`
                      : "var(--bg-surface)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    position: "relative", overflow: "hidden",
                    animation: "fadeUp 0.4s ease",
                    animationDelay: `${i * 0.05}s`,
                    animationFillMode: "both",
                    boxShadow: isOpen ? `0 8px 32px ${st.color}15` : "0 2px 10px rgba(0,0,0,0.02)",
                  }}
                >
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
                        transition: "all 0.3s", flexShrink: 0,
                      }}>{st.icon}</span>
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
                      background: `${st.color}15`, border: `1px solid ${st.color}25`,
                      padding: "5px 12px", borderRadius: "6px",
                      flexShrink: 0, whiteSpace: "nowrap",
                    }}>
                      {st.label.toUpperCase()}
                    </div>
                  </div>
                  {isOpen && (
                    <div style={{
                      fontSize: "15px", color: "var(--text-secondary)",
                      lineHeight: 1.85, marginTop: "16px", paddingTop: "16px",
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

      {/* Footer */}
      <footer className="mono" style={{
        padding: "20px 48px",
        borderTop: "1px solid var(--border-subtle)",
        fontSize: "12px", color: "var(--text-tertiary)", letterSpacing: "1.5px",
        display: "flex", justifyContent: "space-between",
        flexWrap: "wrap", gap: "12px",
        background: "var(--bg-surface-hover)", position: "relative", zIndex: 1,
        fontWeight: 600
      }}>
        <span>PILARES  Tool Governance · Cost Tracking · Human-in-the-Loop · Seguridad y Auditoría</span>
        <span>LIFECYCLE  Diseño → Desarrollo → Deployment → Optimización</span>
      </footer>
    </div>
  );
}
