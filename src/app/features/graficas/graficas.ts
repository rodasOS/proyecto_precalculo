import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Resultado } from '../../core/cas/resultado.model';
import { MotorService } from '../../core/estado/motor.service';
import { CajaResultado } from '../../shared/caja-resultado/caja-resultado';
import { EntradaExpresion } from '../../shared/entrada-expresion/entrada-expresion';
import { curvaDe } from '../../shared/grafico/curva';
import { CurvaGrafica, Grafico } from '../../shared/grafico/grafico';

@Component({
  selector: 'app-graficas',
  imports: [EntradaExpresion, CajaResultado, Grafico],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pagina">
      <header>
        <h1>Gráficas</h1>
        <p>Grafica una o dos funciones y deja que el asistente marque y explique intersecciones con los ejes, máximos y mínimos, puntos de inflexión, asíntotas y los intervalos donde la función crece o decrece.</p>
      </header>
      <form class="tarjeta" (submit)="$event.preventDefault(); graficar()">
        <app-entrada-expresion etiqueta="Función f(x)" placeholder="x^3 - 6x^2 + 9x + 1" ayuda="Esta función se analiza por completo." [(valor)]="f" (enviar)="graficar()" />
        <div style="margin-top:12px">
          <app-entrada-expresion etiqueta="Segunda función (opcional, solo se dibuja)" placeholder="2x" [teclado]="false" [(valor)]="g" (enviar)="graficar()" />
        </div>
        <div class="fila" style="margin-top:12px"><button class="btn" type="submit" [disabled]="cargando()">{{ cargando() ? 'Calculando…' : 'Graficar y analizar' }}</button></div>
      </form>

      @if (aviso()) { <p class="aviso warn">{{ aviso() }}</p> }
      @if (curvas().length) {
        <section class="tarjeta">
          <h2>Gráfica</h2>
          <app-grafico [curvas]="curvas()" [puntos]="resultado()?.grafica?.puntos ?? []" [asintotasV]="resultado()?.grafica?.asintotasVerticales ?? []" [asintotasH]="resultado()?.grafica?.asintotasHorizontales ?? []" [xmin0]="xmin()" [xmax0]="xmax()" />
          <ul class="leyenda-puntos">
            @for (p of resultado()?.grafica?.puntos ?? []; track $index) { <li><span class="pt" [class]="p.tipo"></span>{{ p.etiqueta }}</li> }
          </ul>
        </section>
      }
      @if (resultado(); as r) { <app-caja-resultado [resultado]="r" /> }
    </div>
  `,
  styles: `
    .leyenda-puntos { list-style: none; padding: 0; margin: 10px 0 0; display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: .9rem; }
    .pt { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; background: #495057; }
    .pt.maximo { background: #c92a2a; } .pt.minimo { background: #1c7ed6; } .pt.inflexion { background: #e67700; }
  `,
})
export class Graficas {
  private readonly motor = inject(MotorService);
  protected readonly f = signal('');
  protected readonly g = signal('');
  protected readonly cargando = signal(false);
  protected readonly resultado = signal<Resultado | null>(null);
  protected readonly aviso = signal('');
  protected readonly curvas = signal<CurvaGrafica[]>([]);
  protected readonly xmin = computed(() => this.resultado()?.grafica?.xmin ?? -5);
  protected readonly xmax = computed(() => this.resultado()?.grafica?.xmax ?? 5);

  constructor() {
    inject(ActivatedRoute).queryParamMap.pipe(takeUntilDestroyed()).subscribe((q) => {
      if (q.has('f')) { this.f.set(q.get('f')!); this.g.set(q.get('g') ?? ''); void this.graficar(); }
    });
  }

  protected async graficar(): Promise<void> {
    this.aviso.set('');
    this.curvas.set([]);
    this.cargando.set(true);
    const r = await this.motor.resolver('analisis', this.f());
    this.resultado.set(r);
    const c1 = curvaDe(this.f());
    const c2 = this.g().trim() ? curvaDe(this.g()) : null;
    if (this.g().trim() && !c2) this.aviso.set('La segunda función no se pudo interpretar y no se dibujó.');
    if (r.estado !== 'error' && c1) this.curvas.set([c1, ...(c2 ? [c2] : [])]);
    else if (r.estado === 'error') this.aviso.set('No se puede graficar: revisa la función (solo se admiten funciones de x).');
    this.cargando.set(false);
  }
}
