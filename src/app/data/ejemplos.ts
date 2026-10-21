import { resolverEcuacion, resolverFactorizacion } from '../core/cas/algebra';
import { resolverComposicion, resolverDominio } from '../core/cas/funciones';
import { resolverAnalisis } from '../core/cas/analisis-funcion';
import { resolverOptimizacion, resolverRazonRelacionada } from '../core/cas/aplicaciones';
import { resolverDerivada } from '../core/cas/derivadas';
import { resolverIntegral } from '../core/cas/integrales';
import { resolverLimite } from '../core/cas/limites';
import { Resultado } from '../core/cas/resultado.model';

export type ModuloEjemplo = 'algebra' | 'graficas' | 'limites' | 'derivadas' | 'integrales' | 'aplicaciones';

export interface Ejemplo {
  id: string;
  modulo: ModuloEjemplo;
  titulo: string;
  enunciado: string;
  /** Ruta de la app y parámetros de consulta que precargan el módulo. */
  ruta: string;
  consulta: Record<string, string>;
}

/** Ejercicios de ejemplo. Al abrirlos, el módulo los resuelve con el motor real. */
export const EJEMPLOS: Ejemplo[] = [
  { id: 'prueba-cubica', modulo: 'aplicaciones', titulo: 'Función de prueba: extremos de x³ − 6x² + 9x + 1', enunciado: 'Analiza f(x) = x³ − 6x² + 9x + 1; determina sus puntos críticos y clasifica sus extremos relativos.', ruta: '/aplicaciones', consulta: { tab: 'funcion', f: 'x^3 - 6x^2 + 9x + 1' } },
  { id: 'ecuacion-cuadratica', modulo: 'algebra', titulo: 'Ecuación cuadrática', enunciado: 'Resuelve x² − 5x + 6 = 0.', ruta: '/algebra', consulta: { tab: 'ecuaciones', q: 'x^2 - 5x + 6 = 0' } },
  { id: 'ecuacion-radical', modulo: 'algebra', titulo: 'Ecuación con raíz extraña', enunciado: 'Resuelve √(x + 2) = x y descarta la raíz extraña.', ruta: '/algebra', consulta: { tab: 'ecuaciones', q: 'sqrt(x+2) = x' } },
  { id: 'factorizar', modulo: 'algebra', titulo: 'Factorización', enunciado: 'Factoriza x³ − 4x.', ruta: '/algebra', consulta: { tab: 'factorizacion', q: 'x^3 - 4x' } },
  { id: 'dominio', modulo: 'algebra', titulo: 'Dominio de una función', enunciado: 'Halla el dominio de f(x) = √(x − 1)/(x − 3).', ruta: '/algebra', consulta: { tab: 'dominio', q: 'sqrt(x-1)/(x-3)' } },
  { id: 'composicion', modulo: 'algebra', titulo: 'Composición de funciones', enunciado: 'Con f(x) = x² + 1 y g(x) = 2x − 3, calcula f∘g y g∘f, y evalúa en x = 2.', ruta: '/algebra', consulta: { tab: 'composicion', f: 'x^2 + 1', g: '2x - 3', p: '2' } },
  { id: 'grafica-racional', modulo: 'graficas', titulo: 'Gráfica con asíntota', enunciado: 'Grafica f(x) = 1/(x − 2) e identifica sus asíntotas.', ruta: '/graficas', consulta: { f: '1/(x-2)' } },
  { id: 'limite-factorizar', modulo: 'limites', titulo: 'Límite 0/0 por factorización', enunciado: 'Calcula el límite de (x² − 4)/(x − 2) cuando x → 2.', ruta: '/limites', consulta: { f: '(x^2-4)/(x-2)', a: '2' } },
  { id: 'limite-notable', modulo: 'limites', titulo: 'Límite trigonométrico notable', enunciado: 'Calcula el límite de sin(3x)/x cuando x → 0.', ruta: '/limites', consulta: { f: 'sin(3x)/x', a: '0' } },
  { id: 'limite-infinito', modulo: 'limites', titulo: 'Límite en el infinito', enunciado: 'Calcula el límite de (3x² + 1)/(x² − 5) cuando x → ∞.', ruta: '/limites', consulta: { f: '(3x^2+1)/(x^2-5)', a: 'inf' } },
  { id: 'derivada-producto', modulo: 'derivadas', titulo: 'Regla del producto', enunciado: 'Deriva f(x) = x²·sin(x).', ruta: '/derivadas', consulta: { f: 'x^2*sin(x)' } },
  { id: 'derivada-cadena', modulo: 'derivadas', titulo: 'Regla de la cadena y tangente', enunciado: 'Deriva f(x) = (3x + 1)⁵ y evalúa f′(0).', ruta: '/derivadas', consulta: { f: '(3x+1)^5', p: '0' } },
  { id: 'integral-sustitucion', modulo: 'integrales', titulo: 'Integral por sustitución', enunciado: 'Calcula ∫ 2x·cos(x²) dx.', ruta: '/integrales', consulta: { f: '2x*cos(x^2)' } },
  { id: 'integral-definida', modulo: 'integrales', titulo: 'Integral definida', enunciado: 'Calcula ∫₀³ x² dx.', ruta: '/integrales', consulta: { f: 'x^2', a: '0', b: '3' } },
  { id: 'optimizacion-rectangulo', modulo: 'aplicaciones', titulo: 'Optimización: rectángulo de área máxima', enunciado: 'Un rectángulo tiene perímetro 40 m. ¿Qué dimensiones dan el área máxima?', ruta: '/aplicaciones', consulta: { tab: 'optimizacion', plantilla: 'rectangulo-perimetro', P: '40' } },
  { id: 'razon-esfera', modulo: 'aplicaciones', titulo: 'Razón de cambio: esfera', enunciado: 'El volumen de una esfera crece a 100 cm³/s. ¿Qué tan rápido crece el radio cuando r = 5 cm?', ruta: '/aplicaciones', consulta: { tab: 'razones', plantilla: 'esfera', conocida: 'Q', tasa: '100', x0: '5' } },
];

/** Resuelve un ejemplo con el motor (la misma lógica que usan las pantallas). */
export function ejecutarEjemplo(e: Ejemplo): Resultado {
  const c = e.consulta;
  switch (e.id) {
    case 'prueba-cubica': return resolverAnalisis(c['f']);
    case 'ecuacion-cuadratica': case 'ecuacion-radical': return resolverEcuacion(c['q']);
    case 'factorizar': return resolverFactorizacion(c['q']);
    case 'dominio': return resolverDominio(c['q']);
    case 'composicion': return resolverComposicion(c['f'], c['g'], c['p']);
    case 'grafica-racional': return resolverAnalisis(c['f']);
    case 'limite-factorizar': case 'limite-notable': case 'limite-infinito': return resolverLimite(c['f'], c['a']);
    case 'derivada-producto': case 'derivada-cadena': return resolverDerivada(c['f'], { punto: c['p'] });
    case 'integral-sustitucion': case 'integral-definida': return resolverIntegral(c['f'], c['a'], c['b']);
    case 'optimizacion-rectangulo': return resolverOptimizacion(c['plantilla'], { P: c['P'] });
    case 'razon-esfera': return resolverRazonRelacionada(c['plantilla'], c['conocida'] as 'X' | 'Q', c['tasa'], c['x0']);
    default: throw new Error(`Ejemplo desconocido: ${e.id}`);
  }
}
