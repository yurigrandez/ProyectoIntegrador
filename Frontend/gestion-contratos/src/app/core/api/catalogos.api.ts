import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { CatalogoItem } from './modelos';

export type NombreCatalogo =
  | 'tipos-documento'
  | 'tipos-comprobante'
  | 'tipos-local'
  | 'monedas'
  | 'medios-pago'
  | 'conceptos'
  | 'estados'
  | 'tipos-incidencia';

/** Catálogos de solo lectura; cambian muy poco, así que se piden una sola vez por sesión. */
@Injectable({ providedIn: 'root' })
export class CatalogosApi {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<NombreCatalogo, Observable<CatalogoItem[]>>();

  listar(nombre: NombreCatalogo): Observable<CatalogoItem[]> {
    let consulta = this.cache.get(nombre);
    if (!consulta) {
      consulta = this.http.get<CatalogoItem[]>(`/api/catalogos/${nombre}`).pipe(shareReplay(1));
      this.cache.set(nombre, consulta);
    }
    return consulta;
  }
}
