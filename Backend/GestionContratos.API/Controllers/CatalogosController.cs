using GestionContratos.DTOs.Catalogos;
using GestionContratos.Negocio.Catalogos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GestionContratos.API.Controllers;

/// <summary>Catálogos de solo lectura para llenar listas desplegables.</summary>
[ApiController]
[Route("api/catalogos")]
[Authorize]
public class CatalogosController(ICatalogosServicio servicio) : ControllerBase
{
    /// <summary>Nombres de los catálogos disponibles.</summary>
    [HttpGet]
    public ActionResult<IReadOnlyCollection<string>> Nombres() => Ok(servicio.Nombres);

    /// <param name="nombre">tipos-documento, tipos-comprobante, tipos-local, monedas, medios-pago, conceptos, estados o tipos-incidencia.</param>
    [HttpGet("{nombre}")]
    public async Task<ActionResult<IReadOnlyList<CatalogoItemDto>>> Listar(string nombre, CancellationToken ct) =>
        Ok(await servicio.ListarAsync(nombre, ct));
}
