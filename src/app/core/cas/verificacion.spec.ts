import { describe, expect, it } from 'vitest';
import { parsear } from './parser';
import { clasificar } from './limites';
import { equivalentes, simpson, aFuncion, verificarAntiderivada, verificarDerivada, verificarIntegralDefinida, aleatorio, puntosValidos } from './verificacion';

const p = parsear;

describe('verificación numérica', () => {
  it('acepta una derivada correcta y rechaza una incorrecta', () => {
    expect(verificarDerivada(p('x^3 - 6x^2'), p('3x^2 - 12x')).coincide).toBe(true);
    expect(verificarDerivada(p('x^3 - 6x^2'), p('3x^2 - 6x')).coincide).toBe(false);
    expect(verificarDerivada(p('sin(x^2)'), p('2x*cos(x^2)')).coincide).toBe(true);
  });
  it('antiderivada: acepta la correcta y rechaza la errónea', () => {
    expect(verificarAntiderivada(p('2x'), p('x^2')).coincide).toBe(true);
    expect(verificarAntiderivada(p('2x'), p('x^3')).coincide).toBe(false);
    expect(verificarAntiderivada(p('1/x'), p('ln(abs(x))')).coincide).toBe(true);
  });
  it('integral definida contra Simpson', () => {
    expect(verificarIntegralDefinida(p('x^2'), 0, 3, 9).coincide).toBe(true);
    expect(verificarIntegralDefinida(p('x^2'), 0, 3, 8).coincide).toBe(false);
    expect(simpson(aFuncion(p('sin(x)')), 0, Math.PI)).toBeCloseTo(2, 8);
  });
  it('equivalencia de expresiones', () => {
    expect(equivalentes(p('x(x+1)'), p('x^2 + x'))).toBe(true);
    expect(equivalentes(p('(x+1)^2'), p('x^2 + 1'))).toBe(false);
    expect(equivalentes(p('sin(x)^2 + cos(x)^2'), p('1'))).toBe(true);
    expect(equivalentes(p('sqrt(x)'), p('x'))).toBe(false);
  });
  it('clasifica sucesiones', () => {
    expect(clasificar([1.1, 1.01, 1.001, 1.0001, 1.00001]).tipo).toBe('valor');
    expect(clasificar([10, 100, 1000, 1e4, 1e5]).tipo).toBe('inf');
    expect(clasificar([1, -1, 1, -1, 1]).tipo).toBe('oscila');
    expect(clasificar([NaN, NaN, NaN, NaN, NaN]).tipo).toBe('indef');
  });
  it('es determinista', () => {
    const a = aleatorio(5), b = aleatorio(5);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(puntosValidos([aFuncion(p('sqrt(x)'))], 5)).toEqual(puntosValidos([aFuncion(p('sqrt(x)'))], 5));
  });
});

describe('verificación de límites', () => {
  it('detecta cuando la tabla contradice el resultado simbólico', async () => {
    const { verificarLimite } = await import('./limites');
    const f = p('(x^2-4)/(x-2)');
    expect(verificarLimite(f, 2, 0, 0, { tipo: 'valor', v: 4, ex: null }).coincide).toBe(true);
    expect(verificarLimite(f, 2, 0, 0, { tipo: 'valor', v: 5, ex: null }).coincide).toBe(false);
    expect(verificarLimite(p('1/(x-1)'), 1, 0, 0, { tipo: 'valor', v: 0, ex: null }).coincide).toBe(false);
  });
});
