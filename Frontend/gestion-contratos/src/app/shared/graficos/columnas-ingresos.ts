import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { IngresoMensual } from '../../core/api/modelos';
import { formatoDinero, formatoMes, nombreMesCorto } from '../formato';
import { Icono } from '../icono/icono';
import { abreviar, escalaDelEje } from './escala';

/**
 * Columnas mes a mes: lo esperado (gris, de contexto) frente a lo cobrado (azul, lo importante).
 * El mes completo es el área sensible: al pasar el cursor o enfocarlo se ve el detalle de ambos valores.
 */
@Component({
  selector: 'gc-columnas-ingresos',
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="encabezado">
      <ul class="leyenda" aria-label="Leyenda">
        <li><span class="muestra esperado"></span>Esperado <small>(cuotas que vencen)</small></li>
        <li><span class="muestra cobrado"></span>Cobrado <small>(pagos recibidos)</small></li>
      </ul>
      <button type="button" class="btn btn-fantasma btn-sm" (click)="verTabla.set(!verTabla())" [attr.aria-pressed]="verTabla()">
        <gc-icono [nombre]="verTabla() ? 'grafico' : 'tabla'" [tamano]="16" />{{ verTabla() ? 'Ver gráfico' : 'Ver como tabla' }}
      </button>
    </div>

    @if (verTabla()) {
      <div class="tabla-envoltorio">
        <table class="tabla">
          <thead><tr><th>Mes</th><th class="num">Esperado</th><th class="num">Cobrado</th><th class="num">Diferencia</th><th class="num">% cobrado</th></tr></thead>
          <tbody>
            @for (m of meses(); track m.mes) {
              <tr>
                <td>{{ nombre(m.mes) }}</td><td class="num">{{ dinero(m.esperado) }}</td><td class="num">{{ dinero(m.cobrado) }}</td>
                <td class="num">{{ dinero(m.diferencia) }}</td><td class="num">{{ m.porcCobranza }}%</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <div class="grafico" role="group" aria-label="Ingresos esperados y cobrados por mes">
        <div class="eje-y" aria-hidden="true">
          @for (marca of escala().marcas; track marca) {
            <span [style.bottom.%]="(marca / escala().maximo) * 100">{{ abreviado(marca) }}</span>
          }
        </div>
        <div class="area">
          @for (marca of escala().marcas; track marca) {
            <span class="rejilla" aria-hidden="true" [style.bottom.%]="(marca / escala().maximo) * 100"></span>
          }
          <div class="meses" [style.grid-template-columns]="'repeat(' + meses().length + ', minmax(0, 1fr))'">
            @for (m of meses(); track m.mes; let i = $index) {
              <div class="mes" tabindex="0" [attr.aria-label]="descripcion(m)" [class.derecha]="i > meses().length / 2">
                <span class="par">
                  <span class="columna esperado" [style.height.%]="altura(m.esperado)"></span>
                  <span class="columna cobrado" [style.height.%]="altura(m.cobrado)"></span>
                </span>
                <span class="tip" role="tooltip">
                  <strong>{{ nombre(m.mes) }}</strong>
                  <span class="linea"><i class="clave cobrado"></i>Cobrado <b>{{ dinero(m.cobrado) }}</b></span>
                  <span class="linea"><i class="clave esperado"></i>Esperado <b>{{ dinero(m.esperado) }}</b></span>
                  <span class="linea">Cobranza <b>{{ m.porcCobranza }}%</b></span>
                </span>
              </div>
            }
          </div>
        </div>
        <div class="eje-x" [style.grid-template-columns]="'repeat(' + meses().length + ', minmax(0, 1fr))'" aria-hidden="true">
          @for (m of meses(); track m.mes; let i = $index) {
            <span [class.oculto-movil]="i % 2 === 1">{{ corto(m.mes) }}</span>
          }
        </div>
      </div>
    }
  `,
  styles: `
    :host { display: block; }
    .encabezado { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.75rem; }
    .leyenda { list-style: none; margin: 0; padding: 0; display: flex; gap: 1.25rem; flex-wrap: wrap; }
    .leyenda li { display: flex; align-items: center; gap: 0.45rem; color: var(--texto); font-weight: 600; font-size: 0.92rem; }
    .leyenda small { color: var(--texto-suave); font-weight: 400; }
    .muestra { width: 14px; height: 14px; border-radius: 3px; }
    .esperado { background: var(--graf-contexto); }
    .cobrado { background: var(--graf-azul); }

    .grafico { --alto: 230px; display: grid; grid-template-columns: 3.4rem 1fr; grid-template-rows: var(--alto) auto; column-gap: 0.4rem; }
    .eje-y { position: relative; }
    .eje-y span { position: absolute; right: 0; transform: translateY(50%); font-size: 0.78rem; color: var(--texto-suave); font-variant-numeric: tabular-nums; }
    .area { position: relative; }
    .rejilla { position: absolute; left: 0; right: 0; height: 1px; background: var(--graf-rejilla); }
    .meses { position: absolute; inset: 0; display: grid; gap: 2px; }
    .mes { position: relative; display: flex; align-items: flex-end; justify-content: center; min-width: 0; border-radius: 4px 4px 0 0; }
    .mes:hover, .mes:focus-visible { background: rgb(47 120 176 / 8%); }
    .par { display: flex; align-items: flex-end; justify-content: center; gap: 2px; width: 100%; height: 100%; padding: 0 12%; }
    .columna { flex: 1 1 0; max-width: 24px; min-width: 3px; min-height: 0; border-radius: 4px 4px 0 0; }
    .eje-x { grid-column: 2; display: grid; gap: 2px; padding-top: 0.4rem; }
    .eje-x span { text-align: center; font-size: 0.8rem; color: var(--texto-suave); }

    .tip { display: none; position: absolute; bottom: calc(100% - 20px); left: 50%; transform: translateX(-50%); z-index: 6; flex-direction: column; gap: 0.2rem; min-width: 12rem; background: var(--marino); color: #fff; padding: 0.55rem 0.7rem; border-radius: var(--radio-sm); font-size: 0.85rem; box-shadow: var(--sombra-alta); pointer-events: none; }
    .mes:hover .tip, .mes:focus-visible .tip { display: flex; }
    .mes.derecha .tip { left: auto; right: 0; transform: none; }
    .linea { display: flex; align-items: center; gap: 0.4rem; justify-content: space-between; }
    .linea b { margin-left: auto; font-variant-numeric: tabular-nums; }
    .clave { width: 12px; height: 3px; border-radius: 2px; display: inline-block; }
    .tabla-envoltorio { max-height: 340px; overflow: auto; }
    @media (max-width: 640px) { .oculto-movil { visibility: hidden; } .grafico { --alto: 200px; grid-template-columns: 2.8rem 1fr; } }
  `
})
export class ColumnasIngresos {
  readonly meses = input.required<IngresoMensual[]>();

  protected readonly verTabla = signal(false);
  protected readonly escala = computed(() => escalaDelEje(Math.max(0, ...this.meses().flatMap((m) => [m.esperado, m.cobrado]))));

  protected altura(valor: number): number {
    return (valor / this.escala().maximo) * 100;
  }
  protected abreviado = abreviar;
  protected dinero = formatoDinero;
  protected nombre = formatoMes;
  protected corto = nombreMesCorto;

  protected descripcion(m: IngresoMensual): string {
    return `${formatoMes(m.mes)}: cobrado ${formatoDinero(m.cobrado)} de ${formatoDinero(m.esperado)} esperados`;
  }
}
