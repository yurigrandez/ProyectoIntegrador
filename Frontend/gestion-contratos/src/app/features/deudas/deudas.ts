import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { mensajeDeError } from '../../core/api/api.utils';
import { CuotaVencida, Moroso } from '../../core/api/modelos';
import { PagosApi } from '../../core/api/pagos.api';
import { cantidad, ConceptoPipe, DineroPipe, FechaPipe } from '../../shared/formato';
import { Icono } from '../../shared/icono/icono';
import { Kpi } from '../../shared/kpi/kpi';
import { Vacio } from '../../shared/vacio/vacio';
import { CuotaPorPagar, PagoDialogo } from '../pagos/pago-dialogo';

/** Quién debe y cuánto: resumen por cliente y, al elegir uno, sus cuotas vencidas con botón para cobrar. */
@Component({
  selector: 'gc-deudas',
  imports: [RouterLink, Icono, Kpi, Vacio, DineroPipe, FechaPipe, ConceptoPipe, PagoDialogo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pagina">
      <header class="pagina-cabecera">
        <div>
          <h1>Deudas vencidas</h1>
          <p>Clientes con cuotas cuya fecha de pago ya pasó y todavía no se pagaron por completo. Elija un cliente para ver sus cuotas y cobrarlas.</p>
        </div>
      </header>

      @if (error()) {
        <div class="caja peligro" role="alert"><gc-icono nombre="circulo-x" [tamano]="20" /><div><strong>No se pudo cargar la lista</strong>{{ error() }}
          <button type="button" class="btn btn-secundario btn-sm" (click)="cargar()">Reintentar</button></div></div>
      }

      @if (morosos(); as lista) {
        @if (lista.length === 0) {
          <div class="tarjeta">
            <gc-vacio icono="circulo-check" titulo="No hay deudas vencidas" texto="Todos los clientes están al día con sus pagos." />
          </div>
        } @else {
          <section class="grilla grilla-kpi">
            <gc-kpi etiqueta="Total vencido" icono="alerta" tono="alerta" [valor]="totalVencido() | dinero" />
            <gc-kpi etiqueta="Clientes con deuda" icono="usuarios" [valor]="'' + lista.length" />
            <gc-kpi etiqueta="Cuotas atrasadas" icono="reloj" [valor]="'' + totalCuotas()" />
          </section>

          <div class="tarjeta tarjeta-plana" [class.cargando]="cargando()">
            <div class="tabla-envoltorio">
              <table class="tabla tabla-tarjetas">
                <thead><tr><th>Cliente</th><th class="num">Cuotas atrasadas</th><th class="num">Mayor atraso</th><th class="num">Deuda</th><th><span class="sr-only">Acciones</span></th></tr></thead>
                <tbody>
                  @for (m of lista; track m.idCliente) {
                    <tr [class.seleccionada]="seleccionado()?.idCliente === m.idCliente">
                      <td data-label="Cliente"><strong>{{ m.cliente }}</strong> <span class="suave">({{ m.codigoCliente }})</span></td>
                      <td data-label="Cuotas atrasadas" class="num">{{ m.cuotasVencidas }}</td>
                      <td data-label="Mayor atraso" class="num">{{ atraso(m.maxDiasAtraso) }}</td>
                      <td data-label="Deuda" class="num"><strong class="deuda">{{ m.montoVencido | dinero }}</strong></td>
                      <td class="acciones">
                        <button type="button" class="btn btn-secundario btn-sm" (click)="verDetalle(m)" [attr.aria-expanded]="seleccionado()?.idCliente === m.idCliente">
                          <gc-icono nombre="ojo" [tamano]="16" />{{ seleccionado()?.idCliente === m.idCliente ? 'Ocultar cuotas' : 'Ver cuotas' }}
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          @if (seleccionado(); as m) {
            <section class="tarjeta tarjeta-plana" id="detalle-deuda" [class.cargando]="cargandoDetalle()">
              <div class="cabecera-detalle">
                <h2>Cuotas vencidas de {{ m.cliente }}</h2>
                <p>Pulse <strong>Cobrar</strong> en la cuota que el cliente está pagando.</p>
              </div>
              <div class="tabla-envoltorio">
                <table class="tabla tabla-tarjetas">
                  <thead><tr><th>Contrato</th><th>Local</th><th>Cuota</th><th>Venció</th><th class="num">Atraso</th><th class="num">Falta pagar</th><th><span class="sr-only">Acciones</span></th></tr></thead>
                  <tbody>
                    @for (q of detalle(); track q.idCronogramaPago) {
                      <tr>
                        <td data-label="Contrato"><a [routerLink]="['/contratos', q.idContrato]">{{ q.codigoContrato }}</a></td>
                        <td data-label="Local">{{ q.codigoLocal }}</td>
                        <td data-label="Cuota">{{ q.concepto | concepto }} #{{ q.nroCuota }}</td>
                        <td data-label="Venció">{{ q.fechaVencimiento | fecha }}</td>
                        <td data-label="Atraso" class="num">{{ atraso(q.diasAtraso) }}</td>
                        <td data-label="Falta pagar" class="num"><strong class="deuda">{{ q.saldo | dinero }}</strong></td>
                        <td class="acciones"><button type="button" class="btn btn-primario btn-sm" (click)="cobrar(q)"><gc-icono nombre="pago" [tamano]="16" />Cobrar</button></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          }
        }
      } @else if (cargando()) {
        <p class="cargando-inicial"><span class="girar"></span> Buscando deudas…</p>
      }
    </div>

    @if (cuotaACobrar(); as cuota) {
      <gc-pago-dialogo [cuota]="cuota" (cancelar)="cuotaACobrar.set(null)" (registrado)="cuotaACobrar.set(null); alCobrar()" />
    }
  `,
  styles: `
    .deuda { color: var(--peligro); }
    tr.seleccionada td { background: var(--primario-tenue); }
    .cabecera-detalle { padding: 1rem 1.25rem; border-bottom: 1px solid var(--borde); }
    .cabecera-detalle p { color: var(--texto-suave); }
    .cargando-inicial { padding: 2rem; text-align: center; color: var(--texto-suave); }
  `
})
export class Deudas implements OnInit {
  private readonly api = inject(PagosApi);

  protected readonly morosos = signal<Moroso[] | null>(null);
  protected readonly seleccionado = signal<Moroso | null>(null);
  protected readonly detalle = signal<CuotaVencida[]>([]);
  protected readonly cuotaACobrar = signal<CuotaPorPagar | null>(null);
  protected readonly cargando = signal(true);
  protected readonly cargandoDetalle = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly totalVencido = computed(() => (this.morosos() ?? []).reduce((s, m) => s + m.montoVencido, 0));
  protected readonly totalCuotas = computed(() => (this.morosos() ?? []).reduce((s, m) => s + m.cuotasVencidas, 0));

  ngOnInit(): void {
    this.cargar();
  }

  protected atraso(dias: number): string {
    return cantidad(dias, 'día');
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.api.morosos().subscribe({
      next: (lista) => {
        this.morosos.set(lista);
        this.cargando.set(false);
        // Si el cliente elegido ya no debe nada, se cierra su detalle.
        const actual = this.seleccionado();
        if (actual && !lista.some((m) => m.idCliente === actual.idCliente)) this.seleccionado.set(null);
      },
      error: (e: unknown) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      }
    });
  }

  protected verDetalle(moroso: Moroso): void {
    if (this.seleccionado()?.idCliente === moroso.idCliente) {
      this.seleccionado.set(null);
      return;
    }
    this.seleccionado.set(moroso);
    this.cargarDetalle();
    setTimeout(() => document.getElementById('detalle-deuda')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  }

  private cargarDetalle(): void {
    const actual = this.seleccionado();
    if (!actual) return;
    this.cargandoDetalle.set(true);
    this.api.cuotasVencidasDe(actual.idCliente).subscribe({
      next: (cuotas) => {
        this.detalle.set(cuotas);
        this.cargandoDetalle.set(false);
      },
      error: (e: unknown) => {
        this.error.set(mensajeDeError(e));
        this.cargandoDetalle.set(false);
      }
    });
  }

  protected cobrar(q: CuotaVencida): void {
    this.cuotaACobrar.set({
      idCronogramaPago: q.idCronogramaPago,
      codigoContrato: q.codigoContrato,
      concepto: q.concepto,
      nroCuota: q.nroCuota,
      fechaVencimiento: q.fechaVencimiento,
      saldo: q.saldo
    });
  }

  protected alCobrar(): void {
    this.cargar();
    this.cargarDetalle();
  }
}
