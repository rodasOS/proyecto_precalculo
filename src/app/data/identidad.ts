/**
 * Datos de identidad del asistente (requisito 7 del enunciado).
 */
export const IDENTIDAD = {
  nombre: 'Tangente',
  lema: 'Asistente de Cálculo',
  universidad: 'Universidad Mariano Gálvez de Guatemala',
  facultad: 'Facultad de Ingeniería',
  asignatura: 'Cálculo',
  seccion: 'A',
  integrantes: [
    { nombre: 'Selvyn Juan de Marco Gutiérrez Castellanos', carne: '2990-26-4129' },
    { nombre: 'Yasterin Hesly Azurdia Alvarez', carne: '2990-26-1364' },
  ],
  entrega: '25/10/2026',
} as const;
