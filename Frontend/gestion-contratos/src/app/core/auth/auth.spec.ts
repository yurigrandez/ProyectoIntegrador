import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { LoginRespuesta } from '../api/modelos';
import { ToastService } from '../ui/toast.service';
import { adminGuard, authGuard, soloVisitanteGuard } from './auth.guards';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

const CLAVE = 'gc.sesion';
const enUnaHora = () => new Date(Date.now() + 3_600_000).toISOString();
const respuesta = (rol: string, expira = enUnaHora()): LoginRespuesta => ({
  token: 'token-de-prueba',
  expira,
  usuario: { id: 1, codigo: rol === 'ADM' ? 'ADMIN' : 'OPERADOR', nombreCompleto: 'Persona Prueba', rol }
});

function configurar(): { auth: AuthService; http: HttpClient; control: HttpTestingController; router: Router } {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()]
  });
  return {
    auth: TestBed.inject(AuthService),
    http: TestBed.inject(HttpClient),
    control: TestBed.inject(HttpTestingController),
    router: TestBed.inject(Router)
  };
}

describe('autenticación', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  describe('AuthService', () => {
    it('inicia sin sesión', () => {
      const { auth } = configurar();

      expect(auth.haySesion()).toBe(false);
      expect(auth.token()).toBeNull();
      expect(auth.usuario()).toBeNull();
    });

    it('al iniciar sesión guarda el token y reconoce al administrador', () => {
      const { auth, control } = configurar();

      auth.login('ADMIN', 'Demo123*').subscribe();
      const peticion = control.expectOne('/api/auth/login');
      expect(peticion.request.body).toEqual({ codigo: 'ADMIN', clave: 'Demo123*' });
      peticion.flush(respuesta('ADM'));

      expect(auth.haySesion()).toBe(true);
      expect(auth.token()).toBe('token-de-prueba');
      expect(auth.esAdmin()).toBe(true);
      expect(auth.nombreRol()).toBe('Administrador');
      expect(sessionStorage.getItem(CLAVE)).toContain('token-de-prueba');
    });

    it('reconoce al operador como no administrador', () => {
      const { auth, control } = configurar();

      auth.login('OPERADOR', 'x').subscribe();
      control.expectOne('/api/auth/login').flush(respuesta('OPE'));

      expect(auth.esAdmin()).toBe(false);
      expect(auth.nombreRol()).toBe('Operador');
    });

    it('recupera la sesión guardada al volver a abrir la aplicación', () => {
      sessionStorage.setItem(CLAVE, JSON.stringify(respuesta('ADM')));

      const { auth } = configurar();

      expect(auth.haySesion()).toBe(true);
      expect(auth.usuario()?.codigo).toBe('ADMIN');
    });

    it('descarta una sesión guardada que ya venció', () => {
      sessionStorage.setItem(CLAVE, JSON.stringify(respuesta('ADM', new Date(Date.now() - 1000).toISOString())));

      const { auth } = configurar();

      expect(auth.haySesion()).toBe(false);
      expect(sessionStorage.getItem(CLAVE)).toBeNull();
    });

    it('ignora datos guardados dañados', () => {
      sessionStorage.setItem(CLAVE, '{no es json');

      const { auth } = configurar();

      expect(auth.haySesion()).toBe(false);
    });

    it('cerrar sesión borra todo y lleva al login', async () => {
      const { auth, control, router } = configurar();
      const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      auth.login('ADMIN', 'x').subscribe();
      control.expectOne('/api/auth/login').flush(respuesta('ADM'));

      auth.cerrarSesion('vencida');

      expect(auth.haySesion()).toBe(false);
      expect(sessionStorage.getItem(CLAVE)).toBeNull();
      expect(navegar).toHaveBeenCalledWith(['/login'], { queryParams: { motivo: 'vencida' } });
    });

    it('una sesión que vence mientras se usa deja de contar como activa', () => {
      vi.useFakeTimers();
      try {
        const { auth, control } = configurar();
        auth.login('ADMIN', 'x').subscribe();
        control.expectOne('/api/auth/login').flush(respuesta('ADM', new Date(Date.now() + 60_000).toISOString()));
        expect(auth.haySesion()).toBe(true);

        vi.advanceTimersByTime(61_000);

        expect(auth.haySesion()).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('interceptor', () => {
    it('agrega el token a las llamadas a la API', () => {
      const { auth, http, control } = configurar();
      auth.login('ADMIN', 'x').subscribe();
      control.expectOne('/api/auth/login').flush(respuesta('ADM'));

      http.get('/api/clientes').subscribe();

      const peticion = control.expectOne('/api/clientes');
      expect(peticion.request.headers.get('Authorization')).toBe('Bearer token-de-prueba');
      peticion.flush({});
    });

    it('no envía el token al iniciar sesión ni a otras direcciones', () => {
      const { auth, http, control } = configurar();
      auth.login('ADMIN', 'x').subscribe();
      const login = control.expectOne('/api/auth/login');
      expect(login.request.headers.has('Authorization')).toBe(false);
      login.flush(respuesta('ADM'));

      http.get('https://otro-sitio.com/datos').subscribe();

      const externa = control.expectOne('https://otro-sitio.com/datos');
      expect(externa.request.headers.has('Authorization')).toBe(false);
      externa.flush({});
    });

    it('si el servidor responde 401 cierra la sesión por vencida', () => {
      const { auth, http, control, router } = configurar();
      const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      auth.login('ADMIN', 'x').subscribe();
      control.expectOne('/api/auth/login').flush(respuesta('ADM'));

      http.get('/api/contratos').subscribe({ error: () => undefined });
      control.expectOne('/api/contratos').flush({}, { status: 401, statusText: 'Unauthorized' });

      expect(auth.haySesion()).toBe(false);
      expect(navegar).toHaveBeenCalledWith(['/login'], { queryParams: { motivo: 'vencida' } });
    });

    it('un 401 al iniciar sesión (clave mala) no cierra nada ni redirige', () => {
      const { auth, control, router } = configurar();
      const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      let fallo = false;

      auth.login('ADMIN', 'mala').subscribe({ error: () => (fallo = true) });
      control.expectOne('/api/auth/login').flush({}, { status: 401, statusText: 'Unauthorized' });

      expect(fallo).toBe(true);
      expect(navegar).not.toHaveBeenCalled();
    });
  });

  describe('guardas', () => {
    const estado = (url: string) => ({ url }) as never;
    const ejecutar = <T>(guarda: () => T): T => TestBed.runInInjectionContext(guarda);

    it('authGuard deja pasar con sesión y si no manda al login recordando la dirección', () => {
      const { auth, control, router } = configurar();

      const sinSesion = ejecutar(() => authGuard({} as never, estado('/contratos/4')));
      expect(sinSesion).toBeInstanceOf(UrlTree);
      expect(router.serializeUrl(sinSesion as UrlTree)).toBe('/login?volverA=%2Fcontratos%2F4');

      auth.login('ADMIN', 'x').subscribe();
      control.expectOne('/api/auth/login').flush(respuesta('ADM'));
      expect(ejecutar(() => authGuard({} as never, estado('/contratos/4')))).toBe(true);
    });

    it('soloVisitanteGuard saca del login a quien ya inició sesión', () => {
      const { auth, control, router } = configurar();
      expect(ejecutar(() => soloVisitanteGuard({} as never, estado('/login')))).toBe(true);

      auth.login('ADMIN', 'x').subscribe();
      control.expectOne('/api/auth/login').flush(respuesta('ADM'));
      const resultado = ejecutar(() => soloVisitanteGuard({} as never, estado('/login')));

      expect(router.serializeUrl(resultado as UrlTree)).toBe('/panel');
    });

    it('adminGuard bloquea al operador y le avisa por qué', () => {
      const { auth, control, router } = configurar();
      const toast = TestBed.inject(ToastService);
      auth.login('OPERADOR', 'x').subscribe();
      control.expectOne('/api/auth/login').flush(respuesta('OPE'));

      const resultado = ejecutar(() => adminGuard({} as never, estado('/empresas/nueva')));

      expect(router.serializeUrl(resultado as UrlTree)).toBe('/panel');
      expect(toast.avisos().some((a) => a.tipo === 'error' && a.texto.includes('administradores'))).toBe(true);
    });

    it('adminGuard deja pasar al administrador', () => {
      const { auth, control } = configurar();
      auth.login('ADMIN', 'x').subscribe();
      control.expectOne('/api/auth/login').flush(respuesta('ADM'));

      expect(ejecutar(() => adminGuard({} as never, estado('/empresas/nueva')))).toBe(true);
    });
  });
});
