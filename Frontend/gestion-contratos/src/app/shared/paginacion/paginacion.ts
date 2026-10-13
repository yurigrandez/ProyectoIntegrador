import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Icono } from '../icono/icono';

/** Páginas a mostrar alrededor de la actual: [1, '…', 4, 5, 6, '…', 20]. */
export function paginasVisibles(actual: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const paginas = new Set<number>([1, total, actual - 1, actual, actual + 1]);
  const ordenadas = [...paginas].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const resultado: (number | '…')[] = [];
  ordenadas.forEach((p, i) => {
    if (i > 0 && p - ordenadas[i - 1] > 1) resultado.push('…');
    resultado.push(p);
  });
  return resultado;
}

@Component({
  selector: 'gc-paginacion',
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (total() > 0) {
      <nav class="paginacion" aria-label="Paginación">
        <p class="resumen" aria-live="polite">Mostrando {{ desde() }}–{{ hasta() }} de {{ total() }}</p>
        @if (totalPaginas() > 1) {
          <div class="botones">
            <button type="button" class="btn btn-secundario btn-sm" [disabled]="pagina() <= 1"
                    (click)="cambiar.emit(pagina() - 1)" aria-label="Página anterior">
              <gc-icono nombre="flecha-izq" [tamano]="16" /><span class="texto-boton">Anterior</span>
            </button>
            @for (p of paginas(); track $index) {
              @if (p === '…') {
                <span class="puntos" aria-hidden="true">…</span>
              } @else {
                <button type="button" class="btn btn-sm numero" [class.btn-primario]="p === pagina()"
                        [class.btn-secundario]="p !== pagina()" [attr.aria-current]="p === pagina() ? 'page' : null"
                        [attr.aria-label]="'Página ' + p" (click)="cambiar.emit(p)">{{ p }}</button>
              }
            }
            <button type="button" class="btn btn-secundario btn-sm" [disabled]="pagina() >= totalPaginas()"
                    (click)="cambiar.emit(pagina() + 1)" aria-label="Página siguiente">
              <span class="texto-boton">Siguiente</span><gc-icono nombre="flecha-der" [tamano]="16" />
            </button>
          </div>
        }
      </nav>
    }
  `,
  styles: `
    .paginacion { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; padding: 0.75rem 1rem; border-top: 1px solid var(--borde); }
    .resumen { color: var(--texto-suave); font-size: 0.9rem; }
    .botones { display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap; }
    .numero { min-width: 36px; padding-inline: 0.5rem; }
    .puntos { color: var(--texto-suave); padding: 0 0.15rem; }
    @media (max-width: 520px) { .texto-boton { display: none; } .paginacion { justify-content: center; } }
  `
})
export class Paginacion {
  readonly pagina = input.required<number>();
  readonly tamano = input.required<number>();
  readonly total = input.required<number>();
  readonly cambiar = output<number>();

  protected readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.total() / this.tamano())));
  protected readonly desde = computed(() => (this.pagina() - 1) * this.tamano() + 1);
  protected readonly hasta = computed(() => Math.min(this.pagina() * this.tamano(), this.total()));
  protected readonly paginas = computed(() => paginasVisibles(this.pagina(), this.totalPaginas()));
}
