import { describe, expect, it } from 'vitest';
import { MODULOS, Nivel, generarEjercicio } from './generador';

const niveles: Nivel[] = ['basico', 'intermedio'];

/** Extrae una respuesta escribible a partir del texto de la solución oficial. */
function respuestaEscribible(formato: string, texto: string): string {
  if (formato === 'numero') return (texto.match(/-?\d+(\.\d+)?/) ?? [''])[0];
  if (formato === 'lista') return (texto.match(/-?\d+(\.\d+)?/g) ?? []).join(', ');
  return texto;
}

describe('generador de prácticas', () => {
  for (const m of MODULOS) for (const n of niveles) {
    it(`${m.id}/${n}: 200 ejercicios resolubles, calificables y variados`, () => {
      const vistos = new Set<string>();
      for (let s = 1; s <= 200; s++) {
        const e = generarEjercicio(m.id, n, s * 7919);
        vistos.add(e.enunciadoLatex);
        const sol = e.resolver();
        expect(['ok', 'advertencia'], `${e.id} ${e.enunciadoLatex}: ${sol.estado} ${sol.advertencias.join('|')}`).toContain(sol.estado);
        expect(sol.advertencias.filter((a) => /no verificado|no se pudo/i.test(a)), `${e.id} ${e.enunciadoLatex}`).toEqual([]);
        const ok = e.calificar(respuestaEscribible(e.formato, e.respuestaTexto));
        expect(ok.estado, `${e.id} ${e.enunciadoLatex} → ${e.respuestaTexto} (${ok.mensaje})`).toBe('correcta');
      }
      expect(vistos.size).toBeGreaterThan(10);
    }, 120000);
  }
  it('califica incorrecta, vacía e ilegible', () => {
    const e = generarEjercicio('algebra', 'basico', 1);
    expect(e.calificar('').estado).toBe('invalida');
    expect(e.calificar('(((').estado).toBe('invalida');
    expect(e.calificar('99999').estado).toBe('incorrecta');
  });
  it('es determinista con la misma semilla', () => {
    expect(generarEjercicio('derivadas', 'intermedio', 42).enunciadoLatex).toBe(generarEjercicio('derivadas', 'intermedio', 42).enunciadoLatex);
  });
  it('acepta formas equivalentes y tolerancia numérica', () => {
    const e = generarEjercicio('derivadas', 'basico', 5);
    expect(e.calificar(e.respuestaTexto).estado).toBe('correcta');
  });
});
