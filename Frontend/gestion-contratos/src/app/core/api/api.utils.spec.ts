import { HttpErrorResponse } from '@angular/common/http';
import { aParametros, mensajeDeError } from './api.utils';

const error = (status: number, cuerpo?: unknown) => new HttpErrorResponse({ status, error: cuerpo });

describe('api.utils', () => {
  describe('aParametros', () => {
    it('omite los valores vacíos y conserva los que tienen dato', () => {
      const params = aParametros({ texto: 'ana', pagina: 2, idCliente: null, idLocal: undefined, desde: '', activo: false, cero: 0 });

      expect(params.get('texto')).toBe('ana');
      expect(params.get('pagina')).toBe('2');
      expect(params.get('activo')).toBe('false');
      expect(params.get('cero')).toBe('0');
      expect(params.has('idCliente')).toBe(false);
      expect(params.has('idLocal')).toBe(false);
      expect(params.has('desde')).toBe(false);
    });
  });

  describe('mensajeDeError', () => {
    it('usa el detalle que envía el servidor para las reglas de negocio', () => {
      expect(mensajeDeError(error(400, { title: 'La solicitud no es válida', detail: 'El monto excede el saldo.' }))).toBe('El monto excede el saldo.');
    });

    it('junta los mensajes de validación de campos', () => {
      const e = error(400, { errors: { Monto: ['Debe ser mayor que 0.'], Fecha: ['La fecha es obligatoria.'] } });

      expect(mensajeDeError(e)).toBe('Debe ser mayor que 0. La fecha es obligatoria.');
    });

    it('explica cuando no hay conexión', () => {
      expect(mensajeDeError(error(0))).toContain('No se pudo conectar');
    });

    it.each([
      [401, 'sesión'],
      [403, 'permiso'],
      [404, 'No se encontró'],
      [500, 'servidor']
    ])('da un texto claro para el código %i', (codigo, fragmento) => {
      expect(mensajeDeError(error(codigo))).toContain(fragmento);
    });

    it('no expone detalles internos de un error 500', () => {
      expect(mensajeDeError(error(500, 'Stack trace: NullReferenceException'))).not.toContain('NullReference');
    });

    it('cae en un mensaje genérico con errores que no son de red', () => {
      expect(mensajeDeError(new Error('boom'))).toContain('inesperado');
      expect(mensajeDeError('texto')).toContain('inesperado');
    });
  });
});
