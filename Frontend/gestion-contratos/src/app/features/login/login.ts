import { ChangeDetectionStrategy, Component, inject, isDevMode, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { mensajeDeError } from '../../core/api/api.utils';
import { AuthService } from '../../core/auth/auth.service';
import { Campo } from '../../shared/campo/campo';
import { Icono } from '../../shared/icono/icono';

@Component({
  selector: 'gc-login',
  imports: [ReactiveFormsModule, Campo, Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pantalla">
      <section class="marca" aria-hidden="true">
        <img src="logo-completo.png" alt="" width="260" />
        <h2>Alquileres bajo control</h2>
        <ul>
          <li><gc-icono nombre="circulo-check" [tamano]="20" />Contratos y cuotas siempre a la vista</li>
          <li><gc-icono nombre="circulo-check" [tamano]="20" />Registre pagos en segundos</li>
          <li><gc-icono nombre="circulo-check" [tamano]="20" />Sepa quién debe y cuánto</li>
        </ul>
      </section>

      <main class="formulario-login">
        <img class="logo-movil" src="logo-completo.png" alt="DA Soluciones e Inversiones" width="190" />
        <h1>Ingrese a su cuenta</h1>
        <p class="suave">Use el usuario y la contraseña que le dio el administrador.</p>

        @if (motivo === 'vencida') {
          <div class="caja aviso" role="status">
            <gc-icono nombre="reloj" [tamano]="20" />
            <div><strong>Su sesión terminó</strong>Por seguridad se cierra después de un tiempo. Ingrese de nuevo para continuar.</div>
          </div>
        }
        @if (error()) {
          <div class="caja peligro" role="alert">
            <gc-icono nombre="circulo-x" [tamano]="20" />
            <div><strong>No pudimos ingresar</strong>{{ error() }}</div>
          </div>
        }

        <form [formGroup]="formulario" (ngSubmit)="ingresar()" novalidate class="apilado">
          <gc-campo para="usuario" etiqueta="Usuario" [control]="formulario.controls.codigo" [requerido]="true"
                    ayuda="Por ejemplo: OPERADOR">
            <input id="usuario" type="text" formControlName="codigo" autocomplete="username" autocapitalize="characters"
                   spellcheck="false" maxlength="15" />
          </gc-campo>

          <gc-campo para="clave" etiqueta="Contraseña" [control]="formulario.controls.clave" [requerido]="true">
            <div class="con-boton">
              <input id="clave" [type]="verClave() ? 'text' : 'password'" formControlName="clave"
                     autocomplete="current-password" maxlength="100" />
              <button type="button" class="btn btn-fantasma btn-sm" (click)="verClave.set(!verClave())"
                      [attr.aria-pressed]="verClave()" [attr.aria-label]="verClave() ? 'Ocultar contraseña' : 'Mostrar contraseña'">
                <gc-icono [nombre]="verClave() ? 'candado' : 'ojo'" [tamano]="20" />{{ verClave() ? 'Ocultar' : 'Mostrar' }}
              </button>
            </div>
          </gc-campo>

          <button type="submit" class="btn btn-primario btn-bloque" [disabled]="cargando()">
            @if (cargando()) { <span class="girar"></span> Ingresando… } @else { Ingresar }
          </button>
        </form>

        @if (esDesarrollo) {
          <p class="demo suave">Entorno de demostración: usuario <strong>ADMIN</strong> u <strong>OPERADOR</strong>, contraseña <strong>Demo123*</strong>.</p>
        }
      </main>
    </div>
  `,
  styles: `
    .pantalla { min-height: 100dvh; display: grid; grid-template-columns: minmax(320px, 5fr) minmax(360px, 6fr); }
    .marca { display: flex; flex-direction: column; justify-content: center; gap: 1.25rem; padding: 3rem; background: linear-gradient(160deg, var(--marino), #254c61); color: #fff; }
    .marca img { background: #fff; border-radius: var(--radio); padding: 0.75rem 1rem; width: min(260px, 100%); height: auto; }
    .marca h2 { color: #fff; font-size: 1.7rem; }
    .marca ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.75rem; font-size: 1.05rem; }
    .marca li { display: flex; align-items: center; gap: 0.6rem; }
    .formulario-login { display: flex; flex-direction: column; justify-content: center; gap: 1rem; width: min(100%, 440px); margin: 0 auto; padding: 2rem 1.25rem; }
    .logo-movil { display: none; height: auto; align-self: center; }
    .con-boton { display: flex; gap: 0.5rem; align-items: center; }
    .con-boton input { flex: 1; }
    .demo { font-size: 0.88rem; padding: 0.75rem; background: var(--primario-tenue); border-radius: var(--radio-sm); }
    @media (max-width: 860px) {
      .pantalla { grid-template-columns: 1fr; }
      .marca { display: none; }
      .logo-movil { display: block; }
      .formulario-login { justify-content: flex-start; padding-top: 2rem; }
    }
  `
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly motivo = this.ruta.snapshot.queryParamMap.get('motivo');
  protected readonly esDesarrollo = isDevMode();
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly verClave = signal(false);

  protected readonly formulario = inject(FormBuilder).nonNullable.group({
    codigo: ['', [Validators.required, Validators.maxLength(15)]],
    clave: ['', [Validators.required]]
  });

  protected ingresar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    const { codigo, clave } = this.formulario.getRawValue();
    this.auth.login(codigo.trim(), clave).subscribe({
      next: () => {
        // Solo se acepta volver a una ruta interna, para no redirigir a sitios externos.
        const destino = this.ruta.snapshot.queryParamMap.get('volverA');
        void this.router.navigateByUrl(destino && destino.startsWith('/') && !destino.startsWith('//') ? destino : '/panel');
      },
      error: (e: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(e));
      }
    });
  }
}
