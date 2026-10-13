/** Cálculos de fechas de contrato con las mismas reglas que el servidor (fechas "yyyy-MM-dd", sin zonas horarias). */

function partes(iso: string): [number, number, number] {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  return [a, m, d];
}

function aTexto(anio: number, mes: number, dia: number): string {
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function diasDelMes(anio: number, mes: number): number {
  return new Date(anio, mes, 0).getDate();
}

/** Suma meses a una fecha; si el día no existe en el mes destino se usa el último (31 ene + 1 mes = 28 feb). */
export function sumarMeses(iso: string, meses: number): string {
  const [anio, mes, dia] = partes(iso);
  const indice = mes - 1 + meses;
  const anioDestino = anio + Math.floor(indice / 12);
  const mesDestino = (((indice % 12) + 12) % 12) + 1;
  return aTexto(anioDestino, mesDestino, Math.min(dia, diasDelMes(anioDestino, mesDestino)));
}

/** Suma días a una fecha (negativo para restar). */
export function sumarDias(iso: string, dias: number): string {
  const [anio, mes, dia] = partes(iso);
  const fecha = new Date(anio, mes - 1, dia + dias);
  return aTexto(fecha.getFullYear(), fecha.getMonth() + 1, fecha.getDate());
}

/** Fecha de fin de un contrato de N meses que empieza en `inicio`: 1/1/2027 + 12 meses -> 31/12/2027. */
export function finDeContrato(inicio: string, meses: number): string {
  return sumarDias(sumarMeses(inicio, meses), -1);
}

/**
 * Cantidad de cuotas mensuales: una por cada mes que empieza dentro de la vigencia
 * (el último mes se cobra completo aunque el contrato termine antes de cumplirlo).
 */
export function contarCuotas(inicio: string, fin: string): number {
  if (!inicio || !fin || fin < inicio) return 0;
  let cantidad = 0;
  while (sumarMeses(inicio, cantidad) <= fin) cantidad++;
  return cantidad;
}

/** Meses completos entre inicio y fin si coinciden con un número entero (para elegir la duración en el formulario). */
export function mesesExactos(inicio: string, fin: string): number | null {
  if (!inicio || !fin || fin <= inicio) return null;
  for (let meses = 1; meses <= 120; meses++) {
    const candidata = finDeContrato(inicio, meses);
    if (candidata === fin) return meses;
    if (candidata > fin) return null;
  }
  return null;
}
