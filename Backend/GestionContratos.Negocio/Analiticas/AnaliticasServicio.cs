using GestionContratos.Comun.Excepciones;
using GestionContratos.Datos.Repositorios;
using GestionContratos.DTOs.Analiticas;
using GestionContratos.Entidades;
using GestionContratos.Negocio.Pagos;
using Microsoft.EntityFrameworkCore;

namespace GestionContratos.Negocio.Analiticas;

public interface IAnaliticasServicio
{
    Task<ResumenDto> ResumenAsync(int? idEmpresa, CancellationToken ct = default);
    Task<IReadOnlyList<OcupacionDto>> OcupacionAsync(int? idEmpresa, CancellationToken ct = default);
    Task<IReadOnlyList<IngresoMensualDto>> IngresosMensualesAsync(IngresosFiltro filtro, CancellationToken ct = default);
    Task<MorosidadResumenDto> MorosidadAsync(int? idEmpresa, CancellationToken ct = default);
    Task<IReadOnlyList<ContratoPorVencerDto>> ContratosPorVencerAsync(PorVencerFiltro filtro, CancellationToken ct = default);
    Task<IReadOnlyList<TopLocalDto>> TopLocalesAsync(TopFiltro filtro, CancellationToken ct = default);
    Task<IReadOnlyList<TopClienteDto>> TopClientesAsync(TopFiltro filtro, CancellationToken ct = default);
}

/// <summary>
/// Consultas de solo lectura para el dashboard. Todas se calculan a la fecha de hoy y aceptan una empresa
/// opcional; sin ella se consideran todas las empresas.
/// </summary>
public class AnaliticasServicio(IUnidadTrabajo unidad, IMorosidadServicio morosidad, TimeProvider reloj) : IAnaliticasServicio
{
    private const int MaximoMesesDeRango = 60;

    private DateTime Hoy => reloj.GetLocalNow().Date;

    // ---------------------------------------------------------------- resumen

    public async Task<ResumenDto> ResumenAsync(int? idEmpresa, CancellationToken ct = default)
    {
        await ValidarEmpresaAsync(idEmpresa, ct);
        var hoy = Hoy;
        var mes = new DateTime(hoy.Year, hoy.Month, 1);

        var ocupacion = await OcupacionAsync(idEmpresa, ct);
        var ingresos = (await IngresosMensualesAsync(new IngresosFiltro { Desde = mes, Hasta = mes, IdEmpresa = idEmpresa }, ct)).Single();
        var mora = await MorosidadAsync(idEmpresa, ct);
        var porVencer = await ContratosPorVencerAsync(new PorVencerFiltro { Dias = 90, IdEmpresa = idEmpresa }, ct);

        var total = ocupacion.Sum(o => o.TotalLocales);
        var ocupados = ocupacion.Sum(o => o.Ocupados);
        return new ResumenDto
        {
            FechaCorte = hoy,
            TotalLocales = total,
            LocalesOcupados = ocupados,
            LocalesDisponibles = ocupacion.Sum(o => o.Disponibles),
            LocalesEnMantenimiento = ocupacion.Sum(o => o.EnMantenimiento),
            PorcOcupacion = Porcentaje(ocupados, total),
            ContratosVigentes = await ContarContratosVigentesAsync(idEmpresa, ct),
            EsperadoMes = ingresos.Esperado,
            CobradoMes = ingresos.Cobrado,
            PorcCobranzaMes = ingresos.PorcCobranza,
            MontoVencido = mora.MontoVencido,
            CuotasVencidas = mora.CuotasVencidas,
            ClientesMorosos = mora.ClientesMorosos,
            ContratosPorVencer30 = porVencer.Count(c => c.DiasRestantes <= 30),
            ContratosPorVencer60 = porVencer.Count(c => c.DiasRestantes <= 60),
            ContratosPorVencer90 = porVencer.Count
        };
    }

    // ---------------------------------------------------------------- ocupación

    public async Task<IReadOnlyList<OcupacionDto>> OcupacionAsync(int? idEmpresa, CancellationToken ct = default)
    {
        await ValidarEmpresaAsync(idEmpresa, ct);
        var hoy = Hoy;
        var idVigente = await IdEstadoAsync("VIG", ct);

        var contratos = unidad.Repositorio<Contrato>().Consultar()
            .Where(c => c.IdEstado == idVigente && c.FechaInicio <= hoy && c.FechaFin >= hoy);
        if (idEmpresa is { } e1) contratos = contratos.Where(c => c.Local.IdEmpresa == e1);
        var ocupados = (await contratos.Select(c => c.IdLocal).Distinct().ToListAsync(ct)).ToHashSet();

        var locales = unidad.Repositorio<Local>().Consultar();
        if (idEmpresa is { } e2) locales = locales.Where(l => l.IdEmpresa == e2);
        var datos = await locales
            .Select(l => new { l.Id, l.IdEmpresa, Empresa = l.Empresa.Nombre, Estado = l.Estado != null ? l.Estado.Abreviatura : null })
            .ToListAsync(ct);

        return datos
            .GroupBy(l => new { l.IdEmpresa, l.Empresa })
            .Select(g =>
            {
                var enOcupados = g.Count(l => ocupados.Contains(l.Id));
                var mantenimiento = g.Count(l => !ocupados.Contains(l.Id) && l.Estado == "MAN");
                return new OcupacionDto
                {
                    IdEmpresa = g.Key.IdEmpresa,
                    Empresa = g.Key.Empresa,
                    TotalLocales = g.Count(),
                    Ocupados = enOcupados,
                    EnMantenimiento = mantenimiento,
                    Disponibles = g.Count() - enOcupados - mantenimiento,
                    PorcOcupacion = Porcentaje(enOcupados, g.Count())
                };
            })
            .OrderBy(o => o.Empresa)
            .ToList();
    }

    // ---------------------------------------------------------------- ingresos esperados vs cobrados

    public async Task<IReadOnlyList<IngresoMensualDto>> IngresosMensualesAsync(IngresosFiltro filtro, CancellationToken ct = default)
    {
        await ValidarEmpresaAsync(filtro.IdEmpresa, ct);
        var hoy = Hoy;
        var hasta = PrimerDiaDelMes(filtro.Hasta ?? hoy);
        var desde = PrimerDiaDelMes(filtro.Desde ?? hasta.AddMonths(-11));
        if (hasta < desde)
            throw new ExcepcionNegocio("El mes final no puede ser anterior al mes inicial.");
        if (desde.AddMonths(MaximoMesesDeRango) <= hasta)
            throw new ExcepcionNegocio($"El rango no puede superar {MaximoMesesDeRango} meses.");
        var limite = hasta.AddMonths(1);

        var cuotas = unidad.Repositorio<CronogramaPago>().Consultar()
            .Where(c => c.FechaVencimiento >= desde && c.FechaVencimiento < limite);
        if (filtro.IdEmpresa is { } e1) cuotas = cuotas.Where(c => c.Contrato.Local.IdEmpresa == e1);
        var esperado = (await cuotas
                .GroupBy(c => new { c.FechaVencimiento.Year, c.FechaVencimiento.Month })
                .Select(g => new { g.Key.Year, g.Key.Month, Total = g.Sum(c => c.Monto) })
                .ToListAsync(ct))
            .ToDictionary(x => new DateTime(x.Year, x.Month, 1), x => x.Total);

        var pagos = unidad.Repositorio<Pago>().Consultar()
            .Where(p => p.FechaPago >= desde && p.FechaPago < limite);
        if (filtro.IdEmpresa is { } e2) pagos = pagos.Where(p => p.Contrato.Local.IdEmpresa == e2);
        var cobrado = (await pagos
                .GroupBy(p => new { p.FechaPago.Year, p.FechaPago.Month })
                .Select(g => new { g.Key.Year, g.Key.Month, Total = g.Sum(p => p.Monto) })
                .ToListAsync(ct))
            .ToDictionary(x => new DateTime(x.Year, x.Month, 1), x => x.Total);

        // Se devuelven todos los meses del rango (con ceros) para que el gráfico no tenga huecos.
        var resultado = new List<IngresoMensualDto>();
        for (var mes = desde; mes <= hasta; mes = mes.AddMonths(1))
        {
            var e = esperado.GetValueOrDefault(mes);
            var c = cobrado.GetValueOrDefault(mes);
            resultado.Add(new IngresoMensualDto
            {
                Mes = mes,
                Esperado = e,
                Cobrado = c,
                Diferencia = c - e,
                PorcCobranza = e > 0 ? Math.Round(c / e * 100, 2) : 0
            });
        }
        return resultado;
    }

    // ---------------------------------------------------------------- morosidad

    public async Task<MorosidadResumenDto> MorosidadAsync(int? idEmpresa, CancellationToken ct = default)
    {
        await ValidarEmpresaAsync(idEmpresa, ct);
        var cuotas = await morosidad.CuotasVencidasAsync(idEmpresa, ct);

        (string Rango, int Desde, int? Hasta)[] rangos = [("1-30 días", 1, 30), ("31-60 días", 31, 60), ("61-90 días", 61, 90), ("Más de 90 días", 91, null)];
        return new MorosidadResumenDto
        {
            MontoVencido = cuotas.Sum(c => c.Saldo),
            CuotasVencidas = cuotas.Count,
            ClientesMorosos = cuotas.Select(c => c.IdCliente).Distinct().Count(),
            MaxDiasAtraso = cuotas.Count == 0 ? 0 : cuotas.Max(c => c.DiasAtraso),
            Antiguedad = rangos.Select(r =>
            {
                var enRango = cuotas.Where(c => c.DiasAtraso >= r.Desde && (r.Hasta is null || c.DiasAtraso <= r.Hasta)).ToList();
                return new AntiguedadDeudaDto
                {
                    Rango = r.Rango,
                    DesdeDias = r.Desde,
                    HastaDias = r.Hasta,
                    Cuotas = enRango.Count,
                    Monto = enRango.Sum(c => c.Saldo)
                };
            }).ToList()
        };
    }

    // ---------------------------------------------------------------- contratos por vencer

    public async Task<IReadOnlyList<ContratoPorVencerDto>> ContratosPorVencerAsync(PorVencerFiltro filtro, CancellationToken ct = default)
    {
        await ValidarEmpresaAsync(filtro.IdEmpresa, ct);
        var hoy = Hoy;
        var limite = hoy.AddDays(filtro.Dias);
        var idVigente = await IdEstadoAsync("VIG", ct);

        var consulta = unidad.Repositorio<Contrato>().Consultar()
            .Where(c => c.IdEstado == idVigente && c.FechaFin >= hoy && c.FechaFin <= limite);
        if (filtro.IdEmpresa is { } empresa) consulta = consulta.Where(c => c.Local.IdEmpresa == empresa);

        var contratos = await consulta
            .OrderBy(c => c.FechaFin).ThenBy(c => c.Codigo)
            .Select(c => new ContratoPorVencerDto
            {
                IdContrato = c.Id,
                CodigoContrato = c.Codigo,
                IdCliente = c.IdCliente,
                Cliente = c.Cliente.Nombre
                          + (c.Cliente.Paterno != null ? " " + c.Cliente.Paterno : "")
                          + (c.Cliente.Materno != null ? " " + c.Cliente.Materno : ""),
                IdLocal = c.IdLocal,
                CodigoLocal = c.Local.Codigo,
                FechaFin = c.FechaFin,
                MontoMensual = (c.MontoAlquiler ?? 0) + (c.MontoLuz ?? 0) + (c.MontoAgua ?? 0) + (c.MontoMantenimiento ?? 0) + (c.MontoOtros ?? 0)
            })
            .ToListAsync(ct);

        foreach (var contrato in contratos)
            contrato.DiasRestantes = (int)(contrato.FechaFin.Date - hoy).TotalDays;
        return contratos;
    }

    // ---------------------------------------------------------------- tops por ingreso cobrado

    public async Task<IReadOnlyList<TopLocalDto>> TopLocalesAsync(TopFiltro filtro, CancellationToken ct = default)
    {
        var grupos = await (await PagosDelPeriodoAsync(filtro, ct))
            .GroupBy(p => p.Contrato.IdLocal)
            .Select(g => new { IdLocal = g.Key, Cantidad = g.Count(), Total = g.Sum(p => p.Monto) })
            .OrderByDescending(g => g.Total).ThenBy(g => g.IdLocal)
            .Take(filtro.Top)
            .ToListAsync(ct);

        var ids = grupos.Select(g => g.IdLocal).ToList();
        var locales = await unidad.Repositorio<Local>().ConsultarTodos()
            .Where(l => ids.Contains(l.Id))
            .Select(l => new { l.Id, l.Codigo, l.Direccion })
            .ToDictionaryAsync(l => l.Id, ct);

        return grupos.Select(g => new TopLocalDto
        {
            IdLocal = g.IdLocal,
            CodigoLocal = locales[g.IdLocal].Codigo,
            Direccion = locales[g.IdLocal].Direccion,
            CantidadPagos = g.Cantidad,
            TotalCobrado = g.Total
        }).ToList();
    }

    public async Task<IReadOnlyList<TopClienteDto>> TopClientesAsync(TopFiltro filtro, CancellationToken ct = default)
    {
        var grupos = await (await PagosDelPeriodoAsync(filtro, ct))
            .GroupBy(p => p.Contrato.IdCliente)
            .Select(g => new { IdCliente = g.Key, Cantidad = g.Count(), Total = g.Sum(p => p.Monto) })
            .OrderByDescending(g => g.Total).ThenBy(g => g.IdCliente)
            .Take(filtro.Top)
            .ToListAsync(ct);

        var ids = grupos.Select(g => g.IdCliente).ToList();
        var clientes = await unidad.Repositorio<Cliente>().ConsultarTodos()
            .Where(c => ids.Contains(c.Id))
            .Select(c => new
            {
                c.Id,
                c.Codigo,
                Nombre = c.Nombre + (c.Paterno != null ? " " + c.Paterno : "") + (c.Materno != null ? " " + c.Materno : "")
            })
            .ToDictionaryAsync(c => c.Id, ct);

        return grupos.Select(g => new TopClienteDto
        {
            IdCliente = g.IdCliente,
            CodigoCliente = clientes[g.IdCliente].Codigo,
            Cliente = clientes[g.IdCliente].Nombre,
            CantidadPagos = g.Cantidad,
            TotalCobrado = g.Total
        }).ToList();
    }

    // ---------------------------------------------------------------- apoyo

    private async Task<IQueryable<Pago>> PagosDelPeriodoAsync(TopFiltro filtro, CancellationToken ct)
    {
        await ValidarEmpresaAsync(filtro.IdEmpresa, ct);
        if (filtro.Desde is { } d && filtro.Hasta is { } h && h.Date < d.Date)
            throw new ExcepcionNegocio("La fecha final no puede ser anterior a la inicial.");

        var pagos = unidad.Repositorio<Pago>().Consultar();
        if (filtro.IdEmpresa is { } empresa) pagos = pagos.Where(p => p.Contrato.Local.IdEmpresa == empresa);
        if (filtro.Desde is { } desde) pagos = pagos.Where(p => p.FechaPago >= desde.Date);
        if (filtro.Hasta is { } hasta) pagos = pagos.Where(p => p.FechaPago < hasta.Date.AddDays(1));
        return pagos;
    }

    private async Task<int> ContarContratosVigentesAsync(int? idEmpresa, CancellationToken ct)
    {
        var idVigente = await IdEstadoAsync("VIG", ct);
        var consulta = unidad.Repositorio<Contrato>().Consultar().Where(c => c.IdEstado == idVigente);
        if (idEmpresa is { } empresa) consulta = consulta.Where(c => c.Local.IdEmpresa == empresa);
        return await consulta.CountAsync(ct);
    }

    private async Task ValidarEmpresaAsync(int? idEmpresa, CancellationToken ct)
    {
        if (idEmpresa is { } id && !await unidad.Repositorio<Empresa>().ExisteAsync(e => e.Id == id, ct))
            throw new ExcepcionNoEncontrado($"No existe la empresa con id {id}.");
    }

    private async Task<int> IdEstadoAsync(string abreviatura, CancellationToken ct) =>
        await unidad.Repositorio<Estado>().Consultar().Where(e => e.Abreviatura == abreviatura).Select(e => e.Id).FirstAsync(ct);

    private static DateTime PrimerDiaDelMes(DateTime fecha) => new(fecha.Year, fecha.Month, 1);

    private static decimal Porcentaje(int parte, int total) => total == 0 ? 0 : Math.Round(100m * parte / total, 2);
}
