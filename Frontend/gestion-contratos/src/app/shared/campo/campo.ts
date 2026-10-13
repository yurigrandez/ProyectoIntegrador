import { Component, input } from '@angular/core';
import { AbstractControl, ValidationErrors } from '@angular/forms';
import { Icono } from '../icono/icono';

/** Mensajes en lenguaje sencillo para los errores de validación más comunes. */
export function mensajeDeValidacion(errores: ValidationErrors | null): string | null {
  if (!errores) return null;
  for (const [clave, valor] of Object.entries(errores)) {
    if (valor && typeof valor === 'object' && typeof (valor as { mensaje?: unknown }).mensaje === 'string') {
      return (valor as { mensaje: string }).mensaje;
    }
    switch (clave) {
      case 'required':
        return 'Este dato es obligatorio.';
      case 'email':
        return 'Escriba un correo válido, por ejemplo nombre@correo.pe.';
      case 'maxlength':
        return `Use como máximo ${(valor as { requiredLength: number }).requiredLength} caracteres.`;
      case 'minlength':
        return `Use al menos ${(valor as { requiredLength: number }).requiredLength} caracteres.`;
      case 'min':
        return `El valor mínimo es ${(valor as { min: number }).min}.`;
      case 'max':
        return `El valor máximo es ${(valor as { max: number }).max}.`;
      case 'pattern':
        return 'El formato no es válido.';
    }
  }
  return 'Revise este dato.';
}

/**
 * Etiqueta + control + ayuda + mensaje de error, siempre con el mismo aspecto.
 * El control de entrada debe tener el mismo `id` que se pasa en `para`.
 */
@Component({
  selector: 'gc-campo',
  imports: [Icono],
  template: `
    <div class="campo">
      <label [for]="para()">{{ etiqueta() }}@if (requerido()) {<span class="req" aria-hidden="true"> *</span>}</label>
      <ng-content />
      @if (textoError(); as mensaje) {
        <span class="error" role="alert" [id]="para() + '-error'"><gc-icono nombre="circulo-x" [tamano]="16" />{{ mensaje }}</span>
      } @else if (ayuda()) {
        <span class="ayuda" [id]="para() + '-ayuda'">{{ ayuda() }}</span>
      }
    </div>
  `
})
export class Campo {
  /** Identificador del control de entrada que se proyecta dentro (el `for` de la etiqueta). */
  readonly para = input.required<string>();
  readonly etiqueta = input.required<string>();
  readonly control = input<AbstractControl | null>(null);
  readonly ayuda = input<string | null>(null);
  readonly requerido = input(false);
  /** Mensaje que viene del servidor para este campo; tiene prioridad sobre la validación local. */
  readonly error = input<string | null>(null);

  protected textoError(): string | null {
    if (this.error()) return this.error();
    const control = this.control();
    if (!control || control.valid || !(control.touched || control.dirty)) return null;
    return mensajeDeValidacion(control.errors);
  }
}
