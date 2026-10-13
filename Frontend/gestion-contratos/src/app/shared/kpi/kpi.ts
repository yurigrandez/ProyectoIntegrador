import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icono, NombreIcono } from '../icono/icono';

/**
 * Ficha de un indicador: qué es (etiqueta), cuánto es (valor), contexto (detalle) y, opcionalmente,
 * una barra de avance. Con tono "alerta" resalta lo que requiere atención, siempre con icono y texto.
 */
@Component({
  selector: 'gc-kpi',
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="kpi" [class.alerta]="tono() === 'alerta'">
      <div class="cabecera">
        <span class="etiqueta">{{ etiqueta() }}</span>
        <gc-icono [nombre]="icono()" [tamano]="20" />
      </div>
      <strong class="valor">{{ valor() }}</strong>
      @if (progreso() !== null) {
        <div class="meter" role="meter" aria-valuemin="0" aria-valuemax="100" [attr.aria-valuenow]="progresoLimitado()" [attr.aria-label]="etiqueta()">
          <span class="relleno" [style.width.%]="progresoLimitado()"></span>
        </div>
      }
      @if (detalle()) {
        <span class="detalle">{{ detalle() }}</span>
      }
      <div class="extra"><ng-content /></div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .kpi { height: 100%; display: flex; flex-direction: column; gap: 0.35rem; padding: 1rem 1.1rem; background: var(--superficie); border: 1px solid var(--borde); border-radius: var(--radio); box-shadow: var(--sombra); }
    .cabecera { display: flex; justify-content: space-between; align-items: center; color: var(--texto-suave); }
    .etiqueta { font-size: 0.92rem; font-weight: 600; }
    .valor { font-size: 1.85rem; line-height: 1.15; color: var(--marino); font-weight: 700; }
    .detalle { color: var(--texto-suave); font-size: 0.9rem; }
    .meter { height: 8px; border-radius: 999px; background: var(--primario-suave); overflow: hidden; }
    .relleno { display: block; height: 100%; border-radius: 999px; background: var(--graf-azul); }
    .extra:empty { display: none; }
    .alerta { border-color: #e6b3ae; background: #fffafa; }
    .alerta .valor, .alerta .cabecera { color: var(--peligro); }
  `
})
export class Kpi {
  readonly etiqueta = input.required<string>();
  readonly valor = input.required<string>();
  readonly detalle = input<string | null>(null);
  readonly icono = input<NombreIcono>('grafico');
  readonly tono = input<'normal' | 'alerta'>('normal');
  /** Porcentaje (0 a 100) para dibujar una barra de avance; null para no mostrarla. */
  readonly progreso = input<number | null>(null);

  protected progresoLimitado(): number {
    return Math.max(0, Math.min(100, this.progreso() ?? 0));
  }
}
