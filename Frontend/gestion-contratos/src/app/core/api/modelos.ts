/** Tipos que reflejan los DTO de la API (camelCase). Las fechas llegan como texto ISO. */

export interface Paginado<T> {
  items: T[];
  total: number;
  pagina: number;
  tamano: number;
  totalPaginas: number;
}

export interface CatalogoItem {
  id: number;
  abreviatura: string;
  nombre: string | null;
}

// ---------- autenticación ----------
export interface UsuarioSesion {
  id: number;
  codigo: string;
  nombreCompleto: string;
  /** ADM (administrador) u OPE (operador). */
  rol: string;
}

export interface LoginRespuesta {
  token: string;
  expira: string;
  usuario: UsuarioSesion;
}

// ---------- maestros ----------
export interface Cliente {
  id: number;
  codigo: string;
  nombre: string | null;
  paterno: string | null;
  materno: string | null;
  idTipoDocumento: number | null;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  correo: string | null;
  direccion: string | null;
  telefono: string | null;
  idTipoComprobante: number | null;
  tipoComprobante: string | null;
  fechaCreacion: string | null;
}

export interface ClienteGuardar {
  nombre: string;
  paterno: string | null;
  materno: string | null;
  idTipoDocumento: number | null;
  numeroDocumento: string;
  correo: string | null;
  direccion: string | null;
  telefono: string | null;
  idTipoComprobante: number | null;
}

export interface ClienteCrear extends ClienteGuardar {
  codigo: string;
}

export interface Empresa {
  id: number;
  codigo: string;
  nombre: string | null;
  direccion: string | null;
  ruc: string | null;
  telefono: string | null;
  movil: string | null;
  nombreContacto: string | null;
  correoContacto: string | null;
  tlfContacto: string | null;
  movilContacto: string | null;
  fechaCreacion: string | null;
}

export interface EmpresaGuardar {
  nombre: string;
  direccion: string | null;
  ruc: string;
  telefono: string | null;
  movil: string | null;
  nombreContacto: string | null;
  correoContacto: string | null;
  tlfContacto: string | null;
  movilContacto: string | null;
}

export interface EmpresaCrear extends EmpresaGuardar {
  codigo: string;
}

export interface Local {
  id: number;
  codigo: string;
  idTipoLocal: number;
  tipoLocal: string | null;
  idEmpresa: number;
  empresa: string | null;
  direccion: string | null;
  interior: number | null;
  totalM2: number | null;
  dimensiones: string | null;
  nroPisos: number | null;
  idEstado: number | null;
  /** DIS, OCU o MAN. */
  estado: string | null;
  fechaCreacion: string | null;
}

export interface LocalGuardar {
  idTipoLocal: number | null;
  idEmpresa: number | null;
  direccion: string | null;
  interior: number | null;
  totalM2: number | null;
  dimensiones: string | null;
  nroPisos: number | null;
  idEstado: number | null;
}

export interface LocalCrear extends LocalGuardar {
  codigo: string;
}

// ---------- contratos ----------
export interface Contrato {
  id: number;
  codigo: string;
  idCliente: number;
  cliente: string | null;
  idLocal: number;
  local: string | null;
  fechaInicio: string;
  fechaFin: string;
  diaPago: number;
  idTipoMoneda: number | null;
  moneda: string | null;
  montoAlquiler: number | null;
  montoLuz: number | null;
  montoAgua: number | null;
  montoMantenimiento: number | null;
  montoOtros: number | null;
  montoMensual: number;
  observaciones: string | null;
  idEstado: number | null;
  /** BOR, VIG, VEN o RES. */
  estado: string | null;
  usuarioRegistra: string | null;
  usuarioAutoriza: string | null;
  fechaCreacion: string | null;
}

export interface ContratoGuardar {
  idCliente: number | null;
  idLocal: number | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  diaPago: number | null;
  montoAlquiler: number | null;
  montoLuz: number | null;
  montoAgua: number | null;
  montoMantenimiento: number | null;
  montoOtros: number | null;
  observaciones: string | null;
}

export interface Cuota {
  id: number;
  idConcepto: number;
  concepto: string | null;
  nroCuota: number;
  fechaVencimiento: string;
  monto: number;
  pagado: number;
  saldo: number;
  idEstado: number | null;
  /** PEN, PAR o PAG. */
  estado: string | null;
  diasAtraso: number;
}

export interface ResultadoActualizacionEstados {
  contratosVencidos: number;
  localesActualizados: number;
}

// ---------- pagos y morosidad ----------
export interface Pago {
  id: number;
  idContrato: number;
  codigoContrato: string | null;
  cliente: string | null;
  idCronogramaPago: number | null;
  nroCuota: number | null;
  concepto: string | null;
  idMedioPago: number;
  medioPago: string | null;
  moneda: string | null;
  fechaPago: string;
  monto: number;
  nroOperacion: string | null;
  observacion: string | null;
  usuarioRegistra: string | null;
  fechaCreacion: string | null;
}

export interface PagoCrear {
  idCronogramaPago: number;
  idMedioPago: number;
  fechaPago: string | null;
  monto: number;
  nroOperacion: string | null;
  observacion: string | null;
}

export interface Moroso {
  idCliente: number;
  codigoCliente: string;
  cliente: string | null;
  cuotasVencidas: number;
  montoVencido: number;
  maxDiasAtraso: number;
}

export interface CuotaVencida {
  idCronogramaPago: number;
  idCliente: number;
  idContrato: number;
  codigoContrato: string;
  codigoLocal: string | null;
  concepto: string | null;
  nroCuota: number;
  fechaVencimiento: string;
  monto: number;
  pagado: number;
  saldo: number;
  diasAtraso: number;
}

// ---------- analíticas ----------
export interface Resumen {
  fechaCorte: string;
  totalLocales: number;
  localesOcupados: number;
  localesDisponibles: number;
  localesEnMantenimiento: number;
  porcOcupacion: number;
  contratosVigentes: number;
  esperadoMes: number;
  cobradoMes: number;
  porcCobranzaMes: number;
  montoVencido: number;
  cuotasVencidas: number;
  clientesMorosos: number;
  contratosPorVencer30: number;
  contratosPorVencer60: number;
  contratosPorVencer90: number;
}

export interface Ocupacion {
  idEmpresa: number;
  empresa: string | null;
  totalLocales: number;
  ocupados: number;
  enMantenimiento: number;
  disponibles: number;
  porcOcupacion: number;
}

export interface IngresoMensual {
  mes: string;
  esperado: number;
  cobrado: number;
  diferencia: number;
  porcCobranza: number;
}

export interface AntiguedadDeuda {
  rango: string;
  desdeDias: number;
  hastaDias: number | null;
  cuotas: number;
  monto: number;
}

export interface MorosidadResumen {
  montoVencido: number;
  cuotasVencidas: number;
  clientesMorosos: number;
  maxDiasAtraso: number;
  antiguedad: AntiguedadDeuda[];
}

export interface ContratoPorVencer {
  idContrato: number;
  codigoContrato: string;
  idCliente: number;
  cliente: string | null;
  idLocal: number;
  codigoLocal: string | null;
  fechaFin: string;
  diasRestantes: number;
  montoMensual: number;
}

export interface TopLocal {
  idLocal: number;
  codigoLocal: string;
  direccion: string | null;
  cantidadPagos: number;
  totalCobrado: number;
}

export interface TopCliente {
  idCliente: number;
  codigoCliente: string;
  cliente: string | null;
  cantidadPagos: number;
  totalCobrado: number;
}
