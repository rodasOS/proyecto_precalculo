import { Injectable } from '@angular/core';
import { Resultado, resultadoError } from '../cas/resultado.model';
import { NombreOp, OPERACIONES, ejecutarOp } from '../motor-ops';

type Args<K extends NombreOp> = Parameters<(typeof OPERACIONES)[K]>;

const LIMITE_MS = 8000;

/**
 * Ejecuta el motor en un Web Worker con tiempo límite, de modo que un caso patológico
 * muestre un aviso en lugar de congelar la página. Sin Worker disponible, ejecuta en el hilo principal.
 */
@Injectable({ providedIn: 'root' })
export class MotorService {
  private worker: Worker | null = null;
  private contador = 0;
  private pendientes = new Map<number, { ok: (r: Resultado) => void; timer: ReturnType<typeof setTimeout> }>();

  private crearWorker(): Worker | null {
    if (typeof Worker === 'undefined') return null;
    try {
      const w = new Worker(new URL('../motor.worker', import.meta.url), { type: 'module' });
      w.onmessage = ({ data }: MessageEvent<{ id: number; resultado: Resultado }>) => {
        const p = this.pendientes.get(data.id);
        if (!p) return;
        clearTimeout(p.timer);
        this.pendientes.delete(data.id);
        p.ok(data.resultado);
      };
      w.onerror = () => this.reiniciar('El motor de cálculo tuvo un error interno. Intenta con otra expresión.');
      return w;
    } catch {
      return null;
    }
  }

  private reiniciar(mensaje: string): void {
    this.worker?.terminate();
    this.worker = null;
    for (const [id, p] of this.pendientes) { clearTimeout(p.timer); p.ok(resultadoError('Cálculo interrumpido', mensaje, 'no-resuelto')); this.pendientes.delete(id); }
  }

  resolver<K extends NombreOp>(op: K, ...args: Args<K>): Promise<Resultado> {
    this.worker ??= this.crearWorker();
    if (!this.worker) return Promise.resolve(ejecutarOp(op, args as unknown[]));
    const id = ++this.contador;
    return new Promise<Resultado>((ok) => {
      const timer = setTimeout(() => this.reiniciar('El cálculo tardó demasiado (más de 8 s) y se detuvo. Prueba con una expresión más sencilla.'), LIMITE_MS);
      this.pendientes.set(id, { ok, timer });
      this.worker!.postMessage({ id, op, args });
    });
  }
}
