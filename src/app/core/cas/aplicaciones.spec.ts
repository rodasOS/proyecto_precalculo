import { describe, expect, it } from 'vitest';
import { resolverExtremosAbsolutos, resolverOptimizacion, resolverRazonCambio, resolverRazonRelacionada } from './aplicaciones';

describe('extremos absolutos', () => {
  it('x³−6x²+9x+1 en [0,4]', () => {
    const r = resolverExtremosAbsolutos('x^3 - 6x^2 + 9x + 1', '0', '4');
    expect(r.respuesta.texto).toBe('Máximo absoluto 5 (x = 1, 4); mínimo absoluto 1 (x = 0, 3)');
    expect(r.verificacion?.coincide).toBe(true);
  });
  it('discontinua', () => expect(resolverExtremosAbsolutos('1/x', '-1', '1').estado).toBe('no-resuelto'));
  it('faltan datos', () => expect(resolverExtremosAbsolutos('x', '0', '').estado).toBe('error'));
});

describe('razón de cambio', () => {
  it('promedio vs instantánea de t²', () => {
    const r = resolverRazonCambio('t^2', '1', '3', '2', 'm', 's');
    expect(r.respuesta.texto).toContain('Promedio 4');
    expect(r.respuesta.texto).toContain('instantánea en x = 2: 4');
  });
});

describe('optimización', () => {
  it('rectángulo con perímetro 40', () => {
    const r = resolverOptimizacion('rectangulo-perimetro', { P: 40 });
    expect(r.respuesta.texto).toContain('x = 10');
    expect(r.interpretacion).toContain('100');
    expect(r.interpretacion).toContain('cuadrado');
    expect(r.verificacion?.coincide).toBe(true);
  });
  it('perímetro inválido', () => {
    expect(resolverOptimizacion('rectangulo-perimetro', { P: -5 }).estado).toBe('error');
    expect(resolverOptimizacion('rectangulo-perimetro', { P: 0 }).estado).toBe('error');
    expect(resolverOptimizacion('rectangulo-perimetro', {}).estado).toBe('error');
  });
  it('otras plantillas', () => {
    expect(resolverOptimizacion('caja-abierta', { L: 12 }).interpretacion).toContain('128');
    expect(resolverOptimizacion('cerca-rio', { F: 100 }).interpretacion).toContain('1250');
    expect(resolverOptimizacion('ingreso-maximo', { a: 100, b: 2 }).interpretacion).toContain('1250');
    expect(resolverOptimizacion('rectangulo-area-perimetro-min', { A: 100 }).interpretacion).toContain('40');
    const lata = resolverOptimizacion('lata-cilindro', { V: 500 });
    expect(lata.estado).toBe('ok');
    expect(lata.verificacion?.coincide).toBe(true);
  });
});

describe('razones relacionadas', () => {
  it('esfera: dV/dt = 100, r = 5', () => {
    const r = resolverRazonRelacionada('esfera', 'Q', 100, 5);
    expect(r.respuesta.texto).toContain('0.31831');
  });
  it('círculo y escalera', () => {
    expect(resolverRazonRelacionada('circulo', 'X', 2, 10).respuesta.texto).toContain('125.66');
    const e = resolverRazonRelacionada('escalera', 'X', 1, 3, { L: 5 });
    expect(e.respuesta.texto).toContain('-0.75');
  });
  it('datos inválidos', () => {
    expect(resolverRazonRelacionada('escalera', 'X', 1, 6, { L: 5 }).estado).toBe('error');
    expect(resolverRazonRelacionada('esfera', 'Q', 100, -1).estado).toBe('error');
    expect(resolverRazonRelacionada('esfera', 'Q', 100, '').estado).toBe('error');
  });
});
