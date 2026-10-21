# Spike de librerías (tarea 1.4)

Probado con nerdamer (bundle `all`) en Node, 2026-10-21.

## nerdamer: se usa
- `diff`, `factor`, `expand`, `simplify`, `solve` (polinomios, racionales, `abs`, con raíz): correctos.
- `solve` de cuadráticas sin soluciones reales devuelve `±i`: el motor debe filtrar complejas.
- `solve` de cúbicas sin raíces racionales da fórmulas enormes: el motor usa respaldo numérico.
- `toTeX()` produce LaTeX utilizable.

## nerdamer: NO se usa para respuesta final (el motor propio lo cubre)
- `limit(1/(x-1), x, 1)` devuelve `0` (incorrecto, diverge) y `limit(abs(x)/x, x, 0)` devuelve `0` (incorrecto, no existe).
- `integrate(1/x)` da `log(x)` (falta `|x|`); `sin(x)/x` da `Si(x)` (no elemental); `e^(x^2)` queda sin evaluar.
- `defint(f, a, b, x)` rechaza la firma probada.
- Ninguna función devuelve pasos.

## Conclusión (decide D3)
Derivadas, integrales, límites y sus pasos: motor propio sobre el AST de math.js.
nerdamer: factorización, resolución, expansión y como segunda opinión de equivalencia.
Toda respuesta se contrasta con `verificacion.ts` (D4), lo que habría atrapado los dos límites erróneos.

## Decisiones finales (tras implementar)
- **Parser, AST y evaluador propios** (en lugar de math.js): permiten errores en español con posición, LaTeX controlado y pasos. math.js y function-plot se desinstalaron.
- **Gráficas**: renderizador SVG propio (zoom, desplazamiento, cortes en asíntotas), en lugar de function-plot.
- **nerdamer** solo para `factor` y para resolver ecuaciones no polinomiales; las raíces de polinomios usan raíces racionales + fórmula cuadrática propias (`nerdamer.solve` se colgaba con cúbicas de raíces irracionales).
- El motor corre en un Web Worker con tiempo límite de 8 s.

## Peso del bundle (producción)
- Inicial: 306 kB sin comprimir / 79 kB transferidos.
- Carga diferida por ruta: ~570 kB (nerdamer, 145 kB comprimido) + worker ~571 kB.
