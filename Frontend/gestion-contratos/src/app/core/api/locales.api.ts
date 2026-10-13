import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { aParametros } from './api.utils';
import { Local, LocalCrear, LocalGuardar, Paginado } from './modelos';

export interface FiltroLocales {
  texto?: string;
  idEmpresa?: number | null;
  idTipoLocal?: number | null;
  idEstado?: number | null;
  pagina?: number;
  tamano?: number;
}

@Injectable({ providedIn: 'root' })
export class LocalesApi {
  private readonly http = inject(HttpClient);

  listar(filtro: FiltroLocales): Observable<Paginado<Local>> {
    return this.http.get<Paginado<Local>>('/api/locales', { params: aParametros(filtro) });
  }
  obtener(id: number): Observable<Local> {
    return this.http.get<Local>(`/api/locales/${id}`);
  }
  crear(datos: LocalCrear): Observable<Local> {
    return this.http.post<Local>('/api/locales', datos);
  }
  actualizar(id: number, datos: LocalGuardar): Observable<Local> {
    return this.http.put<Local>(`/api/locales/${id}`, datos);
  }
  desactivar(id: number): Observable<void> {
    return this.http.delete<void>(`/api/locales/${id}`);
  }
}
