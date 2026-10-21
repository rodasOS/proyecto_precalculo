import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Resultado, resultadoError } from '../../core/cas/resultado.model';
import { MotorService } from '../../core/estado/motor.service';
import { CajaResultado } from '../../shared/caja-resultado/caja-resultado';
import { EntradaExpresion } from '../../shared/entrada-expresion/entrada-expresion';

@Component({
  selector: 'app-integrales',
  imports: [EntradaExpresion, CajaResultado],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pagina">
      <header>
        <h1>Integrales</h1>
        <p>Integrales indefinidas y definidas elementales: potencias, exponenciales, trigonométricas, sustitución y partes sencillas. La antiderivada se verifica derivándola y la integral definida, con una aproximación numérica.</p>
      </header>
      <form class="tarjeta" (submit)="$event.preventDefault(); calcular()">
        <app-entrada-expresion etiqueta="Integrando f(x)" placeholder="3x^2 + 4x - 5" ayuda="Escribe la función a integrar respecto de x." [(valor)]="f" (enviar)="calcular()" />
        <div class="fila" style="margin-top:12px">
          <div class="campo corto">
            <label for="tipo">Tipo</label>
            <select id="tipo" [value]="definida() ? 'def' : 'indef'" (change)="definida.set($any($event.target).value === 'def')">
              <option value="indef">Indefinida (+ C)</option>
              <option value="def">Definida</option>
            </select>
          </div>
          @if (definida()) {
            <div class="campo corto">
              <label for="a">Límite inferior</label>
              <input id="a" type="text" autocomplete="off" [value]="a()" (input)="a.set($any($event.target).value)" placeholder="0" />
            </div>
            <div class="campo corto">
              <label for="b">Límite superior</label>
              <input id="b" type="text" autocomplete="off" [value]="b()" (input)="b.set($any($event.target).value)" placeholder="3" />
            </div>
          }
          <button class="btn" type="submit" [disabled]="cargando()">{{ cargando() ? 'Calculando…' : 'Integrar' }}</button>
        </div>
      </form>
      @if (resultado(); as r) { <app-caja-resultado [resultado]="r" /> }
    </div>
  `,
})
export class Integrales {
  private readonly motor = inject(MotorService);
  protected readonly f = signal('');
  protected readonly a = signal('');
  protected readonly b = signal('');
  protected readonly definida = signal(false);
  protected readonly cargando = signal(false);
  protected readonly resultado = signal<Resultado | null>(null);

  constructor() {
    inject(ActivatedRoute).queryParamMap.pipe(takeUntilDestroyed()).subscribe((q) => {
      if (q.has('f')) {
        this.f.set(q.get('f')!); this.a.set(q.get('a') ?? ''); this.b.set(q.get('b') ?? '');
        this.definida.set(q.has('a') || q.has('b'));
        void this.calcular();
      }
    });
  }

  protected async calcular(): Promise<void> {
    if (this.definida() && (!this.a().trim() || !this.b().trim())) {
      this.resultado.set(resultadoError('Integral definida', `Falta el límite ${!this.a().trim() ? 'inferior' : 'superior'} de integración.`));
      return;
    }
    this.cargando.set(true);
    this.resultado.set(await this.motor.resolver('integral', this.f(), this.definida() ? this.a() : '', this.definida() ? this.b() : ''));
    this.cargando.set(false);
  }
}
