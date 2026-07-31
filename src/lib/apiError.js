// Error con status HTTP explicito, para que las rutas de identidades
// puedan mapear fallos de validacion/negocio (404/409) sin perder el
// try/catch generico que devuelve 500 para lo inesperado.
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}
