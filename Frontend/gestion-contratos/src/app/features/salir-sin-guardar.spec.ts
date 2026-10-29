import { Component, Type } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ConfirmService } from '../core/ui/confirm.service';
import { ConCambios, salirSinGuardarGuard } from '../core/ui/salir-sin-guardar.guard';
import { Confirmacion } from '../shared/confirmacion/confirmacion';
import { ClienteForm } from './clientes/cliente-form';
import { EmpresaForm } from './empresas/empresa-form';
import { LocalForm } from './locales/local-form';

const lista = <T>(items: T[]) => ({ items, total: items.length, pagina: 1, tamano: 100, totalPaginas: 1 });
const texto = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

/** Ejecuta la guarda de salida tal como lo hace el enrutador. */
const intentarSalir = (pantalla: ConCambios) =>
  TestBed.runInInjectionContext(() => salirSinGuardarGuard(pantalla, {} as never, {} as never, {} as never)) as boolean | Promise<boolean>;

describe('guarda de salida sin guardar', () => {
  it('deja salir sin preguntar cuando no hay cambios', () => {
    const resultado = intentarSalir({ hayCambiosSinGuardar: () => false });

    expect(resultado).toBe(true);
    expect(TestBed.inject(ConfirmService).pedido()).toBeNull();
  });

  it('con cambios pregunta con las opciones Sí y No', () => {
    void intentarSalir({ hayCambiosSinGuardar: () => true });

    expect(TestBed.inject(ConfirmService).pedido()).toMatchObject({
      titulo: 'Salir sin guardar', textoConfirmar: 'Sí', textoCancelar: 'No'
    });
  });

  it('si responde Sí permite salir a la opción elegida', async () => {
    const resultado = intentarSalir({ hayCambiosSinGuardar: () => true });
    TestBed.inject(ConfirmService).responder(true);

    await expect(resultado).resolves.toBe(true);
  });

  it('si responde No se queda en el formulario', async () => {
    const resultado = intentarSalir({ hayCambiosSinGuardar: () => true });
    TestBed.inject(ConfirmService).responder(false);

    await expect(resultado).resolves.toBe(false);
  });
});

describe('ventana de confirmación de salida', () => {
  it('muestra los botones Sí y No y responde según el que se pulse', async () => {
    const fixture = TestBed.createComponent(Confirmacion);
    const servicio = TestBed.inject(ConfirmService);
    const respuesta = servicio.confirmar({ titulo: 'Salir sin guardar', mensaje: '¿Desea salir?', textoConfirmar: 'Sí', textoCancelar: 'No' });
    fixture.detectChanges();

    const botones = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('footer button')];
    expect(botones.map((b) => texto(b))).toEqual(['No', 'Sí']);

    botones[0].click();
    await expect(respuesta).resolves.toBe(false);
  });

  it('sin textoCancelar el botón sigue diciendo Cancelar', () => {
    const fixture = TestBed.createComponent(Confirmacion);
    void TestBed.inject(ConfirmService).confirmar({ titulo: 'Eliminar', mensaje: '¿Seguro?' });
    fixture.detectChanges();

    const botones = [...(fixture.nativeElement as HTMLElement).querySelectorAll('footer button')];
    expect(botones.map((b) => texto(b))).toEqual(['Cancelar', 'Confirmar']);
  });
});

const formularios = [
  { nombre: 'cliente', componente: ClienteForm, campo: 'nombre' },
  { nombre: 'empresa', componente: EmpresaForm, campo: 'nombre' },
  { nombre: 'local', componente: LocalForm, campo: 'direccion' }
] as const;

async function abrir(componente: Type<unknown>) {
  TestBed.configureTestingModule({ imports: [componente], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
  const control = TestBed.inject(HttpTestingController);
  const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(componente);
  fixture.detectChanges();
  for (const peticion of control.match(() => true)) {
    peticion.flush(peticion.request.url.startsWith('/api/catalogos') ? [] : lista([]));
  }
  await fixture.whenStable();
  fixture.detectChanges();
  const html = fixture.nativeElement as HTMLElement;
  const escribir = (campo: string, valor: string) => {
    const el = html.querySelector<HTMLInputElement>(`#${campo}`)!;
    el.value = valor;
    el.dispatchEvent(new Event('input'));
  };
  return { fixture, control, html, navegar, escribir, pantalla: fixture.componentInstance as ConCambios };
}

describe.each(formularios)('cambios sin guardar en el formulario de $nombre', ({ componente, campo }) => {
  it('al abrir un registro nuevo sin escribir nada no hay cambios', async () => {
    const { pantalla } = await abrir(componente);

    expect(pantalla.hayCambiosSinGuardar()).toBe(false);
  });

  it('al escribir en un campo hay cambios y la guarda pregunta antes de salir', async () => {
    const { pantalla, escribir } = await abrir(componente);

    escribir(campo, 'Dato nuevo');

    expect(pantalla.hayCambiosSinGuardar()).toBe(true);
    void intentarSalir(pantalla);
    expect(TestBed.inject(ConfirmService).pedido()?.textoCancelar).toBe('No');
  });
});

describe('alta de empresa guardada', () => {
  it('después de guardar con éxito ya no pregunta al salir', async () => {
    const { fixture, control, html, navegar, escribir, pantalla } = await abrir(EmpresaForm);
    escribir('ruc', '20512345678');
    escribir('nombre', 'Inversiones Andina S.A.C.');
    expect(pantalla.hayCambiosSinGuardar()).toBe(true);

    html.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    control.expectOne((r) => r.method === 'POST' && r.url === '/api/empresas').flush({ id: 9, codigo: 'EMP-0009' });
    await fixture.whenStable();

    expect(navegar).toHaveBeenCalledWith(['/empresas']);
    expect(pantalla.hayCambiosSinGuardar()).toBe(false);
    expect(intentarSalir(pantalla)).toBe(true);
  });

  it('si el servidor rechaza el guardado los cambios siguen pendientes', async () => {
    const { fixture, control, html, escribir, pantalla } = await abrir(EmpresaForm);
    escribir('ruc', '20512345678');
    escribir('nombre', 'Inversiones Andina S.A.C.');

    html.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    control.expectOne((r) => r.method === 'POST' && r.url === '/api/empresas').flush({ detail: 'RUC repetido' }, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();

    expect(pantalla.hayCambiosSinGuardar()).toBe(true);
  });
});

@Component({ template: 'formulario' })
class PantallaConCambios implements ConCambios {
  hayCambiosSinGuardar = () => true;
}

@Component({ template: 'otra opción' })
class OtraOpcion {}

describe('salida de un formulario con el enrutador', () => {
  async function abrirFormulario() {
    TestBed.configureTestingModule({
      providers: [provideRouter([
        { path: 'formulario', component: PantallaConCambios, canDeactivate: [salirSinGuardarGuard] },
        { path: 'otra', component: OtraOpcion }
      ])]
    });
    const router = TestBed.inject(Router);
    await RouterTestingHarness.create('/formulario');
    return router;
  }

  it('si responde No se mantiene en el formulario', async () => {
    const router = await abrirFormulario();

    const navegacion = router.navigateByUrl('/otra');
    await vi.waitFor(() => expect(TestBed.inject(ConfirmService).pedido()).not.toBeNull());
    TestBed.inject(ConfirmService).responder(false);

    await expect(navegacion).resolves.toBe(false);
    expect(router.url).toBe('/formulario');
  });

  it('si responde Sí pasa a la opción elegida', async () => {
    const router = await abrirFormulario();

    const navegacion = router.navigateByUrl('/otra');
    await vi.waitFor(() => expect(TestBed.inject(ConfirmService).pedido()).not.toBeNull());
    TestBed.inject(ConfirmService).responder(true);

    await expect(navegacion).resolves.toBe(true);
    expect(router.url).toBe('/otra');
  });
});
