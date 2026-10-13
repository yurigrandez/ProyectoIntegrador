import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { mensajeDeError } from '../../core/api/api.utils';
import { CatalogosApi } from '../../core/api/catalogos.api';
import { ClientesApi } from '../../core/api/clientes.api';
import { ContratosApi } from '../../core/api/contratos.api';
import { LocalesApi } from '../../core/api/locales.api';
import { CatalogoItem, Contrato, Paginado } from '../../core/api/modelos';
import { Estado } from '../../shared/estado/estado';
import { DineroPipe, FechaPipe, nombreDeCliente } from '../../shared/formato';
import { Icono } from '../../shared/icono/icono';
import { Paginacion } from '../../shared/paginacion/paginacion';
import { Vacio } from '../../shared/vacio/vacio';

const TAMANO_PAGINA = 15;

@Component({
  selector: 'gc-contratos-lista',
  imports: [ReactiveFormsModule, RouterLink, Icono, Paginacion, Vacio, Estado, DineroPipe, FechaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pagina">
      <header class="pagina-cabecera">
        <div>
          <h1>Contratos</h1>
          <p>Todos los contratos de alquiler. Entre a uno para ver sus cuotas, registrar pagos o autorizarlo.</p>
        </div>
        <a class="btn btn-primario" routerLink="/contratos/nuevo"><gc-icono nombre="mas" [tamano]="18" />Nuevo contrato</a>
      </header>

      @if (filtroPor()) {
        <div class="caja info">
          <gc-icono nombre="info" [tamano]="20" />
          <div class="crece"><strong>Mostrando solo los contratos {{ filtroPor() }}</strong></div>
          <button type="button" class="btn btn-secundario btn-sm" (click)="quitarFiltroExterno()">Ver todos</button>
        </div>
      }

      <div class="tarjeta">
        <div class="barra-filtros">
          <div class="campo buscar">
            <label for="buscar-contrato">Buscar</label>
            <input id="buscar-contrato" type="search" [formControl]="texto" placeholder="Código, cliente o local" autocomplete="off" />
          </div>
          <div class="campo">
            <label for="f-estado">Estado</label>
            <select id="f-estado" [formControl]="estado">
              <option [ngValue]="null">Todos</option>
              @for (e of estados(); track e.id) { <option [ngValue]="e.id">{{ e.nombre }}</option> }
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
            <gc-vacio icono="contrato" [titulo]="hayFiltros() ? 'No hay contratos con esos filtros' : 'Todavía no hay contratos'"
                      [texto]="hayFiltros() ? 'Pruebe con otra búsqueda o quite los filtros.' : 'Cree el primer contrato para empezar a controlar los cobros.'">
              @if (hayFiltros()) {
                <button type="button" class="btn btn-secundario" (click)="limpiar()">Quitar filtros</button>
              } @else {
                <a class="btn btn-primario" routerLink="/contratos/nuevo"><gc-icono nombre="mas" [tamano]="18" />Crear contrato</a>
              }
            </gc-vacio>
          } @else {
            <div class="tabla-envoltorio">
              <table class="tabla tabla-tarjetas">
                <thead><tr><th>Contrato</th><th>Cliente</th><th>Local</th><th>Vigencia</th><th class="num">Pago mensual</th><th>Estado</th><th><span class="sr-only">Acciones</span></th></tr></thead>
                <tbody>
                  @for (c of d.items; track c.id) {
                    <tr>
                      <td data-label="Contrato"><a [routerLink]="['/contratos', c.id]"><strong>{{ c.codigo }}</strong></a></td>
                      <td data-label="Cliente">{{ c.cliente }}</td>
                      <td data-label="Local">{{ c.local }}</td>
                      <td data-label="Vigencia">{{ c.fechaInicio | fecha }} al {{ c.fechaFin | fecha }}</td>
                      <td data-label="Pago mensual" class="num">{{ c.montoMensual | dinero }}</td>
                      <td data-label="Estado"><gc-estado tipo="contrato" [valor]="c.estado" /></td>
                      <td class="acciones"><a class="btn btn-secundario btn-sm" [routerLink]="['/contratos', c.id]"><gc-icono nombre="ojo" [tamano]="16" />Ver</a></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <gc-paginacion [pagina]="d.pagina" [tamano]="d.tamano" [total]="d.total" (cambiar)="irAPagina($event)" />
          }
        } @else if (cargando()) {
          <p class="cargando-inicial"><span class="girar"></span> Cargando contratos…</p>
        }
      </div>
    </div>
  `,
  styles: `
    .cargando-inicial { padding: 2rem; text-align: center; color: var(--texto-suave); }
  `
})
export class ContratosLista implements OnInit {
  private readonly api = inject(ContratosApi);
  private readonly clientes = inject(ClientesApi);
  private readonly locales = inject(LocalesApi);
  private readonly catalogos = inject(CatalogosApi);
  private readonly router = inject(Router);
  private readonly destruir = inject(DestroyRef);

  /** Filtros que llegan por la dirección (desde las listas de clientes y locales). */
  readonly idCliente = input<string>();
  readonly idLocal = input<string>();

  protected readonly texto = new FormControl('', { nonNullable: true });
  protected readonly estado = new FormControl<number | null>(null);
  protected readonly estados = signal<CatalogoItem[]>([]);
  protected readonly datos = signal<Paginado<Contrato> | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly filtroPor = signal<string | null>(null);
  private pagina = 1;
  private cliente: number | null = null;
  private local: number | null = null;

  ngOnInit(): void {
    this.catalogos.listar('estados').subscribe((e) => this.estados.set(e.filter((x) => ['BOR', 'VIG', 'VEN', 'RES'].includes(x.abreviatura))));

    this.cliente = Number(this.idCliente()) || null;
    this.local = Number(this.idLocal()) || null;
    if (this.cliente) {
      this.clientes.obtener(this.cliente).subscribe((c) => this.filtroPor.set(`del cliente ${nombreDeCliente(c)}`));
    } else if (this.local) {
      this.locales.obtener(this.local).subscribe((l) => this.filtroPor.set(`del local ${l.codigo}`));
    }

    this.texto.valueChanges.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destruir)).subscribe(() => this.irAPagina(1));
    this.estado.valueChanges.pipe(takeUntilDestroyed(this.destruir)).subscribe(() => this.irAPagina(1));
    this.cargar();
  }

  protected hayFiltros(): boolean {
    return !!this.texto.value || this.estado.value !== null;
  }

  protected limpiar(): void {
    this.texto.setValue('', { emitEvent: false });
    this.estado.setValue(null, { emitEvent: false });
    this.irAPagina(1);
  }

  protected quitarFiltroExterno(): void {
    this.cliente = null;
    this.local = null;
    this.filtroPor.set(null);
    void this.router.navigate([], { queryParams: {} });
    this.irAPagina(1);
  }

  protected irAPagina(pagina: number): void {
    this.pagina = pagina;
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.api.listar({
      texto: this.texto.value.trim(), idEstado: this.estado.value, idCliente: this.cliente, idLocal: this.local,
      pagina: this.pagina, tamano: TAMANO_PAGINA
    }).subscribe({
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
}
