use master
go

/***************Verificando si existe BD******************/ 
if exists (select * from sysdatabases where (name = 'dbALQUILERES'))
begin
	print 'existe BD dbALQUILERES, eliminando...'
	drop database dbALQUILERES
end

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

print 'creando tabEMPRESA...'
create table tabEMPRESAS
(Id					int identity(1,1) not null primary key,
 Codigo				nvarchar(15) not null,
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
 TipoLocal			nvarchar(5),
 Descripcion		nvarchar(150),
 fechaCreacion		smalldatetime default getdate(),
 fechaModificacion	smalldatetime,
 fechaDesactivacion	smalldatetime,
)
go

print 'creando tabLOCALES...'
create table tabLOCALES
(Id					int identity(1,1) not null primary key,
 Codigo				nvarchar(15) not null unique,
 IdTipoLocal		int,
 IdEmpresa			int,
 Direccion			nvarchar(250),
 Interior			int,
 TotalM2			decimal(18,2),
 Dimensiones		nvarchar(150),
 NroPisos			int,
 ImgFrontis			varbinary(max),
 FechaCreacion		smalldatetime default getdate(),
 FechaModificacion	smalldatetime,
 FechaDesactivacion	smalldatetime,
 constraint fk_Locales_Empresas foreign key(IdEmpresa) references tabEMPRESAS(Id),
 constraint fk_Locales_Empresa foreign key(IdTipoLocal) references tabTIPO_LOCALES(Id)
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
 Clave				nvarchar(max),
 IdTipoUsuario		int,
 IdtipoDocumento	int,
 NumeroDocumento	nvarchar(25),
 Direccion			nvarchar(250),
 Telefono			nvarchar(25),
 FechaCreacion		smalldatetime default getdate(),
 FechaModificacion	smalldatetime,
 FechaDesactivacion	smalldatetime,
 constraint fk_Usuario_TipoUsuario foreign key(IdTipoUsuario) references tabTIPO_USUARIOS(Id),
 constraint fk_Usuario_TipoDocumento foreign key(IdtipoDocumento) references tabTIPO_DOCUMENTOS(Id)
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
 Yelefono			nvarchar(25),
 IdTipoComprobante	int,
 FechaCreacion		smalldatetime default getdate(),
 FechaModificacion	smalldatetime,
 FechaDesactivacion	smalldatetime,
 constraint fk_Cliente_TipoDocumento foreign key(IdTipoDocumento) references tabTIPO_DOCUMENTOS(Id),
 constraint fk_Cliente_TipoComprobante foreign key(IdTipoComprobante) references tabTIPO_COMPROBANTES(Id)
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
 FechaDesactivacion	smalldatetime,
)
go

print '-------------------------------'
print 'creando Tablas Mantenimiento...'
print '-------------------------------'

print 'creando tabSECUENCIA...'
create table tabSECUENCIA
(Id					int identity(1,1) not null primary key,
 Tabla				varchar(50),
 Anio				char(4),
 Prefijo			char(3),
 Numero				int,
 FechaCreacion		smalldatetime default getdate(),
 FechaModificacion	smalldatetime,
 FechaDesactivacion	smalldatetime,
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
 IdCliente			int,
 IdUsuarioRegistra	int,
 IdUsuarioAutoriza	int,
 IdLocal			int,
 FechaInicio		smalldatetime,
 FechaFin			smalldatetime,
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
 constraint fk_Contrato_Estado foreign key(IdEstado) references tabESTADOS(Id)
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

print 'creando tabCOMPROBANTES...'
create table tabCOMPROBANTES
(Id					int identity(1,1) not null primary key,
 IdEmpresa			int,
 IdTipoComprobante	int,
 NroComprobante		nvarchar(10),
 IdCliente			int,
 IdContrato			int,
 IdUsuarioRegistra	int,
 FechaEmision		smalldatetime,
 IdTipoMoneda		int,
 Observacion		nvarchar(max),
 ImporteTotal		decimal(18,2),
 FechaCreacion		smalldatetime default getdate(),
 FechaModificacion	smalldatetime,
 FechaDesactivacion	smalldatetime
 constraint fk_Comprobante_Empresa foreign key(IdEmpresa) references tabEMPRESAS(Id),
 constraint fk_Comprobante_TipoComprobante foreign key(IdTipoComprobante) references tabTIPO_COMPROBANTES(Id),
 constraint fk_Comprobante_Cliente foreign key(IdCliente) references tabCLIENTES(Id),
 constraint fk_Comprobante_Contrato foreign key(IdContrato) references tabCONTRATOS(Id),
 constraint fk_Comprobante_UsuRegistra foreign key(IdUsuarioRegistra) references tabUSUARIOS(Id),
 constraint fk_Comprobante_TipoMoneda foreign key(IdTipoMoneda) references tabTIPO_MONEDAS(Id)
)
go

print 'creando tabCOMPROBANTE_DETALLES...'
create table tabCOMPROBANTE_DETALLES
(Id					int identity(1,1) not null primary key,
 IdComprobante		int not null,
 Concepto			nvarchar(250),
 Cantidad			int,
 PrecioUnitario		decimal(18,2),
 SubTotal			decimal(18,2),
 FechaCreacion		smalldatetime default getdate(),
 FechaModificacion	smalldatetime,
 FechaDesactivacion	smalldatetime
 constraint fk_ComDetalle_Comprobante foreign key(IdComprobante) references tabCOMPROBANTES(Id)
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
 IdTipoIncidente	int not null,
 Descripcion		nvarchar(max),
 FechaCreacion		smalldatetime default getdate(),
 FechaModificacion	smalldatetime,
 FechaDesactivacion	smalldatetime,
 constraint fk_Incidente_UsuRegistra foreign key(IdUsuarioRegistra) references tabUSUARIOS(Id),
 constraint fk_Incidente_Cliente foreign key(IdCliente) references tabCLIENTES(Id),
 constraint fk_Incidente_TipoIncidente foreign key(IdTipoIncidente) references tabTIPO_INCIDENCIAS(Id)
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

print 'Script ejecutado con exito...'