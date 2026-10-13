import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { aParametros } from './api.utils';
import { Empresa, EmpresaCrear, EmpresaGuardar, Paginado } from './modelos';

export interface FiltroEmpresas {
  texto?: string;
  pagina?: number;
  tamano?: number;
}

@Injectable({ providedIn: 'root' })
export class EmpresasApi {
  private readonly http = inject(HttpClient);

  listar(filtro: FiltroEmpresas): Observable<Paginado<Empresa>> {
    return this.http.get<Paginado<Empresa>>('/api/empresas', { params: aParametros(filtro) });
  }
  obtener(id: number): Observable<Empresa> {
    return this.http.get<Empresa>(`/api/empresas/${id}`);
  }
  crear(datos: EmpresaCrear): Observable<Empresa> {
    return this.http.post<Empresa>('/api/empresas', datos);
  }
  actualizar(id: number, datos: EmpresaGuardar): Observable<Empresa> {
    return this.http.put<Empresa>(`/api/empresas/${id}`, datos);
  }
  desactivar(id: number): Observable<void> {
    return this.http.delete<void>(`/api/empresas/${id}`);
  }
}
