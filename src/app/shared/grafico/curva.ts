import { ErrorEntrada } from '../../core/cas/errores';
import { parsear } from '../../core/cas/parser';
import { enVariableX } from '../../core/cas/variable';
import { CurvaGrafica } from './grafico';

/** Convierte el texto escrito por el usuario en una curva graficable; null si es inválido o vacío. */
export function curvaDe(texto: string): CurvaGrafica | null {
  const t = texto.replace(/^\s*(f|g|h|y)\s*(\(\s*x\s*\))?\s*=\s*/i, '');
  if (!t.trim()) return null;
  try {
    return { nodo: enVariableX(parsear(t)), texto: t.trim() };
  } catch (e) {
    if (e instanceof ErrorEntrada) return null;
    throw e;
  }
}
