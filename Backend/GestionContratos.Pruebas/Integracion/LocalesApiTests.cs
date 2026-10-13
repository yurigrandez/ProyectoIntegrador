using System.Net;
using System.Net.Http.Json;
using GestionContratos.DTOs.Comunes;
using GestionContratos.DTOs.Maestros;
using GestionContratos.Pruebas.Infraestructura;

namespace GestionContratos.Pruebas.Integracion;

public class LocalesApiTests(ApiFactory fabrica) : PruebasApiBase(fabrica), IClassFixture<ApiFactory>
{
    private async Task<LocalDto> CrearOk(LocalCrearDto datos)
    {
        var respuesta = await Admin.PostAsJsonAsync("/api/locales", datos);
        Assert.Equal(HttpStatusCode.Created, respuesta.StatusCode);
        return (await respuesta.Content.ReadFromJsonAsync<LocalDto>())!;
    }

    private async Task<LocalDto> LocalDemo(string codigo)
    {
        var lista = await Admin.GetFromJsonAsync<PaginadoDto<LocalDto>>($"/api/locales?texto={codigo}");
        return lista!.Items.Single(l => l.Codigo == codigo);
    }

    [Fact]
    public async Task Crear_ComoAdmin_QuedaDisponibleYMuestraEmpresaYTipo()
    {
        var datos = NuevoLocal();

        var creado = await CrearOk(datos);

        Assert.Equal("DIS", creado.Estado);
        Assert.Equal("LC", creado.TipoLocal);
        Assert.Equal("Inversiones Andina S.A.C.", creado.Empresa);
        Assert.Equal(30m, creado.TotalM2);
    }

    [Fact]
    public async Task Crear_ComoOperador_Devuelve403()
    {
        var respuesta = await Operador.PostAsJsonAsync("/api/locales", NuevoLocal());

        Assert.Equal(HttpStatusCode.Forbidden, respuesta.StatusCode);
    }

    [Fact]
    public async Task Crear_EnMantenimiento_Devuelve201()
    {
        var datos = NuevoLocal();
        datos.IdEstado = IdEstadoMantenimiento;

        var creado = await CrearOk(datos);

        Assert.Equal("MAN", creado.Estado);
    }

    [Fact]
    public async Task Crear_ComoOcupado_Devuelve400()
    {
        var datos = NuevoLocal();
        datos.IdEstado = IdEstadoOcupado;

        var respuesta = await Admin.PostAsJsonAsync("/api/locales", datos);

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task Crear_EmpresaInexistente_Devuelve400()
    {
        var datos = NuevoLocal(idEmpresa: 99999);

        var respuesta = await Admin.PostAsJsonAsync("/api/locales", datos);

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task Crear_CodigoDuplicado_Devuelve400()
    {
        var datos = NuevoLocal();
        await CrearOk(datos);

        var respuesta = await Admin.PostAsJsonAsync("/api/locales", datos);

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    public async Task Crear_SuperficieNoPositiva_Devuelve400(double metros)
    {
        var datos = NuevoLocal();
        datos.TotalM2 = (decimal)metros;

        var respuesta = await Admin.PostAsJsonAsync("/api/locales", datos);

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task Actualizar_CambiaDireccionYEstado()
    {
        var creado = await CrearOk(NuevoLocal());
        var cambios = new LocalGuardarDto
        {
            IdEmpresa = creado.IdEmpresa,
            IdTipoLocal = creado.IdTipoLocal,
            Direccion = "Dirección nueva 456",
            TotalM2 = 55.5m,
            IdEstado = IdEstadoMantenimiento
        };

        var respuesta = await Admin.PutAsJsonAsync($"/api/locales/{creado.Id}", cambios);

        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        var actualizado = await respuesta.Content.ReadFromJsonAsync<LocalDto>();
        Assert.Equal("Dirección nueva 456", actualizado!.Direccion);
        Assert.Equal("MAN", actualizado.Estado);
        Assert.Equal(creado.Codigo, actualizado.Codigo);
    }

    [Fact]
    public async Task Actualizar_SinIndicarEstado_ConservaElActual()
    {
        var datos = NuevoLocal();
        datos.IdEstado = IdEstadoMantenimiento;
        var creado = await CrearOk(datos);
        var cambios = new LocalGuardarDto { IdEmpresa = creado.IdEmpresa, IdTipoLocal = creado.IdTipoLocal, Direccion = "Otra" };

        var actualizado = await (await Admin.PutAsJsonAsync($"/api/locales/{creado.Id}", cambios))
            .Content.ReadFromJsonAsync<LocalDto>();

        Assert.Equal("MAN", actualizado!.Estado);
    }

    [Fact]
    public async Task Actualizar_CambiarEstadoDeLocalOcupado_Devuelve400()
    {
        var ocupado = await LocalDemo("LOC-001");
        Assert.Equal("OCU", ocupado.Estado);
        var cambios = new LocalGuardarDto
        {
            IdEmpresa = ocupado.IdEmpresa,
            IdTipoLocal = ocupado.IdTipoLocal,
            IdEstado = IdEstadoMantenimiento
        };

        var respuesta = await Admin.PutAsJsonAsync($"/api/locales/{ocupado.Id}", cambios);

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
        Assert.Equal("OCU", (await LocalDemo("LOC-001")).Estado);
    }

    [Fact]
    public async Task Listar_FiltraPorEmpresaYEstado()
    {
        var lista = await Operador.GetFromJsonAsync<PaginadoDto<LocalDto>>(
            $"/api/locales?idEmpresa={IdEmpresaDemo}&idEstado={IdEstadoOcupado}&tamano=100");

        Assert.NotEmpty(lista!.Items);
        Assert.All(lista.Items, l =>
        {
            Assert.Equal("OCU", l.Estado);
            Assert.Equal(IdEmpresaDemo, l.IdEmpresa);
        });
    }

    [Fact]
    public async Task Obtener_Inexistente_Devuelve404()
    {
        var respuesta = await Operador.GetAsync("/api/locales/99999999");

        Assert.Equal(HttpStatusCode.NotFound, respuesta.StatusCode);
    }

    [Fact]
    public async Task Desactivar_LocalOcupado_Devuelve400()
    {
        var ocupado = await LocalDemo("LOC-001");

        var respuesta = await Admin.DeleteAsync($"/api/locales/{ocupado.Id}");

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Admin.GetAsync($"/api/locales/{ocupado.Id}")).StatusCode);
    }

    [Fact]
    public async Task Desactivar_LocalLibre_Devuelve204()
    {
        var creado = await CrearOk(NuevoLocal());

        var respuesta = await Admin.DeleteAsync($"/api/locales/{creado.Id}");

        Assert.Equal(HttpStatusCode.NoContent, respuesta.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Admin.GetAsync($"/api/locales/{creado.Id}")).StatusCode);
    }

    [Fact]
    public async Task Desactivar_ComoOperador_Devuelve403()
    {
        var creado = await CrearOk(NuevoLocal());

        var respuesta = await Operador.DeleteAsync($"/api/locales/{creado.Id}");

        Assert.Equal(HttpStatusCode.Forbidden, respuesta.StatusCode);
    }
}
