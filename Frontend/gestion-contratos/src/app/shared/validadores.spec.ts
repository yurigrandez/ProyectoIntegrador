import { FormControl, FormGroup } from '@angular/forms';
import { ayudaDeDocumento, errorDeDocumento, validadorDocumento, validadorFechasContrato, validadorRuc } from './validadores';

describe('validadores', () => {
  describe('errorDeDocumento', () => {
    it.each([
      ['DNI', '12345678'],
      ['dni', '00000001'],
      ['RUC', '20512345678'],
      ['RUC', '10412345678'],
      ['CE', '001234567'],
      ['PAS', 'AB123456'],
      ['OTR', 'lo-que-sea']
    ])('acepta %s %s', (tipo, numero) => {
      expect(errorDeDocumento(tipo, numero)).toBeNull();
    });

    it.each([
      ['DNI', '1234567'],
      ['DNI', '123456789'],
      ['DNI', '1234567A'],
      ['RUC', '30512345678'],
      ['RUC', '2051234567'],
      ['CE', '123'],
      ['PAS', '12']
    ])('rechaza %s %s con un motivo', (tipo, numero) => {
      expect(errorDeDocumento(tipo, numero)).toBeTruthy();
    });

    it('no valida si todavía no se eligió el tipo', () => {
      expect(errorDeDocumento(null, 'cualquiera')).toBeNull();
    });

    it('ignora espacios alrededor del número', () => {
      expect(errorDeDocumento('DNI', ' 12345678 ')).toBeNull();
    });
  });

  it('da una ayuda sobre el formato de cada documento', () => {
    expect(ayudaDeDocumento('DNI')).toContain('8 dígitos');
    expect(ayudaDeDocumento('RUC')).toContain('11 dígitos');
    expect(ayudaDeDocumento('OTR')).toBeNull();
    expect(ayudaDeDocumento(null)).toBeNull();
  });

  it('validadorDocumento usa el tipo elegido en el momento de validar', () => {
    let tipo: string | null = 'DNI';
    const validador = validadorDocumento(() => tipo);

    expect(validador(new FormControl('1234'))).toEqual({ documento: { mensaje: 'El DNI debe tener 8 dígitos.' } });
    expect(validador(new FormControl('12345678'))).toBeNull();
    tipo = 'RUC';
    expect(validador(new FormControl('12345678'))).not.toBeNull();
    expect(validador(new FormControl(''))).toBeNull(); // "obligatorio" lo valida otro validador
  });

  it('validadorRuc exige 11 dígitos con prefijo válido', () => {
    expect(validadorRuc(new FormControl('20512345678'))).toBeNull();
    expect(validadorRuc(new FormControl('99512345678'))).not.toBeNull();
    expect(validadorRuc(new FormControl(''))).toBeNull();
  });

  describe('validadorFechasContrato', () => {
    const grupo = (inicio: string, fin: string) => new FormGroup({ fechaInicio: new FormControl(inicio), fechaFin: new FormControl(fin) });

    it('acepta un fin posterior al inicio', () => {
      expect(validadorFechasContrato(grupo('2027-01-01', '2027-12-31'))).toBeNull();
    });

    it('rechaza un fin igual o anterior al inicio', () => {
      expect(validadorFechasContrato(grupo('2027-01-01', '2027-01-01'))).toHaveProperty('rangoFechas');
      expect(validadorFechasContrato(grupo('2027-02-01', '2027-01-01'))).toHaveProperty('rangoFechas');
    });

    it('no se queja mientras falte una de las fechas', () => {
      expect(validadorFechasContrato(grupo('', '2027-01-01'))).toBeNull();
      expect(validadorFechasContrato(grupo('2027-01-01', ''))).toBeNull();
    });
  });
});
