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
        var cuotas = await CuotasVencidasAsync(null, ct);
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

        return (await CuotasVencidasAsync(idCliente, ct))
            .Select(q => q.Cuota)
            .OrderBy(c => c.FechaVencimiento).ThenBy(c => c.CodigoContrato).ThenBy(c => c.Concepto)
            .ToList();
    }

    private async Task<List<(int IdCliente, CuotaVencidaDto Cuota)>> CuotasVencidasAsync(int? idCliente, CancellationToken ct)
    {
        var hoy = Hoy;
        var consulta = unidad.Repositorio<CronogramaPago>().Consultar()
            .Where(c => c.FechaVencimiento < hoy && (c.Estado == null || c.Estado.Abreviatura != EstadoCuota.Pagada));
        if (idCliente is { } cliente) consulta = consulta.Where(c => c.Contrato.IdCliente == cliente);

        var filas = await consulta
            .Select(c => new
            {
                c.Contrato.IdCliente,
                Cuota = new CuotaVencidaDto
                {
                    IdCronogramaPago = c.Id,
                    IdContrato = c.IdContrato,
                    CodigoContrato = c.Contrato.Codigo,
                    CodigoLocal = c.Contrato.Local.Codigo,
                    Concepto = c.Concepto.Abreviatura,
                    NroCuota = c.NroCuota,
                    FechaVencimiento = c.FechaVencimiento,
                    Monto = c.Monto,
                    Pagado = c.Pagos.Sum(p => (decimal?)p.Monto) ?? 0
                }
            })
            .ToListAsync(ct);

        return filas
            .Select(f =>
            {
                f.Cuota.Saldo = f.Cuota.Monto - f.Cuota.Pagado;
                f.Cuota.DiasAtraso = (int)(hoy - f.Cuota.FechaVencimiento).TotalDays;
                return (f.IdCliente, f.Cuota);
            })
            .Where(f => f.Cuota.Saldo > 0)
            .ToList();
    }
}
