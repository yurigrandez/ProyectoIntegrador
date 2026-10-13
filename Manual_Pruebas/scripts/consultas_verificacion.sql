/*****************************************************************/
/*  consultas_verificacion.sql - Consultas de control             */
/*                                                               */
/*  Solo leen datos (no modifican nada). Sirven para:            */
/*   1) contrastar las cifras del panel con la base de datos;     */
/*   2) comprobar la integridad de los datos (las consultas de la */
/*      sección B deben devolver CERO filas).                     */
/*                                                               */
/*    sqlcmd -S localhost -d dbALQUILERES -f 65001 -i consultas_verificacion.sql */
/*****************************************************************/
set nocount on

print '=== A1. Ocupación de locales (debe coincidir con el panel) ==='
select Empresa, TotalLocales, Ocupados, EnMantenimiento, Disponibles, PorcOcupacion from vwOCUPACION_LOCALES

print ''
print '=== A2. Deuda vencida por cliente (debe coincidir con la pantalla Deudas vencidas) ==='
select CodigoCliente, Cliente, CuotasVencidas, MontoVencido, MaxDiasAtraso from vwMOROSIDAD order by MontoVencido desc
select isnull(sum(MontoVencido), 0) as DeudaTotal, isnull(sum(CuotasVencidas), 0) as CuotasAtrasadas, count(*) as ClientesConDeuda from vwMOROSIDAD

print ''
print '=== A3. Esperado y cobrado del mes actual (tarjeta "Cobrado este mes") ==='
select Mes, Esperado, Cobrado,
       case when Esperado > 0 then cast(100.0 * Cobrado / Esperado as decimal(7,2)) else 0 end as PorcCobranza
  from vwINGRESOS_MENSUALES
 where Mes = datefromparts(year(getdate()), month(getdate()), 1)

print ''
print '=== A4. Contratos que vencen en los próximos 90 días (tarjeta y tabla del panel) ==='
select CodigoContrato, Cliente, CodigoLocal, FechaFin, DiasRestantes from vwCONTRATOS_POR_VENCER order by DiasRestantes

print ''
print '=== B. CONTROLES DE INTEGRIDAD: cada consulta debe devolver 0 filas ==='

print 'B1. Cuotas cuyo estado no corresponde a lo pagado'
select cp.Id as IdCuota, s.CodigoContrato, e.Abreviatura as Estado, s.Monto, s.Pagado
  from tabCRONOGRAMA_PAGOS cp
  join vwCRONOGRAMA_SALDOS s on s.IdCronogramaPago = cp.Id
  join tabESTADOS e on e.Id = cp.IdEstado
 where cp.FechaDesactivacion is null
   and (   (s.Pagado = 0 and e.Abreviatura <> 'PEN')
        or (s.Pagado > 0 and s.Pagado < s.Monto and e.Abreviatura <> 'PAR')
        or (s.Pagado >= s.Monto and e.Abreviatura <> 'PAG'))

print 'B2. Cuotas pagadas de más (sobrepago)'
select IdCronogramaPago, CodigoContrato, Monto, Pagado from vwCRONOGRAMA_SALDOS where Pagado > Monto

print 'B3. Locales con dos contratos (borrador o vigente) que se cruzan en fechas'
select a.IdLocal, a.Codigo as ContratoA, b.Codigo as ContratoB
  from tabCONTRATOS a
  join tabCONTRATOS b on b.IdLocal = a.IdLocal and b.Id > a.Id
  join tabESTADOS ea on ea.Id = a.IdEstado and ea.Abreviatura in ('BOR', 'VIG')
  join tabESTADOS eb on eb.Id = b.IdEstado and eb.Abreviatura in ('BOR', 'VIG')
 where a.FechaDesactivacion is null and b.FechaDesactivacion is null
   and a.FechaInicio <= b.FechaFin and a.FechaFin >= b.FechaInicio

print 'B4. Contratos autorizados por la misma persona que los registró'
select c.Codigo, c.IdUsuarioRegistra, c.IdUsuarioAutoriza
  from tabCONTRATOS c
 where c.IdUsuarioAutoriza is not null and c.IdUsuarioAutoriza = c.IdUsuarioRegistra and c.FechaDesactivacion is null

print 'B5. Contratos vigentes o vencidos sin cuotas'
select c.Codigo, e.Abreviatura as Estado
  from tabCONTRATOS c
  join tabESTADOS e on e.Id = c.IdEstado and e.Abreviatura in ('VIG', 'VEN')
 where c.FechaDesactivacion is null
   and not exists (select 1 from tabCRONOGRAMA_PAGOS cp where cp.IdContrato = c.Id and cp.FechaDesactivacion is null)

print 'B6. Pagos sobre cuotas de otro contrato'
select p.Id as IdPago, p.IdContrato, cp.IdContrato as ContratoDeLaCuota
  from tabPAGOS p
  join tabCRONOGRAMA_PAGOS cp on cp.Id = p.IdCronogramaPago
 where p.FechaDesactivacion is null and p.IdContrato <> cp.IdContrato

print 'B7. Locales marcados Ocupado sin contrato vigente hoy (si aparecen: la tarea de vencimientos se ejecuta al iniciar la API y cada 6 horas)'
select l.Codigo
  from tabLOCALES l
  join tabESTADOS e on e.Id = l.IdEstado and e.Abreviatura = 'OCU'
 where l.FechaDesactivacion is null
   and not exists (select 1 from tabCONTRATOS c join tabESTADOS ec on ec.Id = c.IdEstado and ec.Abreviatura = 'VIG'
                    where c.IdLocal = l.Id and c.FechaDesactivacion is null
                      and cast(getdate() as date) between c.FechaInicio and c.FechaFin)

print ''
print '=== C. Usuarios registrados (revise que no queden usuarios de demostración en producción) ==='
select u.Codigo, u.Nombre, u.Paterno, t.Abreviatura as Rol, u.FechaCreacion, u.FechaDesactivacion
  from tabUSUARIOS u left join tabTIPO_USUARIOS t on t.Id = u.IdTipoUsuario order by u.Id
