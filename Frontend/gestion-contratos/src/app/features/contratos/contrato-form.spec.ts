import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ContratoForm } from './contrato-form';

const texto = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const lista = <T>(items: T[]) => ({ items, total: items.length, pagina: 1, tamano: 100, totalPaginas: 1 });

async function abrir(id?: string) {
  TestBed.configureTestingModule({ imports: [ContratoForm], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
  const control = TestBed.inject(HttpTestingController);
  const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(ContratoForm);
  if (id) fixture.componentRef.setInput('id', id);
  fixture.detectChanges();
  control.expectOne((r) => r.url === '/api/clientes').flush(lista([{ id: 3, codigo: 'CLI-003', nombre: 'Ana', paterno: 'Flores', materno: null }]));
  control.expectOne((r) => r.url === '/api/locales').flush(lista([
    { id: 6, codigo: 'LOC-006', direccion: 'Galería Central 220', interior: 16, estado: 'DIS' },
    { id: 12, codigo: 'LOC-012', direccion: 'Jr. Unión 456', interior: 3, estado: 'MAN' }
  ]));
  await fixture.whenStable();
  const html = fixture.nativeElement as HTMLElement;
  const escribir = (campo: string, valor: string) => {
    const el = html.querySelector<HTMLInputElement>(`#${campo}`)!;
    el.value = valor;
    el.dispatchEvent(new Event('input'));
  };
  const elegir = (campo: string, valor: string) => {
    const el = html.querySelector<HTMLSelectElement>(`#${campo}`)!;
    el.value = valor;
    el.dispatchEvent(new Event('change'));
  };
  const resumen = () => [...html.querySelectorAll('aside dd')].map((d) => texto(d));
  const enviar = async () => {
    html.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  };
  return { fixture, control, html, navegar, escribir, elegir, resumen, enviar };
}

describe('ContratoForm', () => {
  it('ofrece clientes y locales, y no deja elegir un local en mantenimiento', async () => {
    const { html } = await abrir();

    expect(texto(html.querySelector('#cliente'))).toContain('Ana Flores (CLI-003)');
    const opciones = [...html.querySelectorAll<HTMLOptionElement>('#local option')];
    expect(opciones.find((o) => texto(o).includes('LOC-006'))!.disabled).toBe(false);
    const mantenimiento = opciones.find((o) => texto(o).includes('LOC-012'))!;
    expect(mantenimiento.disabled).toBe(true);
    expect(texto(mantenimiento)).toContain('en mantenimiento');
  });

  it('al elegir la duración calcula la fecha de fin y el resumen de pagos', async () => {
    const { fixture, html, escribir, elegir, resumen } = await abrir();

    escribir('inicio', '2027-01-01');
    escribir('alquiler', '1500');
    escribir('mantenimiento', '100');
    fixture.detectChanges();
    elegir('duracion', '12');
    fixture.detectChanges();

    expect(html.querySelector<HTMLInputElement>('#fin')!.value).toBe('2027-12-31');
    expect(resumen()).toEqual([expect.stringMatching(/1,600\.00$/), '12 meses', expect.stringMatching(/19,200\.00$/)]);
  });

  it('el último mes parcial también se cobra completo en el resumen', async () => {
    const { fixture, escribir, resumen } = await abrir();

    escribir('inicio', '2027-01-01');
    escribir('fin', '2027-03-15');
    escribir('alquiler', '1000');
    fixture.detectChanges();

    expect(resumen()[1]).toBe('3 meses');
  });

  it('antes de elegir fechas el resumen pide completarlas', async () => {
    const { resumen } = await abrir();

    expect(resumen()[1]).toBe('Elija las fechas');
  });

  it('no envía un formulario incompleto y marca lo que falta', async () => {
    const { control, html, enviar } = await abrir();

    await enviar();

    expect(html.querySelectorAll('form .error').length).toBeGreaterThanOrEqual(5);
    expect(texto(html.querySelector('.caja.peligro'))).toContain('Revise los datos');
    control.expectNone('/api/contratos');
  });

  it('avisa si la fecha de fin no es posterior a la de inicio', async () => {
    const { fixture, control, html, escribir, enviar } = await abrir();
    escribir('inicio', '2027-06-01');
    escribir('fin', '2027-01-01');
    fixture.detectChanges();

    await enviar();

    expect(texto(html.querySelector('#fin-error'))).toContain('posterior a la de inicio');
    control.expectNone('/api/contratos');
  });

  it('con datos completos crea el contrato y abre su detalle', async () => {
    const { fixture, control, navegar, escribir, enviar } = await abrir();
    fixture.componentInstance['formulario'].patchValue({ idCliente: 3, idLocal: 6 });
    escribir('inicio', '2026-10-01');
    escribir('fin', '2027-09-30');
    escribir('dia', '5');
    escribir('alquiler', '1500');
    escribir('mantenimiento', '100');
    escribir('observaciones', '  Con depósito de garantía  ');
    fixture.detectChanges();

    await enviar();

    const peticion = control.expectOne({ method: 'POST', url: '/api/contratos' });
    expect(peticion.request.body).toEqual({
      idCliente: 3, idLocal: 6, fechaInicio: '2026-10-01', fechaFin: '2027-09-30', diaPago: 5,
      montoAlquiler: 1500, montoMantenimiento: 100, montoLuz: 0, montoAgua: 0, montoOtros: 0, observaciones: 'Con depósito de garantía'
    });
    peticion.flush({ id: 14, codigo: 'CON-2026-0012' });
    expect(navegar).toHaveBeenCalledWith(['/contratos', 14]);
  });

  it('si el servidor rechaza el contrato muestra el motivo', async () => {
    const { fixture, control, html, escribir, enviar } = await abrir();
    fixture.componentInstance['formulario'].patchValue({ idCliente: 3, idLocal: 6 });
    escribir('inicio', '2026-10-01');
    escribir('fin', '2027-09-30');
    escribir('alquiler', '1500');
    fixture.detectChanges();

    await enviar();
    control.expectOne('/api/contratos').flush(
      { detail: 'El local ya tiene otro contrato (borrador o vigente) que se cruza con esas fechas.' },
      { status: 400, statusText: 'Bad Request' }
    );
    fixture.detectChanges();

    expect(texto(html.querySelector('.caja.peligro'))).toContain('se cruza con esas fechas');
  });

  it('un contrato que ya no es borrador no se puede editar', async () => {
    TestBed.configureTestingModule({ imports: [ContratoForm], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    const control = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ContratoForm);
    fixture.componentRef.setInput('id', '4');
    fixture.detectChanges();
    control.expectOne((r) => r.url === '/api/clientes').flush(lista([]));
    control.expectOne((r) => r.url === '/api/locales').flush(lista([]));
    control.expectOne('/api/contratos/4').flush({
      id: 4, codigo: 'CON-2026-0004', estado: 'VIG', idCliente: 3, idLocal: 6, fechaInicio: '2026-01-01T00:00:00', fechaFin: '2026-12-31T00:00:00',
      diaPago: 16, montoAlquiler: 1800, montoMantenimiento: 150, montoLuz: 0, montoAgua: 0, montoOtros: 0, observaciones: null
    });
    await fixture.whenStable();
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(texto(html.querySelector('.caja.aviso'))).toContain('ya no se puede editar');
    expect(html.querySelector('form')).toBeNull();
  });

  it('marca cambios sin guardar al escribir y deja de marcarlos cuando el contrato se guarda', async () => {
    const { fixture, control, navegar, escribir, enviar } = await abrir();
    const pantalla = fixture.componentInstance;
    expect(pantalla.hayCambiosSinGuardar()).toBe(false);

    fixture.componentInstance['formulario'].patchValue({ idCliente: 3, idLocal: 6 });
    escribir('inicio', '2026-10-01');
    escribir('fin', '2027-09-30');
    escribir('alquiler', '1500');
    fixture.detectChanges();
    expect(pantalla.hayCambiosSinGuardar()).toBe(true);

    await enviar();
    control.expectOne({ method: 'POST', url: '/api/contratos' }).flush({ id: 14, codigo: 'CON-2026-0012' });

    expect(navegar).toHaveBeenCalledWith(['/contratos', 14]);
    expect(pantalla.hayCambiosSinGuardar()).toBe(false);
  });
});
