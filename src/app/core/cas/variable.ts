import { Nodo, sustituir, variables, vr } from './ast';
import { ErrorEntrada } from './errores';

/** Asegura que la expresión sea de x (renombra t → x si solo aparece t). */
export function enVariableX(f: Nodo): Nodo {
  const vs = variables(f);
  if (vs.has('t') && vs.has('x')) throw new ErrorEntrada('Solo se admite una variable por expresión (x o t), no ambas.');
  return vs.has('t') ? sustituir(f, 't', vr('x')) : f;
}
