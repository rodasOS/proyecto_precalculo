# Design

## Context

Motivación y alcance en `proposal.md`; requisitos en `specs/`. Punto de partida: `openspec/desing.md`, el diseño del asistente de Estadística Aplicada (app Angular estática, sin backend, sin IA en los cálculos, patrón `Resultado`, KaTeX, hosting gratuito). Ese diseño se reutiliza casi completo salvo el núcleo.

Qué cambia al pasar de Estadística a Cálculo:

| Aspecto | Estadística (diseño previo) | Cálculo (este cambio) |
|---|---|---|
| Entrada | listas de números | expresiones, ecuaciones, límites e intervalos |
| Núcleo | funciones numéricas escritas a mano | **motor simbólico**: parser + CAS + motor de pasos propio |
| Pasos | plantillas fijas por fórmula | pasos **generados** al recorrer el árbol de la expresión |
| Verificación | valores de scipy en pruebas | **verificación numérica en ejecución** + valores de SymPy en pruebas |
| Gráficas | histograma, dispersión (Chart.js) | curvas de funciones con asíntotas y puntos marcados |
| Prácticas | datos aleatorios | coeficientes aleatorios con respuestas "limpias" y calificación por equivalencia |

Restricciones: gratis, sin login, sin cuota; entrega domingo 25/10/2026; el docente probará problemas nuevos, así que el motor debe ser general, no una colección de casos escritos.

## Goals / Non-Goals

**Goals:**
- Núcleo `core/cas/` en TypeScript puro, sin dependencias de Angular, probable con Vitest y reutilizable por la UI, el generador de prácticas y las pruebas.
- Toda respuesta pasa por verificación independiente antes de mostrarse como correcta; si falla, se degrada a advertencia o "no resuelto".
- Cobertura honesta: preferir "no puedo resolver esto" a una respuesta equivocada (la precisión vale 4 de 15 puntos).

**Non-Goals:**
- Backend, cuentas, IA generativa en el cálculo, comprensión de problemas redactados en texto libre (las aplicaciones se resuelven con plantillas con formulario).
- Cálculo multivariable, ecuaciones diferenciales, series, integración por partes/fracciones parciales avanzadas, límites de funciones definidas a trozos.
- Reemplazar a un CAS completo: el alcance es el temario básico de la asignatura.

## Decisions

### D1. Cálculo determinista en el navegador, sin IA
Igual que el diseño previo: el código calcula y el LLM no interviene. Sin claves ni cuotas, el enlace es gratis y repetible. *Alternativa descartada:* LLM por API; riesgo de errores aritméticos, cuota y claves expuestas en cliente. Si se quisiera IA, solo para extraer parámetros de texto libre, con formularios como respaldo (fuera de este cambio).

### D2. Contrato `Resultado` adaptado (patrón central reutilizado)
Cada función de `core/cas/` es pura y devuelve:

```ts
interface Paso { regla: string; descripcion: string; latex: string; }
interface Resultado {
  estado: 'ok' | 'advertencia' | 'no-resuelto' | 'error';
  formula: string;          // LaTeX de la regla o fórmula aplicada
  sustitucion: string;      // LaTeX con valores sustituidos
  pasos: Paso[];            // procedimiento, cada paso nombra su regla
  respuesta: { latex: string; texto: string };
  interpretacion: string;
  verificacion: { metodo: string; coincide: boolean; detalle: string } | null;
  advertencias: string[];
  grafica?: DatosGrafica;   // curva, puntos marcados, asíntotas
}
```

La UI solo renderiza este objeto (`caja-resultado`). El generador de prácticas reutiliza las mismas funciones para producir la respuesta oficial y calificar. Se añade `estado` y `verificacion` respecto al diseño previo, porque ahora se puede fallar de forma parcial.

### D3. Pila del núcleo: math.js para parsear y evaluar, nerdamer para álgebra, motor de pasos propio
- **math.js** (`parse`, `evaluate`, AST): análisis de la entrada y evaluación numérica rápida para graficar y verificar. Su AST es el árbol que recorre el motor de pasos.
- **nerdamer** (módulos Algebra, Calculus, Solve): factorizar, resolver, simplificar y producir LaTeX; segundo criterio para comprobar equivalencias.
- **Motor de pasos propio** (`derivar`, `integrar`, `limite`, `resolver`) sobre el AST normalizado: ninguna librería devuelve procedimiento, y el procedimiento vale 2.5 puntos. Derivadas: tabla completa de reglas aplicables recursivamente. Integrales: tabla de integrales, linealidad, sustitución lineal y `u = g(x)` con `g'` detectada, polinomios y trigonométricas básicas. Límites: cascada sustitución → factorización/simplificación → conjugado → dominancia de grados → notables → L'Hôpital. Cuando el motor de pasos no cubre un caso pero nerdamer sí, se muestra la respuesta con una advertencia de "procedimiento resumido" y pasa por verificación.
- *Alternativas:* Compute Engine (cortex-js) simplifica pero no integra ni da límites; Algebrite está poco mantenido; SymPy vía Pyodide sirve pero pesa decenas de MB y tarda en cargar, descartado por la experiencia de uso del docente en celular. Se confirma el supuesto en un spike (tarea 1.4) con el corpus de pruebas antes de construir encima; si nerdamer falla en integrales/límites se amplía el motor propio en lugar de cambiar de pila.

### D4. Verificación cruzada obligatoria
Módulo `core/cas/verificacion.ts`, usado por todos los módulos:
- Derivada: cociente incremental simétrico en ~8 puntos aleatorios del dominio.
- Integral indefinida: derivar la antiderivada y comparar con el integrando; definida: cuadratura numérica (Simpson adaptativa) contra el valor exacto.
- Límite: tabla de aproximación por ambos lados con tolerancia relativa.
- Ecuaciones: sustituir cada raíz en la ecuación original (descarta raíces extrañas).
- Equivalencia de expresiones (para calificar prácticas y derivadas propuestas): comparar en ≥20 puntos aleatorios del dominio común más igualdad simbólica tras simplificar.
Si la verificación falla, `estado` pasa a `advertencia` y se muestra "no verificado". Esto protege los 4 puntos de precisión frente a problemas nuevos.

### D5. Análisis de funciones y gráficas
`core/cas/analisis-funcion.ts` calcula intersecciones, puntos críticos, inflexiones, monotonía y asíntotas. Raíces: simbólicas con nerdamer; si no hay forma cerrada, barrido de cambios de signo + bisección/Newton con etiqueta "aproximado". Graficado con **function-plot** (zoom/pan e intervalo, maneja asíntotas) con capa propia para marcar puntos; se valida en el spike 1.4 y, si ve mal las discontinuidades, se cambia a muestreo propio sobre canvas con corte por saltos grandes. *Alternativa:* Chart.js (el del diseño previo) es mala para zoom y curvas continuas.

### D6. Prácticas con respuestas limpias y calificación por equivalencia
El generador construye el ejercicio **desde la respuesta** (por ejemplo elige raíces enteras y arma el polinomio; elige `f` y calcula el integrando), de modo que los resultados sean presentables y el ejercicio siempre sea resoluble. Califica con la equivalencia de D4 (formas distintas, tolerancia numérica) y ofrece pista, procedimiento completo y marcador de sesión en memoria (sin persistencia en servidor).

### D7. Stack y estructura (se conserva del diseño previo)
- Angular (última versión estable al crear el proyecto; confirmar con `ng version`), sin SSR, componentes standalone, signals, Reactive Forms, rutas lazy con `withHashLocation()` para que recargar no dé 404. Angular Material para menú, pestañas y formularios.
- KaTeX directo mediante pipe/directiva propia (sin wrapper).
- Estado compartido con un servicio de signals (última expresión por módulo, ejemplo cargado); sin NgRx.
- Vitest para el núcleo.
- Hosting: Cloudflare Pages, Netlify o Vercel; desplegar un "hola mundo" el primer día y probar en incógnito y celular.

```
src/app/
├── core/
│   ├── cas/
│   │   ├── resultado.model.ts       interfaz Resultado y Paso
│   │   ├── parser.ts                normaliza texto → AST, errores en español
│   │   ├── normalizar.ts            ², −, ×, coma decimal, multiplicación implícita
│   │   ├── algebra.ts               ecuaciones, desigualdades, factorización
│   │   ├── funciones.ts             dominio, rango, composición
│   │   ├── analisis-funcion.ts      intersecciones, críticos, inflexión, monotonía, asíntotas
│   │   ├── limites.ts               cascada de métodos de límite
│   │   ├── derivadas.ts             reglas de derivación con pasos
│   │   ├── integrales.ts            tabla, linealidad, sustitución; definidas
│   │   ├── aplicaciones.ts          extremos, optimización, razones de cambio
│   │   ├── plantillas-aplicaciones.ts  rectángulo, caja, esfera, escalera…
│   │   └── verificacion.ts          comprobaciones numéricas y equivalencia
│   ├── practica/generador.service.ts
│   └── estado/sesion.service.ts
├── features/
│   ├── inicio/  algebra/  graficas/  limites/  derivadas/  integrales/
│   ├── aplicaciones/  practica/  ejemplos/
├── shared/
│   ├── formula/            componente/pipe KaTeX
│   ├── caja-resultado/     fórmula, sustitución, pasos, respuesta, verificación, advertencias
│   ├── entrada-expresion/  campo con vista previa, teclado de símbolos y errores
│   └── grafico/            envoltorio de function-plot con puntos marcados
├── data/
│   ├── ejemplos.ts         ≥10 ejercicios, incluye x³−6x²+9x+1
│   └── identidad.ts        nombre del asistente, integrantes, asignatura, sección
└── app.routes.ts
```

### D8. Pruebas contra un oráculo independiente
Script de Python con SymPy (una sola vez, fuera de la app) genera `casos-referencia.json` con ≥40 casos (derivadas, integrales, límites, ecuaciones, extremos) y valores numéricos esperados; Vitest compara el núcleo contra ese archivo y contra un conjunto de "problemas sorpresa" con entradas inválidas. Equivale al uso de numpy/scipy del diseño previo y alimenta la sección "pruebas realizadas" del informe.

### D9. Entrada: sintaxis tolerante
`normalizar.ts` convierte `x³ − 6x²`, `2,5`, `6x`, `2(x+1)`, `√`, `π`, `|x|` y `ln` antes de parsear, y traduce errores de math.js a mensajes en español con posición. Se acepta la variable `x` (y `t` en razones de cambio/plantillas); otras variables se rechazan con aviso.

## Risks / Trade-offs

- [Los problemas nuevos del docente exceden el motor de pasos] → cascada con respaldo en nerdamer, verificación obligatoria y respuesta explícita "no puedo resolver" (spec `math-expression-input`); priorizar en el temario básico y probar con un corpus amplio de ejercicios típicos.
- [Errores sutiles de nerdamer en integrales o límites] → nunca confiar en una sola vía: toda respuesta pasa por D4; discrepancias visibles al usuario.
- [Pasos que no se vean como un procedimiento de clase] → escribir pasos con la nomenclatura de la asignatura y revisarlos con el ejemplo de prueba y 3-4 ejercicios del curso antes de ampliar.
- [Simplificación con forma distinta a la esperada] → mostrar la forma factorizada y expandida cuando aporte, y calificar siempre por equivalencia.
- [Peso del bundle y carga en celular] → carga diferida (lazy) de nerdamer y function-plot por ruta; medir en el primer despliegue.
- [Tiempo hasta el 25/10] → entregar por vertical completa (derivadas → análisis del ejemplo de prueba → resto); si falta tiempo, recortar alcance de integración por sustitución y de plantillas de aplicaciones, no la verificación ni el manejo de errores.
- [Trabajo en pareja con conflictos] → repo en GitHub con rama por módulo; definir primero `Resultado`, `parser` y `verificacion`, luego repartir módulos; ambos deben poder explicar todo el funcionamiento.

## Migration Plan

Proyecto nuevo, sin migración. Orden sugerido (reutiliza el orden del diseño previo): crear proyecto y desplegar "hola mundo" → spike de librerías (1.4) → parser, `Resultado`, `formula`, `caja-resultado`, `verificacion` → derivadas y análisis de la función de prueba → límites, integrales, álgebra → gráficas y aplicaciones → prácticas y ejemplos → pruebas contra SymPy y pulido → informe y capturas → revisión final del enlace en incógnito y celular. Reversión: el hosting conserva despliegues anteriores; se puede volver al último estable.

## Open Questions

- Nombre original del asistente, nombres de los integrantes y sección: se cargan en `data/identidad.ts`; no afectan el diseño.
- Proveedor de hosting concreto (Cloudflare Pages, Netlify o Vercel): cualquiera cumple; se elige al desplegar.
