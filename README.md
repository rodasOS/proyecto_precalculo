# Tangente — Asistente de Cálculo

App web estática (Angular, sin backend ni claves). El motor de cálculo corre en el navegador, en un Web Worker con tiempo límite.

## Antes de entregar
1. Verificar `src/app/data/identidad.ts` (nombres, carnés y sección ya están cargados).
2. Desplegar (gratis, sin login para el docente):
   - Build: `npm ci && npm run build` · Carpeta de salida: `dist/asistente/browser`
   - Cloudflare Pages, Netlify o Vercel. Las rutas usan `#/`, así que recargar no da 404.
3. Probar el enlace en ventana de incógnito y en el celular.

## Comandos
- `npm start`: servidor de desarrollo.
- `npm test`: pruebas (Vitest) del núcleo, ejemplos, generador de prácticas, robustez y 66 casos de referencia contra SymPy.
- `python3 tools/generar_referencia.py`: regenera `src/app/data/casos-referencia.json` (requiere `pip install sympy`).

Diseño y decisiones: `openspec/changes/asistente-calculo-precalculo/` y `docs/spike-librerias.md`.
