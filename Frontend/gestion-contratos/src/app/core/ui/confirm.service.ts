import { Injectable, signal } from '@angular/core';

export interface OpcionesConfirmacion {
  titulo: string;
  mensaje: string;
  textoConfirmar?: string;
  /** Si es una acción que no se puede deshacer, el botón se muestra en rojo. */
  peligro?: boolean;
}

interface PedidoConfirmacion extends OpcionesConfirmacion {
  resolver: (valor: boolean) => void;
}

/** Ventana de confirmación antes de acciones importantes. Se usa con `await confirmar({...})`. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly pedido = signal<PedidoConfirmacion | null>(null);

  confirmar(opciones: OpcionesConfirmacion): Promise<boolean> {
    return new Promise<boolean>((resolver) => this.pedido.set({ ...opciones, resolver }));
  }

  responder(valor: boolean): void {
    const actual = this.pedido();
    this.pedido.set(null);
    actual?.resolver(valor);
  }
}
