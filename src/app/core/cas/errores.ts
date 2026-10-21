/** Error de entrada del usuario, con mensaje en español y posición aproximada. */
export class ErrorEntrada extends Error {
  constructor(mensaje: string, readonly pos?: number) {
    super(mensaje);
    this.name = 'ErrorEntrada';
  }
}

/** Caso que el motor no puede resolver (no es culpa de la entrada). */
export class NoResuelto extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'NoResuelto';
  }
}
