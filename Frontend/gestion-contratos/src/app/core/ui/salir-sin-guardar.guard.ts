import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { ConfirmService } from './confirm.service';

/** Pantalla con un formulario que puede tener cambios sin guardar. */
export interface ConCambios {
  hayCambiosSinGuardar(): boolean;
}

/**
 * Antes de salir de un formulario con cambios sin guardar pregunta si se desea salir.
 * "Sí" deja continuar a la opción elegida; "No" (o cerrar la ventana) mantiene el formulario.
 */
export const salirSinGuardarGuard: CanDeactivateFn<ConCambios> = (pantalla) => {
  if (!pantalla.hayCambiosSinGuardar()) return true;
  return inject(ConfirmService).confirmar({
    titulo: 'Salir sin guardar',
    mensaje: 'Hay cambios sin guardar. ¿Desea salir sin guardar los cambios?',
    textoConfirmar: 'Sí',
    textoCancelar: 'No'
  });
};
