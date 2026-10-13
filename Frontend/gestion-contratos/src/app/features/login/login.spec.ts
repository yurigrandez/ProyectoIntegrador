import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { Login } from './login';

const texto = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

function crear(parametros: Record<string, string> = {}) {
  TestBed.configureTestingModule({
    imports: [Login],
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(parametros) } } }
    ]
  });
  const fixture = TestBed.createComponent(Login);
  const router = TestBed.inject(Router);
  const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  const control = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  const html = fixture.nativeElement as HTMLElement;
  const escribir = (id: string, valor: string) => {
    const campo = html.querySelector<HTMLInputElement>(`#${id}`)!;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
  };
  const enviar = async () => {
    html.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };
  return { fixture, html, control, navegar, escribir, enviar };
}

const respuestaOk = { token: 't', expira: new Date(Date.now() + 3_600_000).toISOString(), usuario: { id: 1, codigo: 'ADMIN', nombreCompleto: 'Carlos', rol: 'ADM' } };

describe('Login', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it('pide usuario y contraseña antes de enviar y no llama al servidor', async () => {
    const { html, control, enviar, fixture } = crear();

    await enviar();
    fixture.detectChanges();

    expect([...html.querySelectorAll('.error')].map((e) => texto(e))).toEqual(['Este dato es obligatorio.', 'Este dato es obligatorio.']);
    control.expectNone('/api/auth/login');
  });

  it('con datos correctos inicia sesión y lleva al panel', async () => {
    const { control, navegar, escribir, enviar } = crear();
    escribir('usuario', ' ADMIN ');
    escribir('clave', 'Demo123*');

    await enviar();
    const peticion = control.expectOne('/api/auth/login');
    expect(peticion.request.body).toEqual({ codigo: 'ADMIN', clave: 'Demo123*' }); // se recorta el espacio del usuario
    peticion.flush(respuestaOk);

    expect(navegar).toHaveBeenCalledWith('/panel');
  });

  it('vuelve a la pantalla a la que la persona quería entrar', async () => {
    const { control, navegar, escribir, enviar } = crear({ volverA: '/contratos/4' });
    escribir('usuario', 'ADMIN');
    escribir('clave', 'x');

    await enviar();
    control.expectOne('/api/auth/login').flush(respuestaOk);

    expect(navegar).toHaveBeenCalledWith('/contratos/4');
  });

  it.each(['https://sitio-malicioso.com', '//sitio-malicioso.com', 'javascript:alert(1)'])(
    'nunca redirige a una dirección externa (%s)',
    async (destino) => {
      const { control, navegar, escribir, enviar } = crear({ volverA: destino });
      escribir('usuario', 'ADMIN');
      escribir('clave', 'x');

      await enviar();
      control.expectOne('/api/auth/login').flush(respuestaOk);

      expect(navegar).toHaveBeenCalledWith('/panel');
    }
  );

  it('con clave incorrecta explica el problema, permite reintentar y no guarda sesión', async () => {
    const { fixture, html, control, navegar, escribir, enviar } = crear();
    escribir('usuario', 'ADMIN');
    escribir('clave', 'mala');

    await enviar();
    control.expectOne('/api/auth/login').flush(
      { title: 'No autorizado', status: 401, detail: 'Usuario o clave incorrectos.' },
      { status: 401, statusText: 'Unauthorized' }
    );
    fixture.detectChanges();

    expect(texto(html.querySelector('.caja.peligro'))).toContain('Usuario o clave incorrectos.');
    expect(html.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(false);
    expect(navegar).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('gc.sesion')).toBeNull();
  });

  it('explica cuando el servidor no responde', async () => {
    const { fixture, html, control, escribir, enviar } = crear();
    escribir('usuario', 'ADMIN');
    escribir('clave', 'x');

    await enviar();
    control.expectOne('/api/auth/login').error(new ProgressEvent('error'));
    fixture.detectChanges();

    expect(texto(html.querySelector('.caja.peligro'))).toContain('No se pudo conectar con el servidor');
  });

  it('avisa que la sesión terminó cuando se llega por vencimiento', () => {
    const { html } = crear({ motivo: 'vencida' });

    expect(texto(html.querySelector('.caja.aviso'))).toContain('Su sesión terminó');
  });

  it('permite mostrar y ocultar la contraseña', async () => {
    const { fixture, html } = crear();
    const clave = html.querySelector<HTMLInputElement>('#clave')!;
    expect(clave.type).toBe('password');

    html.querySelector<HTMLButtonElement>('button[aria-pressed]')!.click();
    fixture.detectChanges();

    expect(clave.type).toBe('text');
  });
});
