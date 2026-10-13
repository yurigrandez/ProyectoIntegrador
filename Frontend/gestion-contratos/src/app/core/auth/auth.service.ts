import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { LoginRespuesta, UsuarioSesion } from '../api/modelos';

const CLAVE_SESION = 'gc.sesion';

/** Rol que puede autorizar contratos y administrar empresas y locales. */
export const ROL_ADMINISTRADOR = 'ADM';

interface Sesion {
  token: string;
  expira: string;
  usuario: UsuarioSesion;
}

/**
 * Estado de la sesión. El token se guarda solo en sessionStorage: al cerrar la pestaña hay que volver a iniciar sesión,
 * lo que reduce el riesgo si alguien usa el equipo después.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly sesion = signal<Sesion | null>(this.leerSesionGuardada());

  readonly usuario = computed(() => this.sesion()?.usuario ?? null);
  readonly esAdmin = computed(() => this.usuario()?.rol === ROL_ADMINISTRADOR);
  /** Nombre de rol legible para mostrar en pantalla. */
  readonly nombreRol = computed(() => (this.esAdmin() ? 'Administrador' : 'Operador'));

  /** Token vigente o null si no hay sesión o ya venció. */
  token(): string | null {
    const actual = this.sesion();
    if (!actual) return null;
    if (this.haVencido(actual)) {
      this.limpiar();
      return null;
    }
    return actual.token;
  }

  haySesion(): boolean {
    return this.token() !== null;
  }

  login(codigo: string, clave: string): Observable<LoginRespuesta> {
    return this.http.post<LoginRespuesta>('/api/auth/login', { codigo, clave }).pipe(
      tap((respuesta) => {
        const nueva: Sesion = { token: respuesta.token, expira: respuesta.expira, usuario: respuesta.usuario };
        this.sesion.set(nueva);
        this.guardar(nueva);
      })
    );
  }

  /** Cierra la sesión y lleva a la pantalla de ingreso; con motivo 'vencida' el login explica por qué. */
  cerrarSesion(motivo?: 'vencida'): void {
    this.limpiar();
    void this.router.navigate(['/login'], { queryParams: motivo ? { motivo } : undefined });
  }

  private haVencido(sesion: Sesion): boolean {
    return new Date(sesion.expira).getTime() <= Date.now();
  }

  private limpiar(): void {
    this.sesion.set(null);
    try {
      sessionStorage.removeItem(CLAVE_SESION);
    } catch {
      // sin almacenamiento disponible: la sesión solo vive en memoria
    }
  }

  private guardar(sesion: Sesion): void {
    try {
      sessionStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
    } catch {
      // sin almacenamiento disponible: la sesión solo vive en memoria
    }
  }

  private leerSesionGuardada(): Sesion | null {
    try {
      const texto = sessionStorage.getItem(CLAVE_SESION);
      if (!texto) return null;
      const sesion = JSON.parse(texto) as Sesion;
      if (!sesion?.token || !sesion.expira || !sesion.usuario || this.haVencido(sesion)) {
        sessionStorage.removeItem(CLAVE_SESION);
        return null;
      }
      return sesion;
    } catch {
      return null;
    }
  }
}
