using GestionContratos.API.Infraestructura;
using GestionContratos.Comun;
using GestionContratos.DTOs.Comunes;
using GestionContratos.DTOs.Contratos;
using GestionContratos.Negocio.Contratos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GestionContratos.API.Controllers;

/// <summary>
/// Contratos de alquiler. Cualquier usuario autenticado consulta, registra y edita borradores;
/// autorizar, rescindir y eliminar borradores es solo del administrador.
/// </summary>
[ApiController]
[Route("api/contratos")]
[Authorize]
public class ContratosController(IContratosServicio servicio) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PaginadoDto<ContratoDto>>> Listar([FromQuery] ContratoFiltro filtro, CancellationToken ct) =>
        Ok(await servicio.ListarAsync(filtro, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ContratoDto>> Obtener(int id, CancellationToken ct) =>
        Ok(await servicio.ObtenerAsync(id, ct));

    /// <summary>Cuotas del contrato con lo pagado, el saldo y los días de atraso.</summary>
    [HttpGet("{id:int}/cronograma")]
    public async Task<ActionResult<IReadOnlyList<CuotaDto>>> Cronograma(int id, CancellationToken ct) =>
        Ok(await servicio.ObtenerCronogramaAsync(id, ct));

    /// <summary>Registra un contrato en borrador; el código se genera automáticamente.</summary>
    [HttpPost]
    public async Task<ActionResult<ContratoDto>> Crear(ContratoGuardarDto datos, CancellationToken ct)
    {
        var creado = await servicio.CrearAsync(datos, User.ObtenerUsuarioActual(), ct);
        return CreatedAtAction(nameof(Obtener), new { id = creado.Id }, creado);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ContratoDto>> Actualizar(int id, ContratoGuardarDto datos, CancellationToken ct) =>
        Ok(await servicio.ActualizarAsync(id, datos, ct));

    [HttpDelete("{id:int}")]
    [Authorize(Roles = Roles.Administrador)]
    public async Task<IActionResult> Desactivar(int id, CancellationToken ct)
    {
        await servicio.DesactivarAsync(id, ct);
        return NoContent();
    }

    /// <summary>Autoriza el contrato (debe hacerlo un administrador distinto del que lo registró) y genera el cronograma.</summary>
    [HttpPost("{id:int}/autorizar")]
    [Authorize(Roles = Roles.Administrador)]
    public async Task<ActionResult<ContratoDto>> Autorizar(int id, CancellationToken ct) =>
        Ok(await servicio.AutorizarAsync(id, User.ObtenerUsuarioActual(), ct));

    [HttpPost("{id:int}/rescindir")]
    [Authorize(Roles = Roles.Administrador)]
    public async Task<ActionResult<ContratoDto>> Rescindir(int id, RescindirContratoDto datos, CancellationToken ct) =>
        Ok(await servicio.RescindirAsync(id, datos, User.ObtenerUsuarioActual(), ct));

    /// <summary>Marca vencidos los contratos cuyo plazo terminó y actualiza el estado de los locales.</summary>
    [HttpPost("actualizar-estados")]
    [Authorize(Roles = Roles.Administrador)]
    public async Task<ActionResult<ResultadoActualizacionEstadosDto>> ActualizarEstados(CancellationToken ct) =>
        Ok(await servicio.ActualizarEstadosAsync(ct));
}
