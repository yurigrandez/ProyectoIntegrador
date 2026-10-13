import {
  ConceptoPipe, DineroPipe, FechaPipe, MesPipe, cantidad, formatoDinero, formatoEntero, formatoFecha, formatoMes,
  hoyIso, nombreConcepto, nombreDeCliente, nombreMesCorto, soloFecha
} from './formato';

describe('formato', () => {
  it('muestra el dinero en soles con dos decimales y separador de miles', () => {
    expect(formatoDinero(1234.5)).toMatch(/^S\/\s?1,234\.50$/);
    expect(formatoDinero(0)).toMatch(/^S\/\s?0\.00$/);
    expect(new DineroPipe().transform(26350)).toMatch(/26,350\.00$/);
  });

  it('muestra un guion cuando no hay valor', () => {
    expect(formatoDinero(null)).toBe('—');
    expect(formatoDinero(undefined)).toBe('—');
    expect(formatoFecha(null)).toBe('—');
    expect(formatoMes('')).toBe('—');
  });

  it('convierte fechas ISO a dd/MM/yyyy sin corrimientos de zona horaria', () => {
    expect(formatoFecha('2026-10-12T00:00:00')).toBe('12/10/2026');
    expect(formatoFecha('2027-01-01')).toBe('01/01/2027');
    expect(formatoFecha('2026-12-31T23:59:59')).toBe('31/12/2026');
    expect(new FechaPipe().transform('2026-03-05')).toBe('05/03/2026');
  });

  it('devuelve el texto original si la fecha no tiene el formato esperado', () => {
    expect(formatoFecha('ayer')).toBe('ayer');
  });

  it('muestra el mes abreviado con el año', () => {
    expect(formatoMes('2026-10-01')).toBe('oct 2026');
    expect(formatoMes('2027-01-01T00:00:00')).toBe('ene 2027');
    expect(nombreMesCorto('2026-08-01')).toBe('ago');
    expect(new MesPipe().transform('2026-05-01')).toBe('may 2026');
  });

  it('arma la fecha de hoy y recorta la parte de fecha', () => {
    expect(hoyIso(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(hoyIso(new Date(2026, 11, 31))).toBe('2026-12-31');
    expect(soloFecha('2026-10-12T00:00:00')).toBe('2026-10-12');
    expect(soloFecha(null)).toBe('');
  });

  it('usa singular y plural', () => {
    expect(cantidad(1, 'cuota')).toBe('1 cuota');
    expect(cantidad(3, 'cuota')).toBe('3 cuotas');
    expect(cantidad(1, 'día')).toBe('1 día');
    expect(cantidad(2, 'cuota atrasada', 'cuotas atrasadas')).toBe('2 cuotas atrasadas');
    expect(formatoEntero(12345)).toBe('12,345');
  });

  it('traduce los conceptos y arma el nombre del cliente', () => {
    expect(nombreConcepto('ALQ')).toBe('Alquiler');
    expect(nombreConcepto('MAN')).toBe('Mantenimiento');
    expect(nombreConcepto('XYZ')).toBe('XYZ');
    expect(nombreConcepto(null)).toBe('—');
    expect(new ConceptoPipe().transform('LUZ')).toBe('Luz');
    expect(nombreDeCliente({ nombre: 'José', paterno: 'Ramírez', materno: 'Soto' })).toBe('José Ramírez Soto');
    expect(nombreDeCliente({ nombre: 'Panadería San Jorge', paterno: null, materno: null })).toBe('Panadería San Jorge');
    expect(nombreDeCliente({ nombre: null, paterno: null, materno: null })).toBe('—');
  });
});
