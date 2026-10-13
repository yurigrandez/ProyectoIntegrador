import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ConfirmService } from '../../core/ui/confirm.service';
import { Modal } from '../modal/modal';

/** Ventana de confirmación global; se muestra cuando algún componente llama a ConfirmService.confirmar(). */
@Component({
  selector: 'gc-confirmacion',
  imports: [Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (servicio.pedido(); as pedido) {
      <gc-modal [titulo]="pedido.titulo" (cerrar)="servicio.responder(false)">
        <p>{{ pedido.mensaje }}</p>
        <ng-container pie>
          <button type="button" class="btn btn-secundario" (click)="servicio.responder(false)">Cancelar</button>
          <button type="button" class="btn" [class.btn-peligro]="pedido.peligro" [class.btn-primario]="!pedido.peligro"
                  (click)="servicio.responder(true)">{{ pedido.textoConfirmar ?? 'Confirmar' }}</button>
        </ng-container>
      </gc-modal>
    }
  `
})
export class Confirmacion {
  protected readonly servicio = inject(ConfirmService);
}
