import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IDENTIDAD } from '../../data/identidad';

@Component({
  selector: 'app-inicio',
  imports: [RouterLink, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss',
})
export class Inicio {
  private readonly router = inject(Router);
  protected readonly id = IDENTIDAD;
  protected readonly funcion = signal('');

  /** Lleva la función escrita al análisis completo (puntos críticos, extremos y gráfica). */
  protected analizar(): void {
    const f = this.funcion().trim();
    if (!f) return;
    void this.router.navigate(['/aplicaciones'], { queryParams: { tab: 'funcion', f } });
  }
  protected readonly modulos = [
    { ruta: '/algebra', icono: 'ƒ', titulo: 'Álgebra y funciones', texto: 'Ecuaciones, desigualdades, factorización, dominio, rango y composición.' },
    { ruta: '/graficas', icono: '∿', titulo: 'Gráficas', texto: 'Curvas con intersecciones, extremos, inflexión, asíntotas y crecimiento.' },
    { ruta: '/limites', icono: 'lim', titulo: 'Límites', texto: 'En un punto, laterales y en el infinito, con el método explicado.' },
    { ruta: '/derivadas', icono: "f′", titulo: 'Derivadas', texto: 'Reglas básicas, orden superior, tangente y verificación.' },
    { ruta: '/integrales', icono: '∫', titulo: 'Integrales', texto: 'Indefinidas y definidas elementales, con sustitución y comprobación.' },
    { ruta: '/aplicaciones', icono: '⛰', titulo: 'Aplicaciones', texto: 'Máximos y mínimos, optimización y razones de cambio.' },
    { ruta: '/practica', icono: '✎', titulo: 'Práctica', texto: 'Ejercicios nuevos con calificación, pistas y procedimiento.' },
    { ruta: '/ejemplos', icono: '★', titulo: 'Ejemplos', texto: 'Ejercicios de muestra resueltos en el momento.' },
  ];
  protected readonly sintaxis = [
    ['x^2', 'x al cuadrado', 'x²'],
    ['3x + 1  o  3*x + 1', 'multiplicación (puede omitirse)', '3x + 1'],
    ['(x+1)/(x-2)', 'fracción', '(x+1)/(x−2)'],
    ['sqrt(x)  o  √(x)', 'raíz cuadrada', '√x'],
    ['abs(x)  o  |x|', 'valor absoluto', '|x|'],
    ['sin(x), cos(x), tan(x)', 'trigonométricas (en radianes)', 'sen x, cos x'],
    ['e^x,  ln(x),  log(x)', 'exponencial, logaritmo natural, logaritmo base 10', 'eˣ, ln x'],
    ['pi,  e', 'constantes π y e', 'π, e'],
    ['2,5  o  2.5', 'coma o punto decimal', '2.5'],
  ];
}
