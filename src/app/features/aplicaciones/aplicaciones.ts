import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute } from '@angular/router';
import { PLANTILLAS_OPT, PLANTILLAS_RAZON } from '../../core/cas/aplicaciones';
import { Resultado } from '../../core/cas/resultado.model';
import { MotorService } from '../../core/estado/motor.service';
import { CajaResultado } from '../../shared/caja-resultado/caja-resultado';
import { EntradaExpresion } from '../../shared/entrada-expresion/entrada-expresion';
import { curvaDe } from '../../shared/grafico/curva';
import { CurvaGrafica, Grafico } from '../../shared/grafico/grafico';

const TABS = ['funcion', 'extremos', 'razon', 'optimizacion', 'razones'];

@Component({
  selector: 'app-aplicaciones',
  imports: [MatTabsModule, EntradaExpresion, CajaResultado, Grafico],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './aplicaciones.html',
  styles: `
    .enunciado { background: var(--app-primary-soft); border-radius: 8px; padding: 10px 12px; margin: 0 0 12px; }
    .leyenda-puntos { list-style: none; padding: 0; margin: 10px 0 0; display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: .9rem; }
  `,
})
export class Aplicaciones {
  private readonly motor = inject(MotorService);
  protected readonly plantillasOpt = PLANTILLAS_OPT;
  protected readonly plantillasRazon = PLANTILLAS_RAZON;
  protected readonly tab = signal(0);
  protected readonly cargando = signal(false);
  protected readonly resultado = signal<Resultado | null>(null);
  protected readonly curvas = signal<CurvaGrafica[]>([]);

  // función
  protected readonly f1 = signal('');
  // extremos
  protected readonly f2 = signal('');
  protected readonly a2 = signal('');
  protected readonly b2 = signal('');
  // razón de cambio
  protected readonly f3 = signal('');
  protected readonly a3 = signal('');
  protected readonly b3 = signal('');
  protected readonly p3 = signal('');
  protected readonly uy = signal('');
  protected readonly ux = signal('');
  // optimización
  protected readonly idOpt = signal(PLANTILLAS_OPT[0].id);
  protected readonly valoresOpt = signal<Record<string, string>>({});
  protected readonly plOpt = computed(() => PLANTILLAS_OPT.find((p) => p.id === this.idOpt())!);
  // razones relacionadas
  protected readonly idRaz = signal(PLANTILLAS_RAZON[0].id);
  protected readonly conocida = signal<'X' | 'Q'>('Q');
  protected readonly tasa = signal('');
  protected readonly x0 = signal('');
  protected readonly tiempo = signal('s');
  protected readonly paramsRaz = signal<Record<string, string>>({});
  protected readonly plRaz = computed(() => PLANTILLAS_RAZON.find((p) => p.id === this.idRaz())!);

  protected readonly xmin = computed(() => this.resultado()?.grafica?.xmin ?? -5);
  protected readonly xmax = computed(() => this.resultado()?.grafica?.xmax ?? 5);

  constructor() {
    inject(ActivatedRoute).queryParamMap.pipe(takeUntilDestroyed()).subscribe((q) => {
      const t = q.get('tab');
      if (!t) return;
      this.tab.set(Math.max(0, TABS.indexOf(t)));
      if (t === 'funcion' && q.has('f')) { this.f1.set(q.get('f')!); void this.analizar(); }
      if (t === 'optimizacion' && q.has('plantilla')) {
        this.idOpt.set(q.get('plantilla')!);
        const v: Record<string, string> = {};
        for (const e of this.plOpt().entradas) if (q.has(e.id)) v[e.id] = q.get(e.id)!;
        this.valoresOpt.set(v);
        void this.optimizar();
      }
      if (t === 'razones' && q.has('plantilla')) {
        this.idRaz.set(q.get('plantilla')!);
        this.conocida.set((q.get('conocida') as 'X' | 'Q') ?? 'Q');
        this.tasa.set(q.get('tasa') ?? ''); this.x0.set(q.get('x0') ?? '');
        void this.relacionadas();
      }
    });
  }

  protected cambiarTab(i: number): void { this.tab.set(i); this.resultado.set(null); this.curvas.set([]); }
  protected valorOpt(id: string): string { return this.valoresOpt()[id] ?? ''; }
  protected setOpt(id: string, v: string): void { this.valoresOpt.update((o) => ({ ...o, [id]: v })); }
  protected valorRaz(id: string): string { return this.paramsRaz()[id] ?? ''; }
  protected setRaz(id: string, v: string): void { this.paramsRaz.update((o) => ({ ...o, [id]: v })); }
  protected ejemploOpt(): void { const v: Record<string, string> = {}; for (const e of this.plOpt().entradas) v[e.id] = String(e.ejemplo); this.valoresOpt.set(v); }
  protected ejemploRaz(): void { const v: Record<string, string> = {}; for (const e of this.plRaz().params) v[e.id] = String(e.ejemplo); this.paramsRaz.set(v); }

  private async correr(p: Promise<Resultado>): Promise<void> {
    this.cargando.set(true);
    this.resultado.set(await p);
    this.cargando.set(false);
  }

  protected async analizar(): Promise<void> {
    this.curvas.set([]);
    await this.correr(this.motor.resolver('analisis', this.f1()));
    const c = curvaDe(this.f1());
    if (c && this.resultado()?.estado !== 'error') this.curvas.set([c]);
  }
  protected extremos(): Promise<void> { this.curvas.set([]); return this.correr(this.motor.resolver('extremos', this.f2(), this.a2(), this.b2())); }
  protected razon(): Promise<void> { this.curvas.set([]); return this.correr(this.motor.resolver('razonCambio', this.f3(), this.a3(), this.b3(), this.p3(), this.uy(), this.ux())); }
  protected optimizar(): Promise<void> { this.curvas.set([]); return this.correr(this.motor.resolver('optimizacion', this.idOpt(), this.valoresOpt())); }
  protected relacionadas(): Promise<void> {
    this.curvas.set([]);
    return this.correr(this.motor.resolver('razonRelacionada', this.idRaz(), this.conocida(), this.tasa(), this.x0(), this.paramsRaz(), this.tiempo()));
  }
}
