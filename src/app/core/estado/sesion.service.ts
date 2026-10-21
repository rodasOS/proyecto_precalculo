import { Injectable, computed, signal } from '@angular/core';

/** Marcador de la sesión de práctica (solo en memoria: no hay cuentas ni servidor). */
@Injectable({ providedIn: 'root' })
export class SesionService {
  readonly aciertos = signal(0);
  readonly intentos = signal(0);
  readonly porcentaje = computed(() => (this.intentos() ? Math.round((this.aciertos() / this.intentos()) * 100) : 0));

  registrar(correcta: boolean): void {
    this.intentos.update((n) => n + 1);
    if (correcta) this.aciertos.update((n) => n + 1);
  }
  reiniciar(): void { this.aciertos.set(0); this.intentos.set(0); }
}
