import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { mensajeDeError } from '../../core/api/api.utils';
import { AnaliticasApi } from '../../core/api/analiticas.api';
import { EmpresasApi } from '../../core/api/empresas.api';
import { ContratoPorVencer, Empresa, IngresoMensual, MorosidadResumen, Resumen, TopCliente, TopLocal } from '../../core/api/modelos';
import { AuthService } from '../../core/auth/auth.service';
import { cantidad, DineroPipe, FechaPipe, formatoDinero, formatoFecha } from '../../shared/formato';
import { BarraApilada, Segmento } from '../../shared/graficos/barra-apilada';
import { BarrasHorizontales, FilaBarra } from '../../shared/graficos/barras-horizontales';
import { ColumnasIngresos } from '../../shared/graficos/columnas-ingresos';
import { Icono } from '../../shared/icono/icono';
import { Kpi } from '../../shared/kpi/kpi';
import { PagoDialogo } from '../pagos/pago-dialogo';

interface Datos {
  resumen: Resumen;
  ingresos: IngresoMensual[];
  morosidad: MorosidadResumen;
  porVencer: ContratoPorVencer[];
  topClientes: TopCliente[];
  topLocales: TopLocal[];
}

const COLORES_ANTIGUEDAD = ['var(--graf-ord-1)', 'var(--graf-ord-2)', 'var(--graf-ord-3)', 'var(--graf-ord-4)'];

@Component({
  selector: 'gc-panel',
  imports: [ReactiveFormsModule, RouterLink, Icono, Kpi, BarraApilada, BarrasHorizontales, ColumnasIngresos, PagoDialogo, DineroPipe, FechaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pagina">
      <header class="pagina-cabecera">
        <div>
          <h1>Hola, {{ nombrePila() }}</h1>
          <p>Así van sus alquileres{{ datos() ? ' al ' + fecha(datos()!.resumen.fechaCorte) : '' }}. Todo se actualiza solo cuando registra contratos y pagos.</p>
        </div>
        @if (empresas().length > 1) {
          <div class="campo">
            <label for="f-empresa">Ver datos de</label>
            <select id="f-empresa" [formControl]="empresa">
              <option [ngValue]="null">Todas las empresas</option>
              @for (e of empresas(); track e.id) { <option [ngValue]="e.id">{{ e.nombre }}</option> }
            </select>
          </div>
        }
      </header>

      <section class="tarjeta acciones-rapidas" aria-label="Acciones frecuentes">
        <h2>¿Qué desea hacer?</h2>
        <div class="fila">
          <a class="btn btn-primario" routerLink="/contratos/nuevo"><gc-icono nombre="contrato" [tamano]="18" />Nuevo contrato</a>
          <button type="button" class="btn btn-secundario" (click)="registrandoPago.set(true)"><gc-icono nombre="pago" [tamano]="18" />Registrar un pago</button>
          <a class="btn btn-secundario" routerLink="/clientes/nuevo"><gc-icono nombre="usuarios" [tamano]="18" />Nuevo cliente</a>
          <a class="btn btn-secundario" routerLink="/deudas"><gc-icono nombre="alerta" [tamano]="18" />Ver quién debe</a>
        </div>
      </section>

      @if (error()) {
        <div class="caja peligro" role="alert"><gc-icono nombre="circulo-x" [tamano]="20" />
          <div><strong>No se pudo cargar el panel</strong>{{ error() }} <button type="button" class="btn btn-secundario btn-sm" (click)="cargar()">Reintentar</button></div></div>
      }

      @if (datos(); as d) {
        <div class="apilado" [class.cargando]="cargando()">
          <section class="grilla grilla-kpi" aria-label="Indicadores principales">
            <gc-kpi etiqueta="Locales ocupados" icono="tienda" [valor]="d.resumen.localesOcupados + ' de ' + d.resumen.totalLocales"
                    [detalle]="d.resumen.porcOcupacion + '% de ocupación'" [progreso]="d.resumen.porcOcupacion" />
            <gc-kpi etiqueta="Cobrado este mes" icono="pago" [valor]="dinero(d.resumen.cobradoMes)"
                    [detalle]="'de ' + dinero(d.resumen.esperadoMes) + ' que vencen este mes (' + d.resumen.porcCobranzaMes + '%)'"
                    [progreso]="d.resumen.porcCobranzaMes" />
            <gc-kpi etiqueta="Deuda vencida" icono="alerta" [valor]="dinero(d.resumen.montoVencido)"
                    [tono]="d.resumen.montoVencido > 0 ? 'alerta' : 'normal'"
                    [detalle]="d.resumen.montoVencido > 0 ? cuotasYClientes(d.resumen) : 'Nadie tiene cuotas atrasadas'">
              @if (d.resumen.montoVencido > 0) { <a routerLink="/deudas">Ver detalle de la deuda</a> }
            </gc-kpi>
            <gc-kpi etiqueta="Contratos por vencer" icono="calendario" [valor]="d.resumen.contratosPorVencer30 + ' en 30 días'"
                    [detalle]="d.resumen.contratosPorVencer60 + ' en 60 días · ' + d.resumen.contratosPorVencer90 + ' en 90 días'" />
          </section>

          <div class="grilla grilla-2">
            <section class="tarjeta ancho-doble">
              <div class="tarjeta-cabecera">
                <h2>Ingresos de los últimos 12 meses</h2>
                <p>Lo esperado son las cuotas que vencen cada mes; lo cobrado, los pagos que se recibieron.</p>
              </div>
              <gc-columnas-ingresos [meses]="d.ingresos" />
            </section>

            <section class="tarjeta">
              <div class="tarjeta-cabecera">
                <h2>Ocupación de locales</h2>
                <p>Un local está ocupado si tiene un contrato vigente hoy.</p>
              </div>
              <gc-barra-apilada nombreTotal="Estado del local" [segmentos]="segmentosOcupacion()" textoSinDatos="Todavía no hay locales registrados." />
            </section>

            <section class="tarjeta">
              <div class="tarjeta-cabecera">
                <h2>Deuda vencida por antigüedad</h2>
                <p>Cuánto se debe según los días de atraso. Lo más antiguo es lo más urgente.</p>
              </div>
              <gc-barras-horizontales titulo="Antigüedad" nombreValor="Deuda" [filas]="filasAntiguedad()" [formato]="dinero"
                                      textoSinDatos="No hay deuda vencida. ¡Todo al día!" />
            </section>

            <section class="tarjeta">
              <div class="tarjeta-cabecera">
                <h2>Clientes que más han pagado</h2>
                <p>Según el total cobrado en todo el historial.</p>
              </div>
              <gc-barras-horizontales titulo="Cliente" nombreValor="Total cobrado" [filas]="filasClientes()" [formato]="dinero"
                                      textoSinDatos="Todavía no hay pagos registrados." />
            </section>

            <section class="tarjeta">
              <div class="tarjeta-cabecera">
                <h2>Locales que más generan</h2>
                <p>Según el total cobrado en todo el historial.</p>
              </div>
              <gc-barras-horizontales titulo="Local" nombreValor="Total cobrado" [filas]="filasLocales()" [formato]="dinero"
                                      textoSinDatos="Todavía no hay pagos registrados." />
            </section>
          </div>

          <section class="tarjeta tarjeta-plana">
            <div class="tarjeta-cabecera relleno-cabecera">
              <h2>Contratos que vencen en los próximos 90 días</h2>
              <p>Es buen momento para hablar con el cliente y decidir si se renueva.</p>
            </div>
            @if (d.porVencer.length === 0) {
              <p class="sin-datos">Ningún contrato vigente vence en los próximos 90 días.</p>
            } @else {
              <div class="tabla-envoltorio">
                <table class="tabla tabla-tarjetas">
                  <thead><tr><th>Contrato</th><th>Cliente</th><th>Local</th><th>Termina</th><th class="num">Pago mensual</th><th>Faltan</th></tr></thead>
                  <tbody>
                    @for (c of d.porVencer; track c.idContrato) {
                      <tr>
                        <td data-label="Contrato"><a [routerLink]="['/contratos', c.idContrato]"><strong>{{ c.codigoContrato }}</strong></a></td>
                        <td data-label="Cliente">{{ c.cliente }}</td>
                        <td data-label="Local">{{ c.codigoLocal }}</td>
                        <td data-label="Termina">{{ c.fechaFin | fecha }}</td>
                        <td data-label="Pago mensual" class="num">{{ c.montoMensual | dinero }}</td>
                        <td data-label="Faltan"><span class="insignia" [class.peligro]="c.diasRestantes <= 30" [class.aviso]="c.diasRestantes > 30 && c.diasRestantes <= 60" [class.info]="c.diasRestantes > 60">
                          <gc-icono [nombre]="c.diasRestantes <= 30 ? 'alerta' : 'reloj'" [tamano]="14" />{{ diasTexto(c.diasRestantes) }}</span></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>
        </div>
      } @else if (cargando()) {
        <p class="cargando-inicial"><span class="girar"></span> Cargando el panel…</p>
      }
    </div>

    @if (registrandoPago()) {
      <gc-pago-dialogo (cancelar)="registrandoPago.set(false)" (registrado)="registrandoPago.set(false); cargar()" />
    }
  `,
  styles: `
    .acciones-rapidas { display: flex; flex-direction: column; gap: 0.75rem; }
    .acciones-rapidas h2 { font-size: 1.05rem; }
    .ancho-doble { grid-column: 1 / -1; }
    .relleno-cabecera { padding: 1.25rem 1.25rem 0; }
    .sin-datos, .cargando-inicial { padding: 1.5rem; color: var(--texto-suave); text-align: center; }
  `
})
export class Panel implements OnInit {
  private readonly api = inject(AnaliticasApi);
  private readonly empresasApi = inject(EmpresasApi);
  private readonly auth = inject(AuthService);

  protected readonly empresa = new FormControl<number | null>(null);
  protected readonly empresas = signal<Empresa[]>([]);
  protected readonly datos = signal<Datos | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly registrandoPago = signal(false);

  protected readonly dinero = formatoDinero;
  protected readonly fecha = formatoFecha;

  protected readonly nombrePila = computed(() => (this.auth.usuario()?.nombreCompleto ?? '').split(' ')[0] || 'bienvenido');

  protected readonly segmentosOcupacion = computed<Segmento[]>(() => {
    const r = this.datos()?.resumen;
    return r
      ? [
          { etiqueta: 'Ocupados', valor: r.localesOcupados, color: 'var(--graf-azul)', descripcion: 'Con contrato vigente' },
          { etiqueta: 'Disponibles', valor: r.localesDisponibles, color: 'var(--graf-naranja)', descripcion: 'Listos para alquilar' },
          { etiqueta: 'En mantenimiento', valor: r.localesEnMantenimiento, color: 'var(--graf-violeta)', descripcion: 'No se pueden alquilar por ahora' }
        ]
      : [];
  });

  protected readonly filasAntiguedad = computed<FilaBarra[]>(() => {
    const m = this.datos()?.morosidad;
    if (!m || m.montoVencido === 0) return [];
    return m.antiguedad.map((a, i) => ({ etiqueta: a.rango, valor: a.monto, detalle: cantidad(a.cuotas, 'cuota'), color: COLORES_ANTIGUEDAD[i] }));
  });

  protected readonly filasClientes = computed<FilaBarra[]>(() =>
    (this.datos()?.topClientes ?? []).map((c) => ({ etiqueta: c.cliente ?? c.codigoCliente, valor: c.totalCobrado, detalle: cantidad(c.cantidadPagos, 'pago') }))
  );

  protected readonly filasLocales = computed<FilaBarra[]>(() =>
    (this.datos()?.topLocales ?? []).map((l) => ({ etiqueta: l.codigoLocal, valor: l.totalCobrado, detalle: l.direccion ?? undefined }))
  );

  ngOnInit(): void {
    this.empresasApi.listar({ tamano: 100 }).subscribe((r) => this.empresas.set(r.items));
    this.empresa.valueChanges.subscribe(() => this.cargar());
    this.cargar();
  }

  /** Mientras recarga, el panel conserva lo que ya mostraba (más tenue) para que la pantalla no salte. */
  protected cargar(): void {
    const id = this.empresa.value;
    this.cargando.set(true);
    this.error.set(null);
    forkJoin({
      resumen: this.api.resumen(id),
      ingresos: this.api.ingresosMensuales(id),
      morosidad: this.api.morosidad(id),
      porVencer: this.api.contratosPorVencer(id, 90),
      topClientes: this.api.topClientes(id, 5),
      topLocales: this.api.topLocales(id, 5)
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

  protected cuotasYClientes(r: Resumen): string {
    return `${cantidad(r.cuotasVencidas, 'cuota atrasada', 'cuotas atrasadas')} de ${cantidad(r.clientesMorosos, 'cliente')}`;
  }

  protected diasTexto(dias: number): string {
    return dias === 0 ? 'Vence hoy' : cantidad(dias, 'día');
  }
}
