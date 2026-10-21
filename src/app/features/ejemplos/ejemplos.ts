import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EJEMPLOS, Ejemplo } from '../../data/ejemplos';
import { MODULOS } from '../../core/practica/generador';

@Component({
  selector: 'app-ejemplos',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pagina">
      <header>
        <h1>Ejemplos resueltos</h1>
        <p>{{ total }} ejercicios de muestra. Al abrir uno, el módulo correspondiente lo resuelve en el momento con el motor de cálculo (no son respuestas escritas de antemano); luego puedes cambiar los datos.</p>
      </header>
      @for (g of grupos; track g.id) {
        <section class="grupo">
          <h2>{{ g.nombre }}</h2>
          <div class="rejilla">
            @for (e of g.ejemplos; track e.id) {
              <article class="tarjeta ej">
                <h3>{{ e.titulo }}</h3>
                <p>{{ e.enunciado }}</p>
                <a class="btn" [routerLink]="e.ruta" [queryParams]="e.consulta">Resolver</a>
              </article>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    .grupo { margin-top: 20px; }
    .rejilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
    .ej { margin: 0; display: flex; flex-direction: column; gap: 6px; }
    .ej h3 { font-size: 1rem; margin: 0; }
    .ej p { color: var(--app-muted); font-size: .92rem; flex: 1; }
    .ej a { align-self: flex-start; display: inline-flex; align-items: center; text-decoration: none; }
  `,
})
export class Ejemplos {
  protected readonly total = EJEMPLOS.length;
  protected readonly grupos: { id: string; nombre: string; ejemplos: Ejemplo[] }[] = MODULOS
    .map((m) => ({ id: m.id, nombre: m.nombre, ejemplos: EJEMPLOS.filter((e) => e.modulo === m.id) }))
    .filter((g) => g.ejemplos.length);
}
