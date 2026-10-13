import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

const RUTA_LOGIN = '/api/auth/login';

/** Agrega el token a las llamadas a la API y, si el servidor responde 401, cierra la sesión vencida. */
export const authInterceptor: HttpInterceptorFn = (peticion, siguiente) => {
  const auth = inject(AuthService);
  const esApi = peticion.url.startsWith('/api/');
  const token = esApi && peticion.url !== RUTA_LOGIN ? auth.token() : null;
  const conToken = token ? peticion.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : peticion;

  return siguiente(conToken).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && esApi && peticion.url !== RUTA_LOGIN) {
        auth.cerrarSesion('vencida');
      }
      return throwError(() => error);
    })
  );
};
