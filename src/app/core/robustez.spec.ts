import { describe, expect, it } from 'vitest';
import { NombreOp, ejecutarOp } from './motor-ops';

const HOSTILES = ['', '   ', '((', '))', '1/0', 'ln(-1)', 'x^', '^x', 'abc', '√', 'x+', '*x', 'x**', 'sin', 'sin()', 'x y z', '3 $ x', '😀', 'x'.repeat(5000), '9'.repeat(400),
  '1e999', 'x^99999', '2^(2^(2^10))', 'sqrt(-x^2-1)', '|x', '|x||', 'x=', '=x', 'x<', '(x+1)(', 'tan(x)^tan(x)', 'x^x^x^x', '0^0', 'ln(0)', 'acos(5)'];

const UNARIAS: NombreOp[] = ['ecuacion', 'factorizacion', 'dominio', 'rango', 'analisis'];

describe('robustez ante entradas inesperadas', () => {
  for (const h of HOSTILES) {
    const nombre = JSON.stringify(h.length > 30 ? h.slice(0, 12) + '…' : h);
    it(`nunca lanza ni cuelga: ${nombre}`, () => {
      const inicio = performance.now();
      const resultados = [
        ...UNARIAS.map((op) => ejecutarOp(op, [h])),
        ejecutarOp('derivada', [h, { orden: 1, punto: '1' }]),
        ejecutarOp('integral', [h, '', '']),
        ejecutarOp('integral', [h, '0', '1']),
        ejecutarOp('limite', [h, '0', 'ambos']),
        ejecutarOp('limite', ['x', h, 'ambos']),
        ejecutarOp('composicion', [h, 'x', '']),
        ejecutarOp('extremos', [h, '0', '1']),
        ejecutarOp('razonCambio', [h, '0', '1', '0.5', '', '']),
      ];
      for (const r of resultados) {
        expect(['ok', 'advertencia', 'no-resuelto', 'error']).toContain(r.estado);
        if (r.estado === 'error' || r.estado === 'no-resuelto') expect(r.advertencias.length).toBeGreaterThan(0);
        if (r.estado === 'ok') expect(r.respuesta.latex).not.toBe('');
      }
      expect(performance.now() - inicio).toBeLessThan(15000);
    }, 30000);
  }

  it('límites y datos inválidos concretos', () => {
    expect(ejecutarOp('integral', ['x', '5', '1']).estado).not.toBe('error');
    expect(ejecutarOp('integral', ['x', '3', '3']).respuesta.texto).toBe('0');
    expect(ejecutarOp('extremos', ['x', '4', '0']).estado).not.toBe('error');
    expect(ejecutarOp('extremos', ['x', '1', '1']).estado).toBe('error');
    expect(ejecutarOp('optimizacion', ['no-existe', {}]).estado).toBe('error');
    expect(ejecutarOp('razonRelacionada', ['esfera', 'Q', 'abc', '5', {}, 's']).estado).toBe('error');
  });
});
