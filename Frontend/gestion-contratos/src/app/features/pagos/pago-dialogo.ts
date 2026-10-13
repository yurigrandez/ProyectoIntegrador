import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { mensajeDeError } from '../../core/api/api.utils';
import { CatalogosApi } from '../../core/api/catalogos.api';
import { ContratosApi } from '../../core/api/contratos.api';
import { CatalogoItem, Contrato, Cuota, Pago } from '../../core/api/modelos';
import { PagosApi } from '../../core/api/pagos.api';
import { ToastService } from '../../core/ui/toast.service';
import { Campo } from '../../shared/campo/campo';
import { formatoDinero, formatoFecha, hoyIso, nombreConcepto } from '../../shared/formato';
import { Icono } from '../../shared/icono/icono';
import { Modal } from '../../shared/modal/modal';

/** Datos mínimos de la cuota que se va a pagar. */
export interface CuotaPorPagar {
  idCronogramaPago: number;
  codigoContrato: string;
  concepto: string | null;
  nroCuota: number;
  fechaVencimiento: string;
  saldo: number;
}

/**
 * Ventana para registrar un pago. Si recibe una cuota, la muestra y pide solo los datos del pago;
 * si no, primero deja elegir el contrato y la cuota que se está pagando.
 */
@Component({
  selector: 'gc-pago-dialogo',
  imports: [ReactiveFormsModule, Modal, Campo, Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <gc-modal titulo="Registrar un pago" (cerrar)="cancelar.emit()">
      <form id="form-pago" [formGroup]="formulario" (ngSubmit)="guardar()" novalidate class="apilado">
        @if (error()) {
          <div class="caja peligro" role="alert"><gc-icono nombre="circulo-x" [tamano]="20" /><div><strong>No se registró el pago</strong>{{ error() }}</div></div>
        }

        @if (cuotaFija(); as c) {
          <div class="resumen-cuota">
            <p class="suave">Contrato <strong>{{ c.codigoContrato }}</strong></p>
            <p><strong>{{ concepto(c.concepto) }}</strong> · cuota {{ c.nroCuota }} · vence el {{ fecha(c.fechaVencimiento) }}</p>
            <p>Falta pagar: <strong>{{ dinero(c.saldo) }}</strong></p>
          </div>
        } @else {
          <gc-campo para="pago-contrato" etiqueta="¿De qué contrato es el pago?" [requerido]="true">
            <select id="pago-contrato" (change)="elegirContrato($any($event.target).value)">
              <option value="">Elija un contrato…</option>
              @for (c of contratos(); track c.id) {
                <option [value]="c.id">{{ c.codigo }} · {{ c.cliente }} · {{ c.local }}</option>
              }
            </select>
          </gc-campo>
          @if (cargandoCuotas()) {
            <p class="suave"><span class="girar"></span> Buscando cuotas pendientes…</p>
          } @else if (contratoElegido() && cuotasPendientes().length === 0) {
            <div class="caja ok"><gc-icono nombre="circulo-check" [tamano]="20" /><div><strong>Este contrato está al día</strong>No tiene cuotas pendientes de pago.</div></div>
          } @else if (cuotasPendientes().length > 0) {
            <gc-campo para="pago-cuota" etiqueta="¿Qué cuota se está pagando?" [requerido]="true"
                      ayuda="Se muestran las cuotas que todavía tienen saldo, de la más antigua a la más reciente.">
              <select id="pago-cuota" (change)="elegirCuota($any($event.target).value)">
                <option value="">Elija una cuota…</option>
                @for (q of cuotasPendientes(); track q.id) {
                  <option [value]="q.id">Cuota {{ q.nroCuota }} · {{ concepto(q.concepto) }} · vence {{ fecha(q.fechaVencimiento) }} · debe {{ dinero(q.saldo) }}</option>
                }
              </select>
            </gc-campo>
          }
        }

        @if (cuotaActiva()) {
          <div class="formulario">
            <gc-campo para="pago-monto" etiqueta="Monto que se paga (S/)" [control]="formulario.controls.monto" [requerido]="true"
                      [ayuda]="'Puede pagar solo una parte. Como máximo ' + dinero(cuotaActiva()!.saldo) + '.'">
              <input id="pago-monto" type="number" inputmode="decimal" step="0.01" min="0.01" formControlName="monto" />
            </gc-campo>
            <gc-campo para="pago-fecha" etiqueta="Fecha del pago" [control]="formulario.controls.fechaPago" [requerido]="true"
                      ayuda="No puede ser una fecha futura.">
              <input id="pago-fecha" type="date" formControlName="fechaPago" [max]="hoy" />
            </gc-campo>
            <gc-campo para="pago-medio" etiqueta="¿Cómo pagó?" [control]="formulario.controls.idMedioPago" [requerido]="true">
              <select id="pago-medio" formControlName="idMedioPago">
                <option [ngValue]="null">Elija una opción…</option>
                @for (m of medios(); track m.id) { <option [ngValue]="m.id">{{ m.nombre }}</option> }
              </select>
            </gc-campo>
            <gc-campo para="pago-operacion" etiqueta="Número de operación" [control]="formulario.controls.nroOperacion"
                      ayuda="Opcional. El número de la transferencia, depósito o voucher.">
              <input id="pago-operacion" type="text" formControlName="nroOperacion" maxlength="50" autocomplete="off" />
            </gc-campo>
            <gc-campo class="completo" para="pago-nota" etiqueta="Observación" [control]="formulario.controls.observacion"
                      ayuda="Opcional. Cualquier dato que ayude a recordar este pago.">
              <textarea id="pago-nota" formControlName="observacion" maxlength="500" rows="2"></textarea>
            </gc-campo>
          </div>
        }
      </form>
      <ng-container pie>
        <button type="button" class="btn btn-secundario" (click)="cancelar.emit()">Cancelar</button>
        <button type="submit" form="form-pago" class="btn btn-primario" [disabled]="guardando() || !cuotaActiva()">
          @if (guardando()) { <span class="girar"></span> Guardando… } @else { Registrar pago }
        </button>
      </ng-container>
    </gc-modal>
  `,
  styles: `
    .resumen-cuota { background: var(--primario-tenue); border: 1px solid var(--borde); border-radius: var(--radio-sm); padding: 0.8rem 1rem; display: flex; flex-direction: column; gap: 0.15rem; }
  `
})
export class PagoDialogo implements OnInit {
  private readonly pagos = inject(PagosApi);
  private readonly contratosApi = inject(ContratosApi);
  private readonly catalogos = inject(CatalogosApi);
  private readonly toast = inject(ToastService);

  /** Cuota a pagar; si es null se muestra primero el selector de contrato y cuota. */
  readonly cuota = input<CuotaPorPagar | null>(null);
  readonly registrado = output<Pago>();
  readonly cancelar = output<void>();

  protected readonly hoy = hoyIso();
  protected readonly dinero = formatoDinero;
  protected readonly fecha = formatoFecha;
  protected readonly concepto = nombreConcepto;

  protected readonly medios = signal<CatalogoItem[]>([]);
  protected readonly contratos = signal<Contrato[]>([]);
  protected readonly contratoElegido = signal<Contrato | null>(null);
  protected readonly cuotasPendientes = signal<Cuota[]>([]);
  protected readonly cuotaElegida = signal<Cuota | null>(null);
  protected readonly cargandoCuotas = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly cuotaFija = computed(() => this.cuota());
  /** La cuota que se está pagando, venga fija o elegida en la lista. */
  protected readonly cuotaActiva = computed<CuotaPorPagar | null>(() => {
    const fija = this.cuota();
    if (fija) return fija;
    const elegida = this.cuotaElegida();
    const contrato = this.contratoElegido();
    return elegida && contrato
      ? {
          idCronogramaPago: elegida.id,
          codigoContrato: contrato.codigo,
          concepto: elegida.concepto,
          nroCuota: elegida.nroCuota,
          fechaVencimiento: elegida.fechaVencimiento,
          saldo: elegida.saldo
        }
      : null;
  });

  protected readonly formulario = inject(FormBuilder).group({
    monto: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01), (c) => this.validarSaldo(c)]),
    fechaPago: new FormControl<string>(this.hoy, { nonNullable: true, validators: [Validators.required, (c) => this.validarFecha(c)] }),
    idMedioPago: new FormControl<number | null>(null, [Validators.required]),
    nroOperacion: new FormControl<string>('', { nonNullable: true, validators: [Validators.maxLength(50)] }),
    observacion: new FormControl<string>('', { nonNullable: true, validators: [Validators.maxLength(500)] })
  });

  ngOnInit(): void {
    this.catalogos.listar('medios-pago').subscribe((medios) => {
      this.medios.set(medios);
      const efectivo = medios.find((m) => m.abreviatura === 'EFE');
      if (efectivo) this.formulario.controls.idMedioPago.setValue(efectivo.id);
    });

    const fija = this.cuota();
    if (fija) {
      this.formulario.controls.monto.setValue(fija.saldo);
    } else {
      this.contratosApi.listar({ tamano: 100 }).subscribe({
        next: (r) => this.contratos.set(r.items.filter((c) => ['VIG', 'VEN', 'RES'].includes(c.estado ?? ''))),
        error: (e: unknown) => this.error.set(mensajeDeError(e))
      });
    }
  }

  protected elegirContrato(valor: string): void {
    this.cuotaElegida.set(null);
    this.cuotasPendientes.set([]);
    this.formulario.controls.monto.reset(null);
    const contrato = this.contratos().find((c) => c.id === Number(valor)) ?? null;
    this.contratoElegido.set(contrato);
    if (!contrato) return;
    this.cargandoCuotas.set(true);
    this.contratosApi.cronograma(contrato.id).subscribe({
      next: (cuotas) => {
        this.cuotasPendientes.set(cuotas.filter((q) => q.saldo > 0).sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento)));
        this.cargandoCuotas.set(false);
      },
      error: (e: unknown) => {
        this.cargandoCuotas.set(false);
        this.error.set(mensajeDeError(e));
      }
    });
  }

  protected elegirCuota(valor: string): void {
    const cuota = this.cuotasPendientes().find((q) => q.id === Number(valor)) ?? null;
    this.cuotaElegida.set(cuota);
    this.formulario.controls.monto.setValue(cuota?.saldo ?? null);
  }

  protected guardar(): void {
    const cuota = this.cuotaActiva();
    if (!cuota) return;
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const v = this.formulario.getRawValue();
    this.guardando.set(true);
    this.error.set(null);
    this.pagos
      .registrar({
        idCronogramaPago: cuota.idCronogramaPago,
        idMedioPago: v.idMedioPago!,
        fechaPago: v.fechaPago,
        monto: v.monto!,
        nroOperacion: v.nroOperacion.trim() || null,
        observacion: v.observacion.trim() || null
      })
      .subscribe({
        next: (pago) => {
          this.toast.ok(`Pago de ${formatoDinero(pago.monto)} registrado.`);
          this.registrado.emit(pago);
        },
        error: (e: unknown) => {
          this.guardando.set(false);
          this.error.set(mensajeDeError(e));
        }
      });
  }

  private validarSaldo(control: AbstractControl): ValidationErrors | null {
    const saldo = this.cuotaActiva()?.saldo;
    const valor = control.value as number | null;
    return saldo !== undefined && valor !== null && valor > saldo + 0.0001
      ? { saldo: { mensaje: `El monto no puede ser mayor que lo que falta pagar (${formatoDinero(saldo)}).` } }
      : null;
  }

  private validarFecha(control: AbstractControl): ValidationErrors | null {
    const valor = control.value as string;
    return valor && valor > this.hoy ? { fecha: { mensaje: 'La fecha de pago no puede ser futura.' } } : null;
  }
}
