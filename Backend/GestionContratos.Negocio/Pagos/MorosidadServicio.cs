using GestionContratos.Comun.Excepciones;
using GestionContratos.Datos.Repositorios;
using GestionContratos.DTOs.Pagos;
using GestionContratos.Entidades;
using Microsoft.EntityFrameworkCore;

namespace GestionContratos.Negocio.Pagos;

public interface IMorosidadServicio
{
    /// <summary>Clientes con cuotas vencidas y saldo pendiente, de mayor a menor deuda.</summary>
    Task<IReadOnlyList<MorosoDto>> ListarAsync(CancellationToken ct = default);

    /// <summary>Cuotas vencidas con saldo de un cliente, de la más antigua a la más reciente.</summary>
    Task<IReadOnlyList<CuotaVencidaDto>> DetalleDeClienteAsync(int idCliente, CancellationToken ct = default);

    /// <summary>Todas las cuotas vencidas con saldo a hoy, opcionalmente de una sola empresa (para las analíticas).</summary>
    Task<IReadOnlyList<CuotaVencidaDto>> CuotasVencidasAsync(int? idEmpresa = null, CancellationToken ct = default);
}

/// <summary>
/// La mora no se guarda: una cuota está en mora si su fecha de vencimiento ya pasó y todavía tiene saldo.
/// Se calcula siempre a la fecha de hoy.
/// </summary>
public class MorosidadServicio(IUnidadTrabajo unidad, TimeProvider reloj) : IMorosidadServicio
{
    private DateTime Hoy => reloj.GetLocalNow().Date;

    public async Task<IReadOnlyList<MorosoDto>> ListarAsync(CancellationToken ct = default)
    {
        var cuotas = (await ObtenerCuotasVencidasAsync(null, null, ct)).Select(c => (c.IdCliente, Cuota: c)).ToList();
        var clientes = await unidad.Repositorio<Cliente>().Consultar()
            .Where(c => cuotas.Select(q => q.IdCliente).Distinct().Contains(c.Id))
            .Select(c => new
            {
                c.Id,
                c.Codigo,
                Nombre = c.Nombre + (c.Paterno != null ? " " + c.Paterno : "") + (c.Materno != null ? " " + c.Materno : "")
            })
            .ToDictionaryAsync(c => c.Id, ct);

        return cuotas
            .GroupBy(q => q.IdCliente)
            .Where(g => clientes.ContainsKey(g.Key))
            .Select(g => new MorosoDto
            {
                IdCliente = g.Key,
                CodigoCliente = clientes[g.Key].Codigo,
                Cliente = clientes[g.Key].Nombre,
                CuotasVencidas = g.Count(),
                MontoVencido = g.Sum(q => q.Cuota.Saldo),
                MaxDiasAtraso = g.Max(q => q.Cuota.DiasAtraso)
            })
            .OrderByDescending(m => m.MontoVencido)
            .ToList();
    }

    public async Task<IReadOnlyList<CuotaVencidaDto>> DetalleDeClienteAsync(int idCliente, CancellationToken ct = default)
    {
        if (!await unidad.Repositorio<Cliente>().ExisteAsync(c => c.Id == idCliente, ct))
            throw new ExcepcionNoEncontrado($"No existe el cliente con id {idCliente}.");

        return (await ObtenerCuotasVencidasAsync(idCliente, null, ct))
            .OrderBy(c => c.FechaVencimiento).ThenBy(c => c.CodigoContrato).ThenBy(c => c.Concepto)
            .ToList();
    }

    public async Task<IReadOnlyList<CuotaVencidaDto>> CuotasVencidasAsync(int? idEmpresa = null, CancellationToken ct = default) =>
        await ObtenerCuotasVencidasAsync(null, idEmpresa, ct);

    private async Task<List<CuotaVencidaDto>> ObtenerCuotasVencidasAsync(int? idCliente, int? idEmpresa, CancellationToken ct)
    {
        var hoy = Hoy;
        var consulta = unidad.Repositorio<CronogramaPago>().Consultar()
            .Where(c => c.FechaVencimiento < hoy && (c.Estado == null || c.Estado.Abreviatura != EstadoCuota.Pagada));
        if (idCliente is { } cliente) consulta = consulta.Where(c => c.Contrato.IdCliente == cliente);
        if (idEmpresa is { } empresa) consulta = consulta.Where(c => c.Contrato.Local.IdEmpresa == empresa);

        var cuotas = await consulta
            .Select(c => new CuotaVencidaDto
            {
                IdCronogramaPago = c.Id,
                IdCliente = c.Contrato.IdCliente,
                IdContrato = c.IdContrato,
                CodigoContrato = c.Contrato.Codigo,
                CodigoLocal = c.Contrato.Local.Codigo,
                Concepto = c.Concepto.Abreviatura,
                NroCuota = c.NroCuota,
                FechaVencimiento = c.FechaVencimiento,
                Monto = c.Monto,
                Pagado = c.Pagos.Sum(p => (decimal?)p.Monto) ?? 0
            })
            .ToListAsync(ct);

        foreach (var cuota in cuotas)
        {
            cuota.Saldo = cuota.Monto - cuota.Pagado;
            cuota.DiasAtraso = (int)(hoy - cuota.FechaVencimiento).TotalDays;
        }
        return cuotas.Where(c => c.Saldo > 0).ToList();
    }
}
