using GestionContratos.DTOs.Analiticas;
using GestionContratos.Negocio.Analiticas;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GestionContratos.API.Controllers;

/// <summary>
/// Indicadores del dashboard. Solo lectura, para cualquier usuario autenticado.
/// Todos aceptan <c>idEmpresa</c>; sin él se consideran todas las empresas. Los cálculos son a la fecha de hoy.
/// </summary>
[ApiController]
[Route("api/analiticas")]
[Authorize]
public class AnaliticasController(IAnaliticasServicio servicio) : ControllerBase
{
    /// <summary>Indicadores principales: ocupación, cobranza del mes, deuda vencida y contratos por vencer.</summary>
    [HttpGet("resumen")]
    public async Task<ActionResult<ResumenDto>> Resumen([FromQuery] AnaliticaFiltro filtro, CancellationToken ct) =>
        Ok(await servicio.ResumenAsync(filtro.IdEmpresa, ct));

    /// <summary>Locales ocupados, disponibles y en mantenimiento por empresa.</summary>
    [HttpGet("ocupacion")]
    public async Task<ActionResult<IReadOnlyList<OcupacionDto>>> Ocupacion([FromQuery] AnaliticaFiltro filtro, CancellationToken ct) =>
        Ok(await servicio.OcupacionAsync(filtro.IdEmpresa, ct));

    /// <summary>Ingresos esperados (cuotas que vencen) frente a cobrados (pagos recibidos), mes a mes. Máximo 60 meses.</summary>
    [HttpGet("ingresos-mensuales")]
    public async Task<ActionResult<IReadOnlyList<IngresoMensualDto>>> IngresosMensuales([FromQuery] IngresosFiltro filtro, CancellationToken ct) =>
        Ok(await servicio.IngresosMensualesAsync(filtro, ct));

    /// <summary>Deuda vencida total y su antigüedad.</summary>
    [HttpGet("morosidad")]
    public async Task<ActionResult<MorosidadResumenDto>> Morosidad([FromQuery] AnaliticaFiltro filtro, CancellationToken ct) =>
        Ok(await servicio.MorosidadAsync(filtro.IdEmpresa, ct));

    /// <summary>Contratos vigentes que terminan dentro de los próximos <c>dias</c> (90 por defecto), del más próximo al más lejano.</summary>
    [HttpGet("contratos-por-vencer")]
    public async Task<ActionResult<IReadOnlyList<ContratoPorVencerDto>>> ContratosPorVencer([FromQuery] PorVencerFiltro filtro, CancellationToken ct) =>
        Ok(await servicio.ContratosPorVencerAsync(filtro, ct));

    /// <summary>Locales que más han generado, según lo cobrado en el período.</summary>
    [HttpGet("top-locales")]
    public async Task<ActionResult<IReadOnlyList<TopLocalDto>>> TopLocales([FromQuery] TopFiltro filtro, CancellationToken ct) =>
        Ok(await servicio.TopLocalesAsync(filtro, ct));

    /// <summary>Clientes que más han pagado en el período.</summary>
    [HttpGet("top-clientes")]
    public async Task<ActionResult<IReadOnlyList<TopClienteDto>>> TopClientes([FromQuery] TopFiltro filtro, CancellationToken ct) =>
        Ok(await servicio.TopClientesAsync(filtro, ct));
}
