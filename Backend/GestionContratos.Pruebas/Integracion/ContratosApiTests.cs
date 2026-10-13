using System.Net;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using GestionContratos.DTOs.Comunes;
using GestionContratos.DTOs.Contratos;
using GestionContratos.DTOs.Maestros;
using GestionContratos.Pruebas.Infraestructura;

namespace GestionContratos.Pruebas.Integracion;

public class ContratosApiTests(ApiFactory fabrica) : PruebasApiBase(fabrica), IClassFixture<ApiFactory>
{
    private static DateTime PrimerDiaMes(int desplazamientoMeses = 0) =>
        new DateTime(DateTime.Today.Year, DateTime.Today.Month, 1).AddMonths(desplazamientoMeses);

    /// <summary>Registra un contrato en borrador como operador.</summary>
    private async Task<ContratoDto> CrearBorrador(ContratoGuardarDto datos)
    {
        var respuesta = await Operador.PostAsJsonAsync("/api/contratos", datos);
        Assert.Equal(HttpStatusCode.Created, respuesta.StatusCode);
        return (await respuesta.Content.ReadFromJsonAsync<ContratoDto>())!;
    }

    /// <summary>Registra (operador) y autoriza (administrador) un contrato.</summary>
    private async Task<ContratoDto> CrearVigente(ContratoGuardarDto datos)
    {
        var borrador = await CrearBorrador(datos);
        var respuesta = await Admin.PostAsync($"/api/contratos/{borrador.Id}/autorizar", null);
        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        return (await respuesta.Content.ReadFromJsonAsync<ContratoDto>())!;
    }

    private async Task<int> IdCatalogoEstado(string abreviatura) =>
        (await Operador.GetFromJsonAsync<List<GestionContratos.DTOs.Catalogos.CatalogoItemDto>>("/api/catalogos/estados"))!
        .Single(e => e.Abreviatura == abreviatura).Id;

    private Task<LocalDto> ObtenerLocal(int id) => Admin.GetFromJsonAsync<LocalDto>($"/api/locales/{id}")!;

    private Task<List<CuotaDto>> Cronograma(int idContrato) =>
        Operador.GetFromJsonAsync<List<CuotaDto>>($"/api/contratos/{idContrato}/cronograma")!;

    // ------------------------------------------------------------------ alta

    [Fact]
    public async Task Crear_ComoOperador_QuedaEnBorradorConCodigoGenerado()
    {
        var (cliente, local) = await CrearClienteYLocal();

        var contrato = await CrearBorrador(NuevoContrato(cliente, local, mantenimiento: 150m));

        Assert.Matches(new Regex(@"^CON-\d{4}-\d{4,}$"), contrato.Codigo);
        Assert.Equal("BOR", contrato.Estado);
        Assert.Equal("PEN", contrato.Moneda);
        Assert.Equal("OPERADOR", contrato.UsuarioRegistra);
        Assert.Null(contrato.UsuarioAutoriza);
        Assert.Equal(1150m, contrato.MontoMensual);
        Assert.Empty(await Cronograma(contrato.Id));
    }

    [Fact]
    public async Task Crear_DosContratos_RecibenCodigosConsecutivos()
    {
        var (cliente, local1) = await CrearClienteYLocal();
        var (_, local2) = await CrearClienteYLocal();

        var primero = await CrearBorrador(NuevoContrato(cliente, local1));
        var segundo = await CrearBorrador(NuevoContrato(cliente, local2));

        static int Numero(string codigo) => int.Parse(codigo.Split('-')[2]);
        Assert.Equal(Numero(primero.Codigo) + 1, Numero(segundo.Codigo));
    }

    [Fact]
    public async Task Crear_FechaFinNoPosteriorAInicio_Devuelve400()
    {
        var (cliente, local) = await CrearClienteYLocal();
        var datos = NuevoContrato(cliente, local);
        datos.FechaFin = datos.FechaInicio;

        var respuesta = await Operador.PostAsJsonAsync("/api/contratos", datos);

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task Crear_DuracionMayorA120Meses_Devuelve400()
    {
        var (cliente, local) = await CrearClienteYLocal();

        var respuesta = await Operador.PostAsJsonAsync("/api/contratos", NuevoContrato(cliente, local, meses: 121));

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task Crear_MontoDeAlquilerCero_Devuelve400()
    {
        var (cliente, local) = await CrearClienteYLocal();

        var respuesta = await Operador.PostAsJsonAsync("/api/contratos", NuevoContrato(cliente, local, alquiler: 0m));

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(32)]
    public async Task Crear_DiaDePagoFueraDeRango_Devuelve400(int dia)
    {
        var (cliente, local) = await CrearClienteYLocal();

        var respuesta = await Operador.PostAsJsonAsync("/api/contratos", NuevoContrato(cliente, local, diaPago: dia));

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task Crear_ClienteInexistente_Devuelve400()
    {
        var (_, local) = await CrearClienteYLocal();

        var respuesta = await Operador.PostAsJsonAsync("/api/contratos", NuevoContrato(99999999, local));

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task Crear_LocalInexistente_Devuelve400()
    {
        var (cliente, _) = await CrearClienteYLocal();

        var respuesta = await Operador.PostAsJsonAsync("/api/contratos", NuevoContrato(cliente, 99999999));

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task Crear_LocalEnMantenimiento_Devuelve400()
    {
        var cliente = (await (await Operador.PostAsJsonAsync("/api/clientes", NuevoCliente())).Content.ReadFromJsonAsync<ClienteDto>())!;
        var datosLocal = NuevoLocal();
        datosLocal.IdEstado = IdEstadoMantenimiento;
        var local = (await (await Admin.PostAsJsonAsync("/api/locales", datosLocal)).Content.ReadFromJsonAsync<LocalDto>())!;

        var respuesta = await Operador.PostAsJsonAsync("/api/contratos", NuevoContrato(cliente.Id, local.Id));

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task Crear_FechasQueSeCruzanConOtroContratoDelLocal_Devuelve400()
    {
        var (cliente, local) = await CrearClienteYLocal();
        await CrearBorrador(NuevoContrato(cliente, local, inicio: new DateTime(2030, 1, 1), meses: 12));

        var respuesta = await Operador.PostAsJsonAsync("/api/contratos",
            NuevoContrato(cliente, local, inicio: new DateTime(2030, 12, 1), meses: 6)); // se cruza en diciembre

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task Crear_ContratoContiguoSinCruce_Devuelve201()
    {
        var (cliente, local) = await CrearClienteYLocal();
        await CrearBorrador(NuevoContrato(cliente, local, inicio: new DateTime(2030, 1, 1), meses: 12)); // termina 31/12/2030

        var siguiente = await CrearBorrador(NuevoContrato(cliente, local, inicio: new DateTime(2031, 1, 1), meses: 12));

        Assert.Equal("BOR", siguiente.Estado);
    }

    // ------------------------------------------------------------------ edición y baja de borradores

    [Fact]
    public async Task Actualizar_Borrador_ModificaLosDatos()
    {
        var (cliente, local) = await CrearClienteYLocal();
        var contrato = await CrearBorrador(NuevoContrato(cliente, local, alquiler: 1000m));

        var respuesta = await Operador.PutAsJsonAsync($"/api/contratos/{contrato.Id}",
            NuevoContrato(cliente, local, alquiler: 1800m, diaPago: 2));

        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        var actualizado = await respuesta.Content.ReadFromJsonAsync<ContratoDto>();
        Assert.Equal(1800m, actualizado!.MontoAlquiler);
        Assert.Equal(2, actualizado.DiaPago);
        Assert.Equal(contrato.Codigo, actualizado.Codigo);
    }

    [Fact]
    public async Task Actualizar_ContratoVigente_Devuelve400()
    {
        var (cliente, local) = await CrearClienteYLocal();
        var vigente = await CrearVigente(NuevoContrato(cliente, local));

        var respuesta = await Operador.PutAsJsonAsync($"/api/contratos/{vigente.Id}", NuevoContrato(cliente, local, alquiler: 5m));

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task Desactivar_BorradorComoAdmin_Devuelve204()
    {
        var (cliente, local) = await CrearClienteYLocal();
        var borrador = await CrearBorrador(NuevoContrato(cliente, local));

        var respuesta = await Admin.DeleteAsync($"/api/contratos/{borrador.Id}");

        Assert.Equal(HttpStatusCode.NoContent, respuesta.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Admin.GetAsync($"/api/contratos/{borrador.Id}")).StatusCode);
    }

    [Fact]
    public async Task Desactivar_ComoOperador_Devuelve403()
    {
        var (cliente, local) = await CrearClienteYLocal();
        var borrador = await CrearBorrador(NuevoContrato(cliente, local));

        var respuesta = await Operador.DeleteAsync($"/api/contratos/{borrador.Id}");

        Assert.Equal(HttpStatusCode.Forbidden, respuesta.StatusCode);
    }

    [Fact]
    public async Task Desactivar_ContratoVigente_Devuelve400()
    {
        var (cliente, local) = await CrearClienteYLocal();
        var vigente = await CrearVigente(NuevoContrato(cliente, local));

        var respuesta = await Admin.DeleteAsync($"/api/contratos/{vigente.Id}");

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    // ------------------------------------------------------------------ autorización

    [Fact]
    public async Task Autorizar_ComoOperador_Devuelve403()
    {
        var (cliente, local) = await CrearClienteYLocal();
        var borrador = await CrearBorrador(NuevoContrato(cliente, local));

        var respuesta = await Operador.PostAsync($"/api/contratos/{borrador.Id}/autorizar", null);

        Assert.Equal(HttpStatusCode.Forbidden, respuesta.StatusCode);
    }

    [Fact]
    public async Task Autorizar_ComoAdmin_PasaAVigenteGeneraElCronogramaYOcupaElLocal()
    {
        var (cliente, local) = await CrearClienteYLocal();
        var borrador = await CrearBorrador(NuevoContrato(cliente, local, diaPago: 15, alquiler: 1000m, mantenimiento: 100m));

        var respuesta = await Admin.PostAsync($"/api/contratos/{borrador.Id}/autorizar", null);

        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        var vigente = await respuesta.Content.ReadFromJsonAsync<ContratoDto>();
        Assert.Equal("VIG", vigente!.Estado);
        Assert.Equal("ADMIN", vigente.UsuarioAutoriza);
        Assert.Equal("OPERADOR", vigente.UsuarioRegistra);

        var cuotas = await Cronograma(borrador.Id);
        Assert.Equal(24, cuotas.Count); // 12 meses x (alquiler + mantenimiento)
        Assert.Equal(12, cuotas.Count(c => c.Concepto == "ALQ" && c.Monto == 1000m));
        Assert.Equal(12, cuotas.Count(c => c.Concepto == "MAN" && c.Monto == 100m));
        Assert.All(cuotas, c =>
        {
            Assert.Equal("PEN", c.Estado);
            Assert.Equal(0m, c.Pagado);
            Assert.Equal(c.Monto, c.Saldo);
            Assert.Equal(15, c.FechaVencimiento.Day);
        });
        Assert.Equal("OCU", (await ObtenerLocal(local)).Estado);
    }

    [Fact]
    public async Task Autorizar_RegistradoPorElMismoUsuario_Devuelve400()
    {
        var (cliente, local) = await CrearClienteYLocal();
        var respuestaCreacion = await Admin.PostAsJsonAsync("/api/contratos", NuevoContrato(cliente, local));
        var contrato = await respuestaCreacion.Content.ReadFromJsonAsync<ContratoDto>();

        var respuesta = await Admin.PostAsync($"/api/contratos/{contrato!.Id}/autorizar", null);

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
        Assert.Equal("BOR", (await Admin.GetFromJsonAsync<ContratoDto>($"/api/contratos/{contrato.Id}"))!.Estado);
    }

    [Fact]
    public async Task Autorizar_ContratoYaVigente_Devuelve400()
    {
        var (cliente, local) = await CrearClienteYLocal();
        var vigente = await CrearVigente(NuevoContrato(cliente, local));

        var respuesta = await Admin.PostAsync($"/api/contratos/{vigente.Id}/autorizar", null);

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task Autorizar_ContratoConPlazoTerminado_Devuelve400()
    {
        var (cliente, local) = await CrearClienteYLocal();
        var borrador = await CrearBorrador(NuevoContrato(cliente, local, inicio: PrimerDiaMes(-24), meses: 12));

        var respuesta = await Admin.PostAsync($"/api/contratos/{borrador.Id}/autorizar", null);

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task Autorizar_ContratoQueIniciaDespues_NoOcupaElLocalTodavia()
    {
        var (cliente, local) = await CrearClienteYLocal();

        await CrearVigente(NuevoContrato(cliente, local, inicio: PrimerDiaMes(24), meses: 12));

        Assert.Equal("DIS", (await ObtenerLocal(local)).Estado);
    }

    [Fact]
    public async Task Autorizar_RegistraUnEventoDeAuditoria()
    {
        var (cliente, local) = await CrearClienteYLocal();

        var vigente = await CrearVigente(NuevoContrato(cliente, local));

        var eventos = await Fabrica.EscalarAsync<int>(
            "select count(*) from tabEVENTOS where Entidad = 'CONTRATO' and CodigoUsuario = 'ADMIN' and Mensaje like @m",
            ("@m", "%" + vigente.Codigo + "%"));
        Assert.Equal(1, eventos);
    }

    [Fact]
    public async Task Cronograma_DiaDePago31_UsaElUltimoDiaDeLosMesesCortos()
    {
        var (cliente, local) = await CrearClienteYLocal();
        var datos = NuevoContrato(cliente, local, inicio: new DateTime(2031, 1, 1), meses: 3, diaPago: 31);

        var vigente = await CrearVigente(datos);

        var vencimientos = (await Cronograma(vigente.Id)).Select(c => c.FechaVencimiento.Date).ToList();
        Assert.Equal([new DateTime(2031, 1, 31), new DateTime(2031, 2, 28), new DateTime(2031, 3, 31)], vencimientos);
    }

    // ------------------------------------------------------------------ rescisión

    [Fact]
    public async Task Rescindir_ContratoVigente_CierraElContratoAnulaCuotasFuturasYLiberaElLocal()
    {
        var (cliente, local) = await CrearClienteYLocal();
        var vigente = await CrearVigente(NuevoContrato(cliente, local, inicio: PrimerDiaMes(-2), meses: 12));
        var cuotasAntes = await Cronograma(vigente.Id);
        var hoy = DateTime.Today;

        var respuesta = await Admin.PostAsJsonAsync($"/api/contratos/{vigente.Id}/rescindir",
            new RescindirContratoDto { Fecha = hoy, Motivo = "El cliente dejó el local" });

        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        var rescindido = await respuesta.Content.ReadFromJsonAsync<ContratoDto>();
        Assert.Equal("RES", rescindido!.Estado);
        Assert.Equal(hoy, rescindido.FechaFin.Date);
        Assert.Contains("El cliente dejó el local", rescindido.Observaciones);

        var cuotasDespues = await Cronograma(vigente.Id);
        Assert.True(cuotasDespues.Count < cuotasAntes.Count);
        Assert.All(cuotasDespues, c => Assert.True(c.FechaVencimiento.Date <= hoy));
        Assert.Equal("DIS", (await ObtenerLocal(local)).Estado);
    }

    [Fact]
    public async Task Rescindir_ComoOperador_Devuelve403()
    {
        var (cliente, local) = await CrearClienteYLocal();
        var vigente = await CrearVigente(NuevoContrato(cliente, local));

        var respuesta = await Operador.PostAsJsonAsync($"/api/contratos/{vigente.Id}/rescindir",
            new RescindirContratoDto { Fecha = DateTime.Today, Motivo = "x" });

        Assert.Equal(HttpStatusCode.Forbidden, respuesta.StatusCode);
    }

    [Fact]
    public async Task Rescindir_ContratoEnBorrador_Devuelve400()
    {
        var (cliente, local) = await CrearClienteYLocal();
        var borrador = await CrearBorrador(NuevoContrato(cliente, local));

        var respuesta = await Admin.PostAsJsonAsync($"/api/contratos/{borrador.Id}/rescindir",
            new RescindirContratoDto { Fecha = DateTime.Today, Motivo = "x" });

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task Rescindir_ConFechaFuturaOAnteriorAlInicio_Devuelve400()
    {
        var (cliente, local) = await CrearClienteYLocal();
        var vigente = await CrearVigente(NuevoContrato(cliente, local, inicio: PrimerDiaMes(-1), meses: 12));

        var futura = await Admin.PostAsJsonAsync($"/api/contratos/{vigente.Id}/rescindir",
            new RescindirContratoDto { Fecha = DateTime.Today.AddDays(5), Motivo = "x" });
        var anterior = await Admin.PostAsJsonAsync($"/api/contratos/{vigente.Id}/rescindir",
            new RescindirContratoDto { Fecha = PrimerDiaMes(-1).AddDays(-1), Motivo = "x" });

        Assert.Equal(HttpStatusCode.BadRequest, futura.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, anterior.StatusCode);
    }

    [Fact]
    public async Task Rescindir_SinMotivo_Devuelve400()
    {
        var (cliente, local) = await CrearClienteYLocal();
        var vigente = await CrearVigente(NuevoContrato(cliente, local));

        var respuesta = await Admin.PostAsJsonAsync($"/api/contratos/{vigente.Id}/rescindir",
            new RescindirContratoDto { Fecha = DateTime.Today, Motivo = "" });

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    // ------------------------------------------------------------------ vencimientos

    [Fact]
    public async Task ActualizarEstados_MarcaVencidoElContratoCuyoPlazoTermino_YLiberaElLocal()
    {
        var (cliente, local) = await CrearClienteYLocal();
        var vigente = await CrearVigente(NuevoContrato(cliente, local, inicio: PrimerDiaMes(-2), meses: 12));
        Assert.Equal("OCU", (await ObtenerLocal(local)).Estado);
        // Se simula el paso del tiempo: el plazo terminó ayer.
        await Fabrica.EjecutarAsync(
            "update tabCONTRATOS set FechaFin = dateadd(day, -1, cast(getdate() as date)) where Id = @id", ("@id", vigente.Id));

        var respuesta = await Admin.PostAsync("/api/contratos/actualizar-estados", null);

        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        var resultado = await respuesta.Content.ReadFromJsonAsync<ResultadoActualizacionEstadosDto>();
        Assert.True(resultado!.ContratosVencidos >= 1);
        Assert.Equal("VEN", (await Admin.GetFromJsonAsync<ContratoDto>($"/api/contratos/{vigente.Id}"))!.Estado);
        Assert.Equal("DIS", (await ObtenerLocal(local)).Estado);
    }

    [Fact]
    public async Task ActualizarEstados_ComoOperador_Devuelve403()
    {
        var respuesta = await Operador.PostAsync("/api/contratos/actualizar-estados", null);

        Assert.Equal(HttpStatusCode.Forbidden, respuesta.StatusCode);
    }

    // ------------------------------------------------------------------ consultas

    [Fact]
    public async Task Listar_SinToken_Devuelve401()
    {
        var respuesta = await Anonimo.GetAsync("/api/contratos");

        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
    }

    [Fact]
    public async Task Listar_FiltraPorClienteYEstado()
    {
        var (cliente, local1) = await CrearClienteYLocal();
        var (_, local2) = await CrearClienteYLocal();
        await CrearVigente(NuevoContrato(cliente, local1));
        await CrearBorrador(NuevoContrato(cliente, local2));

        var idBorrador = await IdCatalogoEstado("BOR");

        var todos = await Operador.GetFromJsonAsync<PaginadoDto<ContratoDto>>($"/api/contratos?idCliente={cliente}");
        var soloBorradores = await Operador.GetFromJsonAsync<PaginadoDto<ContratoDto>>(
            $"/api/contratos?idCliente={cliente}&idEstado={idBorrador}");
        var delOtroLocal = await Operador.GetFromJsonAsync<PaginadoDto<ContratoDto>>($"/api/contratos?idLocal={local2}");

        Assert.Equal(2, todos!.Total);
        Assert.Contains(todos.Items, c => c.Estado == "VIG");
        Assert.Contains(todos.Items, c => c.Estado == "BOR");
        Assert.Single(soloBorradores!.Items);
        Assert.Equal("BOR", soloBorradores.Items[0].Estado);
        Assert.Single(delOtroLocal!.Items);
    }

    [Fact]
    public async Task Obtener_YCronograma_DeContratoInexistente_Devuelven404()
    {
        Assert.Equal(HttpStatusCode.NotFound, (await Operador.GetAsync("/api/contratos/99999999")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Operador.GetAsync("/api/contratos/99999999/cronograma")).StatusCode);
    }

    [Fact]
    public async Task ContratosDeDemostracion_TienenCronogramaConSaldos()
    {
        var contratoMoroso = (await Operador.GetFromJsonAsync<PaginadoDto<ContratoDto>>("/api/contratos?texto=LOC-004"))!.Items.First();

        var cuotas = await Cronograma(contratoMoroso.Id);

        Assert.NotEmpty(cuotas);
        Assert.Contains(cuotas, c => c.DiasAtraso > 0 && c.Saldo > 0);
        Assert.Contains(cuotas, c => c.Estado == "PAG" && c.Saldo == 0);
    }
}
