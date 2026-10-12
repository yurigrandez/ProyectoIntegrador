/*****************************************************************/
/*  DatosDemo.sql - Datos de demostración para el MVP            */
/*  Ejecutar después de Tablas.sql y Datos.sql                   */
/*  Las fechas son relativas a la fecha actual, así la demo      */
/*  siempre muestra contratos vigentes, por vencer y morosos.    */
/*****************************************************************/
use $(NombreBD)
go
set nocount on
go

declare @hoy date = cast(getdate() as date)
declare @m1  date = datefromparts(year(@hoy), month(@hoy), 1)	-- primer día del mes actual

/*---------------------------------------------------------------*/
print 'tabEMPRESAS...'
insert into tabEMPRESAS (Codigo, Nombre, Direccion, Ruc, Telefono, Movil, NombreContacto, CorreoContacto, TlfContacto, MovilContacto)
values ('EMP001', 'Inversiones Andina S.A.C.', 'Av. Larco 1234, Miraflores, Lima', '20512345678', '014445566', '987654321',
		'Carlos Mendoza Rivas', 'admin@demo.pe', '014445566', '987654321')
declare @emp int = (select Id from tabEMPRESAS where Codigo = 'EMP001')

/*---------------------------------------------------------------*/
print 'tabLOCALES...'
insert into tabLOCALES (Codigo, IdTipoLocal, IdEmpresa, Direccion, Interior, TotalM2, Dimensiones, NroPisos)
select v.Codigo, t.Id, @emp, v.Direccion, v.Interior, v.M2, v.Dim, v.Pisos
  from (values
	('LOC-001', 'LC', 'Av. Larco 1234',          101,  45.00, '5 x 9 m',   1),
	('LOC-002', 'LC', 'Av. Larco 1234',          102,  38.50, '5 x 7.7 m', 1),
	('LOC-003', 'LC', 'Av. Larco 1234',          103,  60.00, '6 x 10 m',  2),
	('LOC-004', 'ST', 'Galería Central 220',      15,  12.00, '3 x 4 m',   1),
	('LOC-005', 'LC', 'Av. Benavides 890',       201,  85.00, '8.5 x 10 m',2),
	('LOC-006', 'ST', 'Galería Central 220',      16,  10.00, '2.5 x 4 m', 1),
	('LOC-007', 'LC', 'Av. Benavides 890',       202,  52.00, '6.5 x 8 m', 1),
	('LOC-008', 'OF', 'Av. Larco 1234',          301,  35.00, '5 x 7 m',   1),
	('LOC-009', 'ST', 'Galería Central 220',      17,  11.00, '2.75 x 4 m',1),
	('LOC-010', 'LC', 'Jr. Unión 456',             1,  40.00, '5 x 8 m',   1),
	('LOC-011', 'AL', 'Jr. Unión 456',             2,  70.00, '7 x 10 m',  1),
	('LOC-012', 'LC', 'Jr. Unión 456',             3,  42.00, '6 x 7 m',   1)
  ) v (Codigo, Tipo, Direccion, Interior, M2, Dim, Pisos)
  join tabTIPO_LOCALES t on t.TipoLocal = v.Tipo

/*---------------------------------------------------------------*/
print 'tabCLIENTES...'
insert into tabCLIENTES (Codigo, Nombre, Paterno, Materno, IdTipoDocumento, NumeroDocumento, Correo, Direccion, Telefono, IdTipoComprobante)
select v.Codigo, v.Nombre, v.Paterno, v.Materno, td.Id, v.NroDoc, v.Correo, v.Direccion, v.Telefono, tc.Id
  from (values
	('CLI-001', 'Panadería San Jorge E.I.R.L.', null,      null,     'RUC', '20601234567', 'contacto@sanjorge.pe',  'Av. Arequipa 2310, Lince',    '014221100', 'FAC'),
	('CLI-002', 'María',   'Quispe',   'Huamán',  'DNI', '41258963', 'mquispe@correo.pe',      'Jr. Cusco 120, Lima',         '987111222', 'BOL'),
	('CLI-003', 'Farmacia Salud Total S.A.C.',  null,      null,     'RUC', '20556677881', 'admin@saludtotal.pe',   'Av. Brasil 1500, Jesús María','014330099', 'FAC'),
	('CLI-004', 'José',    'Ramírez',  'Soto',    'DNI', '09876543', 'jramirez@correo.pe',     'Calle Los Pinos 85, Surco',   '987333444', 'BOL'),
	('CLI-005', 'Restaurante El Fogón S.R.L.',  null,      null,     'RUC', '20498765432', 'gerencia@elfogon.pe',   'Av. La Marina 700, San Miguel','014559900','FAC'),
	('CLI-006', 'Ana',     'Flores',   'Campos',  'DNI', '42365478', 'aflores@correo.pe',      'Jr. Huancavelica 33, Lima',   '987555666', 'BOL'),
	('CLI-007', 'Luis',    'Paredes',  'Díaz',    'DNI', '43215687', 'lparedes@correo.pe',     'Av. Tomás Marsano 410, Surquillo','987777888','BOL'),
	('CLI-008', 'Tecnocell Perú S.A.C.',        null,      null,     'RUC', '20587412365', 'ventas@tecnocell.pe',   'Av. Wilson 980, Lima',        '014770011', 'FAC'),
	('CLI-009', 'Rosa',    'Vargas',   'Luna',    'DNI', '40741852', 'rvargas@correo.pe',      'Calle Las Flores 12, Barranco','987999000','BOL'),
	('CLI-010', 'Gimnasio Fuerza Viva S.A.C.',  null,      null,     'RUC', '20611122233', 'info@fuerzaviva.pe',    'Av. Javier Prado 3300, San Borja','014880022','FAC')
  ) v (Codigo, Nombre, Paterno, Materno, TipoDoc, NroDoc, Correo, Direccion, Telefono, TipoComp)
  join tabTIPO_DOCUMENTOS   td on td.Abreviatura = v.TipoDoc
  join tabTIPO_COMPROBANTES tc on tc.Abreviatura = v.TipoComp

/*---------------------------------------------------------------*/
print 'tabCONTRATOS...'
declare @adm int = (select Id from tabUSUARIOS where Codigo = 'ADMIN')
declare @ope int = (select Id from tabUSUARIOS where Codigo = 'OPERADOR')
declare @pen int = (select Id from tabTIPO_MONEDAS where Abreviatura = 'PEN')
declare @anio varchar(4) = cast(year(@hoy) as varchar(4))

/* OffMeses: meses desde el mes actual hasta el inicio; Meses: duración */
insert into tabCONTRATOS (Codigo, IdCliente, IdUsuarioRegistra, IdUsuarioAutoriza, IdLocal, FechaInicio, FechaFin, DiaPago,
						  IdTipoMoneda, MontoAlquiler, MontoLuz, MontoAgua, MontoMantenimiento, MontoOtros, Observaciones, IdEstado)
select 'CON-' + @anio + '-' + right('0000' + cast(v.Nro as varchar(4)), 4),
	   cl.Id, @ope, case when v.Estado = 'BOR' then null else @adm end, lo.Id,
	   dateadd(month, v.OffMeses, @m1),
	   dateadd(day, -1, dateadd(month, v.OffMeses + v.Meses, @m1)),
	   v.DiaPago, @pen, v.Alquiler, 0, 0, v.Mantenimiento, 0, v.Obs, es.Id
  from (values
	( 1, 'LOC-001', 'CLI-001', -14, 24,  1, 3500.00, 250.00, 'VIG', null),
	( 2, 'LOC-002', 'CLI-002', -10, 12, 15, 2800.00, 200.00, 'VIG', null),
	( 3, 'LOC-003', 'CLI-003',  -6, 12,  2, 4200.00, 300.00, 'VIG', null),
	( 4, 'LOC-004', 'CLI-004',  -9, 12, 16, 1800.00, 150.00, 'VIG', 'Cliente con pagos atrasados'),
	( 5, 'LOC-005', 'CLI-005',  -3, 24,  1, 5200.00, 400.00, 'VIG', null),
	( 6, 'LOC-006', 'CLI-006', -20, 12,  5, 2000.00,   0.00, 'VEN', 'Contrato finalizado, local sin renovar'),
	( 7, 'LOC-007', 'CLI-007',  -5, 12, 10, 3100.00, 200.00, 'VIG', 'Cliente con pagos atrasados'),
	( 8, 'LOC-008', 'CLI-001',  -8, 12,  2, 2600.00, 150.00, 'VIG', null),
	( 9, 'LOC-009', 'CLI-008', -12, 10,  5, 1900.00, 100.00, 'RES', 'Rescindido por solicitud del cliente'),
	(10, 'LOC-010', 'CLI-009',   1, 12,  1, 2200.00, 150.00, 'BOR', 'Pendiente de autorización'),
	(11, 'LOC-011', 'CLI-010', -11, 12,  1, 1500.00,   0.00, 'VIG', 'Vence el próximo mes')
  ) v (Nro, Local, Cliente, OffMeses, Meses, DiaPago, Alquiler, Mantenimiento, Estado, Obs)
  join tabLOCALES  lo on lo.Codigo = v.Local
  join tabCLIENTES cl on cl.Codigo = v.Cliente
  join tabESTADOS  es on es.Abreviatura = v.Estado

update tabSECUENCIA set Numero = 11, FechaModificacion = getdate() where Tabla = 'tabCONTRATOS'

/*---------------------------------------------------------------*/
print 'tabCRONOGRAMA_PAGOS...'
/* Una cuota mensual de alquiler (y de mantenimiento si aplica) por mes del contrato.
   Si DiaPago excede los días del mes, se usa el último día del mes. */
;with n as (select top (36) row_number() over (order by (select 1)) as Nro from sys.all_objects),
cuotas as (
	select c.Id as IdContrato, k.Id as IdConcepto, n.Nro as NroCuota,
		   mes.Primero,
		   case when day(eomonth(mes.Primero)) < c.DiaPago then eomonth(mes.Primero)
				else dateadd(day, c.DiaPago - 1, mes.Primero) end as Vencimiento,
		   case k.Abreviatura when 'ALQ' then c.MontoAlquiler else c.MontoMantenimiento end as Monto
	  from tabCONTRATOS c
	  join tabESTADOS es on es.Id = c.IdEstado and es.Abreviatura in ('VIG', 'VEN', 'RES')
	  join tabCONCEPTOS k on k.Abreviatura in ('ALQ', 'MAN')
	  join n on n.Nro <= datediff(month, c.FechaInicio, dateadd(day, 1, c.FechaFin))
	  cross apply (select datefromparts(year(dateadd(month, n.Nro - 1, c.FechaInicio)), month(dateadd(month, n.Nro - 1, c.FechaInicio)), 1) as Primero) mes
	 where case k.Abreviatura when 'ALQ' then c.MontoAlquiler else c.MontoMantenimiento end > 0
),
/* Posición de cada cuota vencida contando desde la más reciente */
rango as (
	select q.*, row_number() over (partition by q.IdContrato, q.IdConcepto order by q.NroCuota desc) as DesdeUltima
	  from cuotas q where q.Vencimiento < @hoy
)
insert into tabCRONOGRAMA_PAGOS (IdContrato, IdConcepto, NroCuota, FechaVencimiento, Monto, IdEstado)
select q.IdContrato, q.IdConcepto, q.NroCuota, q.Vencimiento, q.Monto,
	   (select Id from tabESTADOS where Abreviatura =
			case when r.IdContrato is null then 'PEN'											-- aún no vence
				 when c.Codigo like '%-0004' and r.DesdeUltima <= 2 then 'PEN'					-- moroso: 2 cuotas sin pagar
				 when c.Codigo like '%-0007' and r.DesdeUltima <= 3 then 'PEN'					-- moroso: 3 cuotas sin pagar
				 when c.Codigo like '%-0003' and r.DesdeUltima = 1  then 'PAR'					-- pago parcial en la última
				 else 'PAG' end)
  from cuotas q
  join tabCONTRATOS c on c.Id = q.IdContrato
  left join rango r on r.IdContrato = q.IdContrato and r.IdConcepto = q.IdConcepto and r.NroCuota = q.NroCuota

/*---------------------------------------------------------------*/
print 'tabPAGOS...'
/* Cuotas pagadas: un pago por el total, 0 a 3 días después del vencimiento (sin pasar de hoy).
   Cuotas con pago parcial: la mitad del monto. */
insert into tabPAGOS (IdContrato, IdCronogramaPago, IdMedioPago, IdTipoMoneda, IdUsuarioRegistra, FechaPago, Monto, NroOperacion)
select cp.IdContrato, cp.Id,
	   (select Id from tabMEDIOS_PAGO where Abreviatura = case cp.Id % 4 when 0 then 'TRA' when 1 then 'EFE' when 2 then 'YAP' else 'DEP' end),
	   @pen, @ope,
	   case when dateadd(day, cp.Id % 4, cp.FechaVencimiento) > @hoy then @hoy else dateadd(day, cp.Id % 4, cp.FechaVencimiento) end,
	   case es.Abreviatura when 'PAG' then cp.Monto else cast(cp.Monto / 2 as decimal(18,2)) end,
	   'OP-' + right('000000' + cast(cp.Id as varchar(6)), 6)
  from tabCRONOGRAMA_PAGOS cp
  join tabESTADOS es on es.Id = cp.IdEstado and es.Abreviatura in ('PAG', 'PAR')

/*---------------------------------------------------------------*/
print 'estado de los locales...'
update l set IdEstado = (select Id from tabESTADOS where Abreviatura = 'OCU'), FechaModificacion = getdate()
  from tabLOCALES l
 where exists (select 1 from tabCONTRATOS c join tabESTADOS e on e.Id = c.IdEstado
				where c.IdLocal = l.Id and e.Abreviatura = 'VIG' and @hoy between c.FechaInicio and c.FechaFin)
update tabLOCALES set IdEstado = (select Id from tabESTADOS where Abreviatura = 'MAN'), FechaModificacion = getdate() where Codigo = 'LOC-012'
update tabLOCALES set IdEstado = (select Id from tabESTADOS where Abreviatura = 'DIS'), FechaModificacion = getdate() where IdEstado is null

/*---------------------------------------------------------------*/
print 'tabINCIDENCIAS...'
insert into tabINCIDENCIAS (IdUsuarioRegistra, IdCliente, IdLocal, IdContrato, IdTipoIncidente, Descripcion, IdEstado, FechaResolucion, Solucion)
select @ope, c.IdCliente, c.IdLocal, c.Id, ti.Id, v.Descripcion, es.Id,
	   case when v.Estado = 'CER' then dateadd(day, -3, @hoy) end, v.Solucion
  from (values
	('CON-' + @anio + '-0001', 'REP', 'Gotera en el techo de la zona de almacén',        'CER', 'Se reparó la impermeabilización'),
	('CON-' + @anio + '-0003', 'SER', 'Corte intermitente de energía eléctrica',          'PRO', null),
	('CON-' + @anio + '-0005', 'QUE', 'Ruido excesivo del local vecino en horario de tarde','ABI', null)
  ) v (Contrato, Tipo, Descripcion, Estado, Solucion)
  join tabCONTRATOS c on c.Codigo = v.Contrato
  join tabTIPO_INCIDENCIAS ti on ti.Abreviatura = v.Tipo
  join tabESTADOS es on es.Abreviatura = v.Estado
go

print 'Datos de demostración cargados...'
go
