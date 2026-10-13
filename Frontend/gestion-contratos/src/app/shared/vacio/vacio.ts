import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icono, NombreIcono } from '../icono/icono';

/** Mensaje cuando no hay datos: explica qué pasó y, con un botón, cuál es el siguiente paso. */
@Component({
  selector: 'gc-vacio',
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="vacio">
      <span class="icono-vacio"><gc-icono [nombre]="icono()" [tamano]="28" /></span>
      <h3>{{ titulo() }}</h3>
      @if (texto()) {
        <p>{{ texto() }}</p>
      }
      <div class="accion"><ng-content /></div>
    </div>
  `,
  styles: `
    .vacio { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; text-align: center; padding: 2.5rem 1.25rem; }
    .icono-vacio { display: grid; place-items: center; width: 56px; height: 56px; border-radius: 50%; background: var(--primario-suave); color: var(--marino); }
    p { color: var(--texto-suave); max-width: 46ch; }
    .accion:empty { display: none; }
    .accion { margin-top: 0.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; }
  `
})
export class Vacio {
  readonly titulo = input.required<string>();
  readonly texto = input<string | null>(null);
  readonly icono = input<NombreIcono>('info');
}
