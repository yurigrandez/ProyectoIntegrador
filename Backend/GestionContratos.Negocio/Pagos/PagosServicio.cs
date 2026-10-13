using System.Linq.Expressions;
using GestionContratos.Comun;
using GestionContratos.Comun.Excepciones;
using GestionContratos.Datos.Repositorios;
using GestionContratos.DTOs.Comunes;
using GestionContratos.DTOs.Pagos;
using GestionContratos.Entidades;
using GestionContratos.Negocio.Comunes;
using Microsoft.EntityFrameworkCore;

namespace GestionContratos.Negocio.Pagos;

public interface IPagosServicio
{
    Task<PaginadoDto<PagoDto>> ListarAsync(PagoFiltro filtro, CancellationToken ct = default);
    Task<PagoDto> ObtenerAsync(int id, CancellationToken ct = default);

    /// <summary>Registra un pago sobre una cuota y actualiza el estado de la cuota (pendiente, pago parcial o pagada).</summary>
    Task<PagoDto> RegistrarAsync(PagoCrearDto datos, UsuarioActual usuario, CancellationToken ct = default);

    /// <summary>Anula un pago (baja lógica) y recalcula el estado de su cuota.</summary>
    Task AnularAsync(int id, AnularPagoDto datos, UsuarioActual usuario, CancellationToken ct = default);
}

/// <summary>Estado de una cuota según lo pagado.</summary>
public static class EstadoCuota
{
    public const string Pendiente = "PEN", PagoParcial = "PAR", Pagada = "PAG";

    public static string Calcular(decimal monto, decimal pagado) =>
        pagado <= 0 ? Pendiente : pagado >= monto ? Pagada : PagoParcial;
}

public class PagosServicio(IUnidadTrabajo unidad, TimeProvider reloj) : IPagosServicio
{
    private DateTime Hoy => reloj.GetLocalNow().Date;

    private static readonly Expression<Func<Pago, PagoDto>> Proyeccion = p => new PagoDto
    {
        Id = p.Id,
        IdContrato = p.IdContrato,
        CodigoContrato = p.Contrato.Codigo,
        Cliente = p.Contrato.Cliente.Nombre
                  + (p.Contrato.Cliente.Paterno != null ? " " + p.Contrato.Cliente.Paterno : "")
                  + (p.Contrato.Cliente.Materno != null ? " " + p.Contrato.Cliente.Materno : ""),
        IdCronogramaPago = p.IdCronogramaPago,
        NroCuota = p.CronogramaPago != null ? p.CronogramaPago.NroCuota : null,
        Concepto = p.CronogramaPago != null ? p.CronogramaPago.Concepto.Abreviatura : null,
        IdMedioPago = p.IdMedioPago,
        MedioPago = p.MedioPago.Abreviatura,
        Moneda = p.TipoMoneda.Abreviatura,
        FechaPago = p.FechaPago,
        Monto = p.Monto,
        NroOperacion = p.NroOperacion,
        Observacion = p.Observacion,
        UsuarioRegistra = p.UsuarioRegistra.Codigo,
        FechaCreacion = p.FechaCreacion
    };

    public async Task<PaginadoDto<PagoDto>> ListarAsync(PagoFiltro filtro, CancellationToken ct = default)
    {
        var consulta = unidad.Repositorio<Pago>().Consultar();
        if (!string.IsNullOrWhiteSpace(filtro.Texto))
        {
            var texto = filtro.Texto.Trim();
            consulta = consulta.Where(p => p.Contrato.Codigo.Contains(texto)
                || (p.NroOperacion != null && p.NroOperacion.Contains(texto))
                || (p.Contrato.Cliente.Nombre != null && p.Contrato.Cliente.Nombre.Contains(texto)));
        }
        if (filtro.IdContrato is { } contrato) consulta = consulta.Where(p => p.IdContrato == contrato);
        if (filtro.IdCliente is { } cliente) consulta = consulta.Where(p => p.Contrato.IdCliente == cliente);
        if (filtro.IdCronogramaPago is { } cuota) consulta = consulta.Where(p => p.IdCronogramaPago == cuota);
        if (filtro.Desde is { } desde) consulta = consulta.Where(p => p.FechaPago >= desde.Date);
        if (filtro.Hasta is { } hasta) consulta = consulta.Where(p => p.FechaPago < hasta.Date.AddDays(1));

        return await consulta.OrderByDescending(p => p.FechaPago).ThenByDescending(p => p.Id)
            .Select(Proyeccion).PaginarAsync(filtro, ct);
    }

    public async Task<PagoDto> ObtenerAsync(int id, CancellationToken ct = default) =>
        await unidad.Repositorio<Pago>().Consultar().Where(p => p.Id == id).Select(Proyeccion).FirstOrDefaultAsync(ct)
        ?? throw new ExcepcionNoEncontrado($"No existe el pago con id {id}.");

    public async Task<PagoDto> RegistrarAsync(PagoCrearDto datos, UsuarioActual usuario, CancellationToken ct = default)
    {
        var idCuota = datos.IdCronogramaPago!.Value;
        var monto = decimal.Round(datos.Monto!.Value, 2);
        var fechaPago = (datos.FechaPago ?? Hoy).Date;
        if (fechaPago > Hoy)
            throw new ExcepcionNegocio("La fecha de pago no puede ser futura.");

        if (!await unidad.Repositorio<MedioPago>().ExisteAsync(m => m.Id == datos.IdMedioPago, ct))
            throw new ExcepcionNegocio("El medio de pago indicado no existe.");

        await using var transaccion = await unidad.IniciarTransaccionAsync(ct);

        // Se bloquea la cuota: dos pagos simultáneos sobre la misma cuota se atienden uno tras otro,
        // así el saldo que se valida es el real y nunca se paga de más.
        await unidad.BloquearAsync<CronogramaPago>(idCuota, ct);

        var cuota = await unidad.Repositorio<CronogramaPago>().ObtenerPorIdAsync(idCuota, ct)
            ?? throw new ExcepcionNegocio("La cuota indicada no existe.");
        var contrato = await unidad.Repositorio<Contrato>().Consultar()
            .Where(c => c.Id == cuota.IdContrato)
            .Select(c => new { c.Id, c.Codigo, c.FechaInicio, c.IdTipoMoneda })
            .FirstAsync(ct);

        if (fechaPago < contrato.FechaInicio.Date)
            throw new ExcepcionNegocio("La fecha de pago no puede ser anterior al inicio del contrato.");

        var pagado = await PagadoAsync(idCuota, ct);
        var saldo = cuota.Monto - pagado;
        if (saldo <= 0)
            throw new ExcepcionNegocio("La cuota ya está pagada por completo.");
        if (monto > saldo)
            throw new ExcepcionNegocio($"El monto excede el saldo de la cuota ({saldo:0.00}).");

        var pago = new Pago
        {
            IdContrato = contrato.Id,
            IdCronogramaPago = idCuota,
            IdMedioPago = datos.IdMedioPago!.Value,
            IdTipoMoneda = contrato.IdTipoMoneda ?? await IdMonedaLocalAsync(ct),
            IdUsuarioRegistra = usuario.Id,
            FechaPago = fechaPago,
            Monto = monto,
            NroOperacion = Texto.Limpiar(datos.NroOperacion),
            Observacion = Texto.Limpiar(datos.Observacion)
        };
        await unidad.Repositorio<Pago>().AgregarAsync(pago, ct);
        cuota.IdEstado = await IdEstadoAsync(EstadoCuota.Calcular(cuota.Monto, pagado + monto), ct);
        await RegistrarEventoAsync(usuario, $"Registró un pago de {monto:0.00} en el contrato {contrato.Codigo} (cuota {cuota.NroCuota})", ct);

        await unidad.GuardarAsync(ct);
        await transaccion.ConfirmarAsync(ct);
        return await ObtenerAsync(pago.Id, ct);
    }

    public async Task AnularAsync(int id, AnularPagoDto datos, UsuarioActual usuario, CancellationToken ct = default)
    {
        var pago = await unidad.Repositorio<Pago>().ObtenerPorIdAsync(id, ct)
            ?? throw new ExcepcionNoEncontrado($"No existe el pago con id {id}.");
        if (pago.IdComprobante is not null)
            throw new ExcepcionNegocio("El pago ya está asociado a un comprobante y no se puede anular.");

        await using var transaccion = await unidad.IniciarTransaccionAsync(ct);
        if (pago.IdCronogramaPago is { } idCuota)
            await unidad.BloquearAsync<CronogramaPago>(idCuota, ct);

        var codigoContrato = await unidad.Repositorio<Contrato>().Consultar()
            .Where(c => c.Id == pago.IdContrato).Select(c => c.Codigo).FirstAsync(ct);

        unidad.Repositorio<Pago>().Desactivar(pago);
        pago.Observacion = string.Join(Environment.NewLine,
            new[] { pago.Observacion, $"Anulado: {datos.Motivo.Trim()}" }.Where(t => !string.IsNullOrWhiteSpace(t)));
        await unidad.GuardarAsync(ct); // desde aquí el pago ya no cuenta en las consultas

        if (pago.IdCronogramaPago is { } cuotaId)
        {
            var cuota = await unidad.Repositorio<CronogramaPago>().ObtenerPorIdAsync(cuotaId, ct);
            if (cuota is not null)
            {
                cuota.IdEstado = await IdEstadoAsync(EstadoCuota.Calcular(cuota.Monto, await PagadoAsync(cuotaId, ct)), ct);
            }
        }
        await RegistrarEventoAsync(usuario, $"Anuló un pago de {pago.Monto:0.00} del contrato {codigoContrato}: {datos.Motivo.Trim()}", ct);
        await unidad.GuardarAsync(ct);
        await transaccion.ConfirmarAsync(ct);
    }

    private async Task<decimal> PagadoAsync(int idCuota, CancellationToken ct) =>
        await unidad.Repositorio<Pago>().Consultar().Where(p => p.IdCronogramaPago == idCuota).SumAsync(p => p.Monto, ct);

    private async Task<int> IdMonedaLocalAsync(CancellationToken ct) =>
        await unidad.Repositorio<TipoMoneda>().Consultar().Where(m => m.Abreviatura == "PEN").Select(m => m.Id).FirstAsync(ct);

    private async Task<int> IdEstadoAsync(string abreviatura, CancellationToken ct) =>
        await unidad.Repositorio<Estado>().Consultar().Where(e => e.Abreviatura == abreviatura).Select(e => e.Id).FirstAsync(ct);

    private Task RegistrarEventoAsync(UsuarioActual usuario, string mensaje, CancellationToken ct) =>
        unidad.Repositorio<Evento>().AgregarAsync(new Evento
        {
            Estacion = "API",
            Entidad = "PAGO",
            IdUsuario = usuario.Id,
            CodigoUsuario = usuario.Codigo,
            Mensaje = mensaje
        }, ct);
}
