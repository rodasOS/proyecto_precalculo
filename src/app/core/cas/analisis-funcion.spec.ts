import { describe, expect, it } from 'vitest';
import { analizar, resolverAnalisis } from './analisis-funcion';
import { parsear } from './parser';

describe('analisis de función', () => {
  it('función de prueba x³−6x²+9x+1', () => {
    const a = analizar(parsear('x^3 - 6x^2 + 9x + 1'));
    expect(a.criticos.map((c) => [Math.round(c.x.v), Math.round(c.y), c.tipo])).toEqual([[1, 5, 'max'], [3, 1, 'min']]);
    expect(a.inflexiones.map((p) => [Math.round(p.x.v), Math.round(p.y)])).toEqual([[2, 3]]);
    expect(a.ejeY).toBe(1);
    expect(a.intervalos.map((i) => [i.desde?.v ?? null, i.hasta?.v ?? null, i.signo])).toEqual([[null, 1, 1], [1, 3, -1], [3, null, 1]]);
  });
  it('x³: sin extremo y fusiona intervalos', () => {
    const a = analizar(parsear('x^3'));
    expect(a.criticos).toHaveLength(1);
    expect(a.criticos[0].tipo).toBe('ninguno');
    expect(a.intervalos).toHaveLength(1);
  });
  it('x³+x: sin puntos críticos', () => {
    const a = analizar(parsear('x^3 + x'));
    expect(a.criticos).toHaveLength(0);
    expect(a.intervalos[0].signo).toBe(1);
  });
  it('asíntotas de 1/(x-2)', () => {
    const a = analizar(parsear('1/(x-2)'));
    expect(a.asintotasV).toEqual([2]);
    expect(a.asintotasH).toEqual([0]);
  });
  it('resolverAnalisis entrega Resultado completo', () => {
    const r = resolverAnalisis('x^3 - 6x^2 + 9x + 1');
    expect(r.estado).toBe('ok');
    expect(r.respuesta.latex).toContain('Máximo relativo');
    expect(r.grafica?.puntos.length).toBeGreaterThan(3);
    expect(r.verificacion?.coincide).toBe(true);
  });
  it('error de entrada', () => {
    expect(resolverAnalisis('x +* 2').estado).toBe('error');
  });
});
