using GestionContratos.Comun;
using GestionContratos.DTOs.Comunes;
using GestionContratos.DTOs.Maestros;
using GestionContratos.Negocio.Maestros;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GestionContratos.API.Controllers;

/// <summary>Locales comerciales. Lectura: cualquier usuario autenticado. Alta, edición y baja: solo administrador.</summary>
[ApiController]
[Route("api/locales")]
[Authorize]
public class LocalesController(ILocalesServicio servicio) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PaginadoDto<LocalDto>>> Listar([FromQuery] LocalFiltro filtro, CancellationToken ct) =>
        Ok(await servicio.ListarAsync(filtro, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<LocalDto>> Obtener(int id, CancellationToken ct) =>
        Ok(await servicio.ObtenerAsync(id, ct));

    [HttpPost]
    [Authorize(Roles = Roles.Administrador)]
    public async Task<ActionResult<LocalDto>> Crear(LocalGuardarDto datos, CancellationToken ct)
    {
        var creado = await servicio.CrearAsync(datos, ct);
        return CreatedAtAction(nameof(Obtener), new { id = creado.Id }, creado);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = Roles.Administrador)]
    public async Task<ActionResult<LocalDto>> Actualizar(int id, LocalGuardarDto datos, CancellationToken ct) =>
        Ok(await servicio.ActualizarAsync(id, datos, ct));

    [HttpDelete("{id:int}")]
    [Authorize(Roles = Roles.Administrador)]
    public async Task<IActionResult> Desactivar(int id, CancellationToken ct)
    {
        await servicio.DesactivarAsync(id, ct);
        return NoContent();
    }
}
