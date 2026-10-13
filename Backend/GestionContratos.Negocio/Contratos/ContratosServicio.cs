using System.Linq.Expressions;
using GestionContratos.Comun;
using GestionContratos.Comun.Excepciones;
using GestionContratos.Datos.Repositorios;
using GestionContratos.DTOs.Comunes;
using GestionContratos.DTOs.Contratos;
using GestionContratos.Entidades;
using GestionContratos.Negocio.Comunes;
using Microsoft.EntityFrameworkCore;

namespace GestionContratos.Negocio.Contratos;

public interface IContratosServicio
{
    Task<PaginadoDto<ContratoDto>> ListarAsync(ContratoFiltro filtro, CancellationToken ct = default);
    Task<ContratoDto> ObtenerAsync(int id, CancellationToken ct = default);
    Task<IReadOnlyList<CuotaDto>> ObtenerCronogramaAsync(int id, CancellationToken ct = default);

    /// <summary>Registra un contrato en borrador con código generado (CON-AAAA-NNNN).</summary>
    Task<ContratoDto> CrearAsync(ContratoGuardarDto datos, UsuarioActual usuario, CancellationToken ct = default);

    /// <summary>Solo se pueden editar contratos en borrador.</summary>
    Task<ContratoDto> ActualizarAsync(int id, ContratoGuardarDto datos, CancellationToken ct = default);

    /// <summary>Baja lógica de un contrato en borrador.</summary>
    Task DesactivarAsync(int id, CancellationToken ct = default);

    /// <summary>
    /// Un segundo usuario (distinto del que registró) autoriza el contrato: pasa a vigente,
    /// se genera el cronograma de cuotas y se ocupa el local si ya inició.
    /// </summary>
    Task<ContratoDto> AutorizarAsync(int id, UsuarioActual usuario, CancellationToken ct = default);

    /// <summary>Termina anticipadamente un contrato vigente y libera el local.</summary>
    Task<ContratoDto> RescindirAsync(int id, RescindirContratoDto datos, UsuarioActual usuario, CancellationToken ct = default);

    /// <summary>Marca como vencidos los contratos cuyo plazo terminó y deja los locales ocupados/disponibles según la fecha de hoy.</summary>
    Task<ResultadoActualizacionEstadosDto> ActualizarEstadosAsync(CancellationToken ct = default);
}

public class ContratosServicio(IUnidadTrabajo unidad, ISecuenciaGenerador secuencias, TimeProvider reloj) : IContratosServicio
{
    private const string Borrador = "BOR", Vigente = "VIG", Vencido = "VEN", Rescindido = "RES";
    private const string Disponible = "DIS", Ocupado = "OCU", Mantenimiento = "MAN";
    private const string Pendiente = "PEN";
    private const int MaximoMeses = 120;

    private DateTime Hoy => reloj.GetLocalNow().Date;

    private static readonly Expression<Func<Contrato, ContratoDto>> Proyeccion = c => new ContratoDto
    {
        Id = c.Id,
        Codigo = c.Codigo,
        IdCliente = c.IdCliente,
        Cliente = c.Cliente.Nombre
                  + (c.Cliente.Paterno != null ? " " + c.Cliente.Paterno : "")
                  + (c.Cliente.Materno != null ? " " + c.Cliente.Materno : ""),
        IdLocal = c.IdLocal,
        Local = c.Local.Codigo,
        FechaInicio = c.FechaInicio,
        FechaFin = c.FechaFin,
        DiaPago = c.DiaPago,
        IdTipoMoneda = c.IdTipoMoneda,
        Moneda = c.TipoMoneda != null ? c.TipoMoneda.Abreviatura : null,
        MontoAlquiler = c.MontoAlquiler,
        MontoLuz = c.MontoLuz,
        MontoAgua = c.MontoAgua,
        MontoMantenimiento = c.MontoMantenimiento,
        MontoOtros = c.MontoOtros,
        MontoMensual = (c.MontoAlquiler ?? 0) + (c.MontoLuz ?? 0) + (c.MontoAgua ?? 0) + (c.MontoMantenimiento ?? 0) + (c.MontoOtros ?? 0),
        Observaciones = c.Observaciones,
        IdEstado = c.IdEstado,
        Estado = c.Estado != null ? c.Estado.Abreviatura : null,
        UsuarioRegistra = c.UsuarioRegistra.Codigo,
        UsuarioAutoriza = c.UsuarioAutoriza != null ? c.UsuarioAutoriza.Codigo : null,
        FechaCreacion = c.FechaCreacion
    };

    // ---------------------------------------------------------------- consultas

    public async Task<PaginadoDto<ContratoDto>> ListarAsync(ContratoFiltro filtro, CancellationToken ct = default)
    {
        var consulta = unidad.Repositorio<Contrato>().Consultar();
        if (!string.IsNullOrWhiteSpace(filtro.Texto))
        {
            var texto = filtro.Texto.Trim();
            consulta = consulta.Where(c => c.Codigo.Contains(texto)
                || (c.Cliente.Nombre != null && c.Cliente.Nombre.Contains(texto))
                || (c.Cliente.Paterno != null && c.Cliente.Paterno.Contains(texto))
                || c.Local.Codigo.Contains(texto));
        }
        if (filtro.IdCliente is { } cliente) consulta = consulta.Where(c => c.IdCliente == cliente);
        if (filtro.IdLocal is { } local) consulta = consulta.Where(c => c.IdLocal == local);
        if (filtro.IdEstado is { } estado) consulta = consulta.Where(c => c.IdEstado == estado);

        return await consulta.OrderByDescending(c => c.Codigo).Select(Proyeccion).PaginarAsync(filtro, ct);
    }

    public async Task<ContratoDto> ObtenerAsync(int id, CancellationToken ct = default) =>
        await unidad.Repositorio<Contrato>().Consultar().Where(c => c.Id == id).Select(Proyeccion).FirstOrDefaultAsync(ct)
        ?? throw new ExcepcionNoEncontrado($"No existe el contrato con id {id}.");

    public async Task<IReadOnlyList<CuotaDto>> ObtenerCronogramaAsync(int id, CancellationToken ct = default)
    {
        if (!await unidad.Repositorio<Contrato>().ExisteAsync(c => c.Id == id, ct))
            throw new ExcepcionNoEncontrado($"No existe el contrato con id {id}.");

        var cuotas = await unidad.Repositorio<CronogramaPago>().Consultar()
            .Where(c => c.IdContrato == id)
            .OrderBy(c => c.NroCuota).ThenBy(c => c.IdConcepto)
            .Select(c => new CuotaDto
            {
                Id = c.Id,
                IdConcepto = c.IdConcepto,
                Concepto = c.Concepto.Abreviatura,
                NroCuota = c.NroCuota,
                FechaVencimiento = c.FechaVencimiento,
                Monto = c.Monto,
                Pagado = c.Pagos.Sum(p => (decimal?)p.Monto) ?? 0,
                IdEstado = c.IdEstado,
                Estado = c.Estado != null ? c.Estado.Abreviatura : null
            })
            .ToListAsync(ct);

        var hoy = Hoy;
        foreach (var cuota in cuotas)
        {
            cuota.Saldo = cuota.Monto - cuota.Pagado;
            cuota.DiasAtraso = cuota.Saldo > 0 && cuota.FechaVencimiento < hoy ? (int)(hoy - cuota.FechaVencimiento).TotalDays : 0;
        }
        return cuotas;
    }

    // ---------------------------------------------------------------- alta y edición

    public async Task<ContratoDto> CrearAsync(ContratoGuardarDto datos, UsuarioActual usuario, CancellationToken ct = default)
    {
        var idMoneda = await ValidarAsync(datos, idContrato: null, ct);

        var anio = Hoy.Year.ToString();
        var numero = await secuencias.SiguienteAsync("tabCONTRATOS", anio, "CON", ct);

        var contrato = new Contrato
        {
            Codigo = $"CON-{anio}-{numero:0000}",
            IdUsuarioRegistra = usuario.Id,
            IdEstado = await IdEstadoAsync(Borrador, ct)
        };
        Aplicar(contrato, datos, idMoneda);
        await unidad.Repositorio<Contrato>().AgregarAsync(contrato, ct);
        await unidad.GuardarAsync(ct);
        return await ObtenerAsync(contrato.Id, ct);
    }

    public async Task<ContratoDto> ActualizarAsync(int id, ContratoGuardarDto datos, CancellationToken ct = default)
    {
        var contrato = await ObtenerParaModificarAsync(id, ct);
        if (await AbreviaturaEstadoAsync(contrato.IdEstado, ct) != Borrador)
            throw new ExcepcionNegocio("Solo se pueden editar contratos en borrador.");

        var idMoneda = await ValidarAsync(datos, id, ct);
        Aplicar(contrato, datos, idMoneda);
        await unidad.GuardarAsync(ct);
        return await ObtenerAsync(id, ct);
    }

    public async Task DesactivarAsync(int id, CancellationToken ct = default)
    {
        var repositorio = unidad.Repositorio<Contrato>();
        var contrato = await ObtenerParaModificarAsync(id, ct);
        if (await AbreviaturaEstadoAsync(contrato.IdEstado, ct) != Borrador)
            throw new ExcepcionNegocio("Solo se pueden eliminar contratos en borrador; los vigentes se rescinden.");

        repositorio.Desactivar(contrato);
        await unidad.GuardarAsync(ct);
    }

    // ---------------------------------------------------------------- autorización y rescisión

    public async Task<ContratoDto> AutorizarAsync(int id, UsuarioActual usuario, CancellationToken ct = default)
    {
        var contrato = await ObtenerParaModificarAsync(id, ct);
        if (await AbreviaturaEstadoAsync(contrato.IdEstado, ct) != Borrador)
            throw new ExcepcionNegocio("Solo se pueden autorizar contratos en borrador.");
        if (contrato.IdUsuarioRegistra == usuario.Id)
            throw new ExcepcionNegocio("El contrato debe ser autorizado por un usuario distinto del que lo registró.");
        if (contrato.FechaFin.Date < Hoy)
            throw new ExcepcionNegocio("No se puede autorizar un contrato cuyo plazo ya terminó.");

        var local = await unidad.Repositorio<Local>().ObtenerPorIdAsync(contrato.IdLocal, ct)
            ?? throw new ExcepcionNegocio("El local del contrato ya no existe.");
        if (await AbreviaturaEstadoAsync(local.IdEstado, ct) == Mantenimiento)
            throw new ExcepcionNegocio("El local está en mantenimiento.");
        if (await HaySolapamientoAsync(contrato.IdLocal, contrato.FechaInicio, contrato.FechaFin, contrato.Id, soloVigentes: true, ct))
            throw new ExcepcionNegocio("Otro contrato vigente ocupa el local en esas fechas.");

        contrato.IdEstado = await IdEstadoAsync(Vigente, ct);
        contrato.IdUsuarioAutoriza = usuario.Id;
        await GenerarCronogramaAsync(contrato, ct);

        if (contrato.FechaInicio.Date <= Hoy)
            local.IdEstado = await IdEstadoAsync(Ocupado, ct);

        await RegistrarEventoAsync(usuario, $"Autorizó el contrato {contrato.Codigo}", ct);
        await unidad.GuardarAsync(ct);
        return await ObtenerAsync(id, ct);
    }

    public async Task<ContratoDto> RescindirAsync(int id, RescindirContratoDto datos, UsuarioActual usuario, CancellationToken ct = default)
    {
        var contrato = await ObtenerParaModificarAsync(id, ct);
        if (await AbreviaturaEstadoAsync(contrato.IdEstado, ct) != Vigente)
            throw new ExcepcionNegocio("Solo se pueden rescindir contratos vigentes.");

        var fecha = datos.Fecha!.Value.Date;
        if (fecha < contrato.FechaInicio.Date || fecha > contrato.FechaFin.Date)
            throw new ExcepcionNegocio("La fecha de rescisión debe estar dentro de la vigencia del contrato.");
        if (fecha > Hoy)
            throw new ExcepcionNegocio("La fecha de rescisión no puede ser posterior a hoy.");

        contrato.FechaFin = fecha;
        contrato.IdEstado = await IdEstadoAsync(Rescindido, ct);
        contrato.Observaciones = string.Join(Environment.NewLine,
            new[] { contrato.Observaciones, $"Rescindido el {fecha:dd/MM/yyyy}: {datos.Motivo.Trim()}" }
                .Where(t => !string.IsNullOrWhiteSpace(t)));

        // Se anulan las cuotas posteriores a la rescisión que no tengan pagos; las ya pagadas se conservan.
        var ahora = reloj.GetLocalNow().DateTime;
        var cuotasFuturas = await unidad.Repositorio<CronogramaPago>().ConsultarConSeguimiento()
            .Where(c => c.IdContrato == id && c.FechaVencimiento > fecha && !c.Pagos.Any())
            .ToListAsync(ct);
        foreach (var cuota in cuotasFuturas) cuota.FechaDesactivacion = ahora;

        var local = await unidad.Repositorio<Local>().ObtenerPorIdAsync(contrato.IdLocal, ct);
        if (local is not null && await AbreviaturaEstadoAsync(local.IdEstado, ct) == Ocupado)
            local.IdEstado = await IdEstadoAsync(Disponible, ct);

        await RegistrarEventoAsync(usuario, $"Rescindió el contrato {contrato.Codigo} con fecha {fecha:dd/MM/yyyy}", ct);
        await unidad.GuardarAsync(ct);
        return await ObtenerAsync(id, ct);
    }

    public async Task<ResultadoActualizacionEstadosDto> ActualizarEstadosAsync(CancellationToken ct = default)
    {
        var hoy = Hoy;
        var resultado = new ResultadoActualizacionEstadosDto();

        // 1. Contratos vigentes cuyo plazo terminó pasan a vencidos.
        var idVigente = await IdEstadoAsync(Vigente, ct);
        var idVencido = await IdEstadoAsync(Vencido, ct);
        var vencidos = await unidad.Repositorio<Contrato>().ConsultarConSeguimiento()
            .Where(c => c.IdEstado == idVigente && c.FechaFin < hoy)
            .ToListAsync(ct);
        foreach (var contrato in vencidos) contrato.IdEstado = idVencido;
        resultado.ContratosVencidos = vencidos.Count;

        // 2. Cada local (salvo en mantenimiento) queda ocupado si tiene un contrato vigente que cubre hoy.
        var ocupados = (await unidad.Repositorio<Contrato>().Consultar()
                .Where(c => c.IdEstado == idVigente && c.FechaInicio <= hoy && c.FechaFin >= hoy)
                .Select(c => c.IdLocal).Distinct().ToListAsync(ct)).ToHashSet();
        var idOcupado = await IdEstadoAsync(Ocupado, ct);
        var idDisponible = await IdEstadoAsync(Disponible, ct);
        var idMantenimiento = await IdEstadoAsync(Mantenimiento, ct);

        var locales = await unidad.Repositorio<Local>().ConsultarConSeguimiento().ToListAsync(ct);
        foreach (var local in locales.Where(l => l.IdEstado != idMantenimiento))
        {
            var deseado = ocupados.Contains(local.Id) ? idOcupado : idDisponible;
            if (local.IdEstado == deseado) continue;
            local.IdEstado = deseado;
            resultado.LocalesActualizados++;
        }

        await unidad.GuardarAsync(ct);
        return resultado;
    }

    // ---------------------------------------------------------------- reglas internas

    /// <summary>Valida los datos y devuelve el id de la moneda a usar (soles si no se indicó).</summary>
    private async Task<int> ValidarAsync(ContratoGuardarDto datos, int? idContrato, CancellationToken ct)
    {
        var inicio = datos.FechaInicio!.Value.Date;
        var fin = datos.FechaFin!.Value.Date;
        if (fin <= inicio)
            throw new ExcepcionNegocio("La fecha de fin debe ser posterior a la de inicio.");
        if (inicio.AddMonths(MaximoMeses) < fin)
            throw new ExcepcionNegocio($"La duración del contrato no puede superar {MaximoMeses} meses.");

        if (!await unidad.Repositorio<Cliente>().ExisteAsync(c => c.Id == datos.IdCliente, ct))
            throw new ExcepcionNegocio("El cliente indicado no existe.");

        var local = await unidad.Repositorio<Local>().Consultar()
            .Where(l => l.Id == datos.IdLocal)
            .Select(l => new { Estado = l.Estado != null ? l.Estado.Abreviatura : null })
            .FirstOrDefaultAsync(ct)
            ?? throw new ExcepcionNegocio("El local indicado no existe.");
        if (local.Estado == Mantenimiento)
            throw new ExcepcionNegocio("El local está en mantenimiento.");

        if (await HaySolapamientoAsync(datos.IdLocal!.Value, inicio, fin, idContrato, soloVigentes: false, ct))
            throw new ExcepcionNegocio("El local ya tiene otro contrato (borrador o vigente) que se cruza con esas fechas.");

        if (datos.IdTipoMoneda is { } moneda)
        {
            if (!await unidad.Repositorio<TipoMoneda>().ExisteAsync(m => m.Id == moneda, ct))
                throw new ExcepcionNegocio("La moneda indicada no existe.");
            return moneda;
        }
        return await unidad.Repositorio<TipoMoneda>().Consultar()
                   .Where(m => m.Abreviatura == "PEN").Select(m => (int?)m.Id).FirstOrDefaultAsync(ct)
               ?? throw new ExcepcionNegocio("No está configurada la moneda PEN.");
    }

    private async Task<bool> HaySolapamientoAsync(
        int idLocal, DateTime inicio, DateTime fin, int? idPropio, bool soloVigentes, CancellationToken ct)
    {
        var idBorrador = await IdEstadoAsync(Borrador, ct);
        var idVigente = await IdEstadoAsync(Vigente, ct);
        return await unidad.Repositorio<Contrato>().Consultar().AnyAsync(c =>
            c.IdLocal == idLocal && c.Id != idPropio
            && (c.IdEstado == idVigente || (!soloVigentes && c.IdEstado == idBorrador))
            && c.FechaInicio <= fin && c.FechaFin >= inicio, ct);
    }

    private static void Aplicar(Contrato contrato, ContratoGuardarDto datos, int idMoneda)
    {
        contrato.IdCliente = datos.IdCliente!.Value;
        contrato.IdLocal = datos.IdLocal!.Value;
        contrato.FechaInicio = datos.FechaInicio!.Value.Date;
        contrato.FechaFin = datos.FechaFin!.Value.Date;
        contrato.DiaPago = (byte)datos.DiaPago!.Value;
        contrato.IdTipoMoneda = idMoneda;
        contrato.MontoAlquiler = datos.MontoAlquiler;
        contrato.MontoLuz = datos.MontoLuz ?? 0;
        contrato.MontoAgua = datos.MontoAgua ?? 0;
        contrato.MontoMantenimiento = datos.MontoMantenimiento ?? 0;
        contrato.MontoOtros = datos.MontoOtros ?? 0;
        contrato.Observaciones = Texto.Limpiar(datos.Observaciones);
    }

    private async Task GenerarCronogramaAsync(Contrato contrato, CancellationToken ct)
    {
        var conceptos = await unidad.Repositorio<Concepto>().Consultar().ToDictionaryAsync(c => c.Abreviatura, c => c.Id, ct);
        var montos = new (int IdConcepto, decimal Monto)[]
        {
            (conceptos["ALQ"], contrato.MontoAlquiler ?? 0),
            (conceptos["LUZ"], contrato.MontoLuz ?? 0),
            (conceptos["AGU"], contrato.MontoAgua ?? 0),
            (conceptos["MAN"], contrato.MontoMantenimiento ?? 0),
            (conceptos["OTR"], contrato.MontoOtros ?? 0)
        };
        var idPendiente = await IdEstadoAsync(Pendiente, ct);
        var repositorio = unidad.Repositorio<CronogramaPago>();

        foreach (var cuota in GeneradorCronograma.Generar(contrato.FechaInicio, contrato.FechaFin, contrato.DiaPago, montos))
        {
            await repositorio.AgregarAsync(new CronogramaPago
            {
                Contrato = contrato,
                IdConcepto = cuota.IdConcepto,
                NroCuota = cuota.NroCuota,
                FechaVencimiento = cuota.FechaVencimiento,
                Monto = cuota.Monto,
                IdEstado = idPendiente
            }, ct);
        }
    }

    private async Task<Contrato> ObtenerParaModificarAsync(int id, CancellationToken ct) =>
        await unidad.Repositorio<Contrato>().ObtenerPorIdAsync(id, ct)
        ?? throw new ExcepcionNoEncontrado($"No existe el contrato con id {id}.");

    private Task RegistrarEventoAsync(UsuarioActual usuario, string mensaje, CancellationToken ct) =>
        unidad.Repositorio<Evento>().AgregarAsync(new Evento
        {
            Estacion = "API",
            Entidad = "CONTRATO",
            IdUsuario = usuario.Id,
            CodigoUsuario = usuario.Codigo,
            Mensaje = mensaje
        }, ct);

    private async Task<int> IdEstadoAsync(string abreviatura, CancellationToken ct) =>
        await unidad.Repositorio<Estado>().Consultar().Where(e => e.Abreviatura == abreviatura).Select(e => e.Id).FirstAsync(ct);

    private async Task<string?> AbreviaturaEstadoAsync(int? idEstado, CancellationToken ct) =>
        idEstado is null ? null
            : await unidad.Repositorio<Estado>().Consultar().Where(e => e.Id == idEstado).Select(e => e.Abreviatura).FirstOrDefaultAsync(ct);
}
