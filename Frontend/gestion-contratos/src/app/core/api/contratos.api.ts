import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { aParametros } from './api.utils';
import { Contrato, ContratoGuardar, Cuota, Paginado, ResultadoActualizacionEstados } from './modelos';

export interface FiltroContratos {
  texto?: string;
  idCliente?: number | null;
  idLocal?: number | null;
  idEstado?: number | null;
  pagina?: number;
  tamano?: number;
}

@Injectable({ providedIn: 'root' })
export class ContratosApi {
  private readonly http = inject(HttpClient);

  listar(filtro: FiltroContratos): Observable<Paginado<Contrato>> {
    return this.http.get<Paginado<Contrato>>('/api/contratos', { params: aParametros(filtro) });
  }
  obtener(id: number): Observable<Contrato> {
    return this.http.get<Contrato>(`/api/contratos/${id}`);
  }
  cronograma(id: number): Observable<Cuota[]> {
    return this.http.get<Cuota[]>(`/api/contratos/${id}/cronograma`);
  }
  crear(datos: ContratoGuardar): Observable<Contrato> {
    return this.http.post<Contrato>('/api/contratos', datos);
  }
  actualizar(id: number, datos: ContratoGuardar): Observable<Contrato> {
    return this.http.put<Contrato>(`/api/contratos/${id}`, datos);
  }
  eliminarBorrador(id: number): Observable<void> {
    return this.http.delete<void>(`/api/contratos/${id}`);
  }
  autorizar(id: number): Observable<Contrato> {
    return this.http.post<Contrato>(`/api/contratos/${id}/autorizar`, null);
  }
  rescindir(id: number, fecha: string, motivo: string): Observable<Contrato> {
    return this.http.post<Contrato>(`/api/contratos/${id}/rescindir`, { fecha, motivo });
  }
  actualizarEstados(): Observable<ResultadoActualizacionEstados> {
    return this.http.post<ResultadoActualizacionEstados>('/api/contratos/actualizar-estados', null);
  }
}
