using GestionContratos.API.Infraestructura;
using GestionContratos.Comun;
using GestionContratos.DTOs.Comunes;
using GestionContratos.DTOs.Pagos;
using GestionContratos.Negocio.Pagos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GestionContratos.API.Controllers;

/// <summary>Pagos aplicados a las cuotas del cronograma. Registrar: cualquier usuario. Anular: solo administrador.</summary>
[ApiController]
[Route("api/pagos")]
[Authorize]
public class PagosController(IPagosServicio servicio) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PaginadoDto<PagoDto>>> Listar([FromQuery] PagoFiltro filtro, CancellationToken ct) =>
        Ok(await servicio.ListarAsync(filtro, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PagoDto>> Obtener(int id, CancellationToken ct) =>
        Ok(await servicio.ObtenerAsync(id, ct));

    /// <summary>Registra un pago (total o parcial) sobre una cuota. El monto no puede superar el saldo de la cuota.</summary>
    [HttpPost]
    public async Task<ActionResult<PagoDto>> Registrar(PagoCrearDto datos, CancellationToken ct)
    {
        var creado = await servicio.RegistrarAsync(datos, User.ObtenerUsuarioActual(), ct);
        return CreatedAtAction(nameof(Obtener), new { id = creado.Id }, creado);
    }

    /// <summary>Anula un pago y devuelve la cuota al estado que corresponde según lo que quede pagado.</summary>
    [HttpPost("{id:int}/anular")]
    [Authorize(Roles = Roles.Administrador)]
    public async Task<IActionResult> Anular(int id, AnularPagoDto datos, CancellationToken ct)
    {
        await servicio.AnularAsync(id, datos, User.ObtenerUsuarioActual(), ct);
        return NoContent();
    }
}
