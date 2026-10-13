import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { mensajeDeError } from '../../core/api/api.utils';
import { EmpresasApi } from '../../core/api/empresas.api';
import { ToastService } from '../../core/ui/toast.service';
import { Campo } from '../../shared/campo/campo';
import { Icono } from '../../shared/icono/icono';
import { validadorRuc } from '../../shared/validadores';

const vacioANulo = (valor: string | null): string | null => valor?.trim() || null;

@Component({
  selector: 'gc-empresa-form',
  imports: [ReactiveFormsModule, RouterLink, Campo, Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pagina">
      <header class="pagina-cabecera">
        <div>
          <h1>{{ esEdicion() ? 'Editar empresa' : 'Nueva empresa' }}</h1>
          <p>{{ esEdicion() ? 'Corrija los datos y guarde los cambios.' : 'Complete los datos de la empresa propietaria. Los campos con * son obligatorios.' }}</p>
        </div>
      </header>

      <form class="tarjeta" [formGroup]="formulario" (ngSubmit)="guardar()" novalidate>
        @if (error()) {
          <div class="caja peligro" role="alert"><gc-icono nombre="circulo-x" [tamano]="20" /><div><strong>No se guardó la empresa</strong>{{ error() }}</div></div>
        }

        <div class="formulario">
          @if (!esEdicion()) {
            <gc-campo para="codigo" etiqueta="Código" [control]="formulario.controls.codigo" [requerido]="true"
                      ayuda="Un código corto que no se repita, por ejemplo EMP002. No se podrá cambiar después.">
              <input id="codigo" type="text" formControlName="codigo" maxlength="15" autocomplete="off" />
            </gc-campo>
          }
          <gc-campo para="ruc" etiqueta="RUC" [control]="formulario.controls.ruc" [requerido]="true" ayuda="11 dígitos, empieza con 10 o 20">
            <input id="ruc" type="text" formControlName="ruc" maxlength="11" inputmode="numeric" autocomplete="off" />
          </gc-campo>
          <gc-campo class="completo" para="nombre" etiqueta="Razón social" [control]="formulario.controls.nombre" [requerido]="true">
            <input id="nombre" type="text" formControlName="nombre" maxlength="100" autocomplete="off" />
          </gc-campo>
          <gc-campo class="completo" para="direccion" etiqueta="Dirección" [control]="formulario.controls.direccion">
            <input id="direccion" type="text" formControlName="direccion" maxlength="250" autocomplete="off" />
          </gc-campo>
          <gc-campo para="telefono" etiqueta="Teléfono" [control]="formulario.controls.telefono">
            <input id="telefono" type="tel" formControlName="telefono" maxlength="25" autocomplete="off" />
          </gc-campo>
          <gc-campo para="movil" etiqueta="Celular" [control]="formulario.controls.movil">
            <input id="movil" type="tel" formControlName="movil" maxlength="15" autocomplete="off" />
          </gc-campo>
        </div>

        <div class="seccion-form">
          <h3>Persona de contacto</h3>
          <p>Opcional. Con quién se coordina en esta empresa.</p>
          <div class="formulario">
            <gc-campo class="completo" para="contacto" etiqueta="Nombre del contacto" [control]="formulario.controls.nombreContacto">
              <input id="contacto" type="text" formControlName="nombreContacto" maxlength="150" autocomplete="off" />
            </gc-campo>
            <gc-campo para="correo-contacto" etiqueta="Correo del contacto" [control]="formulario.controls.correoContacto">
              <input id="correo-contacto" type="email" formControlName="correoContacto" maxlength="50" autocomplete="off" />
            </gc-campo>
            <gc-campo para="tlf-contacto" etiqueta="Teléfono del contacto" [control]="formulario.controls.tlfContacto">
              <input id="tlf-contacto" type="tel" formControlName="tlfContacto" maxlength="15" autocomplete="off" />
            </gc-campo>
            <gc-campo para="movil-contacto" etiqueta="Celular del contacto" [control]="formulario.controls.movilContacto">
              <input id="movil-contacto" type="tel" formControlName="movilContacto" maxlength="15" autocomplete="off" />
            </gc-campo>
          </div>
        </div>

        <div class="acciones-form">
          <a class="btn btn-secundario" routerLink="/empresas">Cancelar</a>
          <button type="submit" class="btn btn-primario" [disabled]="guardando() || cargando()">
            @if (guardando()) { <span class="girar"></span> Guardando… } @else { <gc-icono nombre="check" [tamano]="18" />Guardar empresa }
          </button>
        </div>
      </form>
    </div>
  `
})
export class EmpresaForm implements OnInit {
  private readonly api = inject(EmpresasApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly id = input<string>();

  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly esEdicion = computed(() => !!this.id());

  protected readonly formulario = inject(FormBuilder).nonNullable.group({
    codigo: ['', [Validators.required, Validators.maxLength(15)]],
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    ruc: ['', [Validators.required, validadorRuc]],
    direccion: ['', [Validators.maxLength(250)]],
    telefono: ['', [Validators.maxLength(25)]],
    movil: ['', [Validators.maxLength(15)]],
    nombreContacto: ['', [Validators.maxLength(150)]],
    correoContacto: ['', [Validators.email, Validators.maxLength(50)]],
    tlfContacto: ['', [Validators.maxLength(15)]],
    movilContacto: ['', [Validators.maxLength(15)]]
  });

  ngOnInit(): void {
    const id = this.id();
    if (!id) return;
    this.formulario.controls.codigo.disable();
    this.cargando.set(true);
    this.api.obtener(Number(id)).subscribe({
      next: (e) => {
        this.formulario.patchValue({
          codigo: e.codigo,
          nombre: e.nombre ?? '',
          ruc: e.ruc ?? '',
          direccion: e.direccion ?? '',
          telefono: e.telefono ?? '',
          movil: e.movil ?? '',
          nombreContacto: e.nombreContacto ?? '',
          correoContacto: e.correoContacto ?? '',
          tlfContacto: e.tlfContacto ?? '',
          movilContacto: e.movilContacto ?? ''
        });
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.error.set(mensajeDeError(err));
        this.cargando.set(false);
      }
    });
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
      direccion: vacioANulo(v.direccion),
      ruc: v.ruc.trim(),
      telefono: vacioANulo(v.telefono),
      movil: vacioANulo(v.movil),
      nombreContacto: vacioANulo(v.nombreContacto),
      correoContacto: vacioANulo(v.correoContacto),
      tlfContacto: vacioANulo(v.tlfContacto),
      movilContacto: vacioANulo(v.movilContacto)
    };

    this.guardando.set(true);
    this.error.set(null);
    const id = this.id();
    const peticion = id ? this.api.actualizar(Number(id), datos) : this.api.crear({ ...datos, codigo: v.codigo.trim() });
    peticion.subscribe({
      next: (empresa) => {
        this.toast.ok(id ? 'Cambios guardados.' : `Empresa ${empresa.codigo} registrada.`);
        void this.router.navigate(['/empresas']);
      },
      error: (e: unknown) => {
        this.guardando.set(false);
        this.error.set(mensajeDeError(e));
      }
    });
  }
}
