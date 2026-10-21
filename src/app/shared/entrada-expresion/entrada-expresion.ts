import { ChangeDetectionStrategy, Component, ElementRef, computed, input, model, output, viewChild } from '@angular/core';
import { ErrorEntrada } from '../../core/cas/errores';
import { parsear } from '../../core/cas/parser';
import { aTex } from '../../core/cas/tex';
import { Formula } from '../formula/formula';

interface Tecla { texto: string; insertar: string; retroceso?: number; titulo: string }

const TECLAS: Tecla[] = [
  { texto: 'x²', insertar: '^2', titulo: 'Elevar al cuadrado' },
  { texto: 'xⁿ', insertar: '^', titulo: 'Potencia' },
  { texto: '√', insertar: 'sqrt()', retroceso: 1, titulo: 'Raíz cuadrada' },
  { texto: '|x|', insertar: 'abs()', retroceso: 1, titulo: 'Valor absoluto' },
  { texto: 'π', insertar: 'pi', titulo: 'Pi' },
  { texto: 'e', insertar: 'e', titulo: 'Número e' },
  { texto: 'ln', insertar: 'ln()', retroceso: 1, titulo: 'Logaritmo natural' },
  { texto: 'sin', insertar: 'sin()', retroceso: 1, titulo: 'Seno' },
  { texto: 'cos', insertar: 'cos()', retroceso: 1, titulo: 'Coseno' },
  { texto: 'tan', insertar: 'tan()', retroceso: 1, titulo: 'Tangente' },
  { texto: '( )', insertar: '()', retroceso: 1, titulo: 'Paréntesis' },
  { texto: '÷', insertar: '/', titulo: 'División' },
];

/** Campo de texto para expresiones con vista previa matemática, errores en español y teclado de símbolos. */
@Component({
  selector: 'app-entrada-expresion',
  imports: [Formula],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './entrada-expresion.html',
  styleUrl: './entrada-expresion.scss',
})
export class EntradaExpresion {
  readonly etiqueta = input('Expresión');
  readonly placeholder = input('');
  readonly ayuda = input('');
  readonly modo = input<'expresion' | 'relacion'>('expresion');
  readonly teclado = input(true);
  readonly valor = model('');
  readonly enviar = output<void>();
  readonly id = `ent-${Math.random().toString(36).slice(2, 8)}`;
  protected readonly teclas = TECLAS;
  private readonly campo = viewChild.required<ElementRef<HTMLInputElement>>('campo');

  protected readonly vista = computed<{ tipo: 'vacio' | 'ok' | 'error'; tex: string; msg: string }>(() => {
    const v = this.valor();
    if (!v.trim()) return { tipo: 'vacio', tex: '', msg: '' };
    try {
      if (this.modo() === 'relacion') {
        const partes = v.split(/(<=|>=|≤|≥|=|<|>)/);
        const sim: Record<string, string> = { '<=': '\\leq', '≤': '\\leq', '>=': '\\geq', '≥': '\\geq', '=': '=', '<': '<', '>': '>' };
        const tex = partes.map((p, i) => (i % 2 === 1 ? sim[p] : aTex(parsear(p)))).join(' ');
        return { tipo: 'ok', tex, msg: '' };
      }
      return { tipo: 'ok', tex: aTex(parsear(v)), msg: '' };
    } catch (e) {
      return { tipo: 'error', tex: '', msg: e instanceof ErrorEntrada ? e.message : 'No se puede interpretar la expresión.' };
    }
  });

  protected insertar(t: Tecla): void {
    const el = this.campo().nativeElement;
    const ini = el.selectionStart ?? el.value.length;
    const fin = el.selectionEnd ?? el.value.length;
    const nuevo = el.value.slice(0, ini) + t.insertar + el.value.slice(fin);
    this.valor.set(nuevo);
    const pos = ini + t.insertar.length - (t.retroceso ?? 0);
    queueMicrotask(() => { el.value = nuevo; el.focus(); el.setSelectionRange(pos, pos); });
  }

  protected alEscribir(e: Event): void { this.valor.set((e.target as HTMLInputElement).value); }
}
