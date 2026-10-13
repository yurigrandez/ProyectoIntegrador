import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { mensajeDeError } from '../../core/api/api.utils';
import { ContratosApi } from '../../core/api/contratos.api';
import { Contrato, Cuota, Pago } from '../../core/api/modelos';
import { PagosApi } from '../../core/api/pagos.api';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { contarCuotas } from '../../shared/fechas';
import { Estado } from '../../shared/estado/estado';
import { ConceptoPipe, DineroPipe, FechaPipe, cantidad, formatoDinero } from '../../shared/formato';
import { Icono } from '../../shared/icono/icono';
import { AnularPagoDialogo } from '../pagos/anular-pago-dialogo';
import { CuotaPorPagar, PagoDialogo } from '../pagos/pago-dialogo';
import { RescindirDialogo } from './rescindir-dialogo';

@Component({
  selector: 'gc-contrato-detalle',
  imports: [RouterLink, Icono, Estado, DineroPipe, FechaPipe, ConceptoPipe, PagoDialogo, AnularPagoDialogo, RescindirDialogo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pagina">
      @if (error()) {
        <div class="caja peligro" role="alert"><gc-icono nombre="circulo-x" [tamano]="20" />
          <div><strong>No se pudo abrir el contrato</strong>{{ error() }}
            <a routerLink="/contratos">Volver a contratos</a></div></div>
      }

      @if (contrato(); as c) {
        <header class="pagina-cabecera">
          <div>
            <p class="migas"><a routerLink="/contratos">Contratos</a> › {{ c.codigo }}</p>
            <h1>Contrato {{ c.codigo }} <gc-estado tipo="contrato" [valor]="c.estado" /></h1>
            <p>{{ c.cliente }} · local {{ c.local }}</p>
          </div>
          <div class="fila">
            @if (c.estado === 'BOR') {
              <a class="btn btn-secundario" [routerLink]="['/contratos', c.id, 'editar']"><gc-icono nombre="editar" [tamano]="18" />Editar</a>
            }
            @if (puedePagar()) {
              <button type="button" class="btn btn-primario" (click)="pagarSiguiente()" [disabled]="!siguienteCuota()">
                <gc-icono nombre="pago" [tamano]="18" />Registrar pago
              </button>
            }
          </div>
        </header>

        @switch (c.estado) {
          @case ('BOR') {
            <div class="caja aviso">
              <gc-icono nombre="info" [tamano]="20" />
              <div class="crece">
                <strong>Siguiente paso: autorizar el contrato</strong>
                Este contrato es un borrador y todavía no tiene cuotas. Un administrador (distinto de quien lo registró) debe revisarlo y autorizarlo.
                @if (auth.esAdmin() && esRegistrante()) {
                  <br /><em>Usted lo registró, así que debe autorizarlo otro administrador.</em>
                } @else if (!auth.esAdmin()) {
                  <br /><em>Avise a un administrador para que lo revise.</em>
                }
              </div>
              @if (auth.esAdmin()) {
                <div class="fila">
                  <button type="button" class="btn btn-primario" (click)="autorizar()" [disabled]="esRegistrante() || trabajando()">
                    <gc-icono nombre="circulo-check" [tamano]="18" />Autorizar
                  </button>
                  <button type="button" class="btn btn-secundario" (click)="eliminarBorrador()" [disabled]="trabajando()">
                    <gc-icono nombre="papelera" [tamano]="18" />Eliminar borrador
                  </button>
                </div>
              }
            </div>
          }
          @case ('VEN') {
            <div class="caja aviso"><gc-icono nombre="reloj" [tamano]="20" />
              <div class="crece"><strong>Este contrato terminó el {{ c.fechaFin | fecha }}</strong>Si el cliente sigue alquilando, cree un contrato nuevo.</div>
              <a class="btn btn-secundario" routerLink="/contratos/nuevo">Crear contrato nuevo</a></div>
          }
          @case ('RES') {
            <div class="caja peligro"><gc-icono nombre="circulo-x" [tamano]="20" />
              <div><strong>Contrato rescindido</strong>Terminó anticipadamente el {{ c.fechaFin | fecha }}. El detalle está en las observaciones.</div></div>
          }
          @case ('VIG') {
            <div class="caja ok"><gc-icono nombre="circulo-check" [tamano]="20" />
              <div class="crece"><strong>Contrato vigente</strong>Las cuotas vencen el día {{ c.diaPago }} de cada mes. Registre cada pago en la cuota que corresponde.</div>
              @if (auth.esAdmin()) {
                <button type="button" class="btn btn-secundario" (click)="rescindiendo.set(true)"><gc-icono nombre="circulo-x" [tamano]="18" />Rescindir</button>
              }
            </div>
          }
        }

        <section class="tarjeta">
          <h2>Datos del contrato</h2>
          <dl class="datos">
            <div><dt>Cliente</dt><dd><a [routerLink]="['/contratos']" [queryParams]="{ idCliente: c.idCliente }">{{ c.cliente }}</a></dd></div>
            <div><dt>Local</dt><dd><a [routerLink]="['/contratos']" [queryParams]="{ idLocal: c.idLocal }">{{ c.local }}</a></dd></div>
            <div><dt>Vigencia</dt><dd>{{ c.fechaInicio | fecha }} al {{ c.fechaFin | fecha }}</dd></div>
            <div><dt>Día de pago</dt><dd>El {{ c.diaPago }} de cada mes</dd></div>
            <div><dt>Alquiler</dt><dd>{{ c.montoAlquiler | dinero }}</dd></div>
            @if (c.montoMantenimiento) { <div><dt>Mantenimiento</dt><dd>{{ c.montoMantenimiento | dinero }}</dd></div> }
            @if (c.montoLuz) { <div><dt>Luz</dt><dd>{{ c.montoLuz | dinero }}</dd></div> }
            @if (c.montoAgua) { <div><dt>Agua</dt><dd>{{ c.montoAgua | dinero }}</dd></div> }
            @if (c.montoOtros) { <div><dt>Otros</dt><dd>{{ c.montoOtros | dinero }}</dd></div> }
            <div><dt>Pago mensual total</dt><dd><strong>{{ c.montoMensual | dinero }}</strong></dd></div>
            <div><dt>Registrado por</dt><dd>{{ c.usuarioRegistra }}</dd></div>
            <div><dt>Autorizado por</dt><dd>{{ c.usuarioAutoriza || 'Pendiente' }}</dd></div>
            @if (c.observaciones) { <div class="completo"><dt>Observaciones</dt><dd class="nota">{{ c.observaciones }}</dd></div> }
          </dl>
        </section>

        @if (c.estado === 'BOR') {
          <section class="tarjeta">
            <h2>Cuotas</h2>
            <p class="suave">Al autorizar el contrato se generarán las cuotas de {{ cuotasPrevistas() }}, una por cada concepto, con vencimiento el día {{ c.diaPago }} de cada mes.</p>
          </section>
        } @else {
          <section class="grilla grilla-kpi">
            <div class="kpi"><span class="etiqueta-kpi">Total del contrato</span><strong>{{ totales().total | dinero }}</strong><small>{{ cuotas().length }} cuotas (todos los conceptos)</small></div>
            <div class="kpi"><span class="etiqueta-kpi">Pagado</span><strong>{{ totales().pagado | dinero }}</strong></div>
            <div class="kpi"><span class="etiqueta-kpi">Falta pagar</span><strong>{{ totales().saldo | dinero }}</strong></div>
            <div class="kpi" [class.alerta]="totales().vencido > 0">
              <span class="etiqueta-kpi">Vencido sin pagar</span><strong>{{ totales().vencido | dinero }}</strong>
              @if (totales().vencido > 0) { <small>Hay cuotas atrasadas</small> } @else { <small>Todo al día</small> }
            </div>
          </section>

          <section class="tarjeta tarjeta-plana">
            <div class="cabecera-tabla">
              <h2>Cuotas</h2>
              <label class="interruptor"><input type="checkbox" [checked]="soloPendientes()" (change)="soloPendientes.set($any($event.target).checked)" /> Mostrar solo lo pendiente</label>
            </div>
            <div class="tabla-envoltorio">
              <table class="tabla tabla-tarjetas">
                <thead><tr><th>Cuota</th><th>Concepto</th><th>Vence</th><th class="num">Monto</th><th class="num">Pagado</th><th class="num">Falta</th><th>Estado</th><th><span class="sr-only">Acciones</span></th></tr></thead>
                <tbody>
                  @for (q of cuotasVisibles(); track q.id) {
                    <tr [class.fila-vencida]="q.diasAtraso > 0">
                      <td data-label="Cuota">{{ q.nroCuota }}</td>
                      <td data-label="Concepto">{{ q.concepto | concepto }}</td>
                      <td data-label="Vence">{{ q.fechaVencimiento | fecha }}@if (q.diasAtraso > 0) { <small class="atraso"> · {{ q.diasAtraso }} {{ q.diasAtraso === 1 ? 'día' : 'días' }} de atraso</small> }</td>
                      <td data-label="Monto" class="num">{{ q.monto | dinero }}</td>
                      <td data-label="Pagado" class="num">{{ q.pagado | dinero }}</td>
                      <td data-label="Falta" class="num"><strong>{{ q.saldo | dinero }}</strong></td>
                      <td data-label="Estado"><gc-estado tipo="cuota" [valor]="q.estado" [diasAtraso]="q.diasAtraso" /></td>
                      <td class="acciones">
                        @if (puedePagar() && q.saldo > 0) {
                          <button type="button" class="btn btn-primario btn-sm" (click)="pagar(q)"><gc-icono nombre="pago" [tamano]="16" />Pagar</button>
                        }
                      </td>
                    </tr>
                  } @empty {
                    <tr><td class="sin-etiqueta" colspan="8">No hay cuotas pendientes. ¡Todo está pagado!</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </section>

          <section class="tarjeta tarjeta-plana">
            <div class="cabecera-tabla"><h2>Pagos registrados</h2></div>
            @if (pagos().length === 0) {
              <p class="vacio-pagos">Todavía no se registró ningún pago en este contrato.</p>
            } @else {
              <div class="tabla-envoltorio">
                <table class="tabla tabla-tarjetas">
                  <thead><tr><th>Fecha</th><th>Cuota</th><th>Medio</th><th>Operación</th><th class="num">Monto</th><th>Registró</th><th><span class="sr-only">Acciones</span></th></tr></thead>
                  <tbody>
                    @for (p of pagos(); track p.id) {
                      <tr>
                        <td data-label="Fecha">{{ p.fechaPago | fecha }}</td>
                        <td data-label="Cuota">{{ p.concepto | concepto }} #{{ p.nroCuota }}</td>
                        <td data-label="Medio">{{ p.medioPago }}</td>
                        <td data-label="Operación">{{ p.nroOperacion || '—' }}</td>
                        <td data-label="Monto" class="num"><strong>{{ p.monto | dinero }}</strong></td>
                        <td data-label="Registró">{{ p.usuarioRegistra }}</td>
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
            }
          </section>
        }
      } @else if (cargando()) {
        <p class="cargando-inicial"><span class="girar"></span> Cargando contrato…</p>
      }
    </div>

    @if (cuotaAPagar()) {
      <gc-pago-dialogo [cuota]="cuotaAPagar()" (cancelar)="cerrarPago()" (registrado)="alRegistrarPago()" />
    }
    @if (anulando(); as pago) {
      <gc-anular-pago-dialogo [pago]="pago" (cancelar)="anulando.set(null)" (anulado)="anulando.set(null); cargar()" />
    }
    @if (rescindiendo() && contrato(); as c) {
      <gc-rescindir-dialogo [contrato]="c" (cancelar)="rescindiendo.set(false)" (rescindido)="rescindiendo.set(false); cargar()" />
    }
  `,
  styles: `
    .migas { font-size: 0.9rem; color: var(--texto-suave); margin: 0 0 0.25rem; }
    h1 { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
    .datos { margin: 0.75rem 0 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem 1.5rem; }
    .datos > div { min-width: 0; }
    .datos .completo { grid-column: 1 / -1; }
    dt { color: var(--texto-suave); font-size: 0.85rem; font-weight: 600; }
    dd { margin: 0.1rem 0 0; }
    .nota { white-space: pre-line; }
    .kpi { background: var(--superficie); border: 1px solid var(--borde); border-radius: var(--radio); box-shadow: var(--sombra); padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.15rem; }
    .kpi .etiqueta-kpi { color: var(--texto-suave); font-size: 0.9rem; }
    .kpi strong { font-size: 1.5rem; color: var(--marino); }
    .kpi small { color: var(--texto-suave); }
    .kpi.alerta { border-color: #e6b3ae; background: #fffafa; }
    .kpi.alerta strong { color: var(--peligro); }
    .cabecera-tabla { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; padding: 1rem 1.25rem; border-bottom: 1px solid var(--borde); }
    .interruptor { display: inline-flex; align-items: center; gap: 0.5rem; cursor: pointer; font-weight: 600; color: var(--marino); }
    .interruptor input { width: 18px; height: 18px; accent-color: var(--primario); }
    .fila-vencida td { background: #fffafa; }
    .atraso { color: var(--peligro); font-weight: 600; }
    .vacio-pagos, .cargando-inicial { padding: 1.5rem; color: var(--texto-suave); text-align: center; }
  `
})
export class ContratoDetalle implements OnInit {
  private readonly api = inject(ContratosApi);
  private readonly pagosApi = inject(PagosApi);
  private readonly confirmar = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  /** Viene de la ruta (contratos/:id). */
  readonly id = input.required<string>();

  protected readonly contrato = signal<Contrato | null>(null);
  protected readonly cuotas = signal<Cuota[]>([]);
  protected readonly pagos = signal<Pago[]>([]);
  protected readonly cargando = signal(true);
  protected readonly trabajando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly soloPendientes = signal(true);
  protected readonly cuotaAPagar = signal<CuotaPorPagar | null>(null);
  protected readonly anulando = signal<Pago | null>(null);
  protected readonly rescindiendo = signal(false);

  protected readonly puedePagar = computed(() => ['VIG', 'VEN', 'RES'].includes(this.contrato()?.estado ?? ''));
  protected readonly esRegistrante = computed(() => this.contrato()?.usuarioRegistra === this.auth.usuario()?.codigo);
  protected readonly cuotasVisibles = computed(() => (this.soloPendientes() ? this.cuotas().filter((q) => q.saldo > 0) : this.cuotas()));
  protected readonly siguienteCuota = computed(() =>
    [...this.cuotas()].filter((q) => q.saldo > 0).sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento))[0] ?? null
  );
  protected readonly totales = computed(() => {
    const cuotas = this.cuotas();
    return {
      total: cuotas.reduce((s, q) => s + q.monto, 0),
      pagado: cuotas.reduce((s, q) => s + q.pagado, 0),
      saldo: cuotas.reduce((s, q) => s + q.saldo, 0),
      vencido: cuotas.filter((q) => q.diasAtraso > 0).reduce((s, q) => s + q.saldo, 0)
    };
  });
  protected readonly cuotasPrevistas = computed(() => {
    const c = this.contrato();
    return c ? cantidad(contarCuotas(c.fechaInicio.slice(0, 10), c.fechaFin.slice(0, 10)), 'mes', 'meses') : '';
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    const id = Number(this.id());
    this.cargando.set(true);
    this.error.set(null);
    this.api.obtener(id).subscribe({
      next: (c) => {
        this.contrato.set(c);
        if (c.estado === 'BOR') {
          this.cuotas.set([]);
          this.pagos.set([]);
          this.cargando.set(false);
          return;
        }
        forkJoin({ cuotas: this.api.cronograma(id), pagos: this.pagosApi.listar({ idContrato: id, tamano: 100 }) }).subscribe({
          next: ({ cuotas, pagos }) => {
            this.cuotas.set(cuotas);
            this.pagos.set(pagos.items);
            this.cargando.set(false);
          },
          error: (e: unknown) => {
            this.error.set(mensajeDeError(e));
            this.cargando.set(false);
          }
        });
      },
      error: (e: unknown) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      }
    });
  }

  protected pagar(cuota: Cuota): void {
    const c = this.contrato();
    if (!c) return;
    this.cuotaAPagar.set({
      idCronogramaPago: cuota.id,
      codigoContrato: c.codigo,
      concepto: cuota.concepto,
      nroCuota: cuota.nroCuota,
      fechaVencimiento: cuota.fechaVencimiento,
      saldo: cuota.saldo
    });
  }

  protected pagarSiguiente(): void {
    const cuota = this.siguienteCuota();
    if (cuota) this.pagar(cuota);
  }

  protected cerrarPago(): void {
    this.cuotaAPagar.set(null);
  }

  protected alRegistrarPago(): void {
    this.cerrarPago();
    this.cargar();
  }

  protected async autorizar(): Promise<void> {
    const c = this.contrato();
    if (!c) return;
    const confirmado = await this.confirmar.confirmar({
      titulo: 'Autorizar contrato',
      mensaje: `Al autorizar el contrato ${c.codigo} se generarán sus cuotas de ${this.cuotasPrevistas()} y el local ${c.local} quedará ocupado. Ya no podrá editarse. ¿Desea autorizarlo?`,
      textoConfirmar: 'Sí, autorizar'
    });
    if (!confirmado) return;
    this.trabajando.set(true);
    this.api.autorizar(c.id).subscribe({
      next: () => {
        this.toast.ok(`Contrato ${c.codigo} autorizado. Ya se generaron sus cuotas.`);
        this.trabajando.set(false);
        this.cargar();
      },
      error: (e: unknown) => {
        this.trabajando.set(false);
        this.toast.error(mensajeDeError(e));
      }
    });
  }

  protected async eliminarBorrador(): Promise<void> {
    const c = this.contrato();
    if (!c) return;
    const confirmado = await this.confirmar.confirmar({
      titulo: 'Eliminar borrador',
      mensaje: `¿Eliminar el borrador ${c.codigo}? Se podrá registrar un contrato nuevo para ese local y cliente.`,
      textoConfirmar: 'Sí, eliminar',
      peligro: true
    });
    if (!confirmado) return;
    this.trabajando.set(true);
    this.api.eliminarBorrador(c.id).subscribe({
      next: () => {
        this.toast.ok('Borrador eliminado.');
        void this.router.navigate(['/contratos']);
      },
      error: (e: unknown) => {
        this.trabajando.set(false);
        this.toast.error(mensajeDeError(e));
      }
    });
  }

  protected dinero = formatoDinero;
}
