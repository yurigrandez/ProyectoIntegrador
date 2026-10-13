import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { mensajeDeError } from '../../core/api/api.utils';
import { ContratosApi } from '../../core/api/contratos.api';
import { Contrato } from '../../core/api/modelos';
import { ToastService } from '../../core/ui/toast.service';
import { Campo } from '../../shared/campo/campo';
import { formatoFecha, hoyIso } from '../../shared/formato';
import { Icono } from '../../shared/icono/icono';
import { Modal } from '../../shared/modal/modal';

/** Termina un contrato vigente antes de su fecha de fin: anula las cuotas futuras sin pagos y libera el local. */
@Component({
  selector: 'gc-rescindir-dialogo',
  imports: [ReactiveFormsModule, Modal, Campo, Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <gc-modal titulo="Rescindir contrato" (cerrar)="cancelar.emit()">
      <form id="form-rescindir" [formGroup]="formulario" (ngSubmit)="rescindir()" novalidate class="apilado">
        <div class="caja aviso"><gc-icono nombre="alerta" [tamano]="20" />
          <div><strong>Esta acción no se puede deshacer</strong>
            El contrato {{ contrato().codigo }} terminará en la fecha que elija, se anularán las cuotas posteriores que no tengan pagos y el local quedará disponible.</div></div>
        @if (error()) {
          <div class="caja peligro" role="alert"><gc-icono nombre="circulo-x" [tamano]="20" /><div>{{ error() }}</div></div>
        }
        <gc-campo para="fecha-rescision" etiqueta="Fecha en que termina el alquiler" [control]="formulario.controls.fecha" [requerido]="true"
                  ayuda="Desde el inicio del contrato hasta hoy.">
          <input id="fecha-rescision" type="date" formControlName="fecha" [min]="minimo" [max]="hoy" />
        </gc-campo>
        <gc-campo para="motivo-rescision" etiqueta="Motivo" [control]="formulario.controls.motivo" [requerido]="true">
          <textarea id="motivo-rescision" formControlName="motivo" rows="3" maxlength="500"></textarea>
        </gc-campo>
      </form>
      <ng-container pie>
        <button type="button" class="btn btn-secundario" (click)="cancelar.emit()">No rescindir</button>
        <button type="submit" form="form-rescindir" class="btn btn-peligro" [disabled]="guardando()">
          @if (guardando()) { <span class="girar"></span> Rescindiendo… } @else { Rescindir contrato }
        </button>
      </ng-container>
    </gc-modal>
  `
})
export class RescindirDialogo implements OnInit {
  private readonly api = inject(ContratosApi);
  private readonly toast = inject(ToastService);

  readonly contrato = input.required<Contrato>();
  readonly rescindido = output<Contrato>();
  readonly cancelar = output<void>();

  protected readonly hoy = hoyIso();
  protected minimo = '';
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly formulario = new FormGroup({
    fecha: new FormControl<string>(this.hoy, { nonNullable: true, validators: [Validators.required, (c: AbstractControl) => this.validarFecha(c)] }),
    motivo: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(500)] })
  });

  ngOnInit(): void {
    this.minimo = this.contrato().fechaInicio.slice(0, 10);
    this.formulario.controls.fecha.updateValueAndValidity();
  }

  protected rescindir(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const { fecha, motivo } = this.formulario.getRawValue();
    this.guardando.set(true);
    this.error.set(null);
    this.api.rescindir(this.contrato().id, fecha, motivo.trim()).subscribe({
      next: (contrato) => {
        this.toast.ok(`Contrato ${contrato.codigo} rescindido el ${formatoFecha(fecha)}.`);
        this.rescindido.emit(contrato);
      },
      error: (e: unknown) => {
        this.guardando.set(false);
        this.error.set(mensajeDeError(e));
      }
    });
  }

  private validarFecha(control: AbstractControl): ValidationErrors | null {
    const valor = control.value as string;
    if (!valor) return null;
    if (valor > this.hoy) return { fecha: { mensaje: 'La fecha no puede ser posterior a hoy.' } };
    if (this.minimo && valor < this.minimo) return { fecha: { mensaje: `La fecha no puede ser anterior al inicio del contrato (${formatoFecha(this.minimo)}).` } };
    return null;
  }
}
