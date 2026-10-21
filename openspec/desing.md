# Asistente Virtual de Estadística Aplicada: Stack y Arquitectura

Proyecto UMG, entrega domingo 25/10/2026. Enfoque: app web estática en Angular, sin backend y sin IA en los cálculos.

## 1. Decisiones clave

- Los cálculos los ejecuta código determinista (TypeScript), no un LLM. La precisión vale 4 de 15 puntos.
- Sin backend ni claves de API: el enlace funciona gratis, sin login y sin cuotas durante la revisión.
- Fórmula, sustitución, procedimiento y respuesta se generan con plantillas, siempre consistentes.
- Si quieren un toque de IA, que solo extraiga parámetros de texto libre. El cálculo lo hace siempre el código, y debe existir un respaldo con formularios.

## 2. Stack

Framework
- Angular 22 (versión activa y estable). Instalar la CLI más reciente: `npm i -g @angular/cli@latest`
- Crear el proyecto sin SSR: `ng new asistente-estadistica --ssr=false`
- Componentes standalone y signals
- Reactive Forms (Signal Forms era experimental en la 21, mejor evitarlo)
- Rutas lazy por módulo con `withHashLocation()`, así no hay 404 al recargar

Interfaz
- Angular Material (pestañas, tablas, formularios, tooltips)
- Tailwind es opcional

Cálculo
- simple-statistics (tipos TS incluidos, normal estándar y su inversa)
- jStat solo si hace falta otra distribución
- Media, mediana, moda, desviación, correlación y regresión: programarlas a mano, para poder mostrar los pasos

Fórmulas
- KaTeX usado directo, con un pipe o directiva propia. Evita depender de un wrapper que quizá no soporte aún Angular 22.

Gráficas
- Chart.js directo sobre un canvas: histograma con barras, dispersión con línea de regresión

Estado compartido
- Un servicio con signals. Los datos cargados se reutilizan entre módulos. No hace falta NgRx.

Pruebas
- Vitest (o el runner que traiga la CLI por defecto)
- Comparar cada función contra valores de Python (numpy/scipy) con 10 a 15 casos. Sirve como "pruebas realizadas" del informe.

Hosting
- Cloudflare Pages, Netlify o Vercel: gratis, HTTPS, sin login
- Desplegar desde el primer día y probar desde incógnito y desde el celular

## 3. Patrón central: separar cálculo e interfaz

Cada función de `core/stats/` es pura y devuelve un objeto con todo lo que exige el enunciado:

```ts
interface Resultado {
  formula: string;          // LaTeX
  sustitucion: string;      // LaTeX con los valores
  pasos: string[];          // procedimiento
  valor: number | number[]; // respuesta final
  interpretacion: string;
  advertencias: string[];   // datos insuficientes, n=1, varianza 0...
}
```

La UI solo renderiza ese objeto. El generador de prácticas reutiliza las mismas funciones para calificar, y las pruebas unitarias cubren todo.

## 4. Estructura de carpetas

```
src/app/
├── core/
│   ├── stats/
│   │   ├── descriptiva.ts        media, mediana, moda, rango, varianza, desviación
│   │   ├── experimental.ts       mediciones, unidades, incertidumbre de la media
│   │   ├── frecuencias.ts        tabla de frecuencias, clases, histograma
│   │   ├── probabilidad.ts       probabilidad básica y distribución normal
│   │   ├── regresion.ts          correlación r, regresión lineal simple
│   │   └── resultado.model.ts    interfaz Resultado
│   ├── parsers/
│   │   └── numeros.parser.ts     coma o punto decimal, separadores, validación
│   ├── practica/
│   │   └── generador.service.ts  genera ejercicios y califica con tolerancia
│   └── estado/
│       └── datos.service.ts      signals con los datos cargados
├── features/
│   ├── inicio/
│   ├── descriptiva/
│   ├── datos-experimentales/
│   ├── tablas-graficas/
│   ├── probabilidad/
│   ├── correlacion-regresion/
│   ├── practica/
│   └── teoria/                   σ poblacional (÷N) vs s muestral (÷(n−1))
├── shared/
│   ├── formula/                  componente KaTeX
│   ├── grafico/                  wrapper de Chart.js
│   ├── caja-resultado/           muestra formula, sustitución, pasos, respuesta
│   └── entrada-datos/            textarea con validación y selector de unidades
├── data/
│   └── ejemplos.ts               10 ejercicios, incluido el de corriente
└── app.routes.ts
```

## 5. Cómo cubrir los requisitos del enunciado

- Nombre original e interfaz clara: elegir un nombre propio, layout con menú lateral o pestañas por módulo.
- Entrada de datos nuevos: textarea que acepta números separados por coma, espacio o salto de línea.
- Cálculo real: todo pasa por `core/stats/`.
- Fórmulas, sustitución, procedimiento y respuesta: componente `caja-resultado`.
- 10 ejemplos: botones que cargan datos de `ejemplos.ts`. El primero, el de corriente: 2.1, 2.3, 2.2, 2.4, 2.0 (media 2.2 A, s ≈ 0.1581 A).
- Generador de prácticas con retroalimentación: datos aleatorios, el usuario responde, se compara con tolerancia y se muestra el procedimiento si falla.
- Advertencias: vacío, texto no numérico, n = 1 para desviación muestral, varianza cero en correlación, regresión con x constante.
- Encabezado fijo con nombres de ambos integrantes, asignatura y sección.
- Interpretación: textos dinámicos, por ejemplo "r = 0.93: correlación positiva fuerte".

## 6. Trabajo en pareja

- Repo en GitHub, una rama por módulo.
- Primero definan juntos la interfaz `Resultado`, el parser y la estructura de carpetas.
- Después se reparten los módulos. Así no se pisan.
- Ambos deben poder explicar y demostrar todo el funcionamiento.

## 7. Orden sugerido de trabajo

1. Crear el proyecto, el repo y desplegar un "hola mundo" en el hosting.
2. Parser de números, interfaz `Resultado`, componentes `formula` y `caja-resultado`.
3. Estadística descriptiva con el ejemplo de la corriente.
4. Datos experimentales, tablas y gráficas, regresión y probabilidad.
5. Generador de prácticas y los 10 ejemplos.
6. Pruebas unitarias contra scipy, manejo de errores, pulido de interfaz.
7. Capturas de pantalla y el informe de máximo 3 páginas.
8. Revisión final del enlace en incógnito y en el celular.
