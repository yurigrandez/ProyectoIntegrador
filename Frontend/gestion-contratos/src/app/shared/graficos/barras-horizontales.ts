import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { Icono } from '../icono/icono';

export interface FilaBarra {
  etiqueta: string;
  valor: number;
  /** Texto secundario bajo la etiqueta (por ejemplo "3 cuotas"). */
  detalle?: string;
  /** Color de esta barra; si no se indica se usa el de la serie. */
  color?: string;
}

/**
 * Barras horizontales para comparar magnitudes (tops, deuda por antigüedad). Marcas finas (22 px), extremo redondeado,
 * valor al final de la barra, información al pasar el cursor o enfocar con teclado, y una vista de tabla equivalente.
 */
@Component({
  selector: 'gc-barras-horizontales',
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (filas().length === 0) {
      <p class="sin-datos">{{ textoSinDatos() }}</p>
    } @else {
      <div class="encabezado">
        <button type="button" class="btn btn-fantasma btn-sm" (click)="verTabla.set(!verTabla())" [attr.aria-pressed]="verTabla()">
          <gc-icono [nombre]="verTabla() ? 'grafico' : 'tabla'" [tamano]="16" />{{ verTabla() ? 'Ver gráfico' : 'Ver como tabla' }}
        </button>
      </div>

      @if (verTabla()) {
        <div class="tabla-envoltorio">
          <table class="tabla">
            <thead><tr><th>{{ titulo() }}</th><th class="num">{{ nombreValor() }}</th></tr></thead>
            <tbody>
              @for (f of filas(); track f.etiqueta) {
                <tr><td>{{ f.etiqueta }}@if (f.detalle) { <span class="suave"> · {{ f.detalle }}</span> }</td><td class="num">{{ formato()(f.valor) }}</td></tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <ul class="filas" [attr.aria-label]="titulo()">
          @for (f of filas(); track f.etiqueta) {
            <li class="fila-barra">
              <div class="rotulo">
                <span class="nombre">{{ f.etiqueta }}</span>
                @if (f.detalle) { <span class="detalle">{{ f.detalle }}</span> }
              </div>
              <div class="pista">
                @if (f.valor > 0) {
                  <span class="marca" tabindex="0" [style.--p]="proporcion(f.valor)" [style.background]="f.color ?? colorBase()"
                        [attr.aria-label]="f.etiqueta + ': ' + formato()(f.valor)">
                    <span class="tip" role="tooltip"><strong>{{ formato()(f.valor) }}</strong> {{ f.etiqueta }}@if (f.detalle) { · {{ f.detalle }} }</span>
                  </span>
                }
                <span class="valor">{{ formato()(f.valor) }}</span>
              </div>
            </li>
          }
        </ul>
      }
    }
  `,
  styles: `
    :host { display: block; }
    .encabezado { display: flex; justify-content: flex-end; margin: -0.25rem 0 0.25rem; }
    .sin-datos { color: var(--texto-suave); padding: 1rem 0; }
    .filas { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.7rem; }
    .fila-barra { display: grid; grid-template-columns: minmax(7rem, 40%) 1fr; gap: 0.75rem; align-items: center; }
    .rotulo { display: flex; flex-direction: column; min-width: 0; line-height: 1.25; }
    .nombre { color: var(--texto); font-weight: 600; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow-wrap: anywhere; }
    .detalle { color: var(--texto-suave); font-size: 0.82rem; }
    .pista { display: flex; align-items: center; gap: 0.5rem; min-width: 0; }
    /* El ancho se calcula sobre el espacio que deja el valor (7.5rem): así la barra mayor llena la pista y las demás guardan su proporción. */
    .marca { position: relative; display: block; flex: 0 0 auto; height: 22px; min-width: 4px; width: calc((100% - 7.5rem) * var(--p, 0)); border-radius: 0 4px 4px 0; transition: filter 0.15s; }
    .marca:hover, .marca:focus-visible { filter: brightness(1.12); }
    .valor { flex: 0 0 auto; color: var(--texto); font-weight: 650; font-variant-numeric: tabular-nums; white-space: nowrap; font-size: 0.92rem; }
    .tip { display: none; position: absolute; left: 0; bottom: calc(100% + 6px); z-index: 5; background: var(--marino); color: #fff; padding: 0.35rem 0.6rem; border-radius: var(--radio-sm); font-size: 0.85rem; white-space: nowrap; box-shadow: var(--sombra-alta); }
    .marca:hover .tip, .marca:focus-visible .tip { display: block; }
    @media (max-width: 520px) { .fila-barra { grid-template-columns: 1fr; gap: 0.25rem; } .rotulo { flex-direction: row; gap: 0.5rem; align-items: baseline; } }
  `
})
export class BarrasHorizontales {
  readonly filas = input.required<FilaBarra[]>();
  readonly formato = input.required<(valor: number) => string>();
  /** Qué se está midiendo, para la vista de tabla (por ejemplo "Cobrado"). */
  readonly nombreValor = input('Valor');
  readonly titulo = input('Detalle');
  readonly colorBase = input('var(--graf-azul)');
  readonly textoSinDatos = input('Todavía no hay datos para mostrar.');

  protected readonly verTabla = signal(false);
  private readonly maximo = computed(() => Math.max(0, ...this.filas().map((f) => f.valor)));

  /** Proporción (0 a 1) respecto de la barra mayor; las barras parten desde cero. */
  protected proporcion(valor: number): number {
    const max = this.maximo();
    return max > 0 ? Math.max(0, valor / max) : 0;
  }
}
