using System.Security.Claims;
using GestionContratos.Comun;

namespace GestionContratos.API.Infraestructura;

public static class UsuarioActualExtensions
{
    /// <summary>Usuario autenticado según los claims del token JWT.</summary>
    public static UsuarioActual ObtenerUsuarioActual(this ClaimsPrincipal usuario) => new(
        int.Parse(usuario.FindFirstValue("sub")!),
        usuario.FindFirstValue("codigo")!,
        usuario.FindFirstValue(ClaimTypes.Role)!);
}
