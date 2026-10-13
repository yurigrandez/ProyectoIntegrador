import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Cliente, Paginado } from '../../core/api/modelos';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { ClientesLista } from './clientes-lista';

const texto = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

const cliente = (id: number, nombre: string, paterno: string | null = null): Cliente => ({
  id, codigo: `CLI-${String(id).padStart(3, '0')}`, nombre, paterno, materno: null, idTipoDocumento: 1, tipoDocumento: 'DNI',
  numeroDocumento: `4000000${id}`, correo: null, direccion: null, telefono: '987654321', idTipoComprobante: null, tipoComprobante: null, fechaCreacion: null
});
const pagina = (items: Cliente[], total = items.length): Paginado<Cliente> => ({ items, total, pagina: 1, tamano: 15, totalPaginas: 1 });

const sesion = (rol: string) =>
  sessionStorage.setItem('gc.sesion', JSON.stringify({
    token: 't', expira: new Date(Date.now() + 3_600_000).toISOString(),
    usuario: { id: 1, codigo: rol === 'ADM' ? 'ADMIN' : 'OPERADOR', nombreCompleto: 'Persona', rol }
  }));

async function abrir(rol = 'ADM') {
  sesion(rol);
  TestBed.configureTestingModule({ imports: [ClientesLista], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
  const control = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(ClientesLista);
  fixture.detectChanges();
  control.expectOne('/api/catalogos/tipos-documento').flush([{ id: 1, abreviatura: 'DNI', nombre: 'DNI' }]);
  const listado = (): TestRequest => control.expectOne((r) => r.url === '/api/clientes');
  return { fixture, control, listado, html: fixture.nativeElement as HTMLElement };
}

describe('ClientesLista', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => {
    sessionStorage.clear();
    vi.useRealTimers();
  });

  it('carga la primera página y muestra a cada cliente con su documento', async () => {
    const { fixture, listado, html } = await abrir();

    const peticion = listado();
    expect(peticion.request.params.get('pagina')).toBe('1');
    expect(peticion.request.params.get('tamano')).toBe('15');
    expect(peticion.request.params.has('texto')).toBe(false); // sin texto no se envía
    peticion.flush(pagina([cliente(1, 'José', 'Ramírez'), cliente(2, 'Panadería San Jorge')]));
    await fixture.whenStable();

    const filas = html.querySelectorAll('tbody tr');
    expect(filas).toHaveLength(2);
    expect(texto(filas[0])).toContain('CLI-001');
    expect(texto(filas[0])).toContain('José Ramírez');
    expect(texto(filas[0])).toContain('DNI 40000001');
    expect(texto(html.querySelector('.resumen'))).toBe('Mostrando 1–2 de 2');
  });

  it('busca después de una pausa al escribir y vuelve a la primera página', async () => {
    const { fixture, control, listado, html } = await abrir();
    listado().flush(pagina([cliente(1, 'José')]));
    await fixture.whenStable();
    vi.useFakeTimers();

    const campo = html.querySelector<HTMLInputElement>('#buscar-cliente')!;
    campo.value = 'ana';
    campo.dispatchEvent(new Event('input'));
    await vi.advanceTimersByTimeAsync(100);
    control.expectNone((r) => r.url === '/api/clientes'); // todavía no: espera a que termine de escribir
    await vi.advanceTimersByTimeAsync(250);

    const busqueda = listado();
    expect(busqueda.request.params.get('texto')).toBe('ana');
    expect(busqueda.request.params.get('pagina')).toBe('1');
    busqueda.flush(pagina([]));
  });

  it('cuando no hay resultados explica qué hacer según haya o no filtros', async () => {
    const { fixture, listado, html } = await abrir();

    listado().flush(pagina([]));
    await fixture.whenStable();

    expect(texto(html.querySelector('gc-vacio'))).toContain('Todavía no hay clientes');
    expect(texto(html.querySelector('gc-vacio a'))).toContain('Registrar cliente');
  });

  it('si la carga falla muestra el motivo y permite reintentar', async () => {
    const { fixture, control, listado, html } = await abrir();

    listado().flush({ detail: 'x' }, { status: 500, statusText: 'Error' });
    await fixture.whenStable();
    expect(texto(html.querySelector('.caja.peligro'))).toContain('No se pudo cargar la lista');

    html.querySelector<HTMLButtonElement>('.caja.peligro button')!.click();
    control.expectOne((r) => r.url === '/api/clientes').flush(pagina([cliente(1, 'José')]));
    await fixture.whenStable();
    expect(html.querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it('el operador no ve el botón de eliminar; el administrador sí', async () => {
    const operador = await abrir('OPE');
    operador.listado().flush(pagina([cliente(1, 'José')]));
    await operador.fixture.whenStable();
    expect(operador.html.querySelector('button[aria-label^="Eliminar"]')).toBeNull();
    TestBed.resetTestingModule();
    sessionStorage.clear();

    const admin = await abrir('ADM');
    admin.listado().flush(pagina([cliente(1, 'José')]));
    await admin.fixture.whenStable();
    expect(admin.html.querySelector('button[aria-label="Eliminar a José"]')).not.toBeNull();
  });

  it('al eliminar pide confirmación y, si se acepta, borra y recarga la lista', async () => {
    const { fixture, control, listado, html } = await abrir('ADM');
    listado().flush(pagina([cliente(1, 'José')]));
    await fixture.whenStable();
    const confirmar = TestBed.inject(ConfirmService);
    const toast = TestBed.inject(ToastService);

    html.querySelector<HTMLButtonElement>('button[aria-label="Eliminar a José"]')!.click();
    expect(confirmar.pedido()?.titulo).toBe('Eliminar cliente');
    expect(confirmar.pedido()?.peligro).toBe(true);
    confirmar.responder(true);
    await fixture.whenStable();

    control.expectOne({ method: 'DELETE', url: '/api/clientes/1' }).flush(null, { status: 204, statusText: 'No Content' });
    listado().flush(pagina([]));
    expect(toast.avisos().some((a) => a.texto === 'Cliente eliminado.')).toBe(true);
  });

  it('si se cancela la confirmación no elimina nada', async () => {
    const { fixture, control, listado, html } = await abrir('ADM');
    listado().flush(pagina([cliente(1, 'José')]));
    await fixture.whenStable();

    html.querySelector<HTMLButtonElement>('button[aria-label="Eliminar a José"]')!.click();
    TestBed.inject(ConfirmService).responder(false);
    await fixture.whenStable();

    control.expectNone({ method: 'DELETE', url: '/api/clientes/1' });
  });

  it('si no se puede eliminar muestra el motivo que da el servidor', async () => {
    const { fixture, control, listado, html } = await abrir('ADM');
    listado().flush(pagina([cliente(1, 'José')]));
    await fixture.whenStable();
    const toast = TestBed.inject(ToastService);

    html.querySelector<HTMLButtonElement>('button[aria-label="Eliminar a José"]')!.click();
    TestBed.inject(ConfirmService).responder(true);
    await fixture.whenStable();
    control.expectOne({ method: 'DELETE', url: '/api/clientes/1' }).flush(
      { detail: 'No se puede desactivar un cliente con contratos borrador o vigentes.' },
      { status: 400, statusText: 'Bad Request' }
    );

    expect(toast.avisos().some((a) => a.tipo === 'error' && a.texto.includes('contratos borrador o vigentes'))).toBe(true);
  });
});
