import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { mensajeDeError } from '../../core/api/api.utils';
import { CatalogosApi } from '../../core/api/catalogos.api';
import { ClientesApi } from '../../core/api/clientes.api';
import { CatalogoItem, Cliente, Paginado } from '../../core/api/modelos';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { nombreDeCliente } from '../../shared/formato';
import { Icono } from '../../shared/icono/icono';
import { Paginacion } from '../../shared/paginacion/paginacion';
import { Vacio } from '../../shared/vacio/vacio';

const TAMANO_PAGINA = 15;

@Component({
  selector: 'gc-clientes-lista',
  imports: [ReactiveFormsModule, RouterLink, Icono, Paginacion, Vacio],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pagina">
      <header class="pagina-cabecera">
        <div>
          <h1>Clientes</h1>
          <p>Las personas y empresas que alquilan sus locales. Búsquelos por nombre, código o número de documento.</p>
        </div>
        <a class="btn btn-primario" routerLink="/clientes/nuevo"><gc-icono nombre="mas" [tamano]="18" />Nuevo cliente</a>
      </header>

      <div class="tarjeta">
        <div class="barra-filtros">
          <div class="campo buscar">
            <label for="buscar-cliente">Buscar</label>
            <input id="buscar-cliente" type="search" [formControl]="texto" placeholder="Nombre, código o documento" autocomplete="off" />
          </div>
          <div class="campo">
            <label for="filtro-documento">Tipo de documento</label>
            <select id="filtro-documento" [formControl]="tipoDocumento">
              <option [ngValue]="null">Todos</option>
              @for (t of tiposDocumento(); track t.id) { <option [ngValue]="t.id">{{ t.nombre }}</option> }
            </select>
          </div>
        </div>
      </div>

      @if (error()) {
        <div class="caja peligro" role="alert"><gc-icono nombre="circulo-x" [tamano]="20" /><div><strong>No se pudo cargar la lista</strong>{{ error() }}
          <button type="button" class="btn btn-secundario btn-sm" (click)="cargar()">Reintentar</button></div></div>
      }

      <div class="tarjeta tarjeta-plana" [class.cargando]="cargando()">
        @if (datos(); as d) {
          @if (d.items.length === 0) {
            <gc-vacio icono="usuarios" [titulo]="hayFiltros() ? 'No hay clientes con esa búsqueda' : 'Todavía no hay clientes'"
                      [texto]="hayFiltros() ? 'Pruebe con otro nombre o quite los filtros.' : 'Registre a su primer cliente para poder crear contratos.'">
              @if (hayFiltros()) {
                <button type="button" class="btn btn-secundario" (click)="limpiar()">Quitar filtros</button>
              } @else {
                <a class="btn btn-primario" routerLink="/clientes/nuevo"><gc-icono nombre="mas" [tamano]="18" />Registrar cliente</a>
              }
            </gc-vacio>
          } @else {
            <div class="tabla-envoltorio">
              <table class="tabla tabla-tarjetas">
                <thead><tr><th>Código</th><th>Cliente</th><th>Documento</th><th>Contacto</th><th><span class="sr-only">Acciones</span></th></tr></thead>
                <tbody>
                  @for (c of d.items; track c.id) {
                    <tr>
                      <td data-label="Código"><strong>{{ c.codigo }}</strong></td>
                      <td data-label="Cliente">{{ nombre(c) }}</td>
                      <td data-label="Documento">{{ c.tipoDocumento }} {{ c.numeroDocumento }}</td>
                      <td data-label="Contacto">{{ c.telefono || c.correo || '—' }}</td>
                      <td class="acciones">
                        <a class="btn btn-fantasma btn-sm" [routerLink]="['/contratos']" [queryParams]="{ idCliente: c.id }"><gc-icono nombre="contrato" [tamano]="16" />Contratos</a>
                        <a class="btn btn-secundario btn-sm" [routerLink]="['/clientes', c.id, 'editar']"><gc-icono nombre="editar" [tamano]="16" />Editar</a>
                        @if (auth.esAdmin()) {
                          <button type="button" class="btn btn-fantasma btn-sm" (click)="desactivar(c)" [attr.aria-label]="'Eliminar a ' + nombre(c)">
                            <gc-icono nombre="papelera" [tamano]="16" />
                          </button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <gc-paginacion [pagina]="d.pagina" [tamano]="d.tamano" [total]="d.total" (cambiar)="irAPagina($event)" />
          }
        } @else if (cargando()) {
          <p class="cargando-inicial"><span class="girar"></span> Cargando clientes…</p>
        }
      </div>
    </div>
  `,
  styles: `
    .cargando-inicial { padding: 2rem; text-align: center; color: var(--texto-suave); }
  `
})
export class ClientesLista implements OnInit {
  private readonly api = inject(ClientesApi);
  private readonly catalogos = inject(CatalogosApi);
  private readonly confirmar = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly destruir = inject(DestroyRef);
  protected readonly auth = inject(AuthService);

  protected readonly texto = new FormControl('', { nonNullable: true });
  protected readonly tipoDocumento = new FormControl<number | null>(null);
  protected readonly tiposDocumento = signal<CatalogoItem[]>([]);
  protected readonly datos = signal<Paginado<Cliente> | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  private pagina = 1;

  protected nombre = nombreDeCliente;

  ngOnInit(): void {
    this.catalogos.listar('tipos-documento').subscribe((t) => this.tiposDocumento.set(t));
    this.texto.valueChanges.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destruir)).subscribe(() => this.irAPagina(1));
    this.tipoDocumento.valueChanges.pipe(takeUntilDestroyed(this.destruir)).subscribe(() => this.irAPagina(1));
    this.cargar();
  }

  protected hayFiltros(): boolean {
    return !!this.texto.value || this.tipoDocumento.value !== null;
  }

  protected limpiar(): void {
    this.texto.setValue('', { emitEvent: false });
    this.tipoDocumento.setValue(null, { emitEvent: false });
    this.irAPagina(1);
  }

  protected irAPagina(pagina: number): void {
    this.pagina = pagina;
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.api.listar({ texto: this.texto.value.trim(), idTipoDocumento: this.tipoDocumento.value, pagina: this.pagina, tamano: TAMANO_PAGINA }).subscribe({
      next: (d) => {
        this.datos.set(d);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      }
    });
  }

  protected async desactivar(cliente: Cliente): Promise<void> {
    const confirmado = await this.confirmar.confirmar({
      titulo: 'Eliminar cliente',
      mensaje: `¿Eliminar a ${nombreDeCliente(cliente)}? Dejará de aparecer en las listas. No se puede eliminar si tiene contratos vigentes o en borrador.`,
      textoConfirmar: 'Sí, eliminar',
      peligro: true
    });
    if (!confirmado) return;
    this.api.desactivar(cliente.id).subscribe({
      next: () => {
        this.toast.ok('Cliente eliminado.');
        this.cargar();
      },
      error: (e: unknown) => this.toast.error(mensajeDeError(e))
    });
  }
}
