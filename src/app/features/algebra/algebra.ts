import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute } from '@angular/router';
import { Resultado } from '../../core/cas/resultado.model';
import { MotorService } from '../../core/estado/motor.service';
import { CajaResultado } from '../../shared/caja-resultado/caja-resultado';
import { EntradaExpresion } from '../../shared/entrada-expresion/entrada-expresion';

const TABS = ['ecuaciones', 'factorizacion', 'dominio', 'composicion'];

@Component({
  selector: 'app-algebra',
  imports: [MatTabsModule, EntradaExpresion, CajaResultado],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pagina">
      <header>
        <h1>Álgebra y funciones</h1>
        <p>Resuelve ecuaciones y desigualdades, factoriza polinomios, halla el dominio y el rango de una función y compón funciones. Cada solución se comprueba en la ecuación original.</p>
      </header>
      <mat-tab-group [selectedIndex]="tab()" (selectedIndexChange)="cambiarTab($event)" animationDuration="0ms">
        <mat-tab label="Ecuaciones y desigualdades">
          <form class="tarjeta" (submit)="$event.preventDefault(); ecuacion()">
            <app-entrada-expresion etiqueta="Ecuación o desigualdad" modo="relacion" placeholder="x^2 - 5x + 6 = 0" ayuda="Usa =, <, >, ≤ o ≥. Admite fracciones, raíces y valor absoluto." [(valor)]="q1" (enviar)="ecuacion()" />
            <div class="fila" style="margin-top:12px"><button class="btn" type="submit" [disabled]="cargando()">Resolver</button></div>
          </form>
        </mat-tab>
        <mat-tab label="Factorización">
          <form class="tarjeta" (submit)="$event.preventDefault(); factorizar()">
            <app-entrada-expresion etiqueta="Polinomio" placeholder="x^3 - 4x" ayuda="El asistente nombra la técnica y comprueba multiplicando los factores." [(valor)]="q2" (enviar)="factorizar()" />
            <div class="fila" style="margin-top:12px"><button class="btn" type="submit" [disabled]="cargando()">Factorizar</button></div>
          </form>
        </mat-tab>
        <mat-tab label="Dominio y rango">
          <form class="tarjeta" (submit)="$event.preventDefault(); dominio()">
            <app-entrada-expresion etiqueta="Función f(x)" placeholder="sqrt(x-1)/(x-3)" ayuda="Se analizan denominadores, raíces pares y logaritmos." [(valor)]="q3" (enviar)="dominio()" />
            <div class="fila" style="margin-top:12px">
              <button class="btn" type="submit" [disabled]="cargando()">Hallar dominio</button>
              <button class="btn secundario" type="button" [disabled]="cargando()" (click)="rango()">Hallar rango</button>
            </div>
          </form>
        </mat-tab>
        <mat-tab label="Composición">
          <form class="tarjeta" (submit)="$event.preventDefault(); componer()">
            <div class="fila">
              <div class="campo"><app-entrada-expresion etiqueta="f(x)" placeholder="x^2 + 1" [teclado]="false" [(valor)]="f" (enviar)="componer()" /></div>
              <div class="campo"><app-entrada-expresion etiqueta="g(x)" placeholder="2x - 3" [teclado]="false" [(valor)]="g" (enviar)="componer()" /></div>
              <div class="campo corto"><label for="pc">Evaluar en x = (opcional)</label><input id="pc" type="text" [value]="p()" (input)="p.set($any($event.target).value)" placeholder="2" /></div>
            </div>
            <div class="fila" style="margin-top:12px"><button class="btn" type="submit" [disabled]="cargando()">Componer f∘g y g∘f</button></div>
          </form>
        </mat-tab>
      </mat-tab-group>
      @if (cargando()) { <p class="nota">Calculando…</p> }
      @if (resultado(); as r) { <app-caja-resultado [resultado]="r" /> }
    </div>
  `,
})
export class Algebra {
  private readonly motor = inject(MotorService);
  protected readonly tab = signal(0);
  protected readonly q1 = signal('');
  protected readonly q2 = signal('');
  protected readonly q3 = signal('');
  protected readonly f = signal('');
  protected readonly g = signal('');
  protected readonly p = signal('');
  protected readonly cargando = signal(false);
  protected readonly resultado = signal<Resultado | null>(null);

  constructor() {
    inject(ActivatedRoute).queryParamMap.pipe(takeUntilDestroyed()).subscribe((q) => {
      const t = q.get('tab');
      if (!t) return;
      this.tab.set(Math.max(0, TABS.indexOf(t)));
      if (t === 'ecuaciones' && q.has('q')) { this.q1.set(q.get('q')!); void this.ecuacion(); }
      if (t === 'factorizacion' && q.has('q')) { this.q2.set(q.get('q')!); void this.factorizar(); }
      if (t === 'dominio' && q.has('q')) { this.q3.set(q.get('q')!); void this.dominio(); }
      if (t === 'composicion' && q.has('f')) { this.f.set(q.get('f')!); this.g.set(q.get('g') ?? ''); this.p.set(q.get('p') ?? ''); void this.componer(); }
    });
  }

  protected cambiarTab(i: number): void { this.tab.set(i); this.resultado.set(null); }

  private async correr(p: Promise<Resultado>): Promise<void> {
    this.cargando.set(true);
    this.resultado.set(await p);
    this.cargando.set(false);
  }
  protected ecuacion(): Promise<void> { return this.correr(this.motor.resolver('ecuacion', this.q1())); }
  protected factorizar(): Promise<void> { return this.correr(this.motor.resolver('factorizacion', this.q2())); }
  protected dominio(): Promise<void> { return this.correr(this.motor.resolver('dominio', this.q3())); }
  protected rango(): Promise<void> { return this.correr(this.motor.resolver('rango', this.q3())); }
  protected componer(): Promise<void> { return this.correr(this.motor.resolver('composicion', this.f(), this.g(), this.p())); }
}
