import { describe, expect, it } from 'vitest';
import { EJEMPLOS, ejecutarEjemplo } from './ejemplos';

describe('banco de ejemplos', () => {
  it('tiene al menos 10 ejemplos y cubre los seis módulos', () => {
    expect(EJEMPLOS.length).toBeGreaterThanOrEqual(10);
    expect(new Set(EJEMPLOS.map((e) => e.modulo))).toEqual(new Set(['algebra', 'graficas', 'limites', 'derivadas', 'integrales', 'aplicaciones']));
    expect(EJEMPLOS.some((e) => e.consulta['f'] === 'x^3 - 6x^2 + 9x + 1')).toBe(true);
  });
  it('todos se resuelven con el motor sin error ni caso no resuelto', () => {
    for (const e of EJEMPLOS) {
      const r = ejecutarEjemplo(e);
      expect(['ok', 'advertencia'], `${e.id}: ${r.estado} ${r.advertencias.join('|')}`).toContain(r.estado);
      expect(r.respuesta.latex, e.id).not.toBe('');
      if (r.verificacion) expect(r.verificacion.coincide, `${e.id} verificación`).toBe(true);
    }
  });
});
