import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { mensajeDeError } from '../../core/api/api.utils';
import { CatalogosApi } from '../../core/api/catalogos.api';
import { EmpresasApi } from '../../core/api/empresas.api';
import { LocalesApi } from '../../core/api/locales.api';
import { CatalogoItem, Empresa, Local, Paginado } from '../../core/api/modelos';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { Estado } from '../../shared/estado/estado';
import { Icono } from '../../shared/icono/icono';
import { Paginacion } from '../../shared/paginacion/paginacion';
import { Vacio } from '../../shared/vacio/vacio';

const TAMANO_PAGINA = 15;

@Component({
  selector: 'gc-locales-lista',
  imports: [ReactiveFormsModule, RouterLink, Icono, Paginacion, Vacio, Estado],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pagina">
      <header class="pagina-cabecera">
        <div>
          <h1>Locales</h1>
          <p>Los locales comerciales que se alquilan. El estado <strong>Ocupado</strong> se pone solo cuando hay un contrato vigente.</p>
        </div>
        @if (auth.esAdmin()) {
          <a class="btn btn-primario" routerLink="/locales/nuevo"><gc-icono nombre="mas" [tamano]="18" />Nuevo local</a>
        }
      </header>

      @if (!auth.esAdmin()) {
        <div class="caja info"><gc-icono nombre="info" [tamano]="20" /><div><strong>Solo consulta</strong>Los locales los crea y modifica un administrador.</div></div>
      }

      <div class="tarjeta">
        <div class="barra-filtros">
          <div class="campo buscar">
            <label for="buscar-local">Buscar</label>
            <input id="buscar-local" type="search" [formControl]="texto" placeholder="Código o dirección" autocomplete="off" />
          </div>
          <div class="campo">
            <label for="f-empresa">Empresa</label>
            <select id="f-empresa" [formControl]="empresa">
              <option [ngValue]="null">Todas</option>
              @for (e of empresas(); track e.id) { <option [ngValue]="e.id">{{ e.nombre }}</option> }
            </select>
          </div>
          <div class="campo">
            <label for="f-tipo">Tipo</label>
            <select id="f-tipo" [formControl]="tipo">
              <option [ngValue]="null">Todos</option>
              @for (t of tipos(); track t.id) { <option [ngValue]="t.id">{{ t.nombre }}</option> }
            </select>
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
            <gc-vacio icono="tienda" [titulo]="hayFiltros() ? 'No hay locales con esos filtros' : 'Todavía no hay locales'"
                      [texto]="hayFiltros() ? 'Pruebe con otros filtros.' : 'Un administrador debe registrar el primer local.'">
              @if (hayFiltros()) {
                <button type="button" class="btn btn-secundario" (click)="limpiar()">Quitar filtros</button>
              } @else if (auth.esAdmin()) {
                <a class="btn btn-primario" routerLink="/locales/nuevo"><gc-icono nombre="mas" [tamano]="18" />Registrar local</a>
              }
            </gc-vacio>
          } @else {
            <div class="tabla-envoltorio">
              <table class="tabla tabla-tarjetas">
                <thead><tr><th>Código</th><th>Dirección</th><th>Tipo</th><th>Empresa</th><th class="num">Superficie</th><th>Estado</th><th><span class="sr-only">Acciones</span></th></tr></thead>
                <tbody>
                  @for (l of d.items; track l.id) {
                    <tr>
                      <td data-label="Código"><strong>{{ l.codigo }}</strong></td>
                      <td data-label="Dirección">{{ l.direccion || '—' }}@if (l.interior) { <span class="suave"> · Int. {{ l.interior }}</span> }</td>
                      <td data-label="Tipo">{{ nombreTipo(l) }}</td>
                      <td data-label="Empresa">{{ l.empresa }}</td>
                      <td data-label="Superficie" class="num">{{ l.totalM2 ? l.totalM2 + ' m²' : '—' }}</td>
                      <td data-label="Estado"><gc-estado tipo="local" [valor]="l.estado" /></td>
                      <td class="acciones">
                        <a class="btn btn-fantasma btn-sm" routerLink="/contratos" [queryParams]="{ idLocal: l.id }"><gc-icono nombre="contrato" [tamano]="16" />Contratos</a>
                        @if (auth.esAdmin()) {
                          <a class="btn btn-secundario btn-sm" [routerLink]="['/locales', l.id, 'editar']"><gc-icono nombre="editar" [tamano]="16" />Editar</a>
                          <button type="button" class="btn btn-fantasma btn-sm" (click)="desactivar(l)" [attr.aria-label]="'Eliminar el local ' + l.codigo">
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
          <p class="cargando-inicial"><span class="girar"></span> Cargando locales…</p>
        }
      </div>
    </div>
  `,
  styles: `
    .cargando-inicial { padding: 2rem; text-align: center; color: var(--texto-suave); }
  `
})
export class LocalesLista implements OnInit {
  private readonly api = inject(LocalesApi);
  private readonly empresasApi = inject(EmpresasApi);
  private readonly catalogos = inject(CatalogosApi);
  private readonly confirmar = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destruir = inject(DestroyRef);
  protected readonly auth = inject(AuthService);

  /** Filtro que llega por la dirección (por ejemplo desde la lista de empresas). */
  readonly idEmpresa = input<string>();

  protected readonly texto = new FormControl('', { nonNullable: true });
  protected readonly empresa = new FormControl<number | null>(null);
  protected readonly tipo = new FormControl<number | null>(null);
  protected readonly estado = new FormControl<number | null>(null);
  protected readonly empresas = signal<Empresa[]>([]);
  protected readonly tipos = signal<CatalogoItem[]>([]);
  protected readonly estados = signal<CatalogoItem[]>([]);
  protected readonly datos = signal<Paginado<Local> | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  private pagina = 1;

  ngOnInit(): void {
    this.empresasApi.listar({ tamano: 100 }).subscribe((r) => this.empresas.set(r.items));
    this.catalogos.listar('tipos-local').subscribe((t) => this.tipos.set(t));
    this.catalogos.listar('estados').subscribe((e) => this.estados.set(e.filter((x) => ['DIS', 'OCU', 'MAN'].includes(x.abreviatura))));

    const inicial = Number(this.idEmpresa());
    if (inicial) this.empresa.setValue(inicial, { emitEvent: false });

    this.texto.valueChanges.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destruir)).subscribe(() => this.irAPagina(1));
    [this.empresa, this.tipo, this.estado].forEach((c) => c.valueChanges.pipe(takeUntilDestroyed(this.destruir)).subscribe(() => this.irAPagina(1)));
    this.cargar();
  }

  protected nombreTipo(l: Local): string {
    return this.tipos().find((t) => t.id === l.idTipoLocal)?.nombre ?? l.tipoLocal ?? '—';
  }

  protected hayFiltros(): boolean {
    return !!this.texto.value || this.empresa.value !== null || this.tipo.value !== null || this.estado.value !== null;
  }

  protected limpiar(): void {
    this.texto.setValue('', { emitEvent: false });
    this.empresa.setValue(null, { emitEvent: false });
    this.tipo.setValue(null, { emitEvent: false });
    this.estado.setValue(null, { emitEvent: false });
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
      texto: this.texto.value.trim(), idEmpresa: this.empresa.value, idTipoLocal: this.tipo.value, idEstado: this.estado.value,
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

  protected async desactivar(local: Local): Promise<void> {
    const confirmado = await this.confirmar.confirmar({
      titulo: 'Eliminar local',
      mensaje: `¿Eliminar el local ${local.codigo}? No se puede eliminar si tiene contratos vigentes o en borrador.`,
      textoConfirmar: 'Sí, eliminar',
      peligro: true
    });
    if (!confirmado) return;
    this.api.desactivar(local.id).subscribe({
      next: () => {
        this.toast.ok('Local eliminado.');
        this.cargar();
      },
      error: (e: unknown) => this.toast.error(mensajeDeError(e))
    });
  }
}
