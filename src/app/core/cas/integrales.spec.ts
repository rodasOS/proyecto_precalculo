import { describe, expect, it } from 'vitest';
import { resolverIntegral, integrar } from './integrales';
import { parsear } from './parser';
import { derivar } from './derivadas';
import { equivalentes } from './verificacion';

/** La derivada simbólica de la integral debe equivaler al integrando. */
const antiderivadaOk = (f: string) => {
  let F;
  try { F = integrar(parsear(f)); } catch (e) { throw new Error(`${f}: ${(e as Error).message}`); }
  expect(equivalentes(derivar(F), parsear(f)), `${f} → no deriva de vuelta`).toBe(true);
};

describe('integrales indefinidas', () => {
  it('polinomio', () => {
    const r = resolverIntegral('3x^2 + 4x - 5');
    expect(r.respuesta.latex).toContain('x^{3} + 2 x^{2} - 5 x + C');
    expect(r.verificacion?.coincide).toBe(true);
    expect(r.estado).toBe('ok');
  });
  it('1/x', () => expect(resolverIntegral('1/x').respuesta.latex).toContain('\\ln\\left(\\left|x\\right|\\right)'));
  it('sustitución', () => {
    const r = resolverIntegral('2x*cos(x^2)');
    expect(r.respuesta.latex).toContain('\\sin\\left(x^{2}\\right) + C');
    expect(r.pasos.some((p) => p.regla === 'Sustitución')).toBe(true);
  });
  it('varias técnicas devuelven antiderivadas correctas', () => {
    for (const f of ['x^2', 'sqrt(x)', '1/x^2', 'e^(2x)', 'sin(3x+1)', '(2x+1)^5', 'x*e^(x^2)', 'x/(x^2+1)',
      'cos(x)^2', '1/(x^2+4)', '1/(x^2-1)', 'x*e^x', 'x*sin(x)', 'ln(x)', 'x*ln(x)', 'tan(x)', '(x+1)^2*x', '2^x', '1/(x^2+2x+1)', 'sin(x)*cos(x)', 'x^2*e^x', 'e^x/(1+e^x)', 'ln(x)/x']) {
      antiderivadaOk(f);
    }
  });
  it('no elemental', () => {
    expect(resolverIntegral('sin(x)/x').estado).toBe('no-resuelto');
    expect(resolverIntegral('e^(x^2)').estado).toBe('no-resuelto');
    expect(resolverIntegral('e^(x^2)').advertencias[0]).toMatch(/no tiene antiderivada elemental/);
  });
});

describe('integrales definidas', () => {
  it('x² de 0 a 3', () => {
    const r = resolverIntegral('x^2', '0', '3');
    expect(r.respuesta.texto).toBe('9');
    expect(r.verificacion?.coincide).toBe(true);
  });
  it('x de -1 a 1', () => {
    const r = resolverIntegral('x', '-1', '1');
    expect(r.respuesta.texto).toBe('0');
    expect(r.interpretacion).toMatch(/cambia de signo/);
  });
  it('discontinuidad dentro del intervalo', () => {
    const r = resolverIntegral('1/x^2', '-1', '1');
    expect(r.estado).toBe('advertencia');
    expect(r.respuesta.texto).not.toBe('-2');
  });
  it('límites con pi y falta de datos', () => {
    expect(resolverIntegral('sin(x)', '0', 'pi').respuesta.texto).toBe('2');
    expect(resolverIntegral('x', '0', '').estado).toBe('error');
    expect(resolverIntegral('x', '3', '0').respuesta.texto).toBe('-4.5');
  });
});
