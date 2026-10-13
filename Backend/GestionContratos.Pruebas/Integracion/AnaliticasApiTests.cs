using System.Net;
using System.Net.Http.Json;
using GestionContratos.DTOs.Analiticas;
using GestionContratos.DTOs.Contratos;
using GestionContratos.DTOs.Maestros;
using GestionContratos.DTOs.Pagos;
using GestionContratos.Pruebas.Infraestructura;

namespace GestionContratos.Pruebas.Integracion;

/// <summary>
/// Cada prueba crea su propia empresa con locales, clientes, contratos y pagos, y consulta las analíticas
/// filtradas por esa empresa: así los números esperados son exactos aunque otras pruebas corran en paralelo.
/// </summary>
public class AnaliticasApiTests(ApiFactory fabrica) : PruebasApiBase(fabrica), IClassFixture<ApiFactory>
{
    private static readonly DateTime Hoy = DateTime.Today;

    private async Task<int> CrearEmpresa()
    {
        var respuesta = await Admin.PostAsJsonAsync("/api/empresas", NuevaEmpresa());
        respuesta.EnsureSuccessStatusCode();
        return (await respuesta.Content.ReadFromJsonAsync<EmpresaDto>())!.Id;
    }

    private async Task<int> CrearLocal(int idEmpresa, bool enMantenimiento = false)
    {
        var datos = NuevoLocal(idEmpresa);
        if (enMantenimiento) datos.IdEstado = IdEstadoMantenimiento;
        var respuesta = await Admin.PostAsJsonAsync("/api/locales", datos);
        respuesta.EnsureSuccessStatusCode();
        return (await respuesta.Content.ReadFromJsonAsync<LocalDto>())!.Id;
    }

    private async Task<int> CrearCliente()
    {
        var respuesta = await Operador.PostAsJsonAsync("/api/clientes", NuevoCliente());
        respuesta.EnsureSuccessStatusCode();
        return (await respuesta.Content.ReadFromJsonAsync<ClienteDto>())!.Id;
    }

    /// <summary>Contrato vigente con cuotas de alquiler (y mantenimiento si se indica) que vencen el día 1.</summary>
    private async Task<ContratoDto> ContratoVigente(int idCliente, int idLocal, DateTime inicio, decimal alquiler = 1000m,
        decimal mantenimiento = 0m, DateTime? fin = null)
    {
        var datos = NuevoContrato(idCliente, idLocal, inicio: inicio, diaPago: 1, alquiler: alquiler, mantenimiento: mantenimiento);
        if (fin is not null) datos.FechaFin = fin;
        return await CrearContratoVigente(datos);
    }

    private async Task<PagoDto> Pagar(int idCuota, decimal monto, DateTime? fecha = null)
    {
        var respuesta = await Operador.PostAsJsonAsync("/api/pagos",
            new PagoCrearDto { IdCronogramaPago = idCuota, IdMedioPago = IdMedioEfectivo, Monto = monto, FechaPago = fecha });
        Assert.Equal(HttpStatusCode.Created, respuesta.StatusCode);
        return (await respuesta.Content.ReadFromJsonAsync<PagoDto>())!;
    }

    private async Task<T> Consultar<T>(string ruta) => (await Operador.GetFromJsonAsync<T>(ruta))!;

    private static bool EsDelMesActual(DateTime fecha) => fecha.Year == Hoy.Year && fecha.Month == Hoy.Month;

    // ------------------------------------------------------------------ ocupación

    [Fact]
    public async Task Ocupacion_CuentaOcupadosMantenimientoYDisponiblesSegunLosContratos()
    {
        var empresa = await CrearEmpresa();
        var cliente = await CrearCliente();
        var ocupado1 = await CrearLocal(empresa);
        var ocupado2 = await CrearLocal(empresa);
        await CrearLocal(empresa, enMantenimiento: true);
        await CrearLocal(empresa); // sin contrato
        var futuro = await CrearLocal(empresa); // contrato vigente que aún no inicia: sigue disponible
        var conBorrador = await CrearLocal(empresa); // contrato sin autorizar: sigue disponible
        await ContratoVigente(cliente, ocupado1, PrimerDiaDelMes(-1));
        await ContratoVigente(cliente, ocupado2, PrimerDiaDelMes(-1));
        await ContratoVigente(cliente, futuro, PrimerDiaDelMes(3));
        (await Operador.PostAsJsonAsync("/api/contratos", NuevoContrato(cliente, conBorrador))).EnsureSuccessStatusCode();

        var lista = await Consultar<List<OcupacionDto>>($"/api/analiticas/ocupacion?idEmpresa={empresa}");

        var ocupacion = Assert.Single(lista);
        Assert.Equal(empresa, ocupacion.IdEmpresa);
        Assert.Equal(6, ocupacion.TotalLocales);
        Assert.Equal(2, ocupacion.Ocupados);
        Assert.Equal(1, ocupacion.EnMantenimiento);
        Assert.Equal(3, ocupacion.Disponibles);
        Assert.Equal(33.33m, ocupacion.PorcOcupacion);
    }

    [Fact]
    public async Task Ocupacion_SinFiltro_ListaTodasLasEmpresasIncluidaLaDeDemostracion()
    {
        var empresa = await CrearEmpresa();
        await CrearLocal(empresa);

        var lista = await Consultar<List<OcupacionDto>>("/api/analiticas/ocupacion");

        Assert.Contains(lista, o => o.IdEmpresa == empresa && o.TotalLocales == 1);
        var demo = lista.Single(o => o.IdEmpresa == IdEmpresaDemo);
        Assert.True(demo.TotalLocales >= 12);
        Assert.Equal(demo.TotalLocales, demo.Ocupados + demo.EnMantenimiento + demo.Disponibles);
    }

    [Fact]
    public async Task Ocupacion_EmpresaSinLocales_DevuelveListaVacia()
    {
        var empresa = await CrearEmpresa();

        var lista = await Consultar<List<OcupacionDto>>($"/api/analiticas/ocupacion?idEmpresa={empresa}");

        Assert.Empty(lista);
    }

    // ------------------------------------------------------------------ ingresos esperados vs cobrados

    [Fact]
    public async Task IngresosMensuales_ComparaLoEsperadoConLoCobradoMesAMes()
    {
        var empresa = await CrearEmpresa();
        var contrato = await ContratoVigente(await CrearCliente(), await CrearLocal(empresa), PrimerDiaDelMes(-3),
            alquiler: 1000m, mantenimiento: 100m);
        var cuotas = await ObtenerCronograma(contrato.Id);
        await Pagar(cuotas.First(c => c.Concepto == "ALQ" && c.NroCuota == 1).Id, 1000m, PrimerDiaDelMes(-3));
        await Pagar(cuotas.First(c => c.Concepto == "MAN" && c.NroCuota == 3).Id, 40m, PrimerDiaDelMes(-1));
        await Pagar(cuotas.First(c => c.Concepto == "ALQ" && c.NroCuota == 4).Id, 300m, Hoy);
        var desde = PrimerDiaDelMes(-5);
        var hasta = PrimerDiaDelMes(0);

        var meses = await Consultar<List<IngresoMensualDto>>(
            $"/api/analiticas/ingresos-mensuales?idEmpresa={empresa}&desde={desde:yyyy-MM-dd}&hasta={hasta:yyyy-MM-dd}");

        Assert.Equal(6, meses.Count);
        Assert.Equal(Enumerable.Range(-5, 6).Select(PrimerDiaDelMes), meses.Select(m => m.Mes));
        // Antes de que empiece el contrato no hay nada (los meses aparecen igual, con ceros).
        Assert.All(meses.Take(2), m => Assert.Equal((0m, 0m, 0m), (m.Esperado, m.Cobrado, m.PorcCobranza)));
        Assert.All(meses.Skip(2), m => Assert.Equal(1100m, m.Esperado));
        Assert.Equal([1000m, 0m, 40m, 300m], meses.Skip(2).Select(m => m.Cobrado));
        Assert.Equal([90.91m, 0m, 3.64m, 27.27m], meses.Skip(2).Select(m => m.PorcCobranza));
        Assert.Equal(-100m, meses[2].Diferencia);
        Assert.Equal(-1100m, meses[3].Diferencia);
    }

    [Fact]
    public async Task IngresosMensuales_SinRango_DevuelveLosUltimosDoceMeses()
    {
        var meses = await Consultar<List<IngresoMensualDto>>("/api/analiticas/ingresos-mensuales");

        Assert.Equal(12, meses.Count);
        Assert.Equal(PrimerDiaDelMes(-11), meses[0].Mes);
        Assert.Equal(PrimerDiaDelMes(0), meses[11].Mes);
        Assert.Contains(meses, m => m.Cobrado > 0); // los pagos de la demostración
    }

    [Fact]
    public async Task IngresosMensuales_ElPagoCuentaEnElMesEnQueSeRecibeNoEnElDeLaCuota()
    {
        var empresa = await CrearEmpresa();
        var contrato = await ContratoVigente(await CrearCliente(), await CrearLocal(empresa), PrimerDiaDelMes(-2));
        var primera = (await ObtenerCronograma(contrato.Id)).First(c => c.NroCuota == 1);
        await Pagar(primera.Id, 1000m, Hoy); // cuota del mes -2 pagada hoy

        var meses = await Consultar<List<IngresoMensualDto>>(
            $"/api/analiticas/ingresos-mensuales?idEmpresa={empresa}&desde={PrimerDiaDelMes(-2):yyyy-MM-dd}&hasta={PrimerDiaDelMes(0):yyyy-MM-dd}");

        Assert.Equal(0m, meses[0].Cobrado);
        Assert.Equal(1000m, meses[0].Esperado);
        Assert.Equal(1000m, meses[2].Cobrado);
    }

    [Fact]
    public async Task IngresosMensuales_HastaAnteriorADesde_Devuelve400()
    {
        var respuesta = await Operador.GetAsync(
            $"/api/analiticas/ingresos-mensuales?desde={PrimerDiaDelMes(0):yyyy-MM-dd}&hasta={PrimerDiaDelMes(-1):yyyy-MM-dd}");

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task IngresosMensuales_RangoMayorA60Meses_Devuelve400()
    {
        var respuesta = await Operador.GetAsync(
            $"/api/analiticas/ingresos-mensuales?desde={PrimerDiaDelMes(-60):yyyy-MM-dd}&hasta={PrimerDiaDelMes(0):yyyy-MM-dd}");

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    // ------------------------------------------------------------------ morosidad

    [Fact]
    public async Task Morosidad_AgrupaLaDeudaVencidaPorAntiguedad()
    {
        var empresa = await CrearEmpresa();
        var contrato = await ContratoVigente(await CrearCliente(), await CrearLocal(empresa), PrimerDiaDelMes(-4),
            alquiler: 1000m, mantenimiento: 100m);
        var cuotas = await ObtenerCronograma(contrato.Id);
        var vencidas = cuotas.Where(c => c.FechaVencimiento.Date < Hoy).ToList();
        await Pagar(vencidas.First(c => c.Concepto == "ALQ").Id, 400m, PrimerDiaDelMes(-4)); // pago parcial
        cuotas = await ObtenerCronograma(contrato.Id);
        var pendientes = cuotas.Where(c => c.FechaVencimiento.Date < Hoy && c.Saldo > 0).ToList();

        var resumen = await Consultar<MorosidadResumenDto>($"/api/analiticas/morosidad?idEmpresa={empresa}");

        Assert.Equal(pendientes.Sum(c => c.Saldo), resumen.MontoVencido);
        Assert.Equal(pendientes.Count, resumen.CuotasVencidas);
        Assert.Equal(1, resumen.ClientesMorosos);
        Assert.Equal(pendientes.Max(c => c.DiasAtraso), resumen.MaxDiasAtraso);
        Assert.Equal(4, resumen.Antiguedad.Count);
        Assert.Equal(["1-30 días", "31-60 días", "61-90 días", "Más de 90 días"], resumen.Antiguedad.Select(a => a.Rango));
        Assert.Equal(resumen.MontoVencido, resumen.Antiguedad.Sum(a => a.Monto));
        Assert.Equal(resumen.CuotasVencidas, resumen.Antiguedad.Sum(a => a.Cuotas));
        foreach (var rango in resumen.Antiguedad)
        {
            var esperadas = pendientes.Where(c => c.DiasAtraso >= rango.DesdeDias && (rango.HastaDias is null || c.DiasAtraso <= rango.HastaDias)).ToList();
            Assert.Equal(esperadas.Count, rango.Cuotas);
            Assert.Equal(esperadas.Sum(c => c.Saldo), rango.Monto);
        }
    }

    [Fact]
    public async Task Morosidad_ClienteQuePagoTodoLoVencido_DevuelveCeros()
    {
        var empresa = await CrearEmpresa();
        var contrato = await ContratoVigente(await CrearCliente(), await CrearLocal(empresa), PrimerDiaDelMes(-1));
        // Las cuotas que ya vencieron se pagan por completo: el cliente queda al día.
        foreach (var cuota in (await ObtenerCronograma(contrato.Id)).Where(c => c.FechaVencimiento.Date < Hoy))
            await Pagar(cuota.Id, cuota.Saldo, Hoy);

        var resumen = await Consultar<MorosidadResumenDto>($"/api/analiticas/morosidad?idEmpresa={empresa}");

        Assert.Equal(0m, resumen.MontoVencido);
        Assert.Equal(0, resumen.CuotasVencidas);
        Assert.Equal(0, resumen.ClientesMorosos);
        Assert.Equal(4, resumen.Antiguedad.Count);
        Assert.All(resumen.Antiguedad, a => Assert.Equal(0, a.Cuotas));
    }

    [Fact]
    public async Task Morosidad_SinFiltro_IncluyeLosClientesMorososDeLaDemostracion()
    {
        var resumen = await Consultar<MorosidadResumenDto>("/api/analiticas/morosidad");

        Assert.True(resumen.ClientesMorosos >= 3);
        Assert.True(resumen.MontoVencido >= 16050m); // CLI-007 + CLI-004 + CLI-003 de la demostración
    }

    // ------------------------------------------------------------------ contratos por vencer

    [Fact]
    public async Task ContratosPorVencer_ListaLosVigentesDentroDelPlazoDelMasProximoAlMasLejano()
    {
        var empresa = await CrearEmpresa();
        var cliente = await CrearCliente();
        foreach (var dias in new[] { 80, 10, 200, 45 })
            await ContratoVigente(cliente, await CrearLocal(empresa), Hoy.AddDays(-30), alquiler: 1500m, mantenimiento: 100m, fin: Hoy.AddDays(dias));
        var borrador = await CrearLocal(empresa); // un borrador que terminaría en 20 días no cuenta
        (await Operador.PostAsJsonAsync("/api/contratos",
            NuevoContrato(cliente, borrador, inicio: Hoy.AddDays(-30)).Also(d => d.FechaFin = Hoy.AddDays(20)))).EnsureSuccessStatusCode();

        var a90 = await Consultar<List<ContratoPorVencerDto>>($"/api/analiticas/contratos-por-vencer?idEmpresa={empresa}");
        var a30 = await Consultar<List<ContratoPorVencerDto>>($"/api/analiticas/contratos-por-vencer?idEmpresa={empresa}&dias=30");
        var a365 = await Consultar<List<ContratoPorVencerDto>>($"/api/analiticas/contratos-por-vencer?idEmpresa={empresa}&dias=365");

        Assert.Equal([10, 45, 80], a90.Select(c => c.DiasRestantes));
        Assert.Equal([10], a30.Select(c => c.DiasRestantes));
        Assert.Equal([10, 45, 80, 200], a365.Select(c => c.DiasRestantes));
        Assert.All(a90, c =>
        {
            Assert.Equal(1600m, c.MontoMensual);
            Assert.Equal(Hoy.AddDays(c.DiasRestantes), c.FechaFin.Date);
            Assert.StartsWith("CON-", c.CodigoContrato);
        });
    }

    [Theory]
    [InlineData(0)]
    [InlineData(366)]
    public async Task ContratosPorVencer_DiasFueraDeRango_Devuelve400(int dias)
    {
        var respuesta = await Operador.GetAsync($"/api/analiticas/contratos-por-vencer?dias={dias}");

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task ContratosPorVencer_ConDatosDeLaDemostracion_IncluyeElQueVenceElProximoMes()
    {
        var lista = await Consultar<List<ContratoPorVencerDto>>("/api/analiticas/contratos-por-vencer?dias=365");

        Assert.NotEmpty(lista);
        Assert.Equal(lista.OrderBy(c => c.DiasRestantes).Select(c => c.IdContrato), lista.Select(c => c.IdContrato));
    }

    // ------------------------------------------------------------------ tops

    [Fact]
    public async Task Tops_OrdenanPorLoCobradoYRespetanElPeriodoYLaCantidad()
    {
        var empresa = await CrearEmpresa();
        var inicio = PrimerDiaDelMes(-3);
        var (clienteA, clienteB, clienteC) = (await CrearCliente(), await CrearCliente(), await CrearCliente());
        var (localA, localB, localC) = (await CrearLocal(empresa), await CrearLocal(empresa), await CrearLocal(empresa));
        var a = await ObtenerCronograma((await ContratoVigente(clienteA, localA, inicio)).Id);
        var b = await ObtenerCronograma((await ContratoVigente(clienteB, localB, inicio)).Id);
        var c = await ObtenerCronograma((await ContratoVigente(clienteC, localC, inicio)).Id);

        await Pagar(a[0].Id, 1000m, Hoy);
        await Pagar(a[1].Id, 1000m, Hoy);
        await Pagar(a[2].Id, 500m, PrimerDiaDelMes(-2)); // fuera del período filtrado más abajo
        await Pagar(b[0].Id, 700m, Hoy);
        await Pagar(c[0].Id, 1000m, Hoy);
        await Pagar(c[1].Id, 500m, Hoy);

        var clientes = await Consultar<List<TopClienteDto>>($"/api/analiticas/top-clientes?idEmpresa={empresa}&top=2");
        var locales = await Consultar<List<TopLocalDto>>($"/api/analiticas/top-locales?idEmpresa={empresa}&top=2");
        var clientesDelMes = await Consultar<List<TopClienteDto>>(
            $"/api/analiticas/top-clientes?idEmpresa={empresa}&desde={PrimerDiaDelMes(-1):yyyy-MM-dd}&hasta={Hoy:yyyy-MM-dd}");
        var todosLosClientes = await Consultar<List<TopClienteDto>>($"/api/analiticas/top-clientes?idEmpresa={empresa}");

        Assert.Equal([clienteA, clienteC], clientes.Select(x => x.IdCliente));
        Assert.Equal([2500m, 1500m], clientes.Select(x => x.TotalCobrado));
        Assert.Equal([3, 2], clientes.Select(x => x.CantidadPagos));
        Assert.Equal([localA, localC], locales.Select(x => x.IdLocal));
        Assert.Equal([2500m, 1500m], locales.Select(x => x.TotalCobrado));
        Assert.StartsWith(Prefijo, locales[0].CodigoLocal);
        // Sin el pago de hace dos meses, A baja a 2000 y el orden de los demás se mantiene.
        Assert.Equal([clienteA, clienteC, clienteB], clientesDelMes.Select(x => x.IdCliente));
        Assert.Equal([2000m, 1500m, 700m], clientesDelMes.Select(x => x.TotalCobrado));
        Assert.Equal(3, todosLosClientes.Count);
    }

    [Fact]
    public async Task Tops_SinPagosEnElPeriodo_DevuelvenListaVacia()
    {
        var empresa = await CrearEmpresa();

        var clientes = await Consultar<List<TopClienteDto>>($"/api/analiticas/top-clientes?idEmpresa={empresa}");
        var locales = await Consultar<List<TopLocalDto>>($"/api/analiticas/top-locales?idEmpresa={empresa}");

        Assert.Empty(clientes);
        Assert.Empty(locales);
    }

    [Theory]
    [InlineData("top=0")]
    [InlineData("top=51")]
    public async Task Tops_CantidadFueraDeRango_Devuelve400(string consulta)
    {
        Assert.Equal(HttpStatusCode.BadRequest, (await Operador.GetAsync($"/api/analiticas/top-clientes?{consulta}")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Operador.GetAsync($"/api/analiticas/top-locales?{consulta}")).StatusCode);
    }

    [Fact]
    public async Task Tops_FechaFinalAnteriorALaInicial_Devuelve400()
    {
        var respuesta = await Operador.GetAsync(
            $"/api/analiticas/top-clientes?desde={Hoy:yyyy-MM-dd}&hasta={Hoy.AddDays(-1):yyyy-MM-dd}");

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task Tops_ConDatosDeLaDemostracion_VienenOrdenadosYLimitados()
    {
        var clientes = await Consultar<List<TopClienteDto>>("/api/analiticas/top-clientes?top=3");

        Assert.Equal(3, clientes.Count);
        Assert.Equal(clientes.OrderByDescending(c => c.TotalCobrado).Select(c => c.IdCliente), clientes.Select(c => c.IdCliente));
        Assert.All(clientes, c => Assert.True(c.TotalCobrado > 0 && c.CantidadPagos > 0));
    }

    // ------------------------------------------------------------------ resumen

    [Fact]
    public async Task Resumen_ReuneLosIndicadoresDeLaEmpresa()
    {
        var empresa = await CrearEmpresa();
        var cliente = await CrearCliente();
        var contratoA = await ContratoVigente(cliente, await CrearLocal(empresa), PrimerDiaDelMes(-2), alquiler: 1000m, mantenimiento: 100m);
        var contratoB = await ContratoVigente(cliente, await CrearLocal(empresa), Hoy.AddDays(-30), alquiler: 800m, fin: Hoy.AddDays(25));
        var contratoC = await ContratoVigente(cliente, await CrearLocal(empresa), Hoy.AddDays(-30), alquiler: 600m, fin: Hoy.AddDays(70));
        await CrearLocal(empresa, enMantenimiento: true);

        var cuotasA = await ObtenerCronograma(contratoA.Id);
        await Pagar(cuotasA.First(q => q.Concepto == "ALQ" && q.NroCuota == 1).Id, 1000m, PrimerDiaDelMes(-2));
        await Pagar(cuotasA.First(q => q.Concepto == "ALQ" && q.NroCuota == 3).Id, 400m, Hoy);

        var cuotas = (await ObtenerCronograma(contratoA.Id)).Concat(await ObtenerCronograma(contratoB.Id)).Concat(await ObtenerCronograma(contratoC.Id)).ToList();
        var esperadoMes = cuotas.Where(q => EsDelMesActual(q.FechaVencimiento)).Sum(q => q.Monto);
        var vencidas = cuotas.Where(q => q.Saldo > 0 && q.FechaVencimiento.Date < Hoy).ToList();

        var resumen = await Consultar<ResumenDto>($"/api/analiticas/resumen?idEmpresa={empresa}");

        Assert.Equal(Hoy, resumen.FechaCorte);
        Assert.Equal(4, resumen.TotalLocales);
        Assert.Equal(3, resumen.LocalesOcupados);
        Assert.Equal(1, resumen.LocalesEnMantenimiento);
        Assert.Equal(0, resumen.LocalesDisponibles);
        Assert.Equal(75m, resumen.PorcOcupacion);
        Assert.Equal(3, resumen.ContratosVigentes);
        Assert.Equal(esperadoMes, resumen.EsperadoMes);
        Assert.Equal(400m, resumen.CobradoMes);
        Assert.Equal(esperadoMes > 0 ? Math.Round(400m / esperadoMes * 100, 2) : 0m, resumen.PorcCobranzaMes);
        Assert.Equal(vencidas.Sum(q => q.Saldo), resumen.MontoVencido);
        Assert.Equal(vencidas.Count, resumen.CuotasVencidas);
        Assert.Equal(vencidas.Count > 0 ? 1 : 0, resumen.ClientesMorosos);
        Assert.Equal(1, resumen.ContratosPorVencer30);  // B termina en 25 días
        Assert.Equal(1, resumen.ContratosPorVencer60);
        Assert.Equal(2, resumen.ContratosPorVencer90);  // C termina en 70 días
    }

    [Fact]
    public async Task Resumen_SinFiltro_ConsolidaTodasLasEmpresas()
    {
        var resumen = await Consultar<ResumenDto>("/api/analiticas/resumen");

        Assert.True(resumen.TotalLocales >= 12);
        Assert.Equal(resumen.TotalLocales, resumen.LocalesOcupados + resumen.LocalesDisponibles + resumen.LocalesEnMantenimiento);
        Assert.True(resumen.ClientesMorosos >= 3);
        Assert.True(resumen.ContratosVigentes >= 8);
    }

    // ------------------------------------------------------------------ acceso

    [Theory]
    [InlineData("resumen")]
    [InlineData("ocupacion")]
    [InlineData("ingresos-mensuales")]
    [InlineData("morosidad")]
    [InlineData("contratos-por-vencer")]
    [InlineData("top-locales")]
    [InlineData("top-clientes")]
    public async Task SinToken_Devuelve401(string endpoint)
    {
        var respuesta = await Anonimo.GetAsync($"/api/analiticas/{endpoint}");

        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
    }

    [Theory]
    [InlineData("resumen")]
    [InlineData("ocupacion")]
    [InlineData("ingresos-mensuales")]
    [InlineData("morosidad")]
    [InlineData("contratos-por-vencer")]
    [InlineData("top-locales")]
    [InlineData("top-clientes")]
    public async Task EmpresaInexistente_Devuelve404(string endpoint)
    {
        var respuesta = await Operador.GetAsync($"/api/analiticas/{endpoint}?idEmpresa=99999999");

        Assert.Equal(HttpStatusCode.NotFound, respuesta.StatusCode);
    }

    [Fact]
    public async Task ElOperadorTambienPuedeConsultarLasAnaliticas()
    {
        var respuesta = await Operador.GetAsync("/api/analiticas/resumen");

        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
    }
}

file static class ObjetoExtensions
{
    /// <summary>Aplica un cambio al objeto y lo devuelve (para armar solicitudes en una sola expresión).</summary>
    public static T Also<T>(this T objeto, Action<T> accion)
    {
        accion(objeto);
        return objeto;
    }
}
