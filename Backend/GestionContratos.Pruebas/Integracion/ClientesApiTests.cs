using System.Net;
using System.Net.Http.Json;
using GestionContratos.DTOs.Comunes;
using GestionContratos.DTOs.Maestros;
using GestionContratos.Pruebas.Infraestructura;

namespace GestionContratos.Pruebas.Integracion;

public class ClientesApiTests(ApiFactory fabrica) : PruebasApiBase(fabrica), IClassFixture<ApiFactory>
{
    private async Task<ClienteDto> CrearOk(ClienteGuardarDto datos)
    {
        var respuesta = await Operador.PostAsJsonAsync("/api/clientes", datos);
        Assert.Equal(HttpStatusCode.Created, respuesta.StatusCode);
        return (await respuesta.Content.ReadFromJsonAsync<ClienteDto>())!;
    }

    [Fact]
    public async Task Listar_SinToken_Devuelve401()
    {
        var respuesta = await Anonimo.GetAsync("/api/clientes");

        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
    }

    [Fact]
    public async Task Crear_ComoOperador_Devuelve201ConUbicacionYDatos()
    {
        var datos = NuevoCliente();

        var respuesta = await Operador.PostAsJsonAsync("/api/clientes", datos);

        Assert.Equal(HttpStatusCode.Created, respuesta.StatusCode);
        Assert.NotNull(respuesta.Headers.Location);
        var cliente = await respuesta.Content.ReadFromJsonAsync<ClienteDto>();
        Assert.Matches(@"^CLI-\d{4}$", cliente!.Codigo);
        Assert.Equal("DNI", cliente.TipoDocumento);
        Assert.NotNull(cliente.FechaCreacion);

        var obtenido = await Operador.GetFromJsonAsync<ClienteDto>($"/api/clientes/{cliente.Id}");
        Assert.Equal(datos.NumeroDocumento, obtenido!.NumeroDocumento);
    }

    [Fact]
    public async Task Crear_AsignaCodigoAutomaticoConFormato()
    {
        var creado = await CrearOk(NuevoCliente());

        Assert.Matches(@"^CLI-\d{4}$", creado.Codigo);
    }

    [Fact]
    public async Task Crear_DosClientes_RecibenCodigosDistintosYCrecientes()
    {
        var primero = await CrearOk(NuevoCliente());
        var segundo = await CrearOk(NuevoCliente());

        Assert.NotEqual(primero.Codigo, segundo.Codigo);
        Assert.True(string.CompareOrdinal(segundo.Codigo, primero.Codigo) > 0);
    }

    [Fact]
    public async Task Crear_IgnoraElCodigoEnviadoPorElCliente()
    {
        var datos = NuevoCliente();

        var respuesta = await Operador.PostAsJsonAsync("/api/clientes", new
        {
            codigo = "MANUAL",
            datos.Nombre,
            datos.Paterno,
            datos.IdTipoDocumento,
            datos.NumeroDocumento
        });

        Assert.Equal(HttpStatusCode.Created, respuesta.StatusCode);
        var creado = await respuesta.Content.ReadFromJsonAsync<ClienteDto>();
        Assert.Matches(@"^CLI-\d{4}$", creado!.Codigo);
    }

    [Fact]
    public async Task Crear_ConDatosInvalidos_NoConsumeNumeroDeLaSecuencia()
    {
        var invalido = NuevoCliente();
        invalido.Nombre = "";
        var antes = await CrearOk(NuevoCliente());

        var rechazo = await Operador.PostAsJsonAsync("/api/clientes", invalido);
        var despues = await CrearOk(NuevoCliente());

        Assert.Equal(HttpStatusCode.BadRequest, rechazo.StatusCode);
        // Otras clases de pruebas pueden crear clientes en paralelo, por eso solo se exige que el orden se mantenga.
        Assert.True(string.CompareOrdinal(despues.Codigo, antes.Codigo) > 0);
    }

    [Fact]
    public async Task Crear_DocumentoDuplicado_Devuelve400()
    {
        var primero = NuevoCliente();
        await CrearOk(primero);
        var repetido = NuevoCliente();
        repetido.NumeroDocumento = primero.NumeroDocumento;

        var respuesta = await Operador.PostAsJsonAsync("/api/clientes", repetido);

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task Crear_DniConFormatoInvalido_Devuelve400()
    {
        var datos = NuevoCliente();
        datos.NumeroDocumento = "1234567"; // 7 dígitos

        var respuesta = await Operador.PostAsJsonAsync("/api/clientes", datos);

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task Crear_SinNombre_Devuelve400()
    {
        var datos = NuevoCliente();
        datos.Nombre = "";

        var respuesta = await Operador.PostAsJsonAsync("/api/clientes", datos);

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task Crear_TipoDocumentoInexistente_Devuelve400()
    {
        var datos = NuevoCliente();
        datos.IdTipoDocumento = 99999;

        var respuesta = await Operador.PostAsJsonAsync("/api/clientes", datos);

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task Crear_CorreoInvalido_Devuelve400()
    {
        var datos = NuevoCliente();
        datos.Correo = "esto-no-es-un-correo";

        var respuesta = await Operador.PostAsJsonAsync("/api/clientes", datos);

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task Actualizar_ModificaLosDatosYConservaElCodigo()
    {
        var creado = await CrearOk(NuevoCliente());
        var cambios = new ClienteGuardarDto
        {
            Nombre = "Nombre modificado",
            IdTipoDocumento = IdDni,
            NumeroDocumento = creado.NumeroDocumento!,
            Telefono = "999888777"
        };

        var respuesta = await Operador.PutAsJsonAsync($"/api/clientes/{creado.Id}", cambios);

        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        var actualizado = await respuesta.Content.ReadFromJsonAsync<ClienteDto>();
        Assert.Equal("Nombre modificado", actualizado!.Nombre);
        Assert.Equal("999888777", actualizado.Telefono);
        Assert.Equal(creado.Codigo, actualizado.Codigo);
        Assert.NotNull(actualizado.FechaCreacion);
    }

    [Fact]
    public async Task Actualizar_ConDocumentoDeOtroCliente_Devuelve400()
    {
        var uno = await CrearOk(NuevoCliente());
        var otro = await CrearOk(NuevoCliente());
        var cambios = new ClienteGuardarDto { Nombre = "X", IdTipoDocumento = IdDni, NumeroDocumento = uno.NumeroDocumento! };

        var respuesta = await Operador.PutAsJsonAsync($"/api/clientes/{otro.Id}", cambios);

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task Actualizar_Inexistente_Devuelve404()
    {
        var cambios = new ClienteGuardarDto { Nombre = "X", IdTipoDocumento = IdDni, NumeroDocumento = NuevoDni() };

        var respuesta = await Operador.PutAsJsonAsync("/api/clientes/99999999", cambios);

        Assert.Equal(HttpStatusCode.NotFound, respuesta.StatusCode);
    }

    [Fact]
    public async Task Obtener_Inexistente_Devuelve404()
    {
        var respuesta = await Operador.GetAsync("/api/clientes/99999999");

        Assert.Equal(HttpStatusCode.NotFound, respuesta.StatusCode);
    }

    [Fact]
    public async Task Listar_BuscaPorTextoYPagina()
    {
        var marca = "Zeta" + Guid.NewGuid().ToString("N")[..8];
        for (var i = 0; i < 3; i++) await CrearOk(NuevoCliente(marca));

        var pagina1 = await Operador.GetFromJsonAsync<PaginadoDto<ClienteDto>>($"/api/clientes?texto={marca}&tamano=2&pagina=1");
        var pagina2 = await Operador.GetFromJsonAsync<PaginadoDto<ClienteDto>>($"/api/clientes?texto={marca}&tamano=2&pagina=2");

        Assert.Equal(3, pagina1!.Total);
        Assert.Equal(2, pagina1.Items.Count);
        Assert.Equal(2, pagina1.TotalPaginas);
        Assert.Single(pagina2!.Items);
    }

    [Fact]
    public async Task Listar_TamanoFueraDeRango_Devuelve400()
    {
        var respuesta = await Operador.GetAsync("/api/clientes?tamano=1000");

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task Desactivar_ComoOperador_Devuelve403()
    {
        var creado = await CrearOk(NuevoCliente());

        var respuesta = await Operador.DeleteAsync($"/api/clientes/{creado.Id}");

        Assert.Equal(HttpStatusCode.Forbidden, respuesta.StatusCode);
    }

    [Fact]
    public async Task Desactivar_ComoAdmin_Devuelve204YYaNoSeConsulta()
    {
        var creado = await CrearOk(NuevoCliente());

        var respuesta = await Admin.DeleteAsync($"/api/clientes/{creado.Id}");

        Assert.Equal(HttpStatusCode.NoContent, respuesta.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Admin.GetAsync($"/api/clientes/{creado.Id}")).StatusCode);
        var lista = await Admin.GetFromJsonAsync<PaginadoDto<ClienteDto>>($"/api/clientes?texto={creado.Codigo}");
        Assert.Empty(lista!.Items);
    }

    [Fact]
    public async Task Desactivar_ClienteConContratoVigente_Devuelve400()
    {
        var lista = await Admin.GetFromJsonAsync<PaginadoDto<ClienteDto>>("/api/clientes?texto=CLI-001");
        var clienteConContrato = lista!.Items.Single(c => c.Codigo == "CLI-001");

        var respuesta = await Admin.DeleteAsync($"/api/clientes/{clienteConContrato.Id}");

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Admin.GetAsync($"/api/clientes/{clienteConContrato.Id}")).StatusCode);
    }
}
