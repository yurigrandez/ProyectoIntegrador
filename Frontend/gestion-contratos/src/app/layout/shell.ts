import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../core/auth/auth.service';
import { Icono, NombreIcono } from '../shared/icono/icono';

interface EnlaceMenu {
  ruta: string;
  texto: string;
  icono: NombreIcono;
}

interface GrupoMenu {
  titulo: string;
  enlaces: EnlaceMenu[];
}

/** Estructura de la aplicación: menú lateral (cajón en el celular), barra superior y contenido. */
@Component({
  selector: 'gc-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="saltar" href="#contenido">Saltar al contenido</a>

    @if (menuAbierto()) {
      <div class="velo" (click)="menuAbierto.set(false)"></div>
    }

    <aside class="menu" [class.abierto]="menuAbierto()" aria-label="Menú principal">
      <a class="logo" routerLink="/panel" aria-label="DA Soluciones e Inversiones, ir al panel">
        <img src="logo-completo.png" alt="DA Soluciones e Inversiones" width="190" height="124" />
      </a>
      <nav>
        @for (grupo of grupos; track grupo.titulo) {
          <p class="grupo">{{ grupo.titulo }}</p>
          <ul>
            @for (enlace of grupo.enlaces; track enlace.ruta) {
              <li>
                <a [routerLink]="enlace.ruta" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: false }">
                  <gc-icono [nombre]="enlace.icono" [tamano]="20" />{{ enlace.texto }}
                </a>
              </li>
            }
          </ul>
        }
      </nav>
      <p class="pie-menu">¿Dudas? Cada pantalla explica qué puede hacer en ella.</p>
    </aside>

    <div class="cuerpo">
      <header class="barra">
        <button type="button" class="btn btn-fantasma btn-sm hamburguesa" (click)="menuAbierto.set(true)" aria-label="Abrir menú">
          <gc-icono nombre="menu" [tamano]="24" />
        </button>
        <img class="logo-corto" src="logo-corto.png" alt="" width="36" height="36" />
        <span class="crece"></span>
        <div class="usuario">
          <gc-icono nombre="usuario" [tamano]="20" />
          <span class="datos">
            <strong>{{ auth.usuario()?.nombreCompleto }}</strong>
            <small>{{ auth.nombreRol() }}</small>
          </span>
        </div>
        <button type="button" class="btn btn-secundario btn-sm" (click)="auth.cerrarSesion()" aria-label="Cerrar sesión">
          <gc-icono nombre="salir" [tamano]="18" /><span class="texto-salir">Salir</span>
        </button>
      </header>
      <main id="contenido" tabindex="-1">
        <router-outlet />
      </main>
    </div>
  `,
  styles: `
    :host { display: block; min-height: 100dvh; }
    .saltar { position: absolute; left: -999px; top: 0.5rem; z-index: 300; background: var(--marino); color: #fff; padding: 0.5rem 1rem; border-radius: var(--radio-sm); }
    .saltar:focus { left: 0.5rem; }

    .menu { position: fixed; inset: 0 auto 0 0; width: var(--ancho-menu); z-index: 60; display: flex; flex-direction: column; background: var(--superficie); border-right: 1px solid var(--borde); overflow-y: auto; }
    .logo { display: block; padding: 1rem 1.25rem 0.5rem; text-align: center; }
    .logo img { width: 100%; max-width: 170px; height: auto; }
    nav { flex: 1; padding: 0.5rem 0.75rem 1rem; }
    .grupo { margin: 1rem 0.75rem 0.35rem; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--texto-suave); }
    ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
    li a { display: flex; align-items: center; gap: 0.7rem; min-height: 44px; padding: 0.5rem 0.75rem; border-radius: var(--radio-sm); color: var(--marino); font-weight: 600; text-decoration: none; }
    li a:hover { background: var(--primario-tenue); }
    li a.activo { background: var(--primario-suave); box-shadow: inset 3px 0 0 var(--primario); }
    .pie-menu { padding: 0.9rem 1.25rem 1.1rem; font-size: 0.82rem; color: var(--texto-suave); border-top: 1px solid var(--borde); }

    .cuerpo { margin-left: var(--ancho-menu); min-height: 100dvh; display: flex; flex-direction: column; }
    .barra { position: sticky; top: 0; z-index: 40; display: flex; align-items: center; gap: 0.75rem; height: var(--alto-barra); padding: 0 1.5rem; background: var(--marino); color: #fff; }
    .barra .btn-secundario { background: transparent; color: #fff; border-color: rgb(255 255 255 / 55%); }
    .barra .btn-secundario:hover { background: rgb(255 255 255 / 14%); color: #fff; }
    .hamburguesa, .logo-corto { display: none; }
    .hamburguesa { color: #fff; }
    .hamburguesa:hover { background: rgb(255 255 255 / 14%); color: #fff; }
    .logo-corto { background: #fff; border-radius: 6px; padding: 2px; }
    .usuario { display: flex; align-items: center; gap: 0.6rem; min-width: 0; }
    .datos { display: flex; flex-direction: column; line-height: 1.2; min-width: 0; }
    .datos small { color: #cfe0ea; }
    main { flex: 1; padding: 1.5rem; outline: none; }
    .velo { position: fixed; inset: 0; z-index: 50; background: rgb(18 38 48 / 55%); }

    @media (max-width: 991px) {
      .menu { transform: translateX(-100%); transition: transform 0.2s ease-out; box-shadow: var(--sombra-alta); }
      .menu.abierto { transform: none; }
      .cuerpo { margin-left: 0; }
      .barra { padding: 0 0.75rem; }
      .hamburguesa, .logo-corto { display: inline-flex; }
      main { padding: 1rem; }
    }
    @media (max-width: 560px) { .datos small, .texto-salir { display: none; } .datos strong { font-size: 0.9rem; max-width: 9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } }
    @media (max-width: 420px) { .barra { gap: 0.4rem; padding: 0 0.5rem; } .datos strong { max-width: 5.5rem; } }
    @media (prefers-reduced-motion: reduce) { .menu { transition: none; } }
  `
})
export class Shell {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly menuAbierto = signal(false);

  protected readonly grupos: GrupoMenu[] = [
    { titulo: 'Inicio', enlaces: [{ ruta: '/panel', texto: 'Panel', icono: 'panel' }] },
    {
      titulo: 'Alquileres',
      enlaces: [
        { ruta: '/contratos', texto: 'Contratos', icono: 'contrato' },
        { ruta: '/pagos', texto: 'Pagos', icono: 'pago' },
        { ruta: '/deudas', texto: 'Deudas vencidas', icono: 'alerta' }
      ]
    },
    {
      titulo: 'Registros',
      enlaces: [
        { ruta: '/clientes', texto: 'Clientes', icono: 'usuarios' },
        { ruta: '/locales', texto: 'Locales', icono: 'tienda' },
        { ruta: '/empresas', texto: 'Empresas', icono: 'edificio' }
      ]
    }
  ];

  constructor() {
    // Al navegar, el cajón del celular se cierra y el foco vuelve al contenido para lectores de pantalla.
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => this.menuAbierto.set(false));
  }

  @HostListener('document:keydown.escape')
  protected alPresionarEscape(): void {
    this.menuAbierto.set(false);
  }
}
