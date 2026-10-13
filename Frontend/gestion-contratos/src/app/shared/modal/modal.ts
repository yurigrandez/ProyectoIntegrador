import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, ElementRef, HostListener, OnDestroy, afterNextRender, inject, input, output, viewChild
} from '@angular/core';
import { Icono } from '../icono/icono';

const ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let contador = 0;

/**
 * Ventana emergente accesible: se cierra con Esc o tocando fuera, mantiene el foco dentro y lo devuelve
 * al elemento que la abrió. Uso: <gc-modal titulo="..."> contenido <div pie> botones </div> </gc-modal>
 */
@Component({
  selector: 'gc-modal',
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fondo" (click)="cerrar.emit()"></div>
    <section #ventana class="ventana" [class.ancha]="ancha()" role="dialog" aria-modal="true" [attr.aria-labelledby]="idTitulo"
             (keydown)="atraparTab($event)">
      <header class="cabecera">
        <h2 [id]="idTitulo">{{ titulo() }}</h2>
        <button type="button" class="btn btn-fantasma btn-sm cerrar" (click)="cerrar.emit()" aria-label="Cerrar ventana">
          <gc-icono nombre="x" [tamano]="20" />
        </button>
      </header>
      <div class="cuerpo"><ng-content /></div>
      <footer class="pie"><ng-content select="[pie]" /></footer>
    </section>
  `,
  styles: `
    :host { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 1rem; }
    .fondo { position: absolute; inset: 0; background: rgb(18 38 48 / 55%); }
    .ventana {
      position: relative; width: min(100%, 520px); max-height: calc(100dvh - 2rem); display: flex; flex-direction: column;
      background: var(--superficie); border-radius: var(--radio); box-shadow: var(--sombra-alta);
    }
    .ventana.ancha { width: min(100%, 760px); }
    .cabecera { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 1.25rem; border-bottom: 1px solid var(--borde); }
    .cuerpo { padding: 1.25rem; overflow-y: auto; }
    .pie { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 0.75rem; padding: 0.9rem 1.25rem; border-top: 1px solid var(--borde); background: var(--primario-tenue); border-radius: 0 0 var(--radio) var(--radio); }
    .pie:empty { display: none; }
    @media (max-width: 520px) { :host { align-items: end; padding: 0; } .ventana, .ventana.ancha { width: 100%; max-height: 92dvh; border-radius: var(--radio) var(--radio) 0 0; } .pie > * { flex: 1 1 auto; } }
  `
})
export class Modal implements OnDestroy {
  private readonly documento = inject(DOCUMENT);
  private readonly ventana = viewChild.required<ElementRef<HTMLElement>>('ventana');
  private readonly elementoPrevio = this.documento.activeElement as HTMLElement | null;
  private readonly overflowPrevio = this.documento.body.style.overflow;

  readonly titulo = input.required<string>();
  readonly ancha = input(false);
  readonly cerrar = output<void>();
  protected readonly idTitulo = `gc-modal-titulo-${++contador}`;

  constructor() {
    this.documento.body.style.overflow = 'hidden';
    afterNextRender(() => {
      const ventana = this.ventana().nativeElement;
      // Se enfoca el primer campo del contenido; si no hay, el primer botón de la ventana.
      const primero = ventana.querySelector<HTMLElement>(`.cuerpo ${ENFOCABLES.split(', ').join(', .cuerpo ')}`) ??
        ventana.querySelector<HTMLElement>(ENFOCABLES);
      (primero ?? ventana).focus();
    });
  }

  @HostListener('document:keydown.escape')
  protected alPresionarEscape(): void {
    this.cerrar.emit();
  }

  /** Mantiene el recorrido con Tab dentro de la ventana. */
  protected atraparTab(evento: KeyboardEvent): void {
    if (evento.key !== 'Tab') return;
    const elementos = [...this.ventana().nativeElement.querySelectorAll<HTMLElement>(ENFOCABLES)];
    if (elementos.length === 0) return;
    const primero = elementos[0];
    const ultimo = elementos[elementos.length - 1];
    const activo = this.documento.activeElement;
    if (evento.shiftKey && activo === primero) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && activo === ultimo) {
      evento.preventDefault();
      primero.focus();
    }
  }

  ngOnDestroy(): void {
    this.documento.body.style.overflow = this.overflowPrevio;
    this.elementoPrevio?.focus?.();
  }
}
