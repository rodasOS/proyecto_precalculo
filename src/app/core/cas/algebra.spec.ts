import { describe, expect, it } from 'vitest';
import { resolverEcuacion, resolverDesigualdad, resolverFactorizacion } from './algebra';

describe('ecuaciones', () => {
  it('cuadrática', () => {
    const r = resolverEcuacion('x^2 - 5x + 6 = 0');
    expect(r.respuesta.texto).toBe('x = 2, x = 3');
    expect(r.pasos.some((p) => p.regla === 'Discriminante')).toBe(true);
    expect(r.verificacion?.coincide).toBe(true);
  });
  it('sin soluciones reales', () => {
    const r = resolverEcuacion('x^2 + 1 = 0');
    expect(r.respuesta.texto).toBe('Sin soluciones reales');
    expect(r.pasos.some((p) => p.regla === 'Δ < 0')).toBe(true);
  });
  it('racional con valor excluido', () => {
    const r = resolverEcuacion('(x^2 - 4)/(x - 2) = 0');
    expect(r.respuesta.texto).toBe('x = -2');
    expect(r.advertencias.join(' ')).toMatch(/2/);
  });
  it('radical con raíz extraña', () => {
    const r = resolverEcuacion('sqrt(x+2) = x');
    expect(r.respuesta.texto).toBe('x = 2');
    expect(r.pasos.some((p) => p.regla === 'Raíz extraña descartada')).toBe(true);
  });
  it('lineal, valor absoluto, cúbica', () => {
    expect(resolverEcuacion('2x + 3 = 7').respuesta.texto).toBe('x = 2');
    expect(resolverEcuacion('|x - 1| = 3').respuesta.texto).toBe('x = -2, x = 4');
    expect(resolverEcuacion('x^3 - 6x^2 + 11x - 6 = 0').respuesta.texto).toBe('x = 1, x = 2, x = 3');
  });
  it('sin igualdad advierte', () => {
    const r = resolverEcuacion('x^2 - 4');
    expect(r.advertencias.join(' ')).toMatch(/expresión = 0/);
    expect(r.respuesta.texto).toBe('x = -2, x = 2');
  });
  it('errores', () => {
    expect(resolverEcuacion('').estado).toBe('error');
    expect(resolverEcuacion('x = = 2').estado).toBe('error');
    expect(resolverEcuacion('x + y = 2').estado).toBe('error');
  });
});

describe('desigualdades', () => {
  it('cuadrática', () => expect(resolverDesigualdad('x^2 - 4 < 0').respuesta.texto).toBe('x ∈ (-2, 2)'));
  it('complemento', () => expect(resolverEcuacion('x^2 - 4 >= 0').respuesta.texto).toBe('x ∈ (−∞, -2] ∪ [2, ∞)'));
  it('racional', () => expect(resolverDesigualdad('(x-1)/(x+2) > 0').respuesta.texto).toBe('x ∈ (−∞, -2) ∪ (1, ∞)'));
});

describe('factorización', () => {
  it('diferencia de cuadrados', () => {
    const r = resolverFactorizacion('x^2 - 9');
    expect(r.respuesta.texto).toMatch(/x - 3/);
    expect(r.formula).toMatch(/Diferencia de cuadrados/);
    expect(r.verificacion?.coincide).toBe(true);
  });
  it('trinomio, cúbico, común', () => {
    expect(resolverFactorizacion('x^2 + x - 6').estado).toBe('ok');
    expect(resolverFactorizacion('x^3 - x').respuesta.texto).toMatch(/x/);
    expect(resolverFactorizacion('2x^2 + 4x').formula).toMatch(/Factor común/);
  });
  it('irreducible', () => {
    const r = resolverFactorizacion('x^2 + 1');
    expect(r.respuesta.texto).toBe('Irreducible');
    expect(r.advertencias[0]).toMatch(/irreducible/);
  });
  it('irracional en reales', () => expect(resolverFactorizacion('x^2 - 2').estado).toBe('ok'));
});
