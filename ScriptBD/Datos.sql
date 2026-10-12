/*****************************************************************/
/*  Datos.sql - Datos semilla (catálogos y usuarios iniciales)    */
/*  Ejecutar después de Tablas.sql                                */
/*****************************************************************/
use $(NombreBD)
go
set nocount on
go

print 'cargando catalogos...'

print 'tabTIPO_MONEDAS...'
insert into tabTIPO_MONEDAS (Abreviatura, Nombre, Descripcion) values
 ('PEN', 'Sol', 'Sol peruano (moneda local)')

print 'tabTIPO_DOCUMENTOS...'
insert into tabTIPO_DOCUMENTOS (Abreviatura, Nombre, Descripcion) values
 ('DNI', 'DNI',        'Documento Nacional de Identidad'),
 ('RUC', 'RUC',        'Registro Unico de Contribuyentes'),
 ('CE',  'Carne ext.', 'Carne de extranjeria'),
 ('PAS', 'Pasaporte',  'Pasaporte')

print 'tabTIPO_COMPROBANTES...'
insert into tabTIPO_COMPROBANTES (Abreviatura, Nombre, Descripcion) values
 ('REC', 'Recibo',  'Recibo interno de alquiler'),
 ('BOL', 'Boleta',  'Boleta de venta'),
 ('FAC', 'Factura', 'Factura')

print 'tabTIPO_USUARIOS...'
insert into tabTIPO_USUARIOS (Abreviatura, Nombre, Descripcion) values
 ('ADM', 'Administrador', 'Dueño o encargado: revisa y autoriza contratos'),
 ('OPE', 'Operador',      'Registra contratos, clientes y pagos')

print 'tabTIPO_LOCALES...'
insert into tabTIPO_LOCALES (TipoLocal, Descripcion) values
 ('LC', 'Local comercial'),
 ('ST', 'Stand o puesto'),
 ('OF', 'Oficina'),
 ('AL', 'Almacén')

print 'tabESTADOS...'
insert into tabESTADOS (Abreviatura, Nombre, Descripcion) values
 -- Contratos
 ('BOR', 'Borrador',      'Contrato: registrado, pendiente de autorización'),
 ('VIG', 'Vigente',       'Contrato: autorizado y en curso'),
 ('VEN', 'Vencido',       'Contrato: finalizó su plazo'),
 ('RES', 'Rescindido',    'Contrato: terminado anticipadamente'),
 -- Cuotas del cronograma (la mora se calcula por fecha, no se almacena)
 ('PEN', 'Pendiente',     'Cuota: sin pagos aplicados'),
 ('PAR', 'Pago parcial',  'Cuota: pagada en parte'),
 ('PAG', 'Pagada',        'Cuota: pagada por completo'),
 -- Locales
 ('DIS', 'Disponible',    'Local: libre para alquilar'),
 ('OCU', 'Ocupado',       'Local: con contrato vigente'),
 ('MAN', 'Mantenimiento', 'Local: no disponible por mantenimiento'),
 -- Incidencias
 ('ABI', 'Abierta',       'Incidencia: registrada'),
 ('PRO', 'En proceso',    'Incidencia: en atención'),
 ('CER', 'Cerrada',       'Incidencia: resuelta')

print 'tabMEDIOS_PAGO...'
insert into tabMEDIOS_PAGO (Abreviatura, Nombre, Descripcion) values
 ('EFE', 'Efectivo',      'Pago en efectivo'),
 ('TRA', 'Transferencia', 'Transferencia bancaria'),
 ('DEP', 'Depósito',      'Depósito en cuenta'),
 ('YAP', 'Yape / Plin',   'Billetera digital'),
 ('TAR', 'Tarjeta',       'Tarjeta de débito o crédito')

print 'tabCONCEPTOS...'
insert into tabCONCEPTOS (Abreviatura, Nombre, Descripcion) values
 ('ALQ', 'Alquiler',      'Renta mensual del local'),
 ('LUZ', 'Luz',           'Consumo de energía eléctrica'),
 ('AGU', 'Agua',          'Consumo de agua'),
 ('MAN', 'Mantenimiento', 'Mantenimiento y áreas comunes'),
 ('OTR', 'Otros',         'Otros conceptos')

print 'tabTIPO_INCIDENCIAS...'
insert into tabTIPO_INCIDENCIAS (Abreviatura, Nombre, Descripcion) values
 ('REP', 'Reparación', 'Daño o reparación del local'),
 ('QUE', 'Queja',      'Queja o reclamo del cliente'),
 ('SER', 'Servicios',  'Problema de luz, agua u otros servicios'),
 ('SEG', 'Seguridad',  'Robo, acceso u otros temas de seguridad')

print 'tabSECUENCIA...'
insert into tabSECUENCIA (Tabla, Anio, Prefijo, Numero) values
 ('tabCONTRATOS', cast(year(getdate()) as char(4)), 'CON', 0)

print 'cargando usuarios iniciales...'
/* Usuarios de DEMOSTRACIÓN. Clave de ambos: Demo123*  (hash BCrypt, factor 11, generado con la
   misma librería que usa la API). Cambiar o eliminar estos usuarios antes de usar la BD en producción. */
insert into tabUSUARIOS (Codigo, Nombre, Paterno, Materno, Correo, Clave, IdTipoUsuario, IdTipoDocumento, NumeroDocumento, Direccion, Telefono)
select 'ADMIN', 'Carlos', 'Mendoza', 'Rivas', 'admin@demo.pe', '$2a$11$l3WTCiiaenCl2xU0CPu39uQLZDbfr2XX9oyp1rd19M4xlIDG0mULy', tu.Id, td.Id, '40123456', 'Av. Larco 1234, Miraflores', '987654321'
  from tabTIPO_USUARIOS tu, tabTIPO_DOCUMENTOS td where tu.Abreviatura = 'ADM' and td.Abreviatura = 'DNI'
union all
select 'OPERADOR', 'Lucía', 'Torres', 'Vega', 'operador@demo.pe', '$2a$11$l3WTCiiaenCl2xU0CPu39uQLZDbfr2XX9oyp1rd19M4xlIDG0mULy', tu.Id, td.Id, '45987123', 'Jr. Union 456, Lima', '987123456'
  from tabTIPO_USUARIOS tu, tabTIPO_DOCUMENTOS td where tu.Abreviatura = 'OPE' and td.Abreviatura = 'DNI'
go

print 'Datos semilla cargados...'
go
