using GestionContratos.Datos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GestionContratos.API.Controllers;

[ApiController]
[Route("api/salud")]
[AllowAnonymous]
public class SaludController(GestionContratosDbContext contexto) : ControllerBase
{
    /// <summary>Comprueba que la API está arriba y que puede conectarse a la base de datos.</summary>
    [HttpGet]
    public async Task<IActionResult> Obtener(CancellationToken ct)
    {
        var bd = await contexto.Database.CanConnectAsync(ct);
        return bd ? Ok(new { estado = "ok", baseDatos = "ok" })
                  : StatusCode(StatusCodes.Status503ServiceUnavailable, new { estado = "degradado", baseDatos = "sin conexión" });
    }
}
