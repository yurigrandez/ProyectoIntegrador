import { Pipe, PipeTransform } from '@angular/core';

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const formatoSoles = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

/** 1234.5 -> "S/ 1,234.50". Un valor vacío se muestra como un guion. */
export function formatoDinero(valor: number | null | undefined): string {
  return valor === null || valor === undefined ? '—' : formatoSoles.format(valor);
}

/** Separa "2026-10-12T00:00:00" en año, mes y día sin pasar por zonas horarias (evita corrimientos de un día). */
function partesDeFecha(iso: string): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** "2026-10-12T00:00:00" -> "12/10/2026". */
export function formatoFecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  const p = partesDeFecha(iso);
  return p ? `${String(p[2]).padStart(2, '0')}/${String(p[1]).padStart(2, '0')}/${p[0]}` : iso;
}

/** "2026-10-01" -> "oct 2026". */
export function formatoMes(iso: string | null | undefined): string {
  if (!iso) return '—';
  const p = partesDeFecha(iso);
  return p ? `${MESES_CORTOS[p[1] - 1]} ${p[0]}` : iso;
}

/** "2026-10-01" -> "oct" (para ejes de gráficos). */
export function nombreMesCorto(iso: string): string {
  const p = partesDeFecha(iso);
  return p ? MESES_CORTOS[p[1] - 1] : iso;
}

/** Fecha local de hoy como "yyyy-MM-dd" (el formato de los campos de fecha). */
export function hoyIso(ahora: Date = new Date()): string {
  return aIso(ahora);
}

export function aIso(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** Recorta la parte de fecha de un texto ISO para llenar un campo de fecha: "2026-10-12T00:00:00" -> "2026-10-12". */
export function soloFecha(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : '';
}

/** Número entero con separador de miles: 12345 -> "12,345". */
export function formatoEntero(valor: number): string {
  return new Intl.NumberFormat('es-PE').format(valor);
}

/** Texto de cantidad con singular/plural: (1, 'cuota') -> "1 cuota"; (3, 'cuota') -> "3 cuotas". */
export function cantidad(n: number, singular: string, plural = singular + 's'): string {
  return `${formatoEntero(n)} ${n === 1 ? singular : plural}`;
}

const CONCEPTOS: Record<string, string> = {
  ALQ: 'Alquiler',
  LUZ: 'Luz',
  AGU: 'Agua',
  MAN: 'Mantenimiento',
  OTR: 'Otros'
};

/** "ALQ" -> "Alquiler". */
export function nombreConcepto(abreviatura: string | null | undefined): string {
  return abreviatura ? (CONCEPTOS[abreviatura] ?? abreviatura) : '—';
}

/** Nombre completo de una persona o la razón social de una empresa. */
export function nombreDeCliente(c: { nombre: string | null; paterno: string | null; materno: string | null }): string {
  return [c.nombre, c.paterno, c.materno].filter((parte) => !!parte).join(' ') || '—';
}

@Pipe({ name: 'dinero' })
export class DineroPipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    return formatoDinero(valor);
  }
}

@Pipe({ name: 'fecha' })
export class FechaPipe implements PipeTransform {
  transform(valor: string | null | undefined): string {
    return formatoFecha(valor);
  }
}

@Pipe({ name: 'concepto' })
export class ConceptoPipe implements PipeTransform {
  transform(valor: string | null | undefined): string {
    return nombreConcepto(valor);
  }
}

@Pipe({ name: 'mes' })
export class MesPipe implements PipeTransform {
  transform(valor: string | null | undefined): string {
    return formatoMes(valor);
  }
}
