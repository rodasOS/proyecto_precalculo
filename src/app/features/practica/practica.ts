import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Calificacion, Ejercicio, MODULOS, Modulo, Nivel, generarEjercicio } from '../../core/practica/generador';
import { Resultado } from '../../core/cas/resultado.model';
import { SesionService } from '../../core/estado/sesion.service';
import { CajaResultado } from '../../shared/caja-resultado/caja-resultado';
import { Formula } from '../../shared/formula/formula';

@Component({
  selector: 'app-practica',
  imports: [CajaResultado, Formula],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './practica.html',
  styleUrl: './practica.scss',
})
export class Practica {
  protected readonly sesion = inject(SesionService);
  protected readonly modulos = MODULOS;
  protected readonly modulo = signal<Modulo>('derivadas');
  protected readonly nivel = signal<Nivel>('basico');
  protected readonly ejercicio = signal<Ejercicio | null>(null);
  protected readonly respuesta = signal('');
  protected readonly calificacion = signal<Calificacion | null>(null);
  protected readonly pistaVisible = signal(false);
  protected readonly solucion = signal<Resultado | null>(null);
  protected readonly yaCalificado = computed(() => this.calificacion()?.estado === 'correcta');
  private semilla = Date.now() % 1_000_000;

  protected generar(): void {
    this.semilla = (this.semilla * 48271 + 11) % 2_147_483_647;
    this.ejercicio.set(generarEjercicio(this.modulo(), this.nivel(), this.semilla));
    this.respuesta.set('');
    this.calificacion.set(null);
    this.pistaVisible.set(false);
    this.solucion.set(null);
  }

  protected calificar(): void {
    const e = this.ejercicio();
    if (!e) return;
    const c = e.calificar(this.respuesta());
    this.calificacion.set(c);
    if (c.estado !== 'invalida' && !this.yaCalificadoPrevio) this.sesion.registrar(c.estado === 'correcta');
    if (c.estado === 'correcta') this.yaCalificadoPrevio = true;
  }
  private yaCalificadoPrevio = false;

  protected reiniciarMarca(): void { this.yaCalificadoPrevio = false; }

  protected verSolucion(): void {
    const e = this.ejercicio();
    if (e) this.solucion.set(e.resolver());
  }
}
