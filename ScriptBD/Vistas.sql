/*****************************************************************/
/*  Vistas.sql - Vistas de apoyo para las analíticas del MVP      */
/*  Ejecutar después de Tablas.sql                               */
/*  Convención: vwNOMBRE_EN_MAYUSCULAS                           */
/*  Las vistas excluyen registros con FechaDesactivacion.        */
/*****************************************************************/
use $(NombreBD)
go
set nocount on
go

print 'creando vwCRONOGRAMA_SALDOS...'
go
/* Cada cuota con lo pagado, el saldo y los días de atraso (0 si no está vencida) */
create view vwCRONOGRAMA_SALDOS
as
select cp.Id as IdCronogramaPago, cp.IdContrato, c.Codigo as CodigoContrato, c.IdCliente, c.IdLocal,
	   cp.IdConcepto, cp.NroCuota, cp.FechaVencimiento, cp.Monto,
	   isnull(p.Pagado, 0) as Pagado,
	   cp.Monto - isnull(p.Pagado, 0) as Saldo,
	   case when cp.Monto - isnull(p.Pagado, 0) > 0 and cp.FechaVencimiento < cast(getdate() as date)
			then datediff(day, cp.FechaVencimiento, cast(getdate() as date)) else 0 end as DiasAtraso
  from tabCRONOGRAMA_PAGOS cp
  join tabCONTRATOS c on c.Id = cp.IdContrato
  left join (select IdCronogramaPago, sum(Monto) as Pagado
			   from tabPAGOS
			  where FechaDesactivacion is null and IdCronogramaPago is not null
			  group by IdCronogramaPago) p on p.IdCronogramaPago = cp.Id
 where cp.FechaDesactivacion is null and c.FechaDesactivacion is null
go

print 'creando vwMOROSIDAD...'
go
/* Deuda vencida por cliente */
create view vwMOROSIDAD
as
select s.IdCliente, cl.Codigo as CodigoCliente,
	   ltrim(concat(cl.Nombre, ' ', cl.Paterno, ' ', cl.Materno)) as Cliente,
	   count(*) as CuotasVencidas,
	   sum(s.Saldo) as MontoVencido,
	   max(s.DiasAtraso) as MaxDiasAtraso
  from vwCRONOGRAMA_SALDOS s
  join tabCLIENTES cl on cl.Id = s.IdCliente
 where s.DiasAtraso > 0
 group by s.IdCliente, cl.Codigo, cl.Nombre, cl.Paterno, cl.Materno
go

print 'creando vwINGRESOS_MENSUALES...'
go
/* Esperado (cuotas que vencen en el mes) vs cobrado (pagos hechos en el mes) */
create view vwINGRESOS_MENSUALES
as
with e as (
	select datefromparts(year(FechaVencimiento), month(FechaVencimiento), 1) as Mes, sum(Monto) as Esperado
	  from vwCRONOGRAMA_SALDOS
	 group by datefromparts(year(FechaVencimiento), month(FechaVencimiento), 1)
),
c as (
	select datefromparts(year(FechaPago), month(FechaPago), 1) as Mes, sum(Monto) as Cobrado
	  from tabPAGOS
	 where FechaDesactivacion is null
	 group by datefromparts(year(FechaPago), month(FechaPago), 1)
)
select coalesce(e.Mes, c.Mes) as Mes, isnull(e.Esperado, 0) as Esperado, isnull(c.Cobrado, 0) as Cobrado
  from e full outer join c on c.Mes = e.Mes
go

print 'creando vwOCUPACION_LOCALES...'
go
/* Ocupación por empresa a la fecha actual. Ocupado = contrato vigente dentro de su plazo */
create view vwOCUPACION_LOCALES
as
select l.IdEmpresa, em.Nombre as Empresa,
	   count(*) as TotalLocales,
	   sum(case when oc.IdLocal is not null then 1 else 0 end) as Ocupados,
	   sum(case when oc.IdLocal is null and sl.Abreviatura = 'MAN' then 1 else 0 end) as EnMantenimiento,
	   sum(case when oc.IdLocal is null and isnull(sl.Abreviatura, '') <> 'MAN' then 1 else 0 end) as Disponibles,
	   cast(100.0 * sum(case when oc.IdLocal is not null then 1 else 0 end) / count(*) as decimal(5,2)) as PorcOcupacion
  from tabLOCALES l
  join tabEMPRESAS em on em.Id = l.IdEmpresa
  left join tabESTADOS sl on sl.Id = l.IdEstado
  left join (select distinct c.IdLocal
			   from tabCONTRATOS c
			   join tabESTADOS e on e.Id = c.IdEstado and e.Abreviatura = 'VIG'
			  where c.FechaDesactivacion is null
				and cast(getdate() as date) between c.FechaInicio and c.FechaFin) oc on oc.IdLocal = l.Id
 where l.FechaDesactivacion is null
 group by l.IdEmpresa, em.Nombre
go

print 'creando vwCONTRATOS_POR_VENCER...'
go
/* Contratos vigentes cuyo plazo termina en los próximos 90 días (filtrar por DiasRestantes) */
create view vwCONTRATOS_POR_VENCER
as
select c.Id as IdContrato, c.Codigo as CodigoContrato, c.IdCliente,
	   ltrim(concat(cl.Nombre, ' ', cl.Paterno, ' ', cl.Materno)) as Cliente,
	   c.IdLocal, lo.Codigo as CodigoLocal, c.FechaFin, c.MontoAlquiler,
	   datediff(day, cast(getdate() as date), c.FechaFin) as DiasRestantes
  from tabCONTRATOS c
  join tabESTADOS e on e.Id = c.IdEstado and e.Abreviatura = 'VIG'
  join tabCLIENTES cl on cl.Id = c.IdCliente
  join tabLOCALES lo on lo.Id = c.IdLocal
 where c.FechaDesactivacion is null
   and datediff(day, cast(getdate() as date), c.FechaFin) between 0 and 90
go

print 'creando vwINGRESOS_POR_LOCAL...'
go
/* Total cobrado por local (para el top de locales) */
create view vwINGRESOS_POR_LOCAL
as
select lo.Id as IdLocal, lo.Codigo as CodigoLocal, lo.Direccion, lo.Interior,
	   count(p.Id) as CantidadPagos, isnull(sum(p.Monto), 0) as TotalCobrado
  from tabLOCALES lo
  join tabCONTRATOS c on c.IdLocal = lo.Id
  join tabPAGOS p on p.IdContrato = c.Id and p.FechaDesactivacion is null
 where lo.FechaDesactivacion is null
 group by lo.Id, lo.Codigo, lo.Direccion, lo.Interior
go

print 'creando vwINGRESOS_POR_CLIENTE...'
go
/* Total cobrado por cliente (para el top de clientes) */
create view vwINGRESOS_POR_CLIENTE
as
select cl.Id as IdCliente, cl.Codigo as CodigoCliente,
	   ltrim(concat(cl.Nombre, ' ', cl.Paterno, ' ', cl.Materno)) as Cliente,
	   count(p.Id) as CantidadPagos, isnull(sum(p.Monto), 0) as TotalCobrado
  from tabCLIENTES cl
  join tabCONTRATOS c on c.IdCliente = cl.Id
  join tabPAGOS p on p.IdContrato = c.Id and p.FechaDesactivacion is null
 where cl.FechaDesactivacion is null
 group by cl.Id, cl.Codigo, cl.Nombre, cl.Paterno, cl.Materno
go

print 'Vistas creadas...'
go
