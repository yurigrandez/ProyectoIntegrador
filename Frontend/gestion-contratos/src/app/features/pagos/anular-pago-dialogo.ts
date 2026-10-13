import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { mensajeDeError } from '../../core/api/api.utils';
import { Pago } from '../../core/api/modelos';
import { PagosApi } from '../../core/api/pagos.api';
import { ToastService } from '../../core/ui/toast.service';
import { Campo } from '../../shared/campo/campo';
import { formatoDinero, formatoFecha } from '../../shared/formato';
import { Icono } from '../../shared/icono/icono';
import { Modal } from '../../shared/modal/modal';

/** Pide el motivo y anula un pago. La cuota vuelve al estado que corresponde según lo que quede pagado. */
@Component({
  selector: 'gc-anular-pago-dialogo',
  imports: [ReactiveFormsModule, Modal, Campo, Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <gc-modal titulo="Anular pago" (cerrar)="cancelar.emit()">
      <form id="form-anular" (submit)="alEnviar($event)" novalidate class="apilado">
        <div class="caja aviso"><gc-icono nombre="alerta" [tamano]="20" />
          <div>Se anulará el pago de <b>{{ dinero(pago().monto) }}</b> del {{ fecha(pago().fechaPago) }}
            (contrato {{ pago().codigoContrato }}). La cuota volverá a mostrar ese monto como pendiente.</div></div>
        @if (error()) {
          <div class="caja peligro" role="alert"><gc-icono nombre="circulo-x" [tamano]="20" /><div>{{ error() }}</div></div>
        }
        <gc-campo para="motivo-anulacion" etiqueta="¿Por qué se anula?" [control]="motivo" [requerido]="true"
                  ayuda="Por ejemplo: se registró dos veces o el monto estaba mal.">
          <textarea id="motivo-anulacion" [formControl]="motivo" rows="3" maxlength="500"></textarea>
        </gc-campo>
      </form>
      <ng-container pie>
        <button type="button" class="btn btn-secundario" (click)="cancelar.emit()">No anular</button>
        <button type="submit" form="form-anular" class="btn btn-peligro" [disabled]="guardando()">
          @if (guardando()) { <span class="girar"></span> Anulando… } @else { Anular pago }
        </button>
      </ng-container>
    </gc-modal>
  `
})
export class AnularPagoDialogo {
  private readonly api = inject(PagosApi);
  private readonly toast = inject(ToastService);

  readonly pago = input.required<Pago>();
  readonly anulado = output<void>();
  readonly cancelar = output<void>();

  protected readonly dinero = formatoDinero;
  protected readonly fecha = formatoFecha;
  protected readonly motivo = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(500)] });
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  /**
   * Este formulario no tiene `formGroup`, así que Angular no intercepta el envío: sin `preventDefault`
   * el navegador recargaría la página en lugar de anular el pago.
   */
  protected alEnviar(evento: Event): void {
    evento.preventDefault();
    this.anular();
  }

  protected anular(): void {
    if (this.motivo.invalid) {
      this.motivo.markAsTouched();
      return;
    }
    this.guardando.set(true);
    this.error.set(null);
    this.api.anular(this.pago().id, this.motivo.value.trim()).subscribe({
      next: () => {
        this.toast.ok('Pago anulado.');
        this.anulado.emit();
      },
      error: (e: unknown) => {
        this.guardando.set(false);
        this.error.set(mensajeDeError(e));
      }
    });
  }
}
