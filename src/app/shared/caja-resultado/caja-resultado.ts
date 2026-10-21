import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Resultado } from '../../core/cas/resultado.model';
import { Formula } from '../formula/formula';

/** Presenta un Resultado: fórmula, sustitución, procedimiento, respuesta, interpretación, verificación y advertencias. */
@Component({
  selector: 'app-caja-resultado',
  imports: [Formula],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './caja-resultado.html',
  styleUrl: './caja-resultado.scss',
})
export class CajaResultado {
  readonly resultado = input.required<Resultado>();
  protected readonly hayContenido = computed(() => this.resultado().estado !== 'error' || this.resultado().pasos.length > 0);
  protected readonly etiquetaEstado = computed(() => {
    switch (this.resultado().estado) {
      case 'ok': return 'Resuelto y verificado';
      case 'advertencia': return 'Resuelto con advertencias';
      case 'no-resuelto': return 'No se pudo resolver';
      default: return 'Entrada no válida';
    }
  });
}
