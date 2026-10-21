import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { comprobarDerivadaPropuesta } from '../../core/cas/derivadas';
import { ErrorEntrada } from '../../core/cas/errores';
import { Resultado } from '../../core/cas/resultado.model';
import { aTex } from '../../core/cas/tex';
import { MotorService } from '../../core/estado/motor.service';
import { CajaResultado } from '../../shared/caja-resultado/caja-resultado';
import { EntradaExpresion } from '../../shared/entrada-expresion/entrada-expresion';
import { Formula } from '../../shared/formula/formula';

@Component({
  selector: 'app-derivadas',
  imports: [EntradaExpresion, CajaResultado, Formula],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pagina">
      <header>
        <h1>Derivadas</h1>
        <p>Deriva con las reglas básicas (potencia, suma, producto, cociente, cadena, trigonométricas, exponencial y logaritmo). Cada paso nombra la regla usada y el resultado se verifica numéricamente.</p>
      </header>
      <form class="tarjeta" (submit)="$event.preventDefault(); calcular()">
        <app-entrada-expresion etiqueta="Función f(x)" placeholder="x^2*sin(x)" ayuda="Escribe la función, por ejemplo (3x+1)^5 o ln(x^2+1)." [(valor)]="f" (enviar)="calcular()" />
        <div class="fila" style="margin-top:12px">
          <div class="campo corto">
            <label for="orden">Orden</label>
            <select id="orden" [value]="orden()" (change)="orden.set(+$any($event.target).value)">
              @for (o of [1, 2, 3, 4]; track o) { <option [value]="o">{{ o === 1 ? 'Primera derivada' : o + 'ª derivada' }}</option> }
            </select>
          </div>
          <div class="campo corto">
            <label for="punto">Evaluar en x = (opcional)</label>
            <input id="punto" type="text" autocomplete="off" [value]="punto()" (input)="punto.set($any($event.target).value)" placeholder="2" />
          </div>
          <button class="btn" type="submit" [disabled]="cargando()">{{ cargando() ? 'Calculando…' : 'Derivar' }}</button>
        </div>
      </form>

      @if (resultado(); as r) { <app-caja-resultado [resultado]="r" /> }

      <section class="tarjeta">
        <h2>Comprueba tu propia derivada</h2>
        <p class="nota">Escribe tu respuesta para f′(x); el asistente dice si es equivalente a la correcta, aunque esté escrita distinto.</p>
        <app-entrada-expresion etiqueta="Tu respuesta para f′(x)" placeholder="2x cos(x) + ..." [(valor)]="propuesta" [teclado]="false" (enviar)="comprobar()" />
        <div class="fila" style="margin-top:10px"><button class="btn secundario" type="button" (click)="comprobar()">Comprobar</button></div>
        @if (veredicto(); as v) {
          <p class="aviso" [class.ok]="v.tipo === 'ok'" [class.error]="v.tipo === 'mal'" [class.warn]="v.tipo === 'aviso'" style="margin-top:10px">
            {{ v.texto }} @if (v.tex) { <app-formula [latex]="v.tex" /> }
          </p>
        }
      </section>
    </div>
  `,
})
export class Derivadas {
  private readonly motor = inject(MotorService);
  protected readonly f = signal('');
  protected readonly orden = signal(1);
  protected readonly punto = signal('');
  protected readonly propuesta = signal('');
  protected readonly cargando = signal(false);
  protected readonly resultado = signal<Resultado | null>(null);
  protected readonly veredicto = signal<{ tipo: 'ok' | 'mal' | 'aviso'; texto: string; tex?: string } | null>(null);

  constructor() {
    inject(ActivatedRoute).queryParamMap.pipe(takeUntilDestroyed()).subscribe((q) => {
      if (q.has('f')) { this.f.set(q.get('f')!); this.punto.set(q.get('p') ?? ''); this.orden.set(+(q.get('n') ?? 1)); void this.calcular(); }
    });
  }

  protected async calcular(): Promise<void> {
    this.cargando.set(true);
    this.veredicto.set(null);
    this.resultado.set(await this.motor.resolver('derivada', this.f(), { orden: this.orden(), punto: this.punto() }));
    this.cargando.set(false);
  }

  protected comprobar(): void {
    if (!this.f().trim()) { this.veredicto.set({ tipo: 'aviso', texto: 'Primero escribe la función f(x) arriba.' }); return; }
    if (!this.propuesta().trim()) { this.veredicto.set({ tipo: 'aviso', texto: 'Escribe tu respuesta para comprobarla.' }); return; }
    try {
      const { correcta, esperada } = comprobarDerivadaPropuesta(this.f(), this.propuesta());
      this.veredicto.set(correcta
        ? { tipo: 'ok', texto: '✓ Correcta: es equivalente a la derivada de f.' }
        : { tipo: 'mal', texto: '✗ Incorrecta. La derivada correcta es:', tex: `f'(x) = ${aTex(esperada)}` });
    } catch (e) {
      this.veredicto.set({ tipo: 'aviso', texto: e instanceof ErrorEntrada ? e.message : 'No se pudo interpretar alguna de las expresiones.' });
    }
  }
}
