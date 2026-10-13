import { Injectable, signal } from '@angular/core';

export type TipoAviso = 'ok' | 'error' | 'info';

export interface Aviso {
  id: number;
  tipo: TipoAviso;
  texto: string;
}

/** Avisos breves en pantalla ("Cliente guardado", "No se pudo..."). Los errores duran más para dar tiempo a leerlos. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private siguienteId = 1;
  readonly avisos = signal<Aviso[]>([]);

  ok(texto: string): void {
    this.agregar('ok', texto, 4500);
  }

  info(texto: string): void {
    this.agregar('info', texto, 5000);
  }

  error(texto: string): void {
    this.agregar('error', texto, 9000);
  }

  cerrar(id: number): void {
    this.avisos.update((lista) => lista.filter((a) => a.id !== id));
  }

  private agregar(tipo: TipoAviso, texto: string, milisegundos: number): void {
    const id = this.siguienteId++;
    this.avisos.update((lista) => [...lista.slice(-3), { id, tipo, texto }]);
    setTimeout(() => this.cerrar(id), milisegundos);
  }
}
