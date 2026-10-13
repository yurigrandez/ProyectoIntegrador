import { contarCuotas, finDeContrato, mesesExactos, sumarDias, sumarMeses } from './fechas';

describe('fechas de contrato', () => {
  describe('sumarMeses', () => {
    it('suma meses y cruza de año', () => {
      expect(sumarMeses('2026-10-01', 3)).toBe('2027-01-01');
      expect(sumarMeses('2026-12-15', 1)).toBe('2027-01-15');
      expect(sumarMeses('2026-01-10', 24)).toBe('2028-01-10');
    });

    it('usa el último día del mes cuando el día no existe', () => {
      expect(sumarMeses('2027-01-31', 1)).toBe('2027-02-28');
      expect(sumarMeses('2028-01-31', 1)).toBe('2028-02-29'); // año bisiesto
      expect(sumarMeses('2027-03-31', 1)).toBe('2027-04-30');
    });

    it('resta meses con números negativos', () => {
      expect(sumarMeses('2027-01-15', -2)).toBe('2026-11-15');
      expect(sumarMeses('2027-03-31', -1)).toBe('2027-02-28');
    });
  });

  it('suma y resta días cruzando meses y años', () => {
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(sumarDias('2027-03-01', -1)).toBe('2027-02-28');
    expect(sumarDias('2028-03-01', -1)).toBe('2028-02-29');
  });

  describe('finDeContrato', () => {
    it('es el día anterior al aniversario', () => {
      expect(finDeContrato('2027-01-01', 12)).toBe('2027-12-31');
      expect(finDeContrato('2026-10-01', 12)).toBe('2027-09-30');
      expect(finDeContrato('2027-03-20', 3)).toBe('2027-06-19');
      expect(finDeContrato('2027-01-01', 6)).toBe('2027-06-30');
    });
  });

  describe('contarCuotas (misma regla que el servidor)', () => {
    it('cuenta un mes por cada período que empieza dentro de la vigencia', () => {
      expect(contarCuotas('2027-01-01', '2027-12-31')).toBe(12);
      expect(contarCuotas('2027-03-20', '2027-06-19')).toBe(3);
      expect(contarCuotas('2026-10-01', '2028-09-30')).toBe(24);
    });

    it('cobra completo el último mes aunque no termine de cumplirse', () => {
      expect(contarCuotas('2027-01-01', '2027-03-15')).toBe(3);
      expect(contarCuotas('2027-03-01', '2027-03-10')).toBe(1);
    });

    it('cuenta el período que empieza justo el día de fin del contrato', () => {
      // Enero, febrero y el 1 de marzo: el tercer período empieza el último día de vigencia.
      expect(contarCuotas('2027-01-01', '2027-03-01')).toBe(3);
      expect(contarCuotas('2027-01-01', '2027-02-28')).toBe(2);
    });

    it('no salta meses cuando el inicio es día 31', () => {
      expect(contarCuotas('2027-01-31', '2027-02-27')).toBe(1);
    });

    it('devuelve cero si faltan fechas o el rango es inválido', () => {
      expect(contarCuotas('', '2027-12-31')).toBe(0);
      expect(contarCuotas('2027-12-31', '2027-01-01')).toBe(0);
    });
  });

  describe('mesesExactos', () => {
    it('reconoce las duraciones en meses completos', () => {
      expect(mesesExactos('2027-01-01', '2027-12-31')).toBe(12);
      expect(mesesExactos('2026-10-01', '2028-09-30')).toBe(24);
    });

    it('devuelve null si no coincide con meses completos', () => {
      expect(mesesExactos('2027-01-01', '2027-03-15')).toBeNull();
      expect(mesesExactos('2027-01-01', '2027-01-01')).toBeNull();
      expect(mesesExactos('', '2027-01-01')).toBeNull();
    });
  });
});
