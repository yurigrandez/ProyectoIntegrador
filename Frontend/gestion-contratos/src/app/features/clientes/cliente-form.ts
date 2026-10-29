import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { startWith } from 'rxjs';
import { mensajeDeError } from '../../core/api/api.utils';
import { CatalogosApi } from '../../core/api/catalogos.api';
import { ClientesApi } from '../../core/api/clientes.api';
import { CatalogoItem } from '../../core/api/modelos';
import { ConCambios } from '../../core/ui/salir-sin-guardar.guard';
import { ToastService } from '../../core/ui/toast.service';
import { Campo } from '../../shared/campo/campo';
import { Icono } from '../../shared/icono/icono';
import { ayudaDeDocumento, validadorDocumento } from '../../shared/validadores';

const vacioANulo = (valor: string): string | null => valor.trim() || null;

@Component({
  selector: 'gc-cliente-form',
  imports: [ReactiveFormsModule, RouterLink, Campo, Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pagina">
      <header class="pagina-cabecera">
        <div>
          <h1>{{ esEdicion() ? 'Editar cliente' : 'Nuevo cliente' }}</h1>
          <p>{{ esEdicion() ? 'Corrija los datos y guarde los cambios.' : 'Complete los datos del cliente. Los campos con * son obligatorios.' }}</p>
        </div>
      </header>

      <form class="tarjeta" [formGroup]="formulario" (ngSubmit)="guardar()" novalidate>
        @if (error()) {
          <div class="caja peligro" role="alert"><gc-icono nombre="circulo-x" [tamano]="20" /><div><strong>No se guardó el cliente</strong>{{ error() }}</div></div>
        }

        <div class="formulario">
          <gc-campo para="codigo" etiqueta="Código" [control]="formulario.controls.codigo"
                    ayuda="Lo asigna el sistema al guardar el registro. No se puede modificar.">
            <input id="codigo" type="text" formControlName="codigo" readonly placeholder="Se genera al guardar" autocomplete="off" />
          </gc-campo>

          <gc-campo para="tipo-doc" etiqueta="Tipo de documento" [control]="formulario.controls.idTipoDocumento" [requerido]="true">
            <select id="tipo-doc" formControlName="idTipoDocumento">
              <option [ngValue]="null">Elija una opción…</option>
              @for (t of tiposDocumento(); track t.id) { <option [ngValue]="t.id">{{ t.nombre }}</option> }
            </select>
          </gc-campo>

          <gc-campo para="num-doc" etiqueta="Número de documento" [control]="formulario.controls.numeroDocumento" [requerido]="true"
                    [ayuda]="ayudaDocumento()">
            <input id="num-doc" type="text" formControlName="numeroDocumento" maxlength="25" autocomplete="off" inputmode="numeric" />
          </gc-campo>

          <gc-campo para="nombre" [etiqueta]="esEmpresa() ? 'Razón social' : 'Nombres'" [control]="formulario.controls.nombre" [requerido]="true">
            <input id="nombre" type="text" formControlName="nombre" maxlength="50" autocomplete="off" />
          </gc-campo>

          @if (!esEmpresa()) {
            <gc-campo para="paterno" etiqueta="Apellido paterno" [control]="formulario.controls.paterno">
              <input id="paterno" type="text" formControlName="paterno" maxlength="50" autocomplete="off" />
            </gc-campo>
            <gc-campo para="materno" etiqueta="Apellido materno" [control]="formulario.controls.materno">
              <input id="materno" type="text" formControlName="materno" maxlength="50" autocomplete="off" />
            </gc-campo>
          }
        </div>

        <div class="seccion-form">
          <h3>Datos de contacto</h3>
          <p>Opcionales, pero ayudan a comunicarse con el cliente.</p>
          <div class="formulario">
            <gc-campo para="telefono" etiqueta="Teléfono o celular" [control]="formulario.controls.telefono">
              <input id="telefono" type="tel" formControlName="telefono" maxlength="25" autocomplete="off" />
            </gc-campo>
            <gc-campo para="correo" etiqueta="Correo electrónico" [control]="formulario.controls.correo">
              <input id="correo" type="email" formControlName="correo" maxlength="50" autocomplete="off" />
            </gc-campo>
            <gc-campo class="completo" para="direccion" etiqueta="Dirección" [control]="formulario.controls.direccion">
              <input id="direccion" type="text" formControlName="direccion" maxlength="250" autocomplete="off" />
            </gc-campo>
            <gc-campo para="comprobante" etiqueta="Comprobante que recibe" [control]="formulario.controls.idTipoComprobante"
                      ayuda="Opcional. Qué documento se le entrega al cliente al pagar.">
              <select id="comprobante" formControlName="idTipoComprobante">
                <option [ngValue]="null">Sin definir</option>
                @for (t of tiposComprobante(); track t.id) { <option [ngValue]="t.id">{{ t.nombre }}</option> }
              </select>
            </gc-campo>
          </div>
        </div>

        <div class="acciones-form">
          <a class="btn btn-secundario" routerLink="/clientes">Cancelar</a>
          <button type="submit" class="btn btn-primario" [disabled]="guardando() || cargando()">
            @if (guardando()) { <span class="girar"></span> Guardando… } @else { <gc-icono nombre="check" [tamano]="18" />Guardar cliente }
          </button>
        </div>
      </form>
    </div>
  `
})
export class ClienteForm implements OnInit, ConCambios {
  private readonly api = inject(ClientesApi);
  private readonly catalogos = inject(CatalogosApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  /** Viene de la ruta (clientes/:id/editar); sin él, es un cliente nuevo. */
  readonly id = input<string>();
  private guardado = false;

  protected readonly tiposDocumento = signal<CatalogoItem[]>([]);
  protected readonly tiposComprobante = signal<CatalogoItem[]>([]);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly esEdicion = computed(() => !!this.id());

  protected readonly formulario = inject(FormBuilder).nonNullable.group({
    codigo: [{ value: '', disabled: true }],
    idTipoDocumento: [null as number | null, [Validators.required]],
    numeroDocumento: ['', [Validators.required, Validators.maxLength(25), validadorDocumento(() => this.abreviaturaDocumento())]],
    nombre: ['', [Validators.required, Validators.maxLength(50)]],
    paterno: ['', [Validators.maxLength(50)]],
    materno: ['', [Validators.maxLength(50)]],
    telefono: ['', [Validators.maxLength(25)]],
    correo: ['', [Validators.email, Validators.maxLength(50)]],
    direccion: ['', [Validators.maxLength(250)]],
    idTipoComprobante: [null as number | null]
  });

  private readonly tipoElegido = toSignal(this.formulario.controls.idTipoDocumento.valueChanges.pipe(startWith(null)), { initialValue: null });
  private readonly abreviaturaElegida = computed(() => {
    const id = this.tipoElegido() ?? this.formulario.controls.idTipoDocumento.value;
    return this.tiposDocumento().find((t) => t.id === id)?.abreviatura ?? null;
  });
  protected readonly esEmpresa = computed(() => this.abreviaturaElegida() === 'RUC');
  protected readonly ayudaDocumento = computed(() => ayudaDeDocumento(this.abreviaturaElegida()) ?? 'Elija primero el tipo de documento.');

  private abreviaturaDocumento(): string | null {
    const id = this.formulario.controls.idTipoDocumento.value;
    return this.tiposDocumento().find((t) => t.id === id)?.abreviatura ?? null;
  }

  ngOnInit(): void {
    this.catalogos.listar('tipos-documento').subscribe((t) => this.tiposDocumento.set(t));
    this.catalogos.listar('tipos-comprobante').subscribe((t) => this.tiposComprobante.set(t));
    // Al cambiar el tipo de documento se vuelve a validar el número con la regla del nuevo tipo.
    this.formulario.controls.idTipoDocumento.valueChanges.subscribe(() => this.formulario.controls.numeroDocumento.updateValueAndValidity());

    const id = this.id();
    if (id) {
      this.cargando.set(true);
      this.api.obtener(Number(id)).subscribe({
        next: (c) => {
          this.formulario.patchValue({
            codigo: c.codigo,
            idTipoDocumento: c.idTipoDocumento,
            numeroDocumento: c.numeroDocumento ?? '',
            nombre: c.nombre ?? '',
            paterno: c.paterno ?? '',
            materno: c.materno ?? '',
            telefono: c.telefono ?? '',
            correo: c.correo ?? '',
            direccion: c.direccion ?? '',
            idTipoComprobante: c.idTipoComprobante
          });
          this.cargando.set(false);
        },
        error: (e: unknown) => {
          this.error.set(mensajeDeError(e));
          this.cargando.set(false);
        }
      });
    }
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
      nombre: v.nombre.trim(),
      paterno: this.esEmpresa() ? null : vacioANulo(v.paterno ?? ''),
      materno: this.esEmpresa() ? null : vacioANulo(v.materno ?? ''),
      idTipoDocumento: v.idTipoDocumento,
      numeroDocumento: v.numeroDocumento.trim(),
      correo: vacioANulo(v.correo ?? ''),
      direccion: vacioANulo(v.direccion ?? ''),
      telefono: vacioANulo(v.telefono ?? ''),
      idTipoComprobante: v.idTipoComprobante
    };

    this.guardando.set(true);
    this.error.set(null);
    const id = this.id();
    const peticion = id ? this.api.actualizar(Number(id), datos) : this.api.crear(datos);
    peticion.subscribe({
      next: (cliente) => {
        this.toast.ok(id ? 'Cambios guardados.' : `Cliente ${cliente.codigo} registrado.`);
        this.guardado = true; // ya se guardó: salir de la pantalla no debe preguntar
        void this.router.navigate(['/clientes']);
      },
      error: (e: unknown) => {
        this.guardando.set(false);
        this.error.set(mensajeDeError(e));
      }
    });
  }
}
