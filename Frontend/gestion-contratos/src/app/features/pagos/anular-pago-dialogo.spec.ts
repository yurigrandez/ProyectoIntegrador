import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Pago } from '../../core/api/modelos';
import { ToastService } from '../../core/ui/toast.service';
import { AnularPagoDialogo } from './anular-pago-dialogo';

const texto = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

const pago = { id: 9, monto: 1000, fechaPago: '2026-10-12T00:00:00', codigoContrato: 'CON-2026-0012' } as Pago;

async function abrir() {
  TestBed.configureTestingModule({ imports: [AnularPagoDialogo], providers: [provideHttpClient(), provideHttpClientTesting()] });
  const control = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(AnularPagoDialogo);
  fixture.componentRef.setInput('pago', pago);
  const eventos = { anulado: 0, cancelado: 0 };
  fixture.componentInstance.anulado.subscribe(() => eventos.anulado++);
  fixture.componentInstance.cancelar.subscribe(() => eventos.cancelado++);
  fixture.detectChanges();
  await fixture.whenStable();
  const html = fixture.nativeElement as HTMLElement;
  const escribirMotivo = (valor: string) => {
    const campo = html.querySelector<HTMLTextAreaElement>('#motivo-anulacion')!;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
  };
  /** Envía el formulario como lo hace el navegador y devuelve si el envío nativo (que recarga la página) fue evitado. */
  const enviar = async () => {
    const envio = new Event('submit', { cancelable: true, bubbles: true });
    html.querySelector<HTMLFormElement>('form')!.dispatchEvent(envio);
    await fixture.whenStable();
    fixture.detectChanges();
    return envio.defaultPrevented;
  };
  return { fixture, control, html, eventos, escribirMotivo, enviar };
}

describe('AnularPagoDialogo', () => {
  it('explica qué se va a anular', async () => {
    const { html } = await abrir();

    const aviso = texto(html.querySelector('.caja.aviso'));
    expect(aviso).toContain('1,000.00');
    expect(aviso).toContain('12/10/2026');
    expect(aviso).toContain('CON-2026-0012');
  });

  it('al enviar NUNCA deja que el navegador recargue la página', async () => {
    const { enviar } = await abrir();

    expect(await enviar()).toBe(true);
  });

  it('sin motivo no llama al servidor y avisa', async () => {
    const { fixture, control, html, enviar } = await abrir();

    await enviar();
    fixture.detectChanges();

    expect(texto(html.querySelector('#motivo-anulacion-error'))).toBe('Este dato es obligatorio.');
    control.expectNone('/api/pagos/9/anular');
  });

  it('con motivo anula el pago, avisa y cierra', async () => {
    const { control, eventos, escribirMotivo, enviar } = await abrir();
    const toast = TestBed.inject(ToastService);
    escribirMotivo('  Se registró dos veces  ');

    await enviar();
    const peticion = control.expectOne({ method: 'POST', url: '/api/pagos/9/anular' });
    expect(peticion.request.body).toEqual({ motivo: 'Se registró dos veces' }); // sin espacios sobrantes
    peticion.flush(null, { status: 204, statusText: 'No Content' });

    expect(eventos.anulado).toBe(1);
    expect(toast.avisos().some((a) => a.texto === 'Pago anulado.')).toBe(true);
  });

  it('si el servidor lo rechaza muestra el motivo y permite reintentar', async () => {
    const { fixture, control, html, eventos, escribirMotivo, enviar } = await abrir();
    escribirMotivo('Error de monto');

    await enviar();
    control.expectOne('/api/pagos/9/anular').flush(
      { detail: 'El pago ya está asociado a un comprobante y no se puede anular.' }, { status: 400, statusText: 'Bad Request' }
    );
    fixture.detectChanges();

    expect(texto(html.querySelector('.caja.peligro'))).toContain('asociado a un comprobante');
    expect(eventos.anulado).toBe(0);
    expect(html.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(false);
  });

  it('se puede cancelar sin anular nada', async () => {
    const { control, html, eventos } = await abrir();

    [...html.querySelectorAll<HTMLButtonElement>('button')].find((b) => texto(b) === 'No anular')!.click();

    expect(eventos.cancelado).toBe(1);
    control.expectNone('/api/pagos/9/anular');
  });
});
