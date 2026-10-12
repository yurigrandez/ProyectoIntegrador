use master
go

/***************Verificando si existe BD******************/
if exists (select * from sys.databases where (name = 'dbALQUILERES'))
begin
	print 'existe BD dbALQUILERES, eliminando...'
	alter database dbALQUILERES set single_user with rollback immediate
	drop database dbALQUILERES
end
go

/***********************Creando BD***********************/
print 'creando BD dbALQUILERES...'
create database dbALQUILERES
go

/***********************Activando BD***********************/
use dbALQUILERES
go

/************************************/
/*			Tablas Mantenimiento	*/
/************************************/
print '-------------------------------'
print 'creando Tablas Mantenimiento...'
print '-------------------------------'

print 'creando tabEMPRESAS...'
create table tabEMPRESAS
(Id					int identity(1,1) not null primary key,
 Codigo				nvarchar(15) not null unique,
 Nombre				nvarchar(100),
 Direccion			nvarchar(250),
 Ruc				nvarchar(11),
 Telefono			nvarchar(25),
 Movil				nvarchar(15),
 NombreContacto		nvarchar(150),
 CorreoContacto		nvarchar(50),
 TlfContacto		nvarchar(15),
 MovilContacto		nvarchar(15),
 FechaCreacion		smalldatetime default getdate(),
 FechaModificacion	smalldatetime,
 FechaDesactivacion	smalldatetime,
 ImgEmpresa			varbinary(max),
 ExtensionImg		nvarchar(5)
)
go

print 'creando tabTIPO_LOCALES...'
create table tabTIPO_LOCALES
(Id					int identity(1,1) not null primary key,
 TipoLocal			nvarchar(5) not null unique,
 Descripcion		nvarchar(150),
 FechaCreacion		smalldatetime default getdate(),
 FechaModificacion	smalldatetime,
 FechaDesactivacion	smalldatetime
)
go

print 'creando tabESTADOS...'
create table tabESTADOS
(Id					int identity(1,1) not null primary key,
 Abreviatura		nvarchar(10) not null unique,
 Nombre				nvarchar(15),
 Descripcion		nvarchar(100),
 FechaCreacion		smalldatetime default getdate(),
 FechaModificacion	smalldatetime,
 FechaDesactivacion	smalldatetime
)
go

print 'creando tabLOCALES...'
create table tabLOCALES
(Id					int identity(1,1) not null primary key,
 Codigo				nvarchar(15) not null unique,
 IdTipoLocal		int not null,
 IdEmpresa			int not null,
 Direccion			nvarchar(250),
 Interior			int,
 TotalM2			decimal(18,2),
 Dimensiones		nvarchar(150),
 NroPisos			int,
 ImgFrontis			varbinary(max),
 IdEstado			int,		-- estado del local (disponible, ocupado, mantenimiento)
 FechaCreacion		smalldatetime default getdate(),
 FechaModificacion	smalldatetime,
 FechaDesactivacion	smalldatetime,
 constraint fk_Locales_Empresas foreign key(IdEmpresa) references tabEMPRESAS(Id),
 constraint fk_Locales_TipoLocal foreign key(IdTipoLocal) references tabTIPO_LOCALES(Id),
 constraint fk_Locales_Estado foreign key(IdEstado) references tabESTADOS(Id),
 constraint ck_Locales_TotalM2 check (TotalM2 is null or TotalM2 > 0)
)
go

print 'creando tabTIPO_USUARIOS...'
create table tabTIPO_USUARIOS
(Id					int identity(1,1) not null primary key,
 Abreviatura		nvarchar(10) not null unique,
 Nombre				nvarchar(25),
 Descripcion		nvarchar(100),
 FechaCreacion		smalldatetime default getdate(),
 FechaModificacion	smalldatetime,
 FechaDesactivacion	smalldatetime
)
go

print 'creando tabTIPO_DOCUMENTOS...'
create table tabTIPO_DOCUMENTOS
(Id					int identity(1,1) not null primary key,
 Abreviatura		nvarchar(10) not null unique,
 Nombre				nvarchar(25),
 Descripcion		nvarchar(100),
 FechaCreacion		smalldatetime default getdate(),
 FechaModificacion	smalldatetime,
 FechaDesactivacion	smalldatetime
)
go

print 'creando tabUSUARIOS...'
create table tabUSUARIOS
(Id					int identity(1,1) not null primary key,
 Codigo				nvarchar(15) not null unique,
 Nombre				nvarchar(50),
 Paterno			nvarchar(50),
 Materno			nvarchar(50),
 Correo				nvarchar(50),
 Clave				nvarchar(max),	-- almacenar solo el hash de la clave
 IdTipoUsuario		int,
 IdTipoDocumento	int,
 NumeroDocumento	nvarchar(25),
 Direccion			nvarchar(250),
 Telefono			nvarchar(25),
 FechaCreacion		smalldatetime default getdate(),
 FechaModificacion	smalldatetime,
 FechaDesactivacion	smalldatetime,
 constraint fk_Usuario_TipoUsuario foreign key(IdTipoUsuario) references tabTIPO_USUARIOS(Id),
 constraint fk_Usuario_TipoDocumento foreign key(IdTipoDocumento) references tabTIPO_DOCUMENTOS(Id)
)
go

print 'creando tabTIPO_COMPROBANTES...'
create table tabTIPO_COMPROBANTES
(Id					int identity(1,1) not null primary key,
 Abreviatura		nvarchar(10) not null unique,
 Nombre				nvarchar(25),
 Descripcion		nvarchar(100),
 FechaCreacion		smalldatetime default getdate(),
 FechaModificacion	smalldatetime,
 FechaDesactivacion	smalldatetime
)
go

print 'creando tabCLIENTES...'
create table tabCLIENTES
(Id					int identity(1,1) not null primary key,
 Codigo				nvarchar(15) not null unique,
 Nombre				nvarchar(50),
 Paterno			nvarchar(50),
 Materno			nvarchar(50),
 IdTipoDocumento	int,
 NumeroDocumento	nvarchar(25),
 Correo				nvarchar(50),
 Direccion			nvarchar(250),
 Telefono			nvarchar(25),
 IdTipoComprobante	int,
 FechaCreacion		smalldatetime default getdate(),
 FechaModificacion	smalldatetime,
 FechaDesactivacion	smalldatetime,
 constraint fk_Cliente_TipoDocumento foreign key(IdTipoDocumento) references tabTIPO_DOCUMENTOS(Id),
 constraint fk_Cliente_TipoComprobante foreign key(IdTipoComprobante) references tabTIPO_COMPROBANTES(Id)
)
go

print 'creando tabTIPO_MONEDAS...'
create table tabTIPO_MONEDAS
(Id					int identity(1,1) not null primary key,
 Abreviatura		nvarchar(10) not null unique,
 Nombre				nvarchar(25),
 Descripcion		nvarchar(100),
 FechaCreacion		smalldatetime default getdate(),
 FechaModificacion	smalldatetime,
 FechaDesactivacion	smalldatetime
)
go

print 'creando tabMEDIOS_PAGO...'
create table tabMEDIOS_PAGO
(Id					int identity(1,1) not null primary key,
 Abreviatura		nvarchar(10) not null unique,
 Nombre				nvarchar(25),
 Descripcion		nvarchar(100),
 FechaCreacion		smalldatetime default getdate(),
 FechaModificacion	smalldatetime,
 FechaDesactivacion	smalldatetime
)
go

print 'creando tabCONCEPTOS...'
create table tabCONCEPTOS
(Id					int identity(1,1) not null primary key,
 Abreviatura		nvarchar(10) not null unique,
 Nombre				nvarchar(25),
 Descripcion		nvarchar(100),
 FechaCreacion		smalldatetime default getdate(),
 FechaModificacion	smalldatetime,
 FechaDesactivacion	smalldatetime
)
go

print '-------------------------------'
print 'creando Tablas Secuencia...'
print '-------------------------------'

print 'creando tabSECUENCIA...'
create table tabSECUENCIA
(Id					int identity(1,1) not null primary key,
 Tabla				varchar(50) not null,
 Anio				char(4) not null,
 Prefijo			char(3) not null,
 Numero				int,
 FechaCreacion		smalldatetime default getdate(),
 FechaModificacion	smalldatetime,
 FechaDesactivacion	smalldatetime,
 constraint uq_Secuencia_Tabla_Anio_Prefijo unique(Tabla, Anio, Prefijo)
)
go

/************************************/
/*			Tablas Negocio			*/
/************************************/
print '-------------------------'
print 'creando Tablas Negocio...'
print '-------------------------'

print 'creando tabCONTRATOS...'
create table tabCONTRATOS
(Id					int identity(1,1) not null primary key,
 Codigo				nvarchar(15) not null unique,
 IdCliente			int not null,
 IdUsuarioRegistra	int not null,
 IdUsuarioAutoriza	int,
 IdLocal			int not null,
 FechaInicio		smalldatetime not null,
 FechaFin			smalldatetime not null,
 IdTipoMoneda		int,
 MontoAlquiler		decimal(18,2),
 MontoLuz			decimal(18,2),
 MontoAgua			decimal(18,2),
 MontoMantenimiento	decimal(18,2),
 MontoOtros			decimal(18,2),
 Observaciones		nvarchar(max),
 IdEstado			int,
 FechaCreacion		smalldatetime default getdate(),
 FechaModificacion	smalldatetime,
 FechaDesactivacion	smalldatetime,
 constraint fk_Contrato_Cliente foreign key(IdCliente) references tabCLIENTES(Id),
 constraint fk_Contrato_UsuRegistra foreign key(IdUsuarioRegistra) references tabUSUARIOS(Id),
 constraint fk_Contrato_UsuAutoriza foreign key(IdUsuarioAutoriza) references tabUSUARIOS(Id),
 constraint fk_Contrato_Local foreign key(IdLocal) references tabLOCALES(Id),
 constraint fk_Contrato_TipoMoneda foreign key(IdTipoMoneda) references tabTIPO_MONEDAS(Id),
 constraint fk_Contrato_Estado foreign key(IdEstado) references tabESTADOS(Id),
 constraint ck_Contrato_Fechas check (FechaFin > FechaInicio),
 constraint ck_Contrato_Montos check (isnull(MontoAlquiler,0) >= 0 and isnull(MontoLuz,0) >= 0 and isnull(MontoAgua,0) >= 0
									  and isnull(MontoMantenimiento,0) >= 0 and isnull(MontoOtros,0) >= 0)
)
go

print 'creando tabADENDAS...'
create table tabADENDAS
(Id					int identity(1,1) not null primary key,
 Codigo				nvarchar(15) not null unique,
 IdContrato			int not null,
 IdUsuarioRegistra	int not null,
 IdUsuarioAutoriza	int,
 FechaAdenda		smalldatetime,
 NuevaFechaFin		smalldatetime,
 MontoAlquiler		decimal(18,2),
 MontoLuz			decimal(18,2),
 MontoAgua			decimal(18,2),
 MontoMantenimiento	decimal(18,2),
 MontoOtros			decimal(18,2),
 Observaciones		nvarchar(max),
 IdEstado			int,
 FechaCreacion		smalldatetime default getdate(),
 FechaModificacion	smalldatetime,
 FechaDesactivacion	smalldatetime,
 constraint fk_Adenda_Contrato foreign key(IdContrato) references tabCONTRATOS(Id),
 constraint fk_Adenda_UsuRegistra foreign key(IdUsuarioRegistra) references tabUSUARIOS(Id),
 constraint fk_Adenda_UsuAutoriza foreign key(IdUsuarioAutoriza) references tabUSUARIOS(Id),
 constraint fk_Adenda_Estado foreign key(IdEstado) references tabESTADOS(Id)
)
go

print 'creando tabGARANTIAS...'
create table tabGARANTIAS
(Id					int identity(1,1) not null primary key,
 IdContrato			int not null,
 IdTipoMoneda		int,
 IdMedioPago		int,
 Monto				decimal(18,2),
 FechaRecepcion		smalldatetime,
 FechaDevolucion	smalldatetime,
 Observaciones		nvarchar(max),
 IdEstado			int,
 FechaCreacion		smalldatetime default getdate(),
 FechaModificacion	smalldatetime,
 FechaDesactivacion	smalldatetime,
 constraint fk_Garantia_Contrato foreign key(IdContrato) references tabCONTRATOS(Id),
 constraint fk_Garantia_TipoMoneda foreign key(IdTipoMoneda) references tabTIPO_MONEDAS(Id),
 constraint fk_Garantia_MedioPago foreign key(IdMedioPago) references tabMEDIOS_PAGO(Id),
 constraint fk_Garantia_Estado foreign key(IdEstado) references tabESTADOS(Id),
 constraint ck_Garantia_Monto check (Monto is null or Monto >= 0)
)
go

print 'creando tabDOCUMENTOS_CONTRATO...'
create table tabDOCUMENTOS_CONTRATO
(Id					int identity(1,1) not null primary key,
 IdContrato			int not null,
 IdUsuarioRegistra	int not null,
 Nombre				nvarchar(150),
 Descripcion		nvarchar(250),
 Archivo			varbinary(max),
 Extension			nvarchar(5),
 FechaCreacion		smalldatetime default getdate(),
 FechaModificacion	smalldatetime,
 FechaDesactivacion	smalldatetime,
 constraint fk_DocContrato_Contrato foreign key(IdContrato) references tabCONTRATOS(Id),
 constraint fk_DocContrato_UsuRegistra foreign key(IdUsuarioRegistra) references tabUSUARIOS(Id)
)
go

print 'creando tabCRONOGRAMA_PAGOS...'
create table tabCRONOGRAMA_PAGOS
(Id					int identity(1,1) not null primary key,
 IdContrato			int not null,
 IdConcepto			int not null,
 NroCuota			int not null,
 FechaVencimiento	smalldatetime not null,
 Monto				decimal(18,2) not null,
 IdEstado			int,
 FechaCreacion		smalldatetime default getdate(),
 FechaModificacion	smalldatetime,
 FechaDesactivacion	smalldatetime,
 constraint fk_Cronograma_Contrato foreign key(IdContrato) references tabCONTRATOS(Id),
 constraint fk_Cronograma_Concepto foreign key(IdConcepto) references tabCONCEPTOS(Id),
 constraint fk_Cronograma_Estado foreign key(IdEstado) references tabESTADOS(Id),
 constraint uq_Cronograma_Contrato_Concepto_Cuota unique(IdContrato, IdConcepto, NroCuota),
 constraint ck_Cronograma_Monto check (Monto >= 0)
)
go

print 'creando tabCOMPROBANTES...'
create table tabCOMPROBANTES
(Id					int identity(1,1) not null primary key,
 IdEmpresa			int not null,
 IdTipoComprobante	int not null,
 NroComprobante		nvarchar(10) not null,
 IdCliente			int not null,
 IdContrato			int,
 IdUsuarioRegistra	int not null,
 FechaEmision		smalldatetime,
 IdTipoMoneda		int,
 Observacion		nvarchar(max),
 SubTotal			decimal(18,2),
 Igv				decimal(18,2),
 ImporteTotal		decimal(18,2),
 FechaCreacion		smalldatetime default getdate(),
 FechaModificacion	smalldatetime,
 FechaDesactivacion	smalldatetime,
 constraint fk_Comprobante_Empresa foreign key(IdEmpresa) references tabEMPRESAS(Id),
 constraint fk_Comprobante_TipoComprobante foreign key(IdTipoComprobante) references tabTIPO_COMPROBANTES(Id),
 constraint fk_Comprobante_Cliente foreign key(IdCliente) references tabCLIENTES(Id),
 constraint fk_Comprobante_Contrato foreign key(IdContrato) references tabCONTRATOS(Id),
 constraint fk_Comprobante_UsuRegistra foreign key(IdUsuarioRegistra) references tabUSUARIOS(Id),
 constraint fk_Comprobante_TipoMoneda foreign key(IdTipoMoneda) references tabTIPO_MONEDAS(Id),
 constraint uq_Comprobante_Empresa_Tipo_Nro unique(IdEmpresa, IdTipoComprobante, NroComprobante)
)
go

print 'creando tabCOMPROBANTE_DETALLES...'
create table tabCOMPROBANTE_DETALLES
(Id					int identity(1,1) not null primary key,
 IdComprobante		int not null,
 IdConcepto			int,
 IdCronogramaPago	int,
 Concepto			nvarchar(250),
 Cantidad			int,
 PrecioUnitario		decimal(18,2),
 SubTotal			decimal(18,2),
 Igv				decimal(18,2),
 FechaCreacion		smalldatetime default getdate(),
 FechaModificacion	smalldatetime,
 FechaDesactivacion	smalldatetime,
 constraint fk_ComDetalle_Comprobante foreign key(IdComprobante) references tabCOMPROBANTES(Id),
 constraint fk_ComDetalle_Concepto foreign key(IdConcepto) references tabCONCEPTOS(Id),
 constraint fk_ComDetalle_Cronograma foreign key(IdCronogramaPago) references tabCRONOGRAMA_PAGOS(Id)
)
go

print 'creando tabPAGOS...'
create table tabPAGOS
(Id					int identity(1,1) not null primary key,
 IdContrato			int not null,
 IdCronogramaPago	int,
 IdComprobante		int,
 IdMedioPago		int not null,
 IdTipoMoneda		int not null,
 IdUsuarioRegistra	int not null,
 FechaPago			smalldatetime not null,
 Monto				decimal(18,2) not null,
 NroOperacion		nvarchar(50),
 Observacion		nvarchar(max),
 FechaCreacion		smalldatetime default getdate(),
 FechaModificacion	smalldatetime,
 FechaDesactivacion	smalldatetime,
 constraint fk_Pago_Contrato foreign key(IdContrato) references tabCONTRATOS(Id),
 constraint fk_Pago_Cronograma foreign key(IdCronogramaPago) references tabCRONOGRAMA_PAGOS(Id),
 constraint fk_Pago_Comprobante foreign key(IdComprobante) references tabCOMPROBANTES(Id),
 constraint fk_Pago_MedioPago foreign key(IdMedioPago) references tabMEDIOS_PAGO(Id),
 constraint fk_Pago_TipoMoneda foreign key(IdTipoMoneda) references tabTIPO_MONEDAS(Id),
 constraint fk_Pago_UsuRegistra foreign key(IdUsuarioRegistra) references tabUSUARIOS(Id),
 constraint ck_Pago_Monto check (Monto > 0)
)
go

/************************************/
/*			Tablas Incidencias		*/
/************************************/
print '----------------------------'
print 'creando Tablas Incidencias..'
print '----------------------------'

print 'creando tabTIPO_INCIDENCIAS...'
create table tabTIPO_INCIDENCIAS
(Id					int identity(1,1) not null primary key,
 Abreviatura		nvarchar(10) not null unique,
 Nombre				nvarchar(25),
 Descripcion		nvarchar(100),
 FechaCreacion		smalldatetime default getdate(),
 FechaModificacion	smalldatetime,
 FechaDesactivacion	smalldatetime
)
go

print 'creando tabINCIDENCIAS...'
create table tabINCIDENCIAS
(Id					int identity(1,1) not null primary key,
 IdUsuarioRegistra	int not null,
 IdCliente			int not null,
 IdLocal			int,
 IdContrato			int,
 IdTipoIncidente	int not null,
 Descripcion		nvarchar(max),
 IdEstado			int,
 FechaResolucion	smalldatetime,
 Solucion			nvarchar(max),
 FechaCreacion		smalldatetime default getdate(),
 FechaModificacion	smalldatetime,
 FechaDesactivacion	smalldatetime,
 constraint fk_Incidente_UsuRegistra foreign key(IdUsuarioRegistra) references tabUSUARIOS(Id),
 constraint fk_Incidente_Cliente foreign key(IdCliente) references tabCLIENTES(Id),
 constraint fk_Incidente_Local foreign key(IdLocal) references tabLOCALES(Id),
 constraint fk_Incidente_Contrato foreign key(IdContrato) references tabCONTRATOS(Id),
 constraint fk_Incidente_TipoIncidente foreign key(IdTipoIncidente) references tabTIPO_INCIDENCIAS(Id),
 constraint fk_Incidente_Estado foreign key(IdEstado) references tabESTADOS(Id)
)
go

/************************************/
/*			Tablas Auditoría		*/
/************************************/
print '-------------------------'
print 'creando Tablas Auditoría.'
print '-------------------------'

print 'creando tabEVENTOS...'
create table tabEVENTOS
(Id					int identity(1,1) not null primary key,
 Estacion			nvarchar(25),
 Entidad			nvarchar(15),
 IdUsuario			int,
 CodigoUsuario		nvarchar(15),
 mensaje			nvarchar(max),
 FechaCreacion		smalldatetime default getdate(),
 FechaModificacion	smalldatetime,
 FechaDesactivacion	smalldatetime
)
go

/************************************/
/*			Índices					*/
/************************************/
print '-------------------------'
print 'creando Índices...'
print '-------------------------'

create index ix_Locales_IdEmpresa				on tabLOCALES(IdEmpresa)
create index ix_Locales_IdTipoLocal				on tabLOCALES(IdTipoLocal)
create index ix_Clientes_NumeroDocumento		on tabCLIENTES(NumeroDocumento)
create index ix_Contratos_IdCliente				on tabCONTRATOS(IdCliente)
create index ix_Contratos_IdLocal_Fechas		on tabCONTRATOS(IdLocal, FechaInicio, FechaFin)
create index ix_Contratos_IdEstado				on tabCONTRATOS(IdEstado)
create index ix_Adendas_IdContrato				on tabADENDAS(IdContrato)
create index ix_Garantias_IdContrato			on tabGARANTIAS(IdContrato)
create index ix_DocContrato_IdContrato			on tabDOCUMENTOS_CONTRATO(IdContrato)
create index ix_Cronograma_FechaVencimiento		on tabCRONOGRAMA_PAGOS(FechaVencimiento, IdEstado)
create index ix_Comprobantes_IdCliente			on tabCOMPROBANTES(IdCliente)
create index ix_Comprobantes_IdContrato			on tabCOMPROBANTES(IdContrato)
create index ix_Comprobantes_FechaEmision		on tabCOMPROBANTES(FechaEmision)
create index ix_ComDetalles_IdComprobante		on tabCOMPROBANTE_DETALLES(IdComprobante)
create index ix_Pagos_IdContrato				on tabPAGOS(IdContrato)
create index ix_Pagos_FechaPago					on tabPAGOS(FechaPago)
create index ix_Incidencias_IdCliente			on tabINCIDENCIAS(IdCliente)
create index ix_Incidencias_IdLocal				on tabINCIDENCIAS(IdLocal)
create index ix_Incidencias_IdContrato			on tabINCIDENCIAS(IdContrato)
create index ix_Eventos_IdUsuario				on tabEVENTOS(IdUsuario)
go

print 'Script ejecutado con exito...'
