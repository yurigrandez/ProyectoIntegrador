import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { Icono } from '../icono/icono';

export interface Segmento {
  etiqueta: string;
  valor: number;
  color: string;
  /** Aclaración que se muestra en la leyenda y el aviso (por ejemplo "con contrato vigente"). */
  descripcion?: string;
}

/**
 * Una sola barra dividida en partes (parte de un todo). Un hueco de 2 px separa los tramos; la leyenda siempre está
 * visible con los números, y cada tramo muestra su detalle al pasar el cursor o enfocarlo con el teclado.
 */
@Component({
  selector: 'gc-barra-apilada',
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (total() === 0) {
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
            <thead><tr><th>{{ nombreTotal() }}</th><th class="num">Cantidad</th><th class="num">Porcentaje</th></tr></thead>
            <tbody>
              @for (s of segmentos(); track s.etiqueta) {
                <tr><td>{{ s.etiqueta }}</td><td class="num">{{ s.valor }}</td><td class="num">{{ porcentaje(s.valor) }}%</td></tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="barra" role="img" [attr.aria-label]="resumenAccesible()">
          @for (s of visibles(); track s.etiqueta) {
            <span class="tramo" tabindex="0" [style.flex-grow]="s.valor" [style.background]="s.color">
              <span class="tip" role="tooltip"><strong>{{ s.valor }}</strong> {{ s.etiqueta.toLowerCase() }} ({{ porcentaje(s.valor) }}%)</span>
            </span>
          }
        </div>
        <ul class="leyenda">
          @for (s of segmentos(); track s.etiqueta) {
            <li>
              <span class="muestra" [style.background]="s.color"></span>
              <span class="texto"><strong>{{ s.valor }}</strong> {{ s.etiqueta }} <span class="pct">({{ porcentaje(s.valor) }}%)</span>
                @if (s.descripcion) { <small>{{ s.descripcion }}</small> }
              </span>
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
    .barra { display: flex; gap: 2px; height: 22px; border-radius: 4px; }
    .tramo { position: relative; display: block; flex-basis: 0; min-width: 6px; border-radius: 4px; transition: filter 0.15s; }
    .tramo:hover, .tramo:focus-visible { filter: brightness(1.12); }
    .tip { display: none; position: absolute; left: 50%; bottom: calc(100% + 6px); transform: translateX(-50%); z-index: 5; background: var(--marino); color: #fff; padding: 0.35rem 0.6rem; border-radius: var(--radio-sm); font-size: 0.85rem; white-space: nowrap; box-shadow: var(--sombra-alta); }
    .tramo:hover .tip, .tramo:focus-visible .tip { display: block; }
    .leyenda { list-style: none; margin: 1rem 0 0; padding: 0; display: grid; gap: 0.5rem; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); }
    .leyenda li { display: flex; gap: 0.6rem; align-items: flex-start; }
    .muestra { flex: 0 0 auto; width: 14px; height: 14px; margin-top: 0.2rem; border-radius: 3px; }
    .texto { display: block; line-height: 1.3; color: var(--texto); }
    .texto small { display: block; color: var(--texto-suave); font-size: 0.82rem; }
    .pct { color: var(--texto-suave); }
  `
})
export class BarraApilada {
  readonly segmentos = input.required<Segmento[]>();
  readonly nombreTotal = input('Estado');
  readonly textoSinDatos = input('Todavía no hay datos para mostrar.');

  protected readonly verTabla = signal(false);
  protected readonly total = computed(() => this.segmentos().reduce((suma, s) => suma + s.valor, 0));
  protected readonly visibles = computed(() => this.segmentos().filter((s) => s.valor > 0));
  protected readonly resumenAccesible = computed(() =>
    this.segmentos().map((s) => `${s.valor} ${s.etiqueta.toLowerCase()}`).join(', ')
  );

  protected porcentaje(valor: number): string {
    const total = this.total();
    return total === 0 ? '0' : String(Number(((valor / total) * 100).toFixed(1)));
  }
}
