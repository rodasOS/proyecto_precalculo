import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', title: 'Inicio', loadComponent: () => import('./features/inicio/inicio').then((m) => m.Inicio) },
  { path: 'algebra', title: 'Álgebra y funciones', loadComponent: () => import('./features/algebra/algebra').then((m) => m.Algebra) },
  { path: 'graficas', title: 'Gráficas', loadComponent: () => import('./features/graficas/graficas').then((m) => m.Graficas) },
  { path: 'limites', title: 'Límites', loadComponent: () => import('./features/limites/limites').then((m) => m.Limites) },
  { path: 'derivadas', title: 'Derivadas', loadComponent: () => import('./features/derivadas/derivadas').then((m) => m.Derivadas) },
  { path: 'integrales', title: 'Integrales', loadComponent: () => import('./features/integrales/integrales').then((m) => m.Integrales) },
  { path: 'aplicaciones', title: 'Aplicaciones', loadComponent: () => import('./features/aplicaciones/aplicaciones').then((m) => m.Aplicaciones) },
  { path: 'practica', title: 'Práctica', loadComponent: () => import('./features/practica/practica').then((m) => m.Practica) },
  { path: 'ejemplos', title: 'Ejemplos', loadComponent: () => import('./features/ejemplos/ejemplos').then((m) => m.Ejemplos) },
  { path: '**', redirectTo: '' },
];
