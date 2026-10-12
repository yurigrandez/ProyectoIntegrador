using System.Security.Claims;
using GestionContratos.DTOs.Autenticacion;
using GestionContratos.Negocio.Autenticacion;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GestionContratos.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IAuthServicio authServicio) : ControllerBase
{
    /// <summary>Inicia sesión y devuelve un token JWT.</summary>
    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType<LoginRespuesta>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<LoginRespuesta>> Login(LoginSolicitud solicitud, CancellationToken ct) =>
        Ok(await authServicio.LoginAsync(solicitud, ct));

    /// <summary>Datos del usuario autenticado según su token.</summary>
    [HttpGet("yo")]
    [Authorize]
    [ProducesResponseType<UsuarioSesion>(StatusCodes.Status200OK)]
    public ActionResult<UsuarioSesion> Yo() => Ok(new UsuarioSesion
    {
        Id = int.Parse(User.FindFirstValue("sub")!),
        Codigo = User.FindFirstValue("codigo")!,
        NombreCompleto = User.FindFirstValue("nombre")!,
        Rol = User.FindFirstValue(ClaimTypes.Role)!
    });
}
