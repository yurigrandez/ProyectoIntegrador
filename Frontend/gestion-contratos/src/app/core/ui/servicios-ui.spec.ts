import { TestBed } from '@angular/core/testing';
import { ConfirmService } from './confirm.service';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('muestra el aviso y lo quita solo pasado un tiempo', () => {
    const toast = TestBed.inject(ToastService);

    toast.ok('Guardado');
    expect(toast.avisos()).toHaveLength(1);
    expect(toast.avisos()[0]).toMatchObject({ tipo: 'ok', texto: 'Guardado' });

    vi.advanceTimersByTime(5000);
    expect(toast.avisos()).toHaveLength(0);
  });

  it('los errores duran más que los avisos de éxito para dar tiempo a leerlos', () => {
    const toast = TestBed.inject(ToastService);

    toast.error('No se pudo guardar');
    vi.advanceTimersByTime(5000);
    expect(toast.avisos()).toHaveLength(1);

    vi.advanceTimersByTime(5000);
    expect(toast.avisos()).toHaveLength(0);
  });

  it('se puede cerrar a mano y nunca acumula más de cuatro', () => {
    const toast = TestBed.inject(ToastService);
    toast.info('uno');
    const id = toast.avisos()[0].id;

    toast.cerrar(id);
    expect(toast.avisos()).toHaveLength(0);

    ['a', 'b', 'c', 'd', 'e', 'f'].forEach((t) => toast.info(t));
    expect(toast.avisos()).toHaveLength(4);
    expect(toast.avisos().map((a) => a.texto)).toEqual(['c', 'd', 'e', 'f']);
  });
});

describe('ConfirmService', () => {
  it('devuelve true cuando la persona confirma', async () => {
    const servicio = TestBed.inject(ConfirmService);

    const respuesta = servicio.confirmar({ titulo: 'Eliminar', mensaje: '¿Seguro?', peligro: true });
    expect(servicio.pedido()?.titulo).toBe('Eliminar');
    servicio.responder(true);

    await expect(respuesta).resolves.toBe(true);
    expect(servicio.pedido()).toBeNull();
  });

  it('devuelve false cuando cancela', async () => {
    const servicio = TestBed.inject(ConfirmService);

    const respuesta = servicio.confirmar({ titulo: 'Autorizar', mensaje: '¿Autorizar?' });
    servicio.responder(false);

    await expect(respuesta).resolves.toBe(false);
  });
});
