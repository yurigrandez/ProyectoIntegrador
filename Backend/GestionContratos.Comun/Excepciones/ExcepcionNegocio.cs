namespace GestionContratos.Comun.Excepciones;

/// <summary>Regla de negocio o validación incumplida (HTTP 400).</summary>
public class ExcepcionNegocio(string mensaje) : Exception(mensaje);

/// <summary>El recurso solicitado no existe (HTTP 404).</summary>
public class ExcepcionNoEncontrado(string mensaje) : Exception(mensaje);

/// <summary>Credenciales inválidas o sin permiso (HTTP 401).</summary>
public class ExcepcionNoAutorizado(string mensaje) : Exception(mensaje);
