import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { mensajeDeError } from '../../core/api/api.utils';
import { Paginado, Pago } from '../../core/api/modelos';
import { PagosApi } from '../../core/api/pagos.api';
import { AuthService } from '../../core/auth/auth.service';
import { ConceptoPipe, DineroPipe, FechaPipe } from '../../shared/formato';
import { Icono } from '../../shared/icono/icono';
import { Paginacion } from '../../shared/paginacion/paginacion';
import { Vacio } from '../../shared/vacio/vacio';
import { AnularPagoDialogo } from './anular-pago-dialogo';
import { PagoDialogo } from './pago-dialogo';

const TAMANO_PAGINA = 15;

@Component({
  selector: 'gc-pagos-lista',
  imports: [ReactiveFormsModule, RouterLink, Icono, Paginacion, Vacio, DineroPipe, FechaPipe, ConceptoPipe, PagoDialogo, AnularPagoDialogo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pagina">
      <header class="pagina-cabecera">
        <div>
          <h1>Pagos</h1>
          <p>Todos los pagos recibidos. Para registrar uno nuevo, elija el contrato y la cuota que se está pagando.</p>
        </div>
        <button type="button" class="btn btn-primario" (click)="registrando.set(true)"><gc-icono nombre="mas" [tamano]="18" />Registrar un pago</button>
      </header>

      <div class="tarjeta">
        <div class="barra-filtros">
          <div class="campo buscar">
            <label for="buscar-pago">Buscar</label>
            <input id="buscar-pago" type="search" [formControl]="texto" placeholder="Contrato, cliente o número de operación" autocomplete="off" />
          </div>
          <div class="campo">
            <label for="f-desde">Desde</label>
            <input id="f-desde" type="date" [formControl]="desde" />
          </div>
          <div class="campo">
            <label for="f-hasta">Hasta</label>
            <input id="f-hasta" type="date" [formControl]="hasta" />
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
            <gc-vacio icono="pago" [titulo]="hayFiltros() ? 'No hay pagos con esos filtros' : 'Todavía no hay pagos registrados'"
                      [texto]="hayFiltros() ? 'Pruebe con otras fechas o con otra búsqueda.' : 'Cuando registre el primer pago aparecerá aquí.'">
              @if (hayFiltros()) {
                <button type="button" class="btn btn-secundario" (click)="limpiar()">Quitar filtros</button>
              } @else {
                <button type="button" class="btn btn-primario" (click)="registrando.set(true)"><gc-icono nombre="mas" [tamano]="18" />Registrar un pago</button>
              }
            </gc-vacio>
          } @else {
            <div class="tabla-envoltorio">
              <table class="tabla tabla-tarjetas">
                <thead><tr><th>Fecha</th><th>Contrato</th><th>Cliente</th><th>Cuota</th><th>Medio</th><th>Operación</th><th class="num">Monto</th><th><span class="sr-only">Acciones</span></th></tr></thead>
                <tbody>
                  @for (p of d.items; track p.id) {
                    <tr>
                      <td data-label="Fecha">{{ p.fechaPago | fecha }}</td>
                      <td data-label="Contrato"><a [routerLink]="['/contratos', p.idContrato]"><strong>{{ p.codigoContrato }}</strong></a></td>
                      <td data-label="Cliente">{{ p.cliente }}</td>
                      <td data-label="Cuota">{{ p.concepto | concepto }} #{{ p.nroCuota }}</td>
                      <td data-label="Medio">{{ p.medioPago }}</td>
                      <td data-label="Operación">{{ p.nroOperacion || '—' }}</td>
                      <td data-label="Monto" class="num"><strong>{{ p.monto | dinero }}</strong></td>
                      <td class="acciones">
                        @if (auth.esAdmin()) {
                          <button type="button" class="btn btn-fantasma btn-sm" (click)="anulando.set(p)"><gc-icono nombre="circulo-x" [tamano]="16" />Anular</button>
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
          <p class="cargando-inicial"><span class="girar"></span> Cargando pagos…</p>
        }
      </div>
    </div>

    @if (registrando()) {
      <gc-pago-dialogo (cancelar)="registrando.set(false)" (registrado)="registrando.set(false); irAPagina(1)" />
    }
    @if (anulando(); as pago) {
      <gc-anular-pago-dialogo [pago]="pago" (cancelar)="anulando.set(null)" (anulado)="anulando.set(null); cargar()" />
    }
  `,
  styles: `
    .cargando-inicial { padding: 2rem; text-align: center; color: var(--texto-suave); }
  `
})
export class PagosLista implements OnInit {
  private readonly api = inject(PagosApi);
  private readonly destruir = inject(DestroyRef);
  protected readonly auth = inject(AuthService);

  protected readonly texto = new FormControl('', { nonNullable: true });
  protected readonly desde = new FormControl('', { nonNullable: true });
  protected readonly hasta = new FormControl('', { nonNullable: true });
  protected readonly datos = signal<Paginado<Pago> | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly registrando = signal(false);
  protected readonly anulando = signal<Pago | null>(null);
  private pagina = 1;

  ngOnInit(): void {
    this.texto.valueChanges.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destruir)).subscribe(() => this.irAPagina(1));
    [this.desde, this.hasta].forEach((c) => c.valueChanges.pipe(takeUntilDestroyed(this.destruir)).subscribe(() => this.irAPagina(1)));
    this.cargar();
  }

  protected hayFiltros(): boolean {
    return !!this.texto.value || !!this.desde.value || !!this.hasta.value;
  }

  protected limpiar(): void {
    this.texto.setValue('', { emitEvent: false });
    this.desde.setValue('', { emitEvent: false });
    this.hasta.setValue('', { emitEvent: false });
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
      texto: this.texto.value.trim(), desde: this.desde.value || null, hasta: this.hasta.value || null,
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
