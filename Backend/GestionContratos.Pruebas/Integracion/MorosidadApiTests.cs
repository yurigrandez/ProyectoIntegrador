using System.Net;
using System.Net.Http.Json;
using GestionContratos.DTOs.Contratos;
using GestionContratos.DTOs.Pagos;
using GestionContratos.Pruebas.Infraestructura;

namespace GestionContratos.Pruebas.Integracion;

public class MorosidadApiTests(ApiFactory fabrica) : PruebasApiBase(fabrica), IClassFixture<ApiFactory>
{
    /// <summary>Contrato que empezó hace tres meses (alquiler 1000 + mantenimiento 100, vence el día 1).</summary>
    private async Task<(int IdCliente, ContratoDto Contrato)> ContratoAtrasado()
    {
        var (cliente, local) = await CrearClienteYLocal();
        var contrato = await CrearContratoVigente(
            NuevoContrato(cliente, local, inicio: PrimerDiaDelMes(-3), diaPago: 1, alquiler: 1000m, mantenimiento: 100m));
        return (cliente, contrato);
    }

    private Task<HttpResponseMessage> Pagar(int idCuota, decimal monto) =>
        Operador.PostAsJsonAsync("/api/pagos", new PagoCrearDto { IdCronogramaPago = idCuota, IdMedioPago = IdMedioEfectivo, Monto = monto });

    private async Task<MorosoDto?> BuscarMoroso(int idCliente) =>
        (await Operador.GetFromJsonAsync<List<MorosoDto>>("/api/morosidad"))!.SingleOrDefault(m => m.IdCliente == idCliente);

    [Fact]
    public async Task Cronograma_MarcaLosDiasDeAtrasoDeLasCuotasVencidasSinPagar()
    {
        var (_, contrato) = await ContratoAtrasado();

        var cuotas = await ObtenerCronograma(contrato.Id);

        var vencidas = cuotas.Where(c => c.FechaVencimiento.Date < DateTime.Today).ToList();
        Assert.NotEmpty(vencidas);
        Assert.All(vencidas, c =>
        {
            Assert.Equal((int)(DateTime.Today - c.FechaVencimiento.Date).TotalDays, c.DiasAtraso);
            Assert.True(c.DiasAtraso > 0);
        });
        Assert.All(cuotas.Where(c => c.FechaVencimiento.Date >= DateTime.Today), c => Assert.Equal(0, c.DiasAtraso));
    }

    [Fact]
    public async Task Listar_IncluyeAlClienteConCuotasVencidasConSuDeudaExacta()
    {
        var (cliente, contrato) = await ContratoAtrasado();
        var vencidas = (await ObtenerCronograma(contrato.Id)).Where(c => c.FechaVencimiento.Date < DateTime.Today).ToList();

        var moroso = await BuscarMoroso(cliente);

        Assert.NotNull(moroso);
        Assert.Equal(vencidas.Count, moroso.CuotasVencidas);
        Assert.Equal(vencidas.Sum(c => c.Saldo), moroso.MontoVencido);
        Assert.Equal(vencidas.Max(c => c.DiasAtraso), moroso.MaxDiasAtraso);
    }

    [Fact]
    public async Task PagoParcial_ReduceLaDeudaPeroLaCuotaSigueVencida()
    {
        var (cliente, contrato) = await ContratoAtrasado();
        var cuotas = await ObtenerCronograma(contrato.Id);
        var primera = cuotas.First(c => c.Concepto == "ALQ" && c.FechaVencimiento.Date < DateTime.Today);
        var antes = (await BuscarMoroso(cliente))!;

        await Pagar(primera.Id, 400m);

        var despues = (await BuscarMoroso(cliente))!;
        Assert.Equal(antes.MontoVencido - 400m, despues.MontoVencido);
        Assert.Equal(antes.CuotasVencidas, despues.CuotasVencidas);
        var detalle = await Operador.GetFromJsonAsync<List<CuotaVencidaDto>>($"/api/morosidad/{cliente}");
        var cuota = detalle!.Single(c => c.IdCronogramaPago == primera.Id);
        Assert.Equal(400m, cuota.Pagado);
        Assert.Equal(600m, cuota.Saldo);
    }

    [Fact]
    public async Task PagarTodasLasCuotasVencidas_QuitaAlClienteDeLaMorosidad()
    {
        var (cliente, contrato) = await ContratoAtrasado();
        var vencidas = (await ObtenerCronograma(contrato.Id)).Where(c => c.FechaVencimiento.Date < DateTime.Today).ToList();
        Assert.NotNull(await BuscarMoroso(cliente));

        foreach (var cuota in vencidas)
            Assert.Equal(HttpStatusCode.Created, (await Pagar(cuota.Id, cuota.Saldo)).StatusCode);

        Assert.Null(await BuscarMoroso(cliente));
        var detalle = await Operador.GetFromJsonAsync<List<CuotaVencidaDto>>($"/api/morosidad/{cliente}");
        Assert.Empty(detalle!);
    }

    [Fact]
    public async Task AnularUnPago_VuelveALaMorosidad()
    {
        var (cliente, contrato) = await ContratoAtrasado();
        var vencidas = (await ObtenerCronograma(contrato.Id)).Where(c => c.FechaVencimiento.Date < DateTime.Today).ToList();
        PagoDto? ultimo = null;
        foreach (var cuota in vencidas)
            ultimo = await (await Pagar(cuota.Id, cuota.Saldo)).Content.ReadFromJsonAsync<PagoDto>();
        Assert.Null(await BuscarMoroso(cliente));

        await Admin.PostAsJsonAsync($"/api/pagos/{ultimo!.Id}/anular", new AnularPagoDto { Motivo = "Cheque rechazado" });

        var moroso = await BuscarMoroso(cliente);
        Assert.NotNull(moroso);
        Assert.Equal(1, moroso.CuotasVencidas);
        Assert.Equal(ultimo.Monto, moroso.MontoVencido);
    }

    [Fact]
    public async Task Detalle_ListaLasCuotasVencidasDeLaMasAntiguaALaMasReciente()
    {
        var (cliente, _) = await ContratoAtrasado();

        var detalle = await Operador.GetFromJsonAsync<List<CuotaVencidaDto>>($"/api/morosidad/{cliente}");

        Assert.True(detalle!.Count >= 4); // alquiler y mantenimiento de al menos dos meses
        Assert.Equal(detalle.OrderBy(c => c.FechaVencimiento).Select(c => c.IdCronogramaPago), detalle.Select(c => c.IdCronogramaPago));
        Assert.All(detalle, c => Assert.True(c.DiasAtraso > 0 && c.Saldo > 0));
    }

    [Fact]
    public async Task ContratoAlDia_NoApareceComoMoroso()
    {
        var (cliente, local) = await CrearClienteYLocal();
        // La primera cuota vence hoy (no es mora hasta mañana) y las demás son futuras, sea cual sea el día del mes en que se ejecute.
        await CrearContratoVigente(NuevoContrato(cliente, local, inicio: DateTime.Today, diaPago: DateTime.Today.Day));

        Assert.Null(await BuscarMoroso(cliente));
    }

    [Fact]
    public async Task ClientesDeDemostracion_ConDeudaAparecenOrdenadosPorMonto()
    {
        var lista = await Operador.GetFromJsonAsync<List<MorosoDto>>("/api/morosidad");

        Assert.Contains(lista!, m => m.CodigoCliente == "CLI-004");
        Assert.Contains(lista!, m => m.CodigoCliente == "CLI-007");
        Assert.Equal(lista!.OrderByDescending(m => m.MontoVencido).Select(m => m.IdCliente), lista!.Select(m => m.IdCliente));
    }

    [Fact]
    public async Task Detalle_ClienteInexistente_Devuelve404()
    {
        var respuesta = await Operador.GetAsync("/api/morosidad/99999999");

        Assert.Equal(HttpStatusCode.NotFound, respuesta.StatusCode);
    }

    [Fact]
    public async Task Listar_SinToken_Devuelve401()
    {
        var respuesta = await Anonimo.GetAsync("/api/morosidad");

        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
    }
}
