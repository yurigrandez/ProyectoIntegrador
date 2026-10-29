import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { startWith } from 'rxjs';
import { mensajeDeError } from '../../core/api/api.utils';
import { ClientesApi } from '../../core/api/clientes.api';
import { ContratosApi } from '../../core/api/contratos.api';
import { LocalesApi } from '../../core/api/locales.api';
import { Cliente, Contrato, Local } from '../../core/api/modelos';
import { ConCambios } from '../../core/ui/salir-sin-guardar.guard';
import { ToastService } from '../../core/ui/toast.service';
import { Campo } from '../../shared/campo/campo';
import { contarCuotas, finDeContrato, mesesExactos } from '../../shared/fechas';
import { cantidad, formatoDinero, nombreDeCliente } from '../../shared/formato';
import { Icono } from '../../shared/icono/icono';
import { validadorFechasContrato } from '../../shared/validadores';

const DURACIONES = [6, 12, 18, 24, 36];
const nulo = (valor: string | null): string | null => valor?.trim() || null;
const numero = (valor: number | null): number => valor ?? 0;

@Component({
  selector: 'gc-contrato-form',
  imports: [ReactiveFormsModule, RouterLink, Campo, Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pagina">
      <header class="pagina-cabecera">
        <div>
          <h1>{{ esEdicion() ? 'Editar contrato ' + (contrato()?.codigo ?? '') : 'Nuevo contrato' }}</h1>
          <p>Complete los datos en orden, de arriba hacia abajo. Los campos con * son obligatorios. El código del contrato se asigna solo al guardar.</p>
        </div>
      </header>

      @if (noEditable()) {
        <div class="caja aviso"><gc-icono nombre="alerta" [tamano]="20" />
          <div><strong>Este contrato ya no se puede editar</strong>Solo se editan los contratos en borrador.
            <a [routerLink]="['/contratos', id()]">Volver al contrato</a></div></div>
      } @else {
        <div class="grilla contenido">
          <form class="tarjeta" [formGroup]="formulario" (ngSubmit)="guardar()" novalidate>
            @if (error()) {
              <div class="caja peligro" role="alert"><gc-icono nombre="circulo-x" [tamano]="20" /><div><strong>No se guardó el contrato</strong>{{ error() }}</div></div>
            }

            <h2 class="paso"><span>1</span>¿Quién alquila y qué local?</h2>
            <div class="formulario">
              <gc-campo para="cliente" etiqueta="Cliente" [control]="formulario.controls.idCliente" [requerido]="true">
                <select id="cliente" formControlName="idCliente">
                  <option [ngValue]="null">Elija un cliente…</option>
                  @for (c of clientes(); track c.id) { <option [ngValue]="c.id">{{ nombreCliente(c) }} ({{ c.codigo }})</option> }
                </select>
                @if (!cargandoListas() && clientes().length === 0) {
                  <span class="ayuda">Todavía no hay clientes. <a routerLink="/clientes/nuevo">Registre uno primero</a>.</span>
                }
              </gc-campo>
              <gc-campo para="local" etiqueta="Local" [control]="formulario.controls.idLocal" [requerido]="true"
                        ayuda="Los locales en mantenimiento no se pueden alquilar.">
                <select id="local" formControlName="idLocal">
                  <option [ngValue]="null">Elija un local…</option>
                  @for (l of locales(); track l.id) {
                    <option [ngValue]="l.id" [disabled]="l.estado === 'MAN'">{{ l.codigo }} · {{ l.direccion }}{{ l.interior ? ' Int. ' + l.interior : '' }}{{ l.estado === 'MAN' ? ' (en mantenimiento)' : '' }}</option>
                  }
                </select>
              </gc-campo>
            </div>

            <h2 class="paso"><span>2</span>¿Cuánto tiempo dura?</h2>
            <div class="formulario">
              <gc-campo para="inicio" etiqueta="Fecha de inicio" [control]="formulario.controls.fechaInicio" [requerido]="true"
                        ayuda="Día en que se entrega el local. La primera cuota se cobra completa.">
                <input id="inicio" type="date" formControlName="fechaInicio" />
              </gc-campo>
              <gc-campo para="duracion" etiqueta="Duración" ayuda="Elija una duración y la fecha de fin se calcula sola.">
                <select id="duracion" [value]="duracionElegida()" (change)="elegirDuracion($any($event.target).value)">
                  <option value="">Otra (elegir la fecha de fin)</option>
                  @for (m of duraciones; track m) { <option [value]="m">{{ m }} meses</option> }
                </select>
              </gc-campo>
              <gc-campo para="fin" etiqueta="Fecha de fin" [control]="formulario.controls.fechaFin" [requerido]="true"
                        [error]="errorDeFechas()">
                <input id="fin" type="date" formControlName="fechaFin" />
              </gc-campo>
              <gc-campo para="dia" etiqueta="Día de pago de cada mes" [control]="formulario.controls.diaPago" [requerido]="true"
                        ayuda="Del 1 al 31. Si un mes es más corto, la cuota vence el último día de ese mes.">
                <input id="dia" type="number" inputmode="numeric" min="1" max="31" formControlName="diaPago" />
              </gc-campo>
            </div>

            <h2 class="paso"><span>3</span>¿Cuánto se paga cada mes?</h2>
            <div class="formulario">
              <gc-campo para="alquiler" etiqueta="Alquiler (S/)" [control]="formulario.controls.montoAlquiler" [requerido]="true">
                <input id="alquiler" type="number" inputmode="decimal" step="0.01" min="0" formControlName="montoAlquiler" />
              </gc-campo>
              <gc-campo para="mantenimiento" etiqueta="Mantenimiento (S/)" [control]="formulario.controls.montoMantenimiento" ayuda="Opcional.">
                <input id="mantenimiento" type="number" inputmode="decimal" step="0.01" min="0" formControlName="montoMantenimiento" />
              </gc-campo>
              <gc-campo para="luz" etiqueta="Luz (S/)" [control]="formulario.controls.montoLuz" ayuda="Opcional. Monto fijo mensual.">
                <input id="luz" type="number" inputmode="decimal" step="0.01" min="0" formControlName="montoLuz" />
              </gc-campo>
              <gc-campo para="agua" etiqueta="Agua (S/)" [control]="formulario.controls.montoAgua" ayuda="Opcional. Monto fijo mensual.">
                <input id="agua" type="number" inputmode="decimal" step="0.01" min="0" formControlName="montoAgua" />
              </gc-campo>
              <gc-campo para="otros" etiqueta="Otros (S/)" [control]="formulario.controls.montoOtros" ayuda="Opcional.">
                <input id="otros" type="number" inputmode="decimal" step="0.01" min="0" formControlName="montoOtros" />
              </gc-campo>
            </div>

            <h2 class="paso"><span>4</span>Notas</h2>
            <gc-campo para="observaciones" etiqueta="Observaciones" [control]="formulario.controls.observaciones"
                      ayuda="Opcional. Acuerdos especiales, garantías u otros datos que convenga recordar.">
              <textarea id="observaciones" formControlName="observaciones" rows="3" maxlength="1000"></textarea>
            </gc-campo>

            <div class="acciones-form">
              <a class="btn btn-secundario" [routerLink]="esEdicion() ? ['/contratos', id()] : ['/contratos']">Cancelar</a>
              <button type="submit" class="btn btn-primario" [disabled]="guardando() || cargando()">
                @if (guardando()) { <span class="girar"></span> Guardando… } @else { <gc-icono nombre="check" [tamano]="18" />Guardar contrato }
              </button>
            </div>
          </form>

          <aside class="tarjeta resumen" aria-live="polite">
            <h2>Resumen</h2>
            <dl>
              <dt>Pago mensual</dt><dd class="grande">{{ dinero(totalMensual()) }}</dd>
              <dt>Duración</dt><dd>{{ cuotasTexto() }}</dd>
              <dt>Total del contrato</dt><dd>{{ dinero(totalMensual() * cuotas()) }}</dd>
            </dl>
            <div class="caja info"><gc-icono nombre="info" [tamano]="20" />
              <div>Al guardar, el contrato queda como <b>borrador</b>. Un administrador debe <b>autorizarlo</b> para que se generen las cuotas y el local pase a ocupado.</div></div>
          </aside>
        </div>
      }
    </div>
  `,
  styles: `
    .contenido { grid-template-columns: minmax(0, 1fr) 320px; align-items: start; }
    .paso { display: flex; align-items: center; gap: 0.6rem; margin: 1.25rem 0 0.75rem; font-size: 1.05rem; }
    .paso:first-of-type { margin-top: 0; }
    .paso span { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; background: var(--primario); color: #fff; font-size: 0.85rem; }
    .resumen { position: sticky; top: calc(var(--alto-barra) + 1rem); display: flex; flex-direction: column; gap: 1rem; }
    dl { margin: 0; display: grid; grid-template-columns: 1fr auto; gap: 0.5rem 1rem; align-items: baseline; }
    dt { color: var(--texto-suave); }
    dd { margin: 0; text-align: right; font-weight: 650; font-variant-numeric: tabular-nums; }
    dd.grande { font-size: 1.45rem; color: var(--marino); }
    @media (max-width: 1000px) { .contenido { grid-template-columns: 1fr; } .resumen { position: static; order: -1; } }
  `
})
export class ContratoForm implements OnInit, ConCambios {
  private readonly api = inject(ContratosApi);
  private readonly clientesApi = inject(ClientesApi);
  private readonly localesApi = inject(LocalesApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  /** Viene de la ruta (contratos/:id/editar); sin él, es un contrato nuevo. */
  readonly id = input<string>();
  private guardado = false;

  protected readonly duraciones = DURACIONES;
  protected readonly dinero = formatoDinero;
  protected readonly nombreCliente = nombreDeCliente;
  protected readonly clientes = signal<Cliente[]>([]);
  protected readonly locales = signal<Local[]>([]);
  protected readonly contrato = signal<Contrato | null>(null);
  protected readonly cargandoListas = signal(true);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly noEditable = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly esEdicion = computed(() => !!this.id());

  protected readonly formulario = inject(FormBuilder).nonNullable.group(
    {
      idCliente: [null as number | null, [Validators.required]],
      idLocal: [null as number | null, [Validators.required]],
      fechaInicio: ['', [Validators.required]],
      fechaFin: ['', [Validators.required]],
      diaPago: [1 as number | null, [Validators.required, Validators.min(1), Validators.max(31)]],
      montoAlquiler: [null as number | null, [Validators.required, Validators.min(0.01)]],
      montoMantenimiento: [null as number | null, [Validators.min(0)]],
      montoLuz: [null as number | null, [Validators.min(0)]],
      montoAgua: [null as number | null, [Validators.min(0)]],
      montoOtros: [null as number | null, [Validators.min(0)]],
      observaciones: ['', [Validators.maxLength(1000)]]
    },
    { validators: [validadorFechasContrato] }
  );

  private readonly valores = toSignal(this.formulario.valueChanges.pipe(startWith(null)), { initialValue: null });

  protected readonly totalMensual = computed(() => {
    this.valores();
    const v = this.formulario.getRawValue();
    return numero(v.montoAlquiler) + numero(v.montoMantenimiento) + numero(v.montoLuz) + numero(v.montoAgua) + numero(v.montoOtros);
  });
  protected readonly cuotas = computed(() => {
    this.valores();
    const v = this.formulario.getRawValue();
    return contarCuotas(v.fechaInicio, v.fechaFin);
  });
  protected readonly cuotasTexto = computed(() => (this.cuotas() > 0 ? cantidad(this.cuotas(), 'mes', 'meses') : 'Elija las fechas'));
  protected readonly duracionElegida = computed(() => {
    this.valores();
    const v = this.formulario.getRawValue();
    const meses = mesesExactos(v.fechaInicio, v.fechaFin);
    return meses !== null && DURACIONES.includes(meses) ? String(meses) : '';
  });

  protected errorDeFechas(): string | null {
    const f = this.formulario;
    return f.errors?.['rangoFechas'] && f.controls.fechaFin.touched ? (f.errors['rangoFechas'] as { mensaje: string }).mensaje : null;
  }

  ngOnInit(): void {
    this.clientesApi.listar({ tamano: 100 }).subscribe((r) => this.clientes.set(r.items));
    this.localesApi.listar({ tamano: 100 }).subscribe((r) => {
      this.locales.set(r.items);
      this.cargandoListas.set(false);
    });

    const id = this.id();
    if (!id) return;
    this.cargando.set(true);
    this.api.obtener(Number(id)).subscribe({
      next: (c) => {
        this.contrato.set(c);
        if (c.estado !== 'BOR') this.noEditable.set(true);
        this.formulario.patchValue({
          idCliente: c.idCliente,
          idLocal: c.idLocal,
          fechaInicio: c.fechaInicio.slice(0, 10),
          fechaFin: c.fechaFin.slice(0, 10),
          diaPago: c.diaPago,
          montoAlquiler: c.montoAlquiler,
          montoMantenimiento: c.montoMantenimiento || null,
          montoLuz: c.montoLuz || null,
          montoAgua: c.montoAgua || null,
          montoOtros: c.montoOtros || null,
          observaciones: c.observaciones ?? ''
        });
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      }
    });
  }

  protected elegirDuracion(valor: string): void {
    const inicio = this.formulario.controls.fechaInicio.value;
    if (!valor || !inicio) return;
    this.formulario.controls.fechaFin.setValue(finDeContrato(inicio, Number(valor)));
    this.formulario.controls.fechaFin.markAsDirty();
  }

  /** Hay datos escritos que todavía no se guardaron (lo consulta la guarda de salida). */
  hayCambiosSinGuardar(): boolean {
    return this.formulario.dirty && !this.guardado;
  }

  protected guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.error.set('Revise los datos marcados en rojo y vuelva a intentar.');
      return;
    }
    const v = this.formulario.getRawValue();
    const datos = {
      idCliente: v.idCliente,
      idLocal: v.idLocal,
      fechaInicio: v.fechaInicio,
      fechaFin: v.fechaFin,
      diaPago: v.diaPago,
      montoAlquiler: v.montoAlquiler,
      montoLuz: v.montoLuz ?? 0,
      montoAgua: v.montoAgua ?? 0,
      montoMantenimiento: v.montoMantenimiento ?? 0,
      montoOtros: v.montoOtros ?? 0,
      observaciones: nulo(v.observaciones)
    };

    this.guardando.set(true);
    this.error.set(null);
    const id = this.id();
    const peticion = id ? this.api.actualizar(Number(id), datos) : this.api.crear(datos);
    peticion.subscribe({
      next: (contrato) => {
        this.toast.ok(id ? 'Cambios guardados.' : `Contrato ${contrato.codigo} guardado como borrador. Falta que un administrador lo autorice.`);
        this.guardado = true; // ya se guardó: salir de la pantalla no debe preguntar
        void this.router.navigate(['/contratos', contrato.id]);
      },
      error: (e: unknown) => {
        this.guardando.set(false);
        this.error.set(mensajeDeError(e));
      }
    });
  }
}
