# Proposal

## Why

La asignatura de Cálculo y Precálculo (UMG, Facultad de Ingeniería, 15 puntos, entrega domingo 25/10/2026) exige un asistente virtual publicado en un enlace gratuito, sin login, que resuelva y explique ejercicios reales de álgebra, gráficas, límites, derivadas, integrales y aplicaciones. El docente lo probará con ejercicios nuevos, y la precisión de los cálculos y la claridad del procedimiento pesan 6.5 de los 15 puntos. Ya existe un diseño de un proyecto hermano (Estadística Aplicada) con la misma filosofía; su núcleo numérico no sirve aquí porque el cálculo requiere álgebra simbólica, no solo estadística sobre listas de números.

## What Changes

- Nueva aplicación web estática (sin backend, sin claves de API, sin IA en los cálculos) con nombre propio, publicada en un hosting gratuito.
- Se reutiliza del proyecto hermano el patrón "cálculo separado de interfaz": funciones puras que devuelven un objeto `Resultado` (fórmula, sustitución, pasos, respuesta, interpretación, advertencias) que la UI solo renderiza. También se reutilizan KaTeX, el componente `caja-resultado`, el generador de prácticas con calificación por tolerancia, el hosting y la forma de trabajo en pareja.
- **Cambia el núcleo**: de `core/stats/` (numérico sobre listas de datos) a `core/cas/` (parser de expresiones matemáticas, motor simbólico y motor de pasos propio con reglas de derivación, integración, límites, álgebra) más verificación numérica cruzada de cada respuesta. Se sustituye el parser de listas de números por un parser de expresiones con validación en español.
- Seis módulos funcionales: Álgebra y funciones, Gráficas, Límites, Derivadas, Integrales, Aplicaciones (optimización y razones de cambio).
- Gráficas interactivas con intersecciones, intervalos de crecimiento y puntos importantes (en lugar de histograma/dispersión de Chart.js).
- Banco de al menos 10 ejemplos (incluye `f(x) = x³ − 6x² + 9x + 1`) y generador de prácticas con retroalimentación y procedimiento si el usuario falla.
- Manejo explícito de entradas inválidas, datos faltantes y casos no resolubles (advertencia en lugar de respuesta falsa).
- Encabezado fijo con los nombres de ambos integrantes, asignatura y sección.
- Entregables: enlace operativo y un informe de máximo 3 páginas con pruebas y capturas.

## Capabilities

### New Capabilities
- `math-expression-input`: ingreso y validación de expresiones, ecuaciones y parámetros escritos por el usuario, con mensajes de error y advertencias en español.
- `step-by-step-results`: contrato de presentación de toda solución (fórmula, sustitución, procedimiento, respuesta final, interpretación, advertencias) y verificación numérica cruzada de resultados.
- `algebra-and-functions`: resolución de ecuaciones, factorización, dominio, rango y composición de funciones.
- `function-graphing`: graficado de funciones e interpretación de intersecciones, crecimiento y puntos importantes.
- `limits`: límites básicos (finitos, en el infinito, laterales, indeterminados) con el método utilizado.
- `derivatives`: derivación con reglas básicas, procedimiento por regla y verificación del resultado.
- `integrals`: integrales indefinidas y definidas elementales con procedimiento y verificación.
- `calculus-applications`: análisis de puntos críticos, extremos, intervalos de monotonía, optimización y razones de cambio en problemas contextualizados.
- `practice-and-examples`: banco de al menos 10 ejemplos precargados y generador de prácticas con calificación y retroalimentación.
- `assistant-shell-and-delivery`: identidad (nombre original), encabezado con integrantes/asignatura/sección, navegación por módulos y publicación con acceso público gratuito sin login.

### Modified Capabilities

(ninguna: `openspec/specs/` está vacío)

## Impact

- Código nuevo: proyecto Angular en la raíz del repo (`src/app/core/cas`, `features/*`, `shared/*`, `data/ejemplos.ts`).
- Dependencias nuevas: Angular + Angular Material, KaTeX, un motor CAS en JavaScript (nerdamer, con math.js para evaluación numérica), una librería de graficado 2D.
- Infraestructura: despliegue estático gratuito (Cloudflare Pages, Netlify o Vercel).
- Documentación: `openspec/desing.md` (diseño del proyecto de Estadística) queda como referencia y no se modifica; el diseño adaptado vive en `design.md` de este cambio.
- Fuera de alcance: backend, cuentas de usuario, IA generativa en el cálculo, cálculo multivariable, ecuaciones diferenciales, series y teoría de integración avanzada (por partes con casos complejos, fracciones parciales de grado alto).
