import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { App } from './app';
import { IDENTIDAD } from './data/identidad';

describe('App', () => {
  it('muestra el nombre, ambos integrantes, asignatura y sección en el encabezado', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const cab = el.querySelector('header')!.textContent!;
    expect(cab).toContain(IDENTIDAD.nombre);
    for (const i of IDENTIDAD.integrantes) expect(cab).toContain(i.nombre);
    expect(cab).toContain(IDENTIDAD.asignatura);
    expect(cab).toContain(IDENTIDAD.seccion);
  });
});
