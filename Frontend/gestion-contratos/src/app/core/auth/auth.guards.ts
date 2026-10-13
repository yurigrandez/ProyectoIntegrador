import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ToastService } from '../ui/toast.service';
import { AuthService } from './auth.service';

/** Solo entra quien tiene sesión vigente; si no, va al login y vuelve a donde quería ir. */
export const authGuard: CanActivateFn = (_ruta, estado) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.haySesion() ? true : router.createUrlTree(['/login'], { queryParams: { volverA: estado.url } });
};

/** Quien ya inició sesión no necesita ver el login otra vez. */
export const soloVisitanteGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.haySesion() ? router.createUrlTree(['/panel']) : true;
};

/** Pantallas de edición que solo puede usar un administrador. */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);
  if (auth.esAdmin()) return true;
  toast.error('Esa pantalla es solo para administradores.');
  return router.createUrlTree(['/panel']);
};
