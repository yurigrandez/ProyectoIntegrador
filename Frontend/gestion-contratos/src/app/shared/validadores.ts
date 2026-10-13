import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Mismas reglas que valida el servidor, para avisar antes de enviar el formulario. */
const REGLAS_DOCUMENTO: Record<string, { patron: RegExp; mensaje: string; ayuda: string }> = {
  DNI: { patron: /^\d{8}$/, mensaje: 'El DNI debe tener 8 dígitos.', ayuda: '8 dígitos, por ejemplo 12345678' },
  RUC: {
    patron: /^(10|15|16|17|20)\d{9}$/,
    mensaje: 'El RUC debe tener 11 dígitos y empezar con 10, 15, 16, 17 o 20.',
    ayuda: '11 dígitos, empieza con 10 o 20'
  },
  CE: { patron: /^[A-Za-z0-9]{9,12}$/, mensaje: 'El carné de extranjería debe tener entre 9 y 12 letras o números.', ayuda: '9 a 12 letras o números' },
  PAS: { patron: /^[A-Za-z0-9]{6,12}$/, mensaje: 'El pasaporte debe tener entre 6 y 12 letras o números.', ayuda: '6 a 12 letras o números' }
};

export const patronRuc = REGLAS_DOCUMENTO['RUC'].patron;

/** Mensaje de error si el número no corresponde al tipo de documento; null si es válido o el tipo no tiene regla. */
export function errorDeDocumento(abreviaturaTipo: string | null | undefined, numero: string): string | null {
  const regla = abreviaturaTipo ? REGLAS_DOCUMENTO[abreviaturaTipo.toUpperCase()] : undefined;
  return regla && !regla.patron.test(numero.trim()) ? regla.mensaje : null;
}

/** Texto de ayuda sobre el formato esperado para el tipo de documento. */
export function ayudaDeDocumento(abreviaturaTipo: string | null | undefined): string | null {
  const regla = abreviaturaTipo ? REGLAS_DOCUMENTO[abreviaturaTipo.toUpperCase()] : undefined;
  return regla?.ayuda ?? null;
}

/** Validador del número de documento; obtiene el tipo elegido en el momento de validar. */
export function validadorDocumento(abreviaturaTipo: () => string | null | undefined): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = String(control.value ?? '').trim();
    if (!valor) return null; // "obligatorio" lo valida Validators.required
    const mensaje = errorDeDocumento(abreviaturaTipo(), valor);
    return mensaje ? { documento: { mensaje } } : null;
  };
}

/** RUC de 11 dígitos con prefijo válido. */
export const validadorRuc: ValidatorFn = (control) => {
  const valor = String(control.value ?? '').trim();
  if (!valor) return null;
  return patronRuc.test(valor) ? null : { ruc: { mensaje: REGLAS_DOCUMENTO['RUC'].mensaje } };
};

/** La fecha de fin debe ser posterior a la de inicio (se aplica al grupo de campos). */
export const validadorFechasContrato: ValidatorFn = (grupo) => {
  const inicio = grupo.get('fechaInicio')?.value as string | null;
  const fin = grupo.get('fechaFin')?.value as string | null;
  return inicio && fin && fin <= inicio ? { rangoFechas: { mensaje: 'La fecha de fin debe ser posterior a la de inicio.' } } : null;
};
