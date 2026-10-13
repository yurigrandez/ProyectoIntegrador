import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { mensajeDeError } from '../../core/api/api.utils';
import { EmpresasApi } from '../../core/api/empresas.api';
import { Empresa, Paginado } from '../../core/api/modelos';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { Icono } from '../../shared/icono/icono';
import { Paginacion } from '../../shared/paginacion/paginacion';
import { Vacio } from '../../shared/vacio/vacio';

const TAMANO_PAGINA = 15;

@Component({
  selector: 'gc-empresas-lista',
  imports: [ReactiveFormsModule, RouterLink, Icono, Paginacion, Vacio],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pagina">
      <header class="pagina-cabecera">
        <div>
          <h1>Empresas</h1>
          <p>Las empresas dueñas de los locales que se alquilan. Cada local pertenece a una empresa.</p>
        </div>
        @if (auth.esAdmin()) {
          <a class="btn btn-primario" routerLink="/empresas/nueva"><gc-icono nombre="mas" [tamano]="18" />Nueva empresa</a>
        }
      </header>

      @if (!auth.esAdmin()) {
        <div class="caja info"><gc-icono nombre="info" [tamano]="20" /><div><strong>Solo consulta</strong>Las empresas las crea y modifica un administrador.</div></div>
      }

      <div class="tarjeta">
        <div class="barra-filtros">
          <div class="campo buscar">
            <label for="buscar-empresa">Buscar</label>
            <input id="buscar-empresa" type="search" [formControl]="texto" placeholder="Razón social, código o RUC" autocomplete="off" />
          </div>
        </div>
      </div>

      @if (error()) {
        <div class="caja peligro" role="alert"><gc-icono nombre="circulo-x" [tamano]="20" /><div><strong>No se pudo cargar la lista</strong>{{ error() }}
          <button type="button" class="btn btn-secundario btn-sm" (click)="cargar()">Reintentar</button></div></div>
      }

      <div class="tarjeta tarjeta-plana" [class.cargando]="cargando()">
        @if (datos(); as d) {
          @if (d.items.length === 0) {
            <gc-vacio icono="edificio" [titulo]="texto.value ? 'No hay empresas con esa búsqueda' : 'Todavía no hay empresas'"
                      [texto]="texto.value ? 'Pruebe con otro texto.' : 'Un administrador debe registrar la primera empresa.'">
              @if (!texto.value && auth.esAdmin()) {
                <a class="btn btn-primario" routerLink="/empresas/nueva"><gc-icono nombre="mas" [tamano]="18" />Registrar empresa</a>
              }
            </gc-vacio>
          } @else {
            <div class="tabla-envoltorio">
              <table class="tabla tabla-tarjetas">
                <thead><tr><th>Código</th><th>Razón social</th><th>RUC</th><th>Contacto</th><th><span class="sr-only">Acciones</span></th></tr></thead>
                <tbody>
                  @for (e of d.items; track e.id) {
                    <tr>
                      <td data-label="Código"><strong>{{ e.codigo }}</strong></td>
                      <td data-label="Razón social">{{ e.nombre }}</td>
                      <td data-label="RUC">{{ e.ruc }}</td>
                      <td data-label="Contacto">{{ e.nombreContacto || e.telefono || '—' }}</td>
                      <td class="acciones">
                        <a class="btn btn-fantasma btn-sm" routerLink="/locales" [queryParams]="{ idEmpresa: e.id }"><gc-icono nombre="tienda" [tamano]="16" />Locales</a>
                        @if (auth.esAdmin()) {
                          <a class="btn btn-secundario btn-sm" [routerLink]="['/empresas', e.id, 'editar']"><gc-icono nombre="editar" [tamano]="16" />Editar</a>
                          <button type="button" class="btn btn-fantasma btn-sm" (click)="desactivar(e)" [attr.aria-label]="'Eliminar ' + e.nombre">
                            <gc-icono nombre="papelera" [tamano]="16" />
                          </button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <gc-paginacion [pagina]="d.pagina" [tamano]="d.tamano" [total]="d.total" (cambiar)="irAPagina($event)" />
          }
        } @else if (cargando()) {
          <p class="cargando-inicial"><span class="girar"></span> Cargando empresas…</p>
        }
      </div>
    </div>
  `,
  styles: `
    .cargando-inicial { padding: 2rem; text-align: center; color: var(--texto-suave); }
  `
})
export class EmpresasLista implements OnInit {
  private readonly api = inject(EmpresasApi);
  private readonly confirmar = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly destruir = inject(DestroyRef);
  protected readonly auth = inject(AuthService);

  protected readonly texto = new FormControl('', { nonNullable: true });
  protected readonly datos = signal<Paginado<Empresa> | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  private pagina = 1;

  ngOnInit(): void {
    this.texto.valueChanges.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destruir)).subscribe(() => this.irAPagina(1));
    this.cargar();
  }

  protected irAPagina(pagina: number): void {
    this.pagina = pagina;
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.api.listar({ texto: this.texto.value.trim(), pagina: this.pagina, tamano: TAMANO_PAGINA }).subscribe({
      next: (d) => {
        this.datos.set(d);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      }
    });
  }

  protected async desactivar(empresa: Empresa): Promise<void> {
    const confirmado = await this.confirmar.confirmar({
      titulo: 'Eliminar empresa',
      mensaje: `¿Eliminar ${empresa.nombre}? No se puede eliminar una empresa que todavía tiene locales.`,
      textoConfirmar: 'Sí, eliminar',
      peligro: true
    });
    if (!confirmado) return;
    this.api.desactivar(empresa.id).subscribe({
      next: () => {
        this.toast.ok('Empresa eliminada.');
        this.cargar();
      },
      error: (e: unknown) => this.toast.error(mensajeDeError(e))
    });
  }
}
