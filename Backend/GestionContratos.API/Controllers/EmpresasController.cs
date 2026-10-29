using GestionContratos.Comun;
using GestionContratos.DTOs.Comunes;
using GestionContratos.DTOs.Maestros;
using GestionContratos.Negocio.Maestros;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GestionContratos.API.Controllers;

/// <summary>Empresas propietarias. Lectura: cualquier usuario autenticado. Alta, edición y baja: solo administrador.</summary>
[ApiController]
[Route("api/empresas")]
[Authorize]
public class EmpresasController(IEmpresasServicio servicio) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PaginadoDto<EmpresaDto>>> Listar([FromQuery] EmpresaFiltro filtro, CancellationToken ct) =>
        Ok(await servicio.ListarAsync(filtro, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<EmpresaDto>> Obtener(int id, CancellationToken ct) =>
        Ok(await servicio.ObtenerAsync(id, ct));

    [HttpPost]
    [Authorize(Roles = Roles.Administrador)]
    public async Task<ActionResult<EmpresaDto>> Crear(EmpresaGuardarDto datos, CancellationToken ct)
    {
        var creada = await servicio.CrearAsync(datos, ct);
        return CreatedAtAction(nameof(Obtener), new { id = creada.Id }, creada);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = Roles.Administrador)]
    public async Task<ActionResult<EmpresaDto>> Actualizar(int id, EmpresaGuardarDto datos, CancellationToken ct) =>
        Ok(await servicio.ActualizarAsync(id, datos, ct));

    [HttpDelete("{id:int}")]
    [Authorize(Roles = Roles.Administrador)]
    public async Task<IActionResult> Desactivar(int id, CancellationToken ct)
    {
        await servicio.DesactivarAsync(id, ct);
        return NoContent();
    }
}
