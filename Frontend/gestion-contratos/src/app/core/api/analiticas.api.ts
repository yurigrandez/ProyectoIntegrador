import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { aParametros } from './api.utils';
import {
  ContratoPorVencer,
  IngresoMensual,
  MorosidadResumen,
  Ocupacion,
  Resumen,
  TopCliente,
  TopLocal
} from './modelos';

@Injectable({ providedIn: 'root' })
export class AnaliticasApi {
  private readonly http = inject(HttpClient);

  resumen(idEmpresa: number | null): Observable<Resumen> {
    return this.http.get<Resumen>('/api/analiticas/resumen', { params: aParametros({ idEmpresa }) });
  }
  ocupacion(idEmpresa: number | null): Observable<Ocupacion[]> {
    return this.http.get<Ocupacion[]>('/api/analiticas/ocupacion', { params: aParametros({ idEmpresa }) });
  }
  ingresosMensuales(idEmpresa: number | null, desde?: string, hasta?: string): Observable<IngresoMensual[]> {
    return this.http.get<IngresoMensual[]>('/api/analiticas/ingresos-mensuales', {
      params: aParametros({ idEmpresa, desde, hasta })
    });
  }
  morosidad(idEmpresa: number | null): Observable<MorosidadResumen> {
    return this.http.get<MorosidadResumen>('/api/analiticas/morosidad', { params: aParametros({ idEmpresa }) });
  }
  contratosPorVencer(idEmpresa: number | null, dias = 90): Observable<ContratoPorVencer[]> {
    return this.http.get<ContratoPorVencer[]>('/api/analiticas/contratos-por-vencer', {
      params: aParametros({ idEmpresa, dias })
    });
  }
  topLocales(idEmpresa: number | null, top = 5): Observable<TopLocal[]> {
    return this.http.get<TopLocal[]>('/api/analiticas/top-locales', { params: aParametros({ idEmpresa, top }) });
  }
  topClientes(idEmpresa: number | null, top = 5): Observable<TopCliente[]> {
    return this.http.get<TopCliente[]>('/api/analiticas/top-clientes', { params: aParametros({ idEmpresa, top }) });
  }
}
