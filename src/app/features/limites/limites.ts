import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Lado } from '../../core/cas/limites';
import { Resultado } from '../../core/cas/resultado.model';
import { MotorService } from '../../core/estado/motor.service';
import { CajaResultado } from '../../shared/caja-resultado/caja-resultado';
import { EntradaExpresion } from '../../shared/entrada-expresion/entrada-expresion';

@Component({
  selector: 'app-limites',
  imports: [EntradaExpresion, CajaResultado],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pagina">
      <header>
        <h1>Límites</h1>
        <p>Resuelve límites en un punto o en el infinito. El asistente indica el método (sustitución, factorización, conjugado, límites notables, L'Hôpital, comparación de grados) y acompaña la respuesta con una tabla de valores.</p>
      </header>
      <form class="tarjeta" (submit)="$event.preventDefault(); calcular()">
        <app-entrada-expresion etiqueta="Función f(x)" placeholder="(x^2-4)/(x-2)" ayuda="Escribe la función cuyo límite buscas." [(valor)]="f" (enviar)="calcular()" />
        <div class="fila" style="margin-top:12px">
          <div class="campo corto">
            <label for="a">x tiende a</label>
            <input id="a" type="text" autocomplete="off" [value]="a()" (input)="a.set($any($event.target).value)" placeholder="2   (o inf, -inf)" />
          </div>
          <div class="campo corto">
            <label for="lado">Lado</label>
            <select id="lado" [value]="lado()" (change)="lado.set($any($event.target).value)">
              <option value="ambos">Ambos lados</option>
              <option value="izq">Por la izquierda (x → a⁻)</option>
              <option value="der">Por la derecha (x → a⁺)</option>
            </select>
          </div>
          <button class="btn" type="submit" [disabled]="cargando()">{{ cargando() ? 'Calculando…' : 'Calcular límite' }}</button>
        </div>
        <p class="nota" style="margin-top:8px">Para el infinito escribe <code>inf</code> o <code>∞</code>; para menos infinito, <code>-inf</code>.</p>
      </form>
      @if (resultado(); as r) { <app-caja-resultado [resultado]="r" /> }
    </div>
  `,
})
export class Limites {
  private readonly motor = inject(MotorService);
  protected readonly f = signal('');
  protected readonly a = signal('');
  protected readonly lado = signal<Lado>('ambos');
  protected readonly cargando = signal(false);
  protected readonly resultado = signal<Resultado | null>(null);

  constructor() {
    inject(ActivatedRoute).queryParamMap.pipe(takeUntilDestroyed()).subscribe((q) => {
      if (q.has('f')) { this.f.set(q.get('f')!); this.a.set(q.get('a') ?? ''); this.lado.set((q.get('lado') as Lado) ?? 'ambos'); void this.calcular(); }
    });
  }

  protected async calcular(): Promise<void> {
    this.cargando.set(true);
    this.resultado.set(await this.motor.resolver('limite', this.f(), this.a(), this.lado()));
    this.cargando.set(false);
  }
}
