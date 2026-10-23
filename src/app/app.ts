import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IDENTIDAD } from './data/identidad';

interface Enlace { ruta: string; texto: string; icono: string }

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly id = IDENTIDAD;
  /** En móvil, el bloque de integrantes y datos del curso empieza colapsado. */
  protected readonly infoAbierta = signal(false);
  protected readonly enlaces: Enlace[] = [
    { ruta: '/', texto: 'Inicio', icono: '⌂' },
    { ruta: '/algebra', texto: 'Álgebra y funciones', icono: 'ƒ' },
    { ruta: '/graficas', texto: 'Gráficas', icono: '∿' },
    { ruta: '/limites', texto: 'Límites', icono: 'lim' },
    { ruta: '/derivadas', texto: 'Derivadas', icono: "f′" },
    { ruta: '/integrales', texto: 'Integrales', icono: '∫' },
    { ruta: '/aplicaciones', texto: 'Aplicaciones', icono: '⛰' },
    { ruta: '/practica', texto: 'Práctica', icono: '✎' },
    { ruta: '/ejemplos', texto: 'Ejemplos', icono: '★' },
  ];
}
