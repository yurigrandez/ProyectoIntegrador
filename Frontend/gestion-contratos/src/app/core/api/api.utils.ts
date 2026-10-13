import { HttpErrorResponse, HttpParams } from '@angular/common/http';

/** Convierte un objeto en parámetros de consulta, omitiendo los valores vacíos. */
export function aParametros(valores: object): HttpParams {
  let params = new HttpParams();
  for (const [clave, valor] of Object.entries(valores)) {
    if (valor === null || valor === undefined || valor === '') continue;
    params = params.set(clave, String(valor));
  }
  return params;
}

interface ProblemaApi {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

/**
 * Traduce cualquier error de la API a un mensaje claro para la persona usuaria.
 * Prioriza el detalle que envía el servidor (reglas de negocio) y cae en un texto genérico según el código HTTP.
 */
export function mensajeDeError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Ocurrió un error inesperado. Intente nuevamente.';
  }
  if (error.status === 0) {
    return 'No se pudo conectar con el servidor. Revise su conexión a internet o avise al administrador.';
  }
  const problema = (typeof error.error === 'object' ? error.error : null) as ProblemaApi | null;
  if (problema?.errors) {
    const mensajes = Object.values(problema.errors).flat();
    if (mensajes.length > 0) return mensajes.join(' ');
  }
  if (problema?.detail) return problema.detail;

  switch (error.status) {
    case 401:
      return 'Su sesión venció o las credenciales no son válidas. Inicie sesión nuevamente.';
    case 403:
      return 'No tiene permiso para realizar esta acción. Pídale a un administrador que lo haga.';
    case 404:
      return 'No se encontró lo que busca. Puede que ya no exista.';
    default:
      return error.status >= 500
        ? 'El servidor tuvo un problema. Intente de nuevo en unos minutos.'
        : (problema?.title ?? 'No se pudo completar la acción.');
  }
}
