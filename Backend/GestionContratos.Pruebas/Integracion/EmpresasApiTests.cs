using System.Net;
using System.Net.Http.Json;
using GestionContratos.DTOs.Comunes;
using GestionContratos.DTOs.Maestros;
using GestionContratos.Pruebas.Infraestructura;

namespace GestionContratos.Pruebas.Integracion;

public class EmpresasApiTests(ApiFactory fabrica) : PruebasApiBase(fabrica), IClassFixture<ApiFactory>
{
    private async Task<EmpresaDto> CrearOk(EmpresaGuardarDto datos)
    {
        var respuesta = await Admin.PostAsJsonAsync("/api/empresas", datos);
        Assert.Equal(HttpStatusCode.Created, respuesta.StatusCode);
        return (await respuesta.Content.ReadFromJsonAsync<EmpresaDto>())!;
    }

    [Fact]
    public async Task Listar_ComoOperador_Devuelve200()
    {
        var lista = await Operador.GetFromJsonAsync<PaginadoDto<EmpresaDto>>("/api/empresas");

        Assert.Contains(lista!.Items, e => e.Codigo == "EMP001");
    }

    [Fact]
    public async Task Crear_ComoOperador_Devuelve403()
    {
        var respuesta = await Operador.PostAsJsonAsync("/api/empresas", NuevaEmpresa());

        Assert.Equal(HttpStatusCode.Forbidden, respuesta.StatusCode);
    }

    [Fact]
    public async Task Crear_ComoAdmin_Devuelve201()
    {
        var datos = NuevaEmpresa();

        var creada = await CrearOk(datos);

        Assert.Matches(@"^EMP-\d{4}$", creada.Codigo);
        Assert.Equal(datos.Ruc, creada.Ruc);
    }

    [Fact]
    public async Task Crear_DosEmpresas_RecibenCodigosDistintosYCrecientes()
    {
        var primera = await CrearOk(NuevaEmpresa());
        var segunda = await CrearOk(NuevaEmpresa());

        Assert.NotEqual(primera.Codigo, segunda.Codigo);
        Assert.True(string.CompareOrdinal(segunda.Codigo, primera.Codigo) > 0);
    }

    [Fact]
    public async Task Crear_IgnoraElCodigoEnviadoPorElCliente()
    {
        var datos = NuevaEmpresa();

        var respuesta = await Admin.PostAsJsonAsync("/api/empresas", new { codigo = "MANUAL", datos.Nombre, datos.Ruc });

        Assert.Equal(HttpStatusCode.Created, respuesta.StatusCode);
        var creada = await respuesta.Content.ReadFromJsonAsync<EmpresaDto>();
        Assert.Matches(@"^EMP-\d{4}$", creada!.Codigo);
    }

    [Fact]
    public async Task Actualizar_ConservaElCodigoGenerado()
    {
        var creada = await CrearOk(NuevaEmpresa());

        var respuesta = await Admin.PutAsJsonAsync($"/api/empresas/{creada.Id}", new { codigo = "OTRO", Nombre = "Otro nombre", Ruc = creada.Ruc });

        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        var actualizada = await respuesta.Content.ReadFromJsonAsync<EmpresaDto>();
        Assert.Equal(creada.Codigo, actualizada!.Codigo);
    }

    [Theory]
    [InlineData("123")]
    [InlineData("30123456789")]
    [InlineData("2012345678A")]
    public async Task Crear_RucInvalido_Devuelve400(string ruc)
    {
        var datos = NuevaEmpresa();
        datos.Ruc = ruc;

        var respuesta = await Admin.PostAsJsonAsync("/api/empresas", datos);

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task Crear_RucDeOtraEmpresa_Devuelve400()
    {
        var datos = NuevaEmpresa();
        datos.Ruc = "20512345678"; // RUC de la empresa de demostración

        var respuesta = await Admin.PostAsJsonAsync("/api/empresas", datos);

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task Actualizar_ComoAdmin_ModificaLosDatos()
    {
        var creada = await CrearOk(NuevaEmpresa());
        var cambios = new EmpresaGuardarDto { Nombre = "Razón social nueva", Ruc = creada.Ruc!, NombreContacto = "Persona de contacto" };

        var respuesta = await Admin.PutAsJsonAsync($"/api/empresas/{creada.Id}", cambios);

        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        var actualizada = await respuesta.Content.ReadFromJsonAsync<EmpresaDto>();
        Assert.Equal("Razón social nueva", actualizada!.Nombre);
        Assert.Equal("Persona de contacto", actualizada.NombreContacto);
    }

    [Fact]
    public async Task Actualizar_ComoOperador_Devuelve403()
    {
        var creada = await CrearOk(NuevaEmpresa());
        var cambios = new EmpresaGuardarDto { Nombre = "X", Ruc = creada.Ruc! };

        var respuesta = await Operador.PutAsJsonAsync($"/api/empresas/{creada.Id}", cambios);

        Assert.Equal(HttpStatusCode.Forbidden, respuesta.StatusCode);
    }

    [Fact]
    public async Task Desactivar_EmpresaConLocales_Devuelve400()
    {
        var respuesta = await Admin.DeleteAsync($"/api/empresas/{IdEmpresaDemo}");

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Admin.GetAsync($"/api/empresas/{IdEmpresaDemo}")).StatusCode);
    }

    [Fact]
    public async Task Desactivar_EmpresaSinLocales_Devuelve204()
    {
        var creada = await CrearOk(NuevaEmpresa());

        var respuesta = await Admin.DeleteAsync($"/api/empresas/{creada.Id}");

        Assert.Equal(HttpStatusCode.NoContent, respuesta.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Admin.GetAsync($"/api/empresas/{creada.Id}")).StatusCode);
    }

    [Fact]
    public async Task Desactivar_ComoOperador_Devuelve403()
    {
        var creada = await CrearOk(NuevaEmpresa());

        var respuesta = await Operador.DeleteAsync($"/api/empresas/{creada.Id}");

        Assert.Equal(HttpStatusCode.Forbidden, respuesta.StatusCode);
    }
}
