using GestionContratos.DTOs.Pagos;
using GestionContratos.Negocio.Pagos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GestionContratos.API.Controllers;

/// <summary>Deuda vencida a la fecha de hoy. Una cuota está en mora si ya venció y aún tiene saldo.</summary>
[ApiController]
[Route("api/morosidad")]
[Authorize]
public class MorosidadController(IMorosidadServicio servicio) : ControllerBase
{
    /// <summary>Clientes con deuda vencida, de mayor a menor monto.</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<MorosoDto>>> Listar(CancellationToken ct) =>
        Ok(await servicio.ListarAsync(ct));

    /// <summary>Cuotas vencidas con saldo de un cliente.</summary>
    [HttpGet("{idCliente:int}")]
    public async Task<ActionResult<IReadOnlyList<CuotaVencidaDto>>> Detalle(int idCliente, CancellationToken ct) =>
        Ok(await servicio.DetalleDeClienteAsync(idCliente, ct));
}
