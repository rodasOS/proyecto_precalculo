# Tasks

## 1. Proyecto, despliegue y spike de librerías

- [x] 1.1 Crear el proyecto Angular sin SSR en la raíz (`ng new` con standalone, signals, rutas con `withHashLocation()`), añadir Angular Material y Vitest; verificar que `ng build` y `ng test` corren en limpio
- [ ] 1.2 Crear repo en GitHub con rama por módulo y desplegar un "hola mundo" en Cloudflare Pages, Netlify o Vercel; verificar que la URL abre en ventana de incógnito y en el celular
- [x] 1.3 Instalar math.js, nerdamer (Algebra, Calculus, Solve), KaTeX y function-plot; verificar que el build compila y anotar el peso del bundle
- [x] 1.4 Spike: probar nerdamer y function-plot con un corpus de ~20 casos (derivada, integral, límite, factorización, resolver, asíntota de `1/(x-2)`, `x^3-6x^2+9x+1`); verificar y registrar en comentarios del repo qué casos cubre cada librería y qué debe cubrir el motor propio (decide D3 y D5 del diseño)
- [ ] 1.5 Definir `data/identidad.ts` con nombre del asistente, integrantes, asignatura y sección (datos reales a confirmar por la pareja); verificar que el encabezado los muestra

## 2. Núcleo base: entrada, contrato y verificación

- [x] 2.1 Implementar `resultado.model.ts` (`Resultado`, `Paso`) según D2 y verificar que compila y los demás módulos lo importan
- [x] 2.2 Implementar `normalizar.ts` y `parser.ts` (símbolos tipográficos, coma decimal, multiplicación implícita, `|x|`, `√`, `π`) y mensajes de error en español con posición; verificar con pruebas unitarias para los escenarios de `math-expression-input` (paréntesis sin cerrar, vacío, función desconocida, variable no soportada)
- [x] 2.3 Implementar `verificacion.ts` (cociente incremental, derivación de antiderivada, cuadratura de Simpson, tabla de límites, sustitución de raíces, equivalencia por muestreo); verificar con pruebas unitarias incluyendo un caso que debe fallar a propósito
- [x] 2.4 Construir `formula` (KaTeX), `entrada-expresion` (vista previa, errores, teclado de símbolos) y `caja-resultado`; verificar visualmente con un `Resultado` de prueba que muestra fórmula, sustitución, pasos, respuesta, verificación y advertencias

## 3. Derivadas y análisis de la función de prueba (primera vertical)

- [x] 3.1 Implementar `derivadas.ts` (constante, potencia, múltiplo, suma, producto, cociente, cadena, trigonométricas, exponencial, logaritmo) con pasos nombrados, derivadas de orden superior y evaluación en un punto con recta tangente; verificar con pruebas unitarias de los escenarios de `derivatives` (incluida `|x|` en 0 y respuesta propuesta equivalente/incorrecta)
- [x] 3.2 Implementar `analisis-funcion.ts` (intersecciones, puntos críticos, clasificación por segunda y primera derivada, inflexión, monotonía) con raíz simbólica y respaldo numérico; verificar con una prueba unitaria que `x^3-6x^2+9x+1` da máximo `(1,5)`, mínimo `(3,1)`, inflexión `(2,3)` y crece en `(-∞,1)∪(3,∞)`, además de `x^3` y `x^3+x`
- [x] 3.3 Construir la pantalla del módulo Derivadas con campo, punto opcional y verificador de respuesta propia; verificar manualmente en el navegador con `x^2*sin(x)` y `(3x+1)^5`

## 4. Álgebra y funciones

- [x] 4.1 Implementar en `algebra.ts` ecuaciones (lineal, cuadrática con discriminante, polinomial, racional, radical, valor absoluto), comprobación de raíces y descarte de extrañas, y desigualdades con notación de intervalos; verificar con pruebas unitarias de `algebra-and-functions` (`x^2-5x+6=0`, `x^2+1=0`, `(x^2-4)/(x-2)=0`, `sqrt(x+2)=x`, `x^2-4<0`)
- [x] 4.2 Implementar factorización con técnica nombrada y comprobación por multiplicación; verificar con pruebas de `x^2-9`, `x^2+x-6`, `x^3-x` y el caso irreducible `x^2+1`
- [x] 4.3 Implementar en `funciones.ts` dominio (denominador, raíz par, logaritmo), rango (cuando sea determinable, si no "no determinado") y composición con dominio y evaluación; verificar con pruebas de `sqrt(x-1)/(x-3)` y `f∘g` con `f=x^2+1`, `g=2x-3`
- [x] 4.4 Construir la pantalla del módulo Álgebra y funciones (pestañas ecuaciones, factorización, dominio y rango, composición); verificar manualmente un ejemplo por pestaña

## 5. Gráficas

- [x] 5.1 Implementar `shared/grafico` con function-plot (o el respaldo del spike): varias funciones, ajuste de intervalo, zoom/pan, asíntotas verticales sin unir ramas y sin dibujar fuera del dominio; verificar con `1/(x-2)`, `sqrt(x)` y `tan(x)`
- [x] 5.2 Marcar sobre la gráfica intersecciones, extremos, inflexiones y asíntotas con lista de coordenadas e interpretación de crecimiento; verificar con la función de prueba que los puntos coinciden con la tarea 3.2
- [x] 5.3 Construir la pantalla del módulo Gráficas con avisos para entradas no graficables (`x+y`, vacío); verificar manualmente en escritorio y en celular sin desplazamiento horizontal

## 6. Límites

- [x] 6.1 Implementar `limites.ts` con cascada: sustitución directa, factorización/simplificación, conjugado, comparación de grados en el infinito, límites notables y L'Hôpital, más límites laterales y divergentes; verificar con pruebas de `limits` (`(x^2-4)/(x-2)`, `(sqrt(x+1)-1)/x`, `|x|/x`, `(3x^2+1)/(x^2-5)`, `1/(x-1)`, `sin(3x)/x`)
- [x] 6.2 Añadir tabla de aproximación numérica por ambos lados y advertencia si contradice el resultado simbólico; verificar con un caso forzado a discrepar
- [x] 6.3 Construir la pantalla del módulo Límites (punto, ±∞, lado) y verificar manualmente un ejemplo de cada tipo

## 7. Integrales

- [x] 7.1 Implementar `integrales.ts`: tabla (potencia, `1/x`, exponencial, trigonométricas), linealidad, sustitución lineal y `u=g(x)` con `g'` detectada, con `+ C`; verificar con pruebas de `3x^2+4x-5`, `1/x`, `2x*cos(x^2)` y que cada resultado se confirma derivando
- [x] 7.2 Implementar integral definida con teorema fundamental, aviso de discontinuidad en el intervalo y declaración de "sin antiderivada elemental"; verificar con `x^2` en `[0,3]`, `x` en `[-1,1]`, `1/x^2` en `[-1,1]` (debe advertir) y `sin(x)/x` (no resuelto)
- [x] 7.3 Añadir comprobación numérica del área y construir la pantalla del módulo Integrales (indefinida/definida); verificar manualmente con ejemplos de ambas

## 8. Aplicaciones

- [x] 8.1 Implementar en `aplicaciones.ts` extremos absolutos en intervalo cerrado con tabla de comparación y razón de cambio promedio/instantánea; verificar con `x^3-6x^2+9x+1` en `[0,4]` y `s(t)=t^2`
- [x] 8.2 Implementar `plantillas-aplicaciones.ts` de optimización (rectángulo con perímetro, caja abierta, ingreso/costo) con función objetivo, restricción, dominio práctico, verificación de máximo/mínimo y conclusión con unidades; verificar con el rectángulo de perímetro 40 (área 100) y datos inválidos (perímetro ≤ 0)
- [x] 8.3 Implementar plantillas de razones relacionadas (esfera, círculo, escalera, cono); verificar con la esfera (`dV/dt=100`, `r=5`, `dr/dt=1/π`)
- [x] 8.4 Construir la pantalla del módulo Aplicaciones (análisis de función con el ejemplo de prueba, optimización, razones de cambio); verificar manualmente el ejemplo de prueba del enunciado de punta a punta

## 9. Ejemplos y prácticas

- [x] 9.1 Crear `data/ejemplos.ts` con ≥10 ejemplos que cubren los seis módulos (incluye `x^3-6x^2+9x+1`) y la sección Ejemplos que los carga en su módulo y los resuelve con el motor; verificar con una prueba que todos resuelven con `estado` distinto de `error` y sin advertencia de no resuelto
- [x] 9.2 Implementar `generador.service.ts` que construye ejercicios desde la respuesta por módulo y dificultad; verificar con una prueba que 200 generaciones por módulo son resolubles por el motor y no se repiten idénticas
- [x] 9.3 Implementar calificación por equivalencia con tolerancia numérica, pista, procedimiento completo a petición y marcador de aciertos/intentos con reinicio; verificar con pruebas (`x(x+1)` vs `x^2+x`, `0.318` vs `0.3183`, respuesta vacía e inválida) y manualmente en la pantalla de Práctica

## 10. Pruebas de referencia, robustez y pulido

- [x] 10.1 Generar con SymPy `casos-referencia.json` (≥40 casos distribuidos en todos los módulos) y escribir el test de Vitest que los compara; verificar que pasan todos o que cada fallo está documentado como limitación
- [x] 10.2 Prueba de robustez con entradas hostiles (vacío, `((`, `1/0`, `ln(-1)`, `x^`, `abc`, `√`, texto largo, números enormes, límites invertidos) verificando que nunca hay excepción no controlada ni resultado sin advertencia; añadir timeout al motor y verificar que un caso patológico responde con aviso en vez de congelar la página
- [x] 10.3 Pantalla de inicio con guía de sintaxis, alcance y limitaciones, navegación, accesibilidad básica y diseño responsive; verificar en escritorio y celular y que recargar en cualquier módulo no da 404
- [ ] 10.4 Revisar los pasos de 5 ejercicios de clase con la nomenclatura del curso y ajustar los textos de las reglas; verificar con ambos integrantes que pueden explicar cada paso

## 11. Entrega

- [ ] 11.1 Despliegue final de producción y prueba del enlace en ventana de incógnito, en celular y con conexión lenta; verificar que no pide login ni consume cuotas
- [ ] 11.2 Tomar capturas (ejemplo de prueba, gráfica, un límite, una integral, una optimización, práctica con retroalimentación, un error de entrada) y redactar el informe de máximo 3 páginas (integrantes, herramientas, funcionalidades, pruebas, capturas); verificar que exporta a PDF o Word y no excede tres páginas
- [ ] 11.3 Ensayo de demostración con ambos integrantes con 3 problemas nuevos no vistos y entrega en Canvas del enlace y del informe antes del 25/10/2026; verificar que el enlace sigue activo tras la entrega

## Workflow follow-up

- Archivar el cambio una vez entregado y revisado.
- Verificar que las specs principales en `openspec/specs/` reflejan lo entregado.
