import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { aParametros } from './api.utils';
import { Cliente, ClienteCrear, ClienteGuardar, Paginado } from './modelos';

export interface FiltroClientes {
  texto?: string;
  idTipoDocumento?: number | null;
  pagina?: number;
  tamano?: number;
}

@Injectable({ providedIn: 'root' })
export class ClientesApi {
  private readonly http = inject(HttpClient);

  listar(filtro: FiltroClientes): Observable<Paginado<Cliente>> {
    return this.http.get<Paginado<Cliente>>('/api/clientes', { params: aParametros(filtro) });
  }
  obtener(id: number): Observable<Cliente> {
    return this.http.get<Cliente>(`/api/clientes/${id}`);
  }
  crear(datos: ClienteCrear): Observable<Cliente> {
    return this.http.post<Cliente>('/api/clientes', datos);
  }
  actualizar(id: number, datos: ClienteGuardar): Observable<Cliente> {
    return this.http.put<Cliente>(`/api/clientes/${id}`, datos);
  }
  desactivar(id: number): Observable<void> {
    return this.http.delete<void>(`/api/clientes/${id}`);
  }
}
