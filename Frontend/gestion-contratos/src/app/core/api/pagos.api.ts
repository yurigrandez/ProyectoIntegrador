import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { aParametros } from './api.utils';
import { CuotaVencida, Moroso, Paginado, Pago, PagoCrear } from './modelos';

export interface FiltroPagos {
  texto?: string;
  idContrato?: number | null;
  idCliente?: number | null;
  desde?: string | null;
  hasta?: string | null;
  pagina?: number;
  tamano?: number;
}

@Injectable({ providedIn: 'root' })
export class PagosApi {
  private readonly http = inject(HttpClient);

  listar(filtro: FiltroPagos): Observable<Paginado<Pago>> {
    return this.http.get<Paginado<Pago>>('/api/pagos', { params: aParametros(filtro) });
  }
  registrar(datos: PagoCrear): Observable<Pago> {
    return this.http.post<Pago>('/api/pagos', datos);
  }
  anular(id: number, motivo: string): Observable<void> {
    return this.http.post<void>(`/api/pagos/${id}/anular`, { motivo });
  }
  morosos(): Observable<Moroso[]> {
    return this.http.get<Moroso[]>('/api/morosidad');
  }
  cuotasVencidasDe(idCliente: number): Observable<CuotaVencida[]> {
    return this.http.get<CuotaVencida[]>(`/api/morosidad/${idCliente}`);
  }
}
