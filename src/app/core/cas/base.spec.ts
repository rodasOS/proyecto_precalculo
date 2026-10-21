import { describe, expect, it } from 'vitest';
import { parsear } from './parser';
import { simplificar } from './simplificar';
import { aTex } from './tex';
import { evaluarEn } from './evaluar';
import { ErrorEntrada } from './errores';

const tex = (s: string) => aTex(simplificar(parsear(s)));

describe('parser', () => {
  it('acepta símbolos tipográficos y multiplicación implícita', () => {
    expect(evaluarEn(parsear('x³ − 6x² + 9x + 1'), 2)).toBe(3);
    expect(evaluarEn(parsear('2(x+1)'), 2)).toBe(6);
    expect(evaluarEn(parsear('2,5x + 1'), 2)).toBe(6);
    expect(evaluarEn(parsear('6x^2'), 2)).toBe(24);
    expect(evaluarEn(parsear('x^-2'), 2)).toBe(0.25);
    expect(evaluarEn(parsear('|x-5|'), 2)).toBe(3);
    expect(evaluarEn(parsear('sqrt(x)+π'), 4)).toBeCloseTo(2 + Math.PI);
    expect(evaluarEn(parsear('2sin(x)cos(x)'), 1)).toBeCloseTo(Math.sin(2));
  });
  it('errores en español', () => {
    expect(() => parsear('(x+1')).toThrow(/cerrar un paréntesis/);
    expect(() => parsear('')).toThrow(/Falta ingresar/);
    expect(() => parsear('x +')).toThrow(ErrorEntrada);
    expect(() => parsear('foo(x)')).toThrow(ErrorEntrada);
    expect(() => parsear('x+y')).toThrow(/variable/);
    expect(() => parsear('sinx')).toThrow(/paréntesis/);
    expect(() => parsear('x^')).toThrow(/exponente/);
    expect(() => parsear('x))')).toThrow(/sin abrir/);
    expect(() => parsear('x=2')).toThrow(ErrorEntrada);
    expect(() => parsear('3 $ x')).toThrow(/no soportado/);
  });
});

describe('simplificar y tex', () => {
  it('ordena polinomios y combina términos', () => {
    expect(tex('1 + 9x - 6x^2 + x^3 + x')).toBe('x^{3} - 6 x^{2} + 10 x + 1');
    expect(tex('x*x')).toBe('x^{2}');
    expect(tex('3x^2 - 3x^2')).toBe('0');
  });
  it('fracciones', () => {
    expect(tex('x^3/3')).toBe('\\frac{x^{3}}{3}');
    expect(tex('1/(x-1)')).toBe('\\frac{1}{x - 1}');
    expect(tex('(x^2+1)/(x-1)')).toBe('\\frac{x^{2} + 1}{x - 1}');
    expect(tex('sqrt(x)')).toBe('\\sqrt{x}');
  });
  it('funciones', () => {
    expect(tex('2x*sin(x)')).toBe('2 x \\sin\\left(x\\right)');
    expect(tex('sin(x)^2')).toBe('\\sin^{2}\\left(x\\right)');
    expect(tex('ln(e^x)')).toBe('x');
  });
});
