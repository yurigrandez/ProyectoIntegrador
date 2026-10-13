import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Pago } from '../../core/api/modelos';
import { ToastService } from '../../core/ui/toast.service';
import { CuotaPorPagar, PagoDialogo } from './pago-dialogo';

const texto = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

const cuota: CuotaPorPagar = {
  idCronogramaPago: 77, codigoContrato: 'CON-2026-0004', concepto: 'ALQ', nroCuota: 8, fechaVencimiento: '2026-08-16T00:00:00', saldo: 1800
};
const medios = [
  { id: 1, abreviatura: 'EFE', nombre: 'Efectivo' },
  { id: 2, abreviatura: 'TRA', nombre: 'Transferencia' }
];

async function abrir(cuotaInicial: CuotaPorPagar | null = cuota) {
  TestBed.configureTestingModule({ imports: [PagoDialogo], providers: [provideHttpClient(), provideHttpClientTesting()] });
  const control = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(PagoDialogo);
  fixture.componentRef.setInput('cuota', cuotaInicial);
  const eventos = { registrado: [] as Pago[], cancelado: 0 };
  fixture.componentInstance.registrado.subscribe((p) => eventos.registrado.push(p));
  fixture.componentInstance.cancelar.subscribe(() => eventos.cancelado++);
  fixture.detectChanges();
  control.expectOne('/api/catalogos/medios-pago').flush(medios);
  if (!cuotaInicial) control.expectOne((r) => r.url === '/api/contratos').flush({ items: [], total: 0, pagina: 1, tamano: 100, totalPaginas: 0 });
  await fixture.whenStable();
  const html = fixture.nativeElement as HTMLElement;
  const escribir = (id: string, valor: string) => {
    const campo = html.querySelector<HTMLInputElement>(`#${id}`)!;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
  };
  const enviar = async () => {
    html.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await fixture.whenStable();
  };
  return { fixture, control, html, eventos, escribir, enviar };
}

describe('PagoDialogo', () => {
  it('con una cuota la muestra y propone pagar el saldo completo en efectivo, con fecha de hoy', async () => {
    const { html } = await abrir();

    const resumen = texto(html.querySelector('.resumen-cuota'));
    expect(resumen).toContain('CON-2026-0004');
    expect(resumen).toContain('Alquiler · cuota 8');
    expect(resumen).toContain('16/08/2026');
    expect(resumen).toMatch(/Falta pagar: S\/\s?1,800\.00/);
    expect(html.querySelector<HTMLInputElement>('#pago-monto')!.value).toBe('1800');
    expect(html.querySelector<HTMLSelectElement>('#pago-medio')!.selectedOptions[0].textContent!.trim()).toBe('Efectivo');
    expect(html.querySelector<HTMLInputElement>('#pago-fecha')!.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('envía el pago con los datos limpios y avisa al terminar', async () => {
    const { control, eventos, escribir, enviar } = await abrir();
    const toast = TestBed.inject(ToastService);
    escribir('pago-monto', '500');
    escribir('pago-operacion', '  OP-123  ');
    escribir('pago-nota', '');

    await enviar();

    const peticion = control.expectOne({ method: 'POST', url: '/api/pagos' });
    expect(peticion.request.body).toMatchObject({ idCronogramaPago: 77, idMedioPago: 1, monto: 500, nroOperacion: 'OP-123', observacion: null });
    peticion.flush({ id: 9, monto: 500 });

    expect(eventos.registrado).toHaveLength(1);
    expect(toast.avisos().some((a) => a.tipo === 'ok' && a.texto.includes('500.00'))).toBe(true);
  });

  it('no permite pagar más de lo que falta y no llama al servidor', async () => {
    const { fixture, control, html, escribir, enviar } = await abrir();
    escribir('pago-monto', '1800.5');

    await enviar();
    fixture.detectChanges();

    expect(texto(html.querySelector('#pago-monto-error'))).toContain('no puede ser mayor que lo que falta pagar');
    control.expectNone('/api/pagos');
  });

  it.each(['0', '-10', ''])('rechaza el monto "%s"', async (monto) => {
    const { control, escribir, enviar } = await abrir();
    escribir('pago-monto', monto);

    await enviar();

    control.expectNone('/api/pagos');
  });

  it('no permite una fecha futura', async () => {
    const { fixture, control, html, escribir, enviar } = await abrir();
    escribir('pago-fecha', '2999-01-01');

    await enviar();
    fixture.detectChanges();

    expect(texto(html.querySelector('#pago-fecha-error'))).toContain('no puede ser futura');
    control.expectNone('/api/pagos');
  });

  it('si el servidor rechaza el pago muestra el motivo y deja corregir sin cerrar la ventana', async () => {
    const { fixture, control, html, eventos, enviar } = await abrir();

    await enviar();
    control.expectOne('/api/pagos').flush(
      { detail: 'La cuota ya está pagada por completo.' }, { status: 400, statusText: 'Bad Request' }
    );
    fixture.detectChanges();

    expect(texto(html.querySelector('.caja.peligro'))).toContain('La cuota ya está pagada por completo.');
    expect(eventos.registrado).toHaveLength(0);
    expect(html.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(false);
  });

  it('se puede cancelar', async () => {
    const { html, eventos } = await abrir();

    [...html.querySelectorAll<HTMLButtonElement>('button')].find((b) => texto(b) === 'Cancelar')!.click();

    expect(eventos.cancelado).toBe(1);
  });

  it('sin cuota primero pide elegir contrato y cuota, y no muestra el pago hasta entonces', async () => {
    const { fixture, control, html } = await abrir(null);
    expect(html.querySelector('#pago-contrato')).not.toBeNull();
    expect(html.querySelector('#pago-monto')).toBeNull();
    expect(html.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(true);

    // se elige un contrato: aparecen solo las cuotas con saldo, de la más antigua a la más reciente
    fixture.componentInstance['contratos'].set([{ id: 4, codigo: 'CON-2026-0004', cliente: 'José', local: 'LOC-004', estado: 'VIG' } as never]);
    fixture.detectChanges();
    const selector = html.querySelector<HTMLSelectElement>('#pago-contrato')!;
    selector.value = '4';
    selector.dispatchEvent(new Event('change'));
    control.expectOne('/api/contratos/4/cronograma').flush([
      { id: 12, nroCuota: 2, concepto: 'ALQ', fechaVencimiento: '2026-11-05T00:00:00', monto: 1500, pagado: 0, saldo: 1500, estado: 'PEN' },
      { id: 11, nroCuota: 1, concepto: 'ALQ', fechaVencimiento: '2026-10-05T00:00:00', monto: 1500, pagado: 1500, saldo: 0, estado: 'PAG' },
      { id: 10, nroCuota: 0, concepto: 'MAN', fechaVencimiento: '2026-09-05T00:00:00', monto: 100, pagado: 0, saldo: 100, estado: 'PEN' }
    ]);
    await fixture.whenStable();
    fixture.detectChanges();

    const opciones = [...html.querySelectorAll<HTMLOptionElement>('#pago-cuota option')].map((o) => texto(o)).slice(1);
    expect(opciones).toHaveLength(2); // la cuota ya pagada no aparece
    expect(opciones[0]).toContain('Mantenimiento'); // la más antigua primero
    expect(opciones[1]).toContain('Alquiler');
  });
});
