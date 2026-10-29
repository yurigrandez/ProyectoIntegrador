import { Type } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ClienteForm } from './clientes/cliente-form';
import { EmpresaForm } from './empresas/empresa-form';
import { LocalForm } from './locales/local-form';

/** El código de empresas, locales y clientes lo asigna el sistema: el campo se ve siempre y no se puede editar. */
const lista = <T>(items: T[]) => ({ items, total: items.length, pagina: 1, tamano: 100, totalPaginas: 1 });

const formularios = [
  { nombre: 'empresa', componente: EmpresaForm, url: '/api/empresas', existente: { id: 5, codigo: 'EMP-0007', nombre: 'Andina', ruc: '20512345678' } },
  { nombre: 'local', componente: LocalForm, url: '/api/locales', existente: { id: 5, codigo: 'LOC-0012', idEmpresa: 1, idTipoLocal: 1, estado: 'DIS' } },
  { nombre: 'cliente', componente: ClienteForm, url: '/api/clientes', existente: { id: 5, codigo: 'CLI-0031', nombre: 'Ana', idTipoDocumento: 1, numeroDocumento: '12345678' } }
] as const;

async function abrir(componente: Type<unknown>, url: string, existente?: object) {
  TestBed.configureTestingModule({ imports: [componente], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
  const control = TestBed.inject(HttpTestingController);
  const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(componente);
  if (existente) fixture.componentRef.setInput('id', '5');
  fixture.detectChanges();

  // Responde a lo que pide el formulario al abrirse: catálogos y empresas vacíos, y la ficha si es edición.
  for (const peticion of control.match(() => true)) {
    if (peticion.request.url === `${url}/5`) peticion.flush(existente ?? null);
    else if (peticion.request.url.startsWith('/api/catalogos')) peticion.flush([]);
    else peticion.flush(lista([]));
  }
  await fixture.whenStable();
  fixture.detectChanges();
  const html = fixture.nativeElement as HTMLElement;
  return { fixture, control, html, navegar, codigo: html.querySelector<HTMLInputElement>('#codigo') };
}

describe.each(formularios)('código automático del formulario de $nombre', ({ componente, url, existente }) => {
  it('al crear muestra el campo del código vacío y no editable', async () => {
    const { codigo } = await abrir(componente, url);

    expect(codigo).not.toBeNull();
    expect(codigo!.value).toBe('');
    expect(codigo!.disabled).toBe(true);
    expect(codigo!.placeholder).toBe('Se genera al guardar');
  });

  it('al editar muestra el código asignado y no editable', async () => {
    const { codigo } = await abrir(componente, url, existente);

    expect(codigo!.value).toBe(existente.codigo);
    expect(codigo!.disabled).toBe(true);
  });

  it('indica que el código lo asigna el sistema', async () => {
    const { html } = await abrir(componente, url);

    expect((html.textContent ?? '').replace(/\s+/g, ' ')).toContain('Lo asigna el sistema al guardar el registro');
  });
});

describe('alta de empresa', () => {
  it('no envía código y muestra el que asignó el sistema', async () => {
    const { fixture, control, html, navegar } = await abrir(EmpresaForm, '/api/empresas');
    const escribir = (campo: string, valor: string) => {
      const el = html.querySelector<HTMLInputElement>(`#${campo}`)!;
      el.value = valor;
      el.dispatchEvent(new Event('input'));
    };
    escribir('ruc', '20512345678');
    escribir('nombre', 'Inversiones Andina S.A.C.');

    html.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    const peticion: TestRequest = control.expectOne((r) => r.method === 'POST' && r.url === '/api/empresas');
    peticion.flush({ id: 9, codigo: 'EMP-0009', nombre: 'Inversiones Andina S.A.C.', ruc: '20512345678' });
    await fixture.whenStable();

    expect('codigo' in peticion.request.body).toBe(false);
    expect(navegar).toHaveBeenCalledWith(['/empresas']);
  });
});
