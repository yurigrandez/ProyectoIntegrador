import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { mensajeDeError } from '../../core/api/api.utils';
import { CatalogosApi } from '../../core/api/catalogos.api';
import { EmpresasApi } from '../../core/api/empresas.api';
import { LocalesApi } from '../../core/api/locales.api';
import { CatalogoItem, Empresa } from '../../core/api/modelos';
import { ConCambios } from '../../core/ui/salir-sin-guardar.guard';
import { ToastService } from '../../core/ui/toast.service';
import { Campo } from '../../shared/campo/campo';
import { Icono } from '../../shared/icono/icono';

const vacioANulo = (valor: string | null): string | null => valor?.trim() || null;

@Component({
  selector: 'gc-local-form',
  imports: [ReactiveFormsModule, RouterLink, Campo, Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pagina">
      <header class="pagina-cabecera">
        <div>
          <h1>{{ esEdicion() ? 'Editar local' : 'Nuevo local' }}</h1>
          <p>{{ esEdicion() ? 'Corrija los datos y guarde los cambios.' : 'Complete los datos del local. Los campos con * son obligatorios.' }}</p>
        </div>
      </header>

      <form class="tarjeta" [formGroup]="formulario" (ngSubmit)="guardar()" novalidate>
        @if (error()) {
          <div class="caja peligro" role="alert"><gc-icono nombre="circulo-x" [tamano]="20" /><div><strong>No se guardó el local</strong>{{ error() }}</div></div>
        }

        <div class="formulario">
          <gc-campo para="codigo" etiqueta="Código" [control]="formulario.controls.codigo"
                    ayuda="Lo asigna el sistema al guardar el registro. No se puede modificar.">
            <input id="codigo" type="text" formControlName="codigo" readonly placeholder="Se genera al guardar" autocomplete="off" />
          </gc-campo>
          <gc-campo para="empresa" etiqueta="Empresa propietaria" [control]="formulario.controls.idEmpresa" [requerido]="true">
            <select id="empresa" formControlName="idEmpresa">
              <option [ngValue]="null">Elija una empresa…</option>
              @for (e of empresas(); track e.id) { <option [ngValue]="e.id">{{ e.nombre }}</option> }
            </select>
          </gc-campo>
          <gc-campo para="tipo" etiqueta="Tipo de local" [control]="formulario.controls.idTipoLocal" [requerido]="true">
            <select id="tipo" formControlName="idTipoLocal">
              <option [ngValue]="null">Elija un tipo…</option>
              @for (t of tipos(); track t.id) { <option [ngValue]="t.id">{{ t.nombre }}</option> }
            </select>
          </gc-campo>
          <gc-campo class="completo" para="direccion" etiqueta="Dirección" [control]="formulario.controls.direccion">
            <input id="direccion" type="text" formControlName="direccion" maxlength="250" autocomplete="off" />
          </gc-campo>
          <gc-campo para="interior" etiqueta="Número de interior" [control]="formulario.controls.interior" ayuda="Opcional. Por ejemplo 101.">
            <input id="interior" type="number" inputmode="numeric" min="0" formControlName="interior" />
          </gc-campo>
          <gc-campo para="m2" etiqueta="Superficie (m²)" [control]="formulario.controls.totalM2" ayuda="Opcional. Metros cuadrados del local.">
            <input id="m2" type="number" inputmode="decimal" step="0.01" min="0.01" formControlName="totalM2" />
          </gc-campo>
          <gc-campo para="dimensiones" etiqueta="Dimensiones" [control]="formulario.controls.dimensiones" ayuda="Opcional. Por ejemplo 5 x 9 m.">
            <input id="dimensiones" type="text" formControlName="dimensiones" maxlength="150" autocomplete="off" />
          </gc-campo>
          <gc-campo para="pisos" etiqueta="Número de pisos" [control]="formulario.controls.nroPisos">
            <input id="pisos" type="number" inputmode="numeric" min="1" max="200" formControlName="nroPisos" />
          </gc-campo>
        </div>

        <div class="seccion-form">
          <h3>Estado del local</h3>
          @if (ocupado()) {
            <div class="caja ok"><gc-icono nombre="circulo-check" [tamano]="20" /><div><strong>Este local está ocupado</strong>Tiene un contrato vigente, por eso su estado no se puede cambiar a mano. Cambiará solo cuando el contrato termine.</div></div>
          } @else {
            <p>Elija <strong>Disponible</strong> si se puede alquilar, o <strong>En mantenimiento</strong> si no. El estado <strong>Ocupado</strong> lo pone el sistema cuando se autoriza un contrato.</p>
            <div class="formulario">
              <gc-campo para="estado" etiqueta="Estado" [control]="formulario.controls.idEstado">
                <select id="estado" formControlName="idEstado">
                  @for (e of estadosEditables(); track e.id) { <option [ngValue]="e.id">{{ e.nombre }}</option> }
                </select>
              </gc-campo>
            </div>
          }
        </div>

        <div class="acciones-form">
          <a class="btn btn-secundario" routerLink="/locales">Cancelar</a>
          <button type="submit" class="btn btn-primario" [disabled]="guardando() || cargando()">
            @if (guardando()) { <span class="girar"></span> Guardando… } @else { <gc-icono nombre="check" [tamano]="18" />Guardar local }
          </button>
        </div>
      </form>
    </div>
  `
})
export class LocalForm implements OnInit, ConCambios {
  private readonly api = inject(LocalesApi);
  private readonly empresasApi = inject(EmpresasApi);
  private readonly catalogos = inject(CatalogosApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly id = input<string>();
  private guardado = false;

  protected readonly empresas = signal<Empresa[]>([]);
  protected readonly tipos = signal<CatalogoItem[]>([]);
  protected readonly estados = signal<CatalogoItem[]>([]);
  protected readonly ocupado = signal(false);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly esEdicion = computed(() => !!this.id());
  protected readonly estadosEditables = computed(() => this.estados().filter((e) => e.abreviatura === 'DIS' || e.abreviatura === 'MAN'));

  protected readonly formulario = inject(FormBuilder).nonNullable.group({
    codigo: [{ value: '', disabled: true }],
    idEmpresa: [null as number | null, [Validators.required]],
    idTipoLocal: [null as number | null, [Validators.required]],
    direccion: ['', [Validators.maxLength(250)]],
    interior: [null as number | null, [Validators.min(0)]],
    totalM2: [null as number | null, [Validators.min(0.01)]],
    dimensiones: ['', [Validators.maxLength(150)]],
    nroPisos: [null as number | null, [Validators.min(1), Validators.max(200)]],
    idEstado: [null as number | null]
  });

  ngOnInit(): void {
    this.empresasApi.listar({ tamano: 100 }).subscribe((r) => this.empresas.set(r.items));
    this.catalogos.listar('tipos-local').subscribe((t) => this.tipos.set(t));
    this.catalogos.listar('estados').subscribe((e) => {
      this.estados.set(e);
      if (!this.esEdicion()) {
        this.formulario.controls.idEstado.setValue(e.find((x) => x.abreviatura === 'DIS')?.id ?? null);
      }
    });

    const id = this.id();
    if (!id) return;
    this.cargando.set(true);
    this.api.obtener(Number(id)).subscribe({
      next: (l) => {
        this.ocupado.set(l.estado === 'OCU');
        this.formulario.patchValue({
          codigo: l.codigo,
          idEmpresa: l.idEmpresa,
          idTipoLocal: l.idTipoLocal,
          direccion: l.direccion ?? '',
          interior: l.interior,
          totalM2: l.totalM2,
          dimensiones: l.dimensiones ?? '',
          nroPisos: l.nroPisos,
          idEstado: l.idEstado
        });
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      }
    });
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
      idTipoLocal: v.idTipoLocal,
      idEmpresa: v.idEmpresa,
      direccion: vacioANulo(v.direccion),
      interior: v.interior,
      totalM2: v.totalM2,
      dimensiones: vacioANulo(v.dimensiones),
      nroPisos: v.nroPisos,
      // Un local ocupado conserva su estado: lo controla el contrato, no esta pantalla.
      idEstado: this.ocupado() ? null : v.idEstado
    };

    this.guardando.set(true);
    this.error.set(null);
    const id = this.id();
    const peticion = id ? this.api.actualizar(Number(id), datos) : this.api.crear(datos);
    peticion.subscribe({
      next: (local) => {
        this.toast.ok(id ? 'Cambios guardados.' : `Local ${local.codigo} registrado.`);
        this.guardado = true; // ya se guardó: salir de la pantalla no debe preguntar
        void this.router.navigate(['/locales']);
      },
      error: (e: unknown) => {
        this.guardando.set(false);
        this.error.set(mensajeDeError(e));
      }
    });
  }
}
