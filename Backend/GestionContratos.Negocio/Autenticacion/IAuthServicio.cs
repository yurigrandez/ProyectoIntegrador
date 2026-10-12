using GestionContratos.DTOs.Autenticacion;

namespace GestionContratos.Negocio.Autenticacion;

public interface IAuthServicio
{
    /// <exception cref="GestionContratos.Comun.Excepciones.ExcepcionNoAutorizado">Credenciales inválidas.</exception>
    Task<LoginRespuesta> LoginAsync(LoginSolicitud solicitud, CancellationToken ct = default);
}
