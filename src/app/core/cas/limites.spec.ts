import { describe, expect, it } from 'vitest';
import { resolverLimite } from './limites';

const L = (f: string, p: string, lado: 'ambos' | 'izq' | 'der' = 'ambos') => resolverLimite(f, p, lado);

describe('límites', () => {
  it('sustitución directa', () => {
    const r = L('x^2 + 3x', '2');
    expect(r.respuesta.texto).toBe('10');
    expect(r.verificacion?.coincide).toBe(true);
  });
  it('0/0 por factorización', () => {
    const r = L('(x^2-4)/(x-2)', '2');
    expect(r.respuesta.texto).toBe('4');
    expect(r.pasos.some((p) => p.regla.includes('Factorizar'))).toBe(true);
    expect(r.estado).toBe('ok');
  });
  it('0/0 por conjugado', () => {
    const r = L('(sqrt(x+1)-1)/x', '0');
    expect(r.respuesta.latex).toContain('\\frac{1}{2}');
    expect(r.pasos.some((p) => p.regla.includes('conjugado'))).toBe(true);
  });
  it('laterales distintos con |x|/x', () => {
    const r = L('|x|/x', '0');
    expect(r.respuesta.texto).toMatch(/no existe/);
    expect(r.interpretacion).toMatch(/izquierda -1 y por la derecha 1/);
    expect(r.estado).toBe('ok');
  });
  it('al infinito: cociente de polinomios', () => {
    const r = L('(3x^2+1)/(x^2-5)', 'inf');
    expect(r.respuesta.texto).toBe('3');
    expect(r.interpretacion).toContain('y = 3');
  });
  it('divergencia: 1/(x-1) en 1', () => {
    const r = L('1/(x-1)', '1');
    expect(r.respuesta.texto).toMatch(/no existe/);
    expect(L('1/x^2', '0').respuesta.texto).toBe('+∞');
    expect(L('1/(x-1)', '1', 'der').respuesta.texto).toBe('+∞');
    expect(L('1/(x-1)', '1', 'izq').respuesta.texto).toBe('−∞');
  });
  it('notable sin(3x)/x', () => {
    const r = L('sin(3x)/x', '0');
    expect(r.respuesta.texto).toBe('3');
    expect(r.pasos.some((p) => p.regla.includes('notable'))).toBe(true);
  });
  it('L\'Hôpital', () => {
    const r = L('(e^x - 1)/x', '0');
    expect(r.respuesta.texto).toBe('1');
    expect(L('(1-cos(x))/x^2', '0').respuesta.latex).toContain('\\frac{1}{2}');
  });
  it('infinito con no polinomios', () => {
    expect(L('e^x/x^2', 'inf').respuesta.texto).toBe('+∞');
    expect(L('ln(x)/x', 'inf').respuesta.texto).toBe('0');
    expect(L('sin(x)', 'inf').respuesta.texto).toMatch(/no existe/);
    expect(L('x^3-2x', '-inf').respuesta.texto).toBe('−∞');
  });
  it('errores', () => {
    expect(L('', '1').estado).toBe('error');
    expect(L('x', '').estado).toBe('error');
    expect(L('x', 'abc').estado).toBe('error');
  });
});
