import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../core/ui/toast.service';
import { Icono } from '../icono/icono';

/** Contenedor de los avisos breves (arriba a la derecha; en el celular, abajo y a lo ancho). */
@Component({
  selector: 'gc-avisos',
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="avisos" role="status" aria-live="polite">
      @for (aviso of toast.avisos(); track aviso.id) {
        <div class="aviso" [class]="aviso.tipo">
          <gc-icono [nombre]="aviso.tipo === 'ok' ? 'circulo-check' : aviso.tipo === 'error' ? 'circulo-x' : 'info'" [tamano]="20" />
          <p>{{ aviso.texto }}</p>
          <button type="button" class="cerrar" (click)="toast.cerrar(aviso.id)" aria-label="Cerrar aviso">
            <gc-icono nombre="x" [tamano]="16" />
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .avisos { position: fixed; top: 1rem; right: 1rem; z-index: 200; display: flex; flex-direction: column; gap: 0.5rem; width: min(380px, calc(100vw - 2rem)); pointer-events: none; }
    .aviso { pointer-events: auto; display: flex; align-items: flex-start; gap: 0.6rem; padding: 0.8rem 0.9rem; border-radius: var(--radio); box-shadow: var(--sombra-alta); border: 1px solid transparent; background: var(--info-fondo); color: var(--info); animation: entrar 0.2s ease-out; }
    .aviso p { flex: 1; font-weight: 600; }
    .aviso.ok { background: var(--ok-fondo); color: var(--ok); }
    .aviso.error { background: var(--peligro-fondo); color: var(--peligro); }
    .cerrar { border: 0; background: transparent; color: inherit; cursor: pointer; padding: 2px; line-height: 0; border-radius: 4px; }
    @keyframes entrar { from { opacity: 0; transform: translateY(-6px); } }
    @media (max-width: 600px) { .avisos { top: auto; bottom: 1rem; right: 1rem; left: 1rem; width: auto; } }
  `
})
export class Avisos {
  protected readonly toast = inject(ToastService);
}
