using System.Net;
using System.Net.Http.Json;
using GestionContratos.DTOs.Comunes;
using GestionContratos.DTOs.Contratos;
using GestionContratos.DTOs.Pagos;
using GestionContratos.Pruebas.Infraestructura;

namespace GestionContratos.Pruebas.Integracion;

public class PagosApiTests(ApiFactory fabrica) : PruebasApiBase(fabrica), IClassFixture<ApiFactory>
{
    /// <summary>Contrato vigente de 12 meses (alquiler 1000) y su primera cuota de alquiler.</summary>
    private async Task<(ContratoDto Contrato, CuotaDto Cuota)> ContratoConCuota(int desplazamientoInicio = 0, decimal mantenimiento = 0m)
    {
        var (cliente, local) = await CrearClienteYLocal();
        var contrato = await CrearContratoVigente(
            NuevoContrato(cliente, local, inicio: PrimerDiaDelMes(desplazamientoInicio), alquiler: 1000m, mantenimiento: mantenimiento));
        var cuota = (await ObtenerCronograma(contrato.Id)).First(c => c.Concepto == "ALQ" && c.NroCuota == 1);
        return (contrato, cuota);
    }

    private Task<HttpResponseMessage> Pagar(int idCuota, decimal monto, HttpClient? cliente = null, DateTime? fecha = null,
        string? nroOperacion = null) =>
        (cliente ?? Operador).PostAsJsonAsync("/api/pagos", new PagoCrearDto
        {
            IdCronogramaPago = idCuota,
            IdMedioPago = IdMedioEfectivo,
            Monto = monto,
            FechaPago = fecha,
            NroOperacion = nroOperacion
        });

    private async Task<CuotaDto> CuotaActual(int idContrato, int idCuota) =>
        (await ObtenerCronograma(idContrato)).Single(c => c.Id == idCuota);

    // ------------------------------------------------------------------ registro

    [Fact]
    public async Task Registrar_PagoTotal_DejaLaCuotaPagadaYSinSaldo()
    {
        var (contrato, cuota) = await ContratoConCuota();

        var respuesta = await Pagar(cuota.Id, 1000m, nroOperacion: "OP-TOTAL-1");

        Assert.Equal(HttpStatusCode.Created, respuesta.StatusCode);
        Assert.NotNull(respuesta.Headers.Location);
        var pago = await respuesta.Content.ReadFromJsonAsync<PagoDto>();
        Assert.Equal(1000m, pago!.Monto);
        Assert.Equal("PEN", pago.Moneda);
        Assert.Equal("EFE", pago.MedioPago);
        Assert.Equal("ALQ", pago.Concepto);
        Assert.Equal(1, pago.NroCuota);
        Assert.Equal(contrato.Codigo, pago.CodigoContrato);
        Assert.Equal("OPERADOR", pago.UsuarioRegistra);
        Assert.Equal(DateTime.Today, pago.FechaPago.Date);
        Assert.Equal("OP-TOTAL-1", pago.NroOperacion);

        var actual = await CuotaActual(contrato.Id, cuota.Id);
        Assert.Equal("PAG", actual.Estado);
        Assert.Equal(1000m, actual.Pagado);
        Assert.Equal(0m, actual.Saldo);
        Assert.Equal(0, actual.DiasAtraso);
    }

    [Fact]
    public async Task Registrar_PagoParcial_DejaLaCuotaEnPagoParcialYLuegoSeCompleta()
    {
        var (contrato, cuota) = await ContratoConCuota();

        await Pagar(cuota.Id, 400m);
        var tras1 = await CuotaActual(contrato.Id, cuota.Id);
        await Pagar(cuota.Id, 600m);
        var tras2 = await CuotaActual(contrato.Id, cuota.Id);

        Assert.Equal("PAR", tras1.Estado);
        Assert.Equal(400m, tras1.Pagado);
        Assert.Equal(600m, tras1.Saldo);
        Assert.Equal("PAG", tras2.Estado);
        Assert.Equal(0m, tras2.Saldo);
    }

    [Fact]
    public async Task Registrar_MontoMayorAlSaldo_Devuelve400YNoCambiaLaCuota()
    {
        var (contrato, cuota) = await ContratoConCuota();
        await Pagar(cuota.Id, 700m);

        var respuesta = await Pagar(cuota.Id, 300.01m);

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
        var actual = await CuotaActual(contrato.Id, cuota.Id);
        Assert.Equal(700m, actual.Pagado);
        Assert.Equal("PAR", actual.Estado);
    }

    [Fact]
    public async Task Registrar_CuotaYaPagada_Devuelve400()
    {
        var (_, cuota) = await ContratoConCuota();
        await Pagar(cuota.Id, 1000m);

        var respuesta = await Pagar(cuota.Id, 1m);

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-50)]
    public async Task Registrar_MontoNoPositivo_Devuelve400(double monto)
    {
        var (_, cuota) = await ContratoConCuota();

        var respuesta = await Pagar(cuota.Id, (decimal)monto);

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task Registrar_FechaFutura_Devuelve400()
    {
        var (_, cuota) = await ContratoConCuota();

        var respuesta = await Pagar(cuota.Id, 100m, fecha: DateTime.Today.AddDays(1));

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task Registrar_FechaAnteriorAlInicioDelContrato_Devuelve400()
    {
        var (_, cuota) = await ContratoConCuota();

        var respuesta = await Pagar(cuota.Id, 100m, fecha: PrimerDiaDelMes().AddDays(-1));

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task Registrar_CuotaOMedioInexistente_Devuelve400()
    {
        var (_, cuota) = await ContratoConCuota();

        var cuotaInexistente = await Pagar(99999999, 100m);
        var medioInexistente = await Operador.PostAsJsonAsync("/api/pagos",
            new PagoCrearDto { IdCronogramaPago = cuota.Id, IdMedioPago = 99999, Monto = 100m });

        Assert.Equal(HttpStatusCode.BadRequest, cuotaInexistente.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, medioInexistente.StatusCode);
    }

    [Fact]
    public async Task Registrar_SinToken_Devuelve401()
    {
        var respuesta = await Pagar(1, 100m, Anonimo);

        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
    }

    [Fact]
    public async Task Registrar_ConFechaPasada_QuedaConEsaFecha()
    {
        var (_, cuota) = await ContratoConCuota();
        var fecha = PrimerDiaDelMes().AddDays(2);
        if (fecha > DateTime.Today) fecha = DateTime.Today;

        var pago = await (await Pagar(cuota.Id, 250m, fecha: fecha)).Content.ReadFromJsonAsync<PagoDto>();

        Assert.Equal(fecha, pago!.FechaPago.Date);
    }

    [Fact]
    public async Task Registrar_CincoPagosSimultaneosDelSaldoCompleto_SoloUnoSeAcepta()
    {
        var (contrato, cuota) = await ContratoConCuota();

        var respuestas = await Task.WhenAll(Enumerable.Range(0, 5).Select(_ => Pagar(cuota.Id, 1000m)));

        Assert.Equal(1, respuestas.Count(r => r.StatusCode == HttpStatusCode.Created));
        Assert.Equal(4, respuestas.Count(r => r.StatusCode == HttpStatusCode.BadRequest));
        var actual = await CuotaActual(contrato.Id, cuota.Id);
        Assert.Equal(1000m, actual.Pagado);
        Assert.Equal("PAG", actual.Estado);
    }

    [Fact]
    public async Task Registrar_PagosSimultaneosParciales_NuncaSuperanElMonto()
    {
        var (contrato, cuota) = await ContratoConCuota();

        // 8 pagos de 200 sobre una cuota de 1000: solo caben 5.
        var respuestas = await Task.WhenAll(Enumerable.Range(0, 8).Select(_ => Pagar(cuota.Id, 200m)));

        Assert.Equal(5, respuestas.Count(r => r.StatusCode == HttpStatusCode.Created));
        var actual = await CuotaActual(contrato.Id, cuota.Id);
        Assert.Equal(1000m, actual.Pagado);
        Assert.Equal(0m, actual.Saldo);
    }

    // ------------------------------------------------------------------ anulación

    [Fact]
    public async Task Anular_PagoTotal_DevuelveLaCuotaAPendiente()
    {
        var (contrato, cuota) = await ContratoConCuota();
        var pago = await (await Pagar(cuota.Id, 1000m)).Content.ReadFromJsonAsync<PagoDto>();

        var respuesta = await Admin.PostAsJsonAsync($"/api/pagos/{pago!.Id}/anular", new AnularPagoDto { Motivo = "Se registró por error" });

        Assert.Equal(HttpStatusCode.NoContent, respuesta.StatusCode);
        var actual = await CuotaActual(contrato.Id, cuota.Id);
        Assert.Equal("PEN", actual.Estado);
        Assert.Equal(0m, actual.Pagado);
        Assert.Equal(1000m, actual.Saldo);
        Assert.Equal(HttpStatusCode.NotFound, (await Admin.GetAsync($"/api/pagos/{pago.Id}")).StatusCode);
    }

    [Fact]
    public async Task Anular_UnoDeDosPagos_DejaLaCuotaEnPagoParcial()
    {
        var (contrato, cuota) = await ContratoConCuota();
        var primero = await (await Pagar(cuota.Id, 300m)).Content.ReadFromJsonAsync<PagoDto>();
        await Pagar(cuota.Id, 700m);

        await Admin.PostAsJsonAsync($"/api/pagos/{primero!.Id}/anular", new AnularPagoDto { Motivo = "Duplicado" });

        var actual = await CuotaActual(contrato.Id, cuota.Id);
        Assert.Equal("PAR", actual.Estado);
        Assert.Equal(700m, actual.Pagado);
        Assert.Equal(300m, actual.Saldo);
    }

    [Fact]
    public async Task Anular_ComoOperador_Devuelve403()
    {
        var (_, cuota) = await ContratoConCuota();
        var pago = await (await Pagar(cuota.Id, 100m)).Content.ReadFromJsonAsync<PagoDto>();

        var respuesta = await Operador.PostAsJsonAsync($"/api/pagos/{pago!.Id}/anular", new AnularPagoDto { Motivo = "x" });

        Assert.Equal(HttpStatusCode.Forbidden, respuesta.StatusCode);
    }

    [Fact]
    public async Task Anular_SinMotivo_Devuelve400()
    {
        var (_, cuota) = await ContratoConCuota();
        var pago = await (await Pagar(cuota.Id, 100m)).Content.ReadFromJsonAsync<PagoDto>();

        var respuesta = await Admin.PostAsJsonAsync($"/api/pagos/{pago!.Id}/anular", new AnularPagoDto { Motivo = "" });

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task Anular_DosVeces_LaSegundaDevuelve404()
    {
        var (_, cuota) = await ContratoConCuota();
        var pago = await (await Pagar(cuota.Id, 100m)).Content.ReadFromJsonAsync<PagoDto>();
        await Admin.PostAsJsonAsync($"/api/pagos/{pago!.Id}/anular", new AnularPagoDto { Motivo = "x" });

        var segunda = await Admin.PostAsJsonAsync($"/api/pagos/{pago.Id}/anular", new AnularPagoDto { Motivo = "x" });

        Assert.Equal(HttpStatusCode.NotFound, segunda.StatusCode);
    }

    [Fact]
    public async Task AnularYVolverAPagar_PermitePagarElSaldoCompleto()
    {
        var (contrato, cuota) = await ContratoConCuota();
        var pago = await (await Pagar(cuota.Id, 1000m)).Content.ReadFromJsonAsync<PagoDto>();
        await Admin.PostAsJsonAsync($"/api/pagos/{pago!.Id}/anular", new AnularPagoDto { Motivo = "Error de monto" });

        var nuevo = await Pagar(cuota.Id, 1000m);

        Assert.Equal(HttpStatusCode.Created, nuevo.StatusCode);
        Assert.Equal("PAG", (await CuotaActual(contrato.Id, cuota.Id)).Estado);
    }

    // ------------------------------------------------------------------ consultas

    [Fact]
    public async Task Listar_FiltraPorContratoYFechas_YOrdenaDelMasRecienteAlMasAntiguo()
    {
        var (contrato, cuota) = await ContratoConCuota();
        var hoy = DateTime.Today;
        var antes = PrimerDiaDelMes() < hoy ? PrimerDiaDelMes() : hoy;
        await Pagar(cuota.Id, 100m, fecha: antes);
        await Pagar(cuota.Id, 200m, fecha: hoy);

        var todos = await Operador.GetFromJsonAsync<PaginadoDto<PagoDto>>($"/api/pagos?idContrato={contrato.Id}");
        var soloHoy = await Operador.GetFromJsonAsync<PaginadoDto<PagoDto>>(
            $"/api/pagos?idContrato={contrato.Id}&desde={hoy:yyyy-MM-dd}&hasta={hoy:yyyy-MM-dd}");
        var porCuota = await Operador.GetFromJsonAsync<PaginadoDto<PagoDto>>($"/api/pagos?idCronogramaPago={cuota.Id}");

        Assert.Equal(2, todos!.Total);
        Assert.Equal(200m, todos.Items[0].Monto); // el más reciente primero
        Assert.Single(soloHoy!.Items);
        Assert.Equal(200m, soloHoy.Items[0].Monto);
        Assert.Equal(2, porCuota!.Total);
    }

    [Fact]
    public async Task Listar_PorNumeroDeOperacion()
    {
        var (_, cuota) = await ContratoConCuota();
        var operacion = "OP" + Guid.NewGuid().ToString("N")[..10];
        await Pagar(cuota.Id, 100m, nroOperacion: operacion);

        var lista = await Operador.GetFromJsonAsync<PaginadoDto<PagoDto>>($"/api/pagos?texto={operacion}");

        Assert.Single(lista!.Items);
        Assert.Equal(operacion, lista.Items[0].NroOperacion);
    }

    [Fact]
    public async Task Obtener_Inexistente_Devuelve404()
    {
        var respuesta = await Operador.GetAsync("/api/pagos/99999999");

        Assert.Equal(HttpStatusCode.NotFound, respuesta.StatusCode);
    }

    [Fact]
    public async Task Registrar_DejaUnEventoDeAuditoria()
    {
        var (contrato, cuota) = await ContratoConCuota();
        await Pagar(cuota.Id, 100m);

        var eventos = await Fabrica.EscalarAsync<int>(
            "select count(*) from tabEVENTOS where Entidad = 'PAGO' and CodigoUsuario = 'OPERADOR' and Mensaje like @m",
            ("@m", "%" + contrato.Codigo + "%"));

        Assert.Equal(1, eventos);
    }

    [Fact]
    public async Task PagosDeDemostracion_ExistenYTienenCuotaYConcepto()
    {
        var lista = await Operador.GetFromJsonAsync<PaginadoDto<PagoDto>>("/api/pagos?tamano=5");

        Assert.True(lista!.Total >= 100);
        Assert.All(lista.Items, p =>
        {
            Assert.NotNull(p.NroCuota);
            Assert.NotNull(p.Concepto);
            Assert.Equal("PEN", p.Moneda);
        });
    }
}
