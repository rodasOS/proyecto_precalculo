import { resolverEcuacion, resolverFactorizacion } from './cas/algebra';
import { resolverAnalisis } from './cas/analisis-funcion';
import { resolverExtremosAbsolutos, resolverOptimizacion, resolverRazonCambio, resolverRazonRelacionada } from './cas/aplicaciones';
import { OpcionesDerivada, resolverDerivada } from './cas/derivadas';
import { resolverComposicion, resolverDominio, resolverRango } from './cas/funciones';
import { resolverIntegral } from './cas/integrales';
import { Lado, resolverLimite } from './cas/limites';
import { NoResuelto } from './cas/errores';
import { Resultado, resultadoError } from './cas/resultado.model';

/** Todas las operaciones del motor, accesibles por nombre (las usa el Web Worker y el respaldo sin worker). */
export const OPERACIONES = {
  derivada: (f: string, op: OpcionesDerivada) => resolverDerivada(f, op),
  integral: (f: string, a: string, b: string) => resolverIntegral(f, a, b),
  limite: (f: string, punto: string, lado: Lado) => resolverLimite(f, punto, lado),
  ecuacion: (q: string) => resolverEcuacion(q),
  factorizacion: (q: string) => resolverFactorizacion(q),
  dominio: (q: string) => resolverDominio(q),
  rango: (q: string) => resolverRango(q),
  composicion: (f: string, g: string, p: string) => resolverComposicion(f, g, p),
  analisis: (f: string) => resolverAnalisis(f),
  extremos: (f: string, a: string, b: string) => resolverExtremosAbsolutos(f, a, b),
  razonCambio: (f: string, a: string, b: string, p: string, uy: string, ux: string) => resolverRazonCambio(f, a, b, p, uy, ux),
  optimizacion: (id: string, v: Record<string, number | string>) => resolverOptimizacion(id, v),
  razonRelacionada: (id: string, conocida: 'X' | 'Q', tasa: string, x0: string, params: Record<string, string>, ut: string) =>
    resolverRazonRelacionada(id, conocida, tasa, x0, params, ut),
} satisfies Record<string, (...args: never[]) => Resultado>;

export type NombreOp = keyof typeof OPERACIONES;

/** Ejecuta una operación; jamás lanza: una excepción se convierte en un Resultado de error. */
export function ejecutarOp(op: NombreOp, args: unknown[]): Resultado {
  try {
    const f = OPERACIONES[op] as (...a: unknown[]) => Resultado;
    return f(...args);
  } catch (e) {
    if (e instanceof NoResuelto) return resultadoError('No resuelto', e.message, 'no-resuelto');
    return resultadoError('Error inesperado', 'Ocurrió un error inesperado al resolver este caso. Revisa la expresión o prueba con una más sencilla.');
  }
}
