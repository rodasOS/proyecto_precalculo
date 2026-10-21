export interface Paso {
  regla: string;
  descripcion: string;
  latex: string;
}

export interface Verificacion {
  metodo: string;
  coincide: boolean;
  detalle: string;
}

export interface PuntoGrafica {
  x: number;
  y: number;
  etiqueta: string;
  tipo: 'interseccion' | 'maximo' | 'minimo' | 'inflexion' | 'otro';
}

export interface DatosGrafica {
  funciones: { texto: string; latex: string }[];
  puntos: PuntoGrafica[];
  asintotasVerticales: number[];
  asintotasHorizontales: number[];
  xmin: number;
  xmax: number;
}

export type EstadoResultado = 'ok' | 'advertencia' | 'no-resuelto' | 'error';

/** Contrato único de toda solución; la interfaz solo lo renderiza. */
export interface Resultado {
  estado: EstadoResultado;
  titulo: string;
  formula: string;
  sustitucion: string;
  pasos: Paso[];
  respuesta: { latex: string; texto: string };
  interpretacion: string;
  verificacion: Verificacion | null;
  advertencias: string[];
  grafica?: DatosGrafica;
}

export function resultadoVacio(titulo: string): Resultado {
  return {
    estado: 'ok', titulo, formula: '', sustitucion: '', pasos: [],
    respuesta: { latex: '', texto: '' }, interpretacion: '', verificacion: null, advertencias: [],
  };
}

export function resultadoError(titulo: string, mensaje: string, estado: 'error' | 'no-resuelto' = 'error'): Resultado {
  return { ...resultadoVacio(titulo), estado, advertencias: [mensaje] };
}
