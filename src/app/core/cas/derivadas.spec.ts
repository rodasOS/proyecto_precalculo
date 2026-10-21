import { describe, expect, it } from 'vitest';
import { derivar, resolverDerivada, comprobarDerivadaPropuesta } from './derivadas';
import { parsear } from './parser';
import { aTex } from './tex';
import { equivalentes } from './verificacion';

const d = (s: string) => aTex(derivar(parsear(s)));
const igualA = (s: string, esperado: string) => expect(equivalentes(derivar(parsear(s)), parsear(esperado))).toBe(true);

describe('derivar', () => {
  it('polinomio', () => expect(d('x^3 - 6x^2 + 9x + 1')).toBe('3 x^{2} - 12 x + 9'));
  it('producto', () => {
    expect(d('x^2*sin(x)')).toBe('x^{2} \\cos\\left(x\\right) + 2 x \\sin\\left(x\\right)');
  });
  it('cadena', () => expect(d('(3x+1)^5')).toBe('15 \\left(3 x + 1\\right)^{4}'));
  it('cociente', () => igualA('(x^2+1)/(x-1)', '(2x(x-1) - (x^2+1))/(x-1)^2'));
  it('exponencial, ln, trig compuestas', () => {
    igualA('e^(2x)', '2e^(2x)');
    igualA('ln(x^2+1)', '2x/(x^2+1)');
    igualA('sin(x^2)', '2x cos(x^2)');
    igualA('tan(x)', '1/cos(x)^2');
    igualA('sqrt(x)', '1/(2sqrt(x))');
    igualA('1/x', '-1/x^2');
    igualA('x^x', 'x^x (ln(x) + 1)');
    igualA('2^x', '2^x ln(2)');
    igualA('atan(x)', '1/(1+x^2)');
    igualA('sin(x)/x', '(x cos(x) - sin(x))/x^2');
  });
});

describe('resolverDerivada', () => {
  it('evalúa y da la recta tangente', () => {
    const r = resolverDerivada('x^3 - 6x^2 + 9x + 1', { punto: '2' });
    expect(r.estado).toBe('ok');
    expect(r.respuesta.texto).toContain("f'(2) = -3");
    expect(r.interpretacion).toContain('-3 x + 9');
    expect(r.verificacion?.coincide).toBe(true);
    expect(r.pasos.length).toBeGreaterThan(4);
  });
  it('segunda derivada', () => {
    const r = resolverDerivada('x^3', { orden: 2 });
    expect(r.respuesta.latex).toContain('6 x');
  });
  it('no derivable', () => {
    const r = resolverDerivada('|x|', { punto: '0' });
    expect(r.estado).toBe('advertencia');
    expect(r.advertencias.join(' ')).toMatch(/No existe la derivada/);
  });
  it('errores de entrada', () => {
    expect(resolverDerivada('(x+1').estado).toBe('error');
    expect(resolverDerivada('').estado).toBe('error');
  });
  it('respuesta propuesta', () => {
    expect(comprobarDerivadaPropuesta('x^2 + 2x', '2(x+1)').correcta).toBe(true);
    expect(comprobarDerivadaPropuesta('x^2 + 2x', '2x').correcta).toBe(false);
  });
});
