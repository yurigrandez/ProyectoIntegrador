using System.Net;
using System.Net.Http.Json;
using GestionContratos.DTOs.Catalogos;
using GestionContratos.Pruebas.Infraestructura;

namespace GestionContratos.Pruebas.Integracion;

public class CatalogosApiTests(ApiFactory fabrica) : PruebasApiBase(fabrica), IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Listar_SinToken_Devuelve401()
    {
        var respuesta = await Anonimo.GetAsync("/api/catalogos/monedas");

        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
    }

    [Fact]
    public async Task TiposDocumento_IncluyeDniYRuc()
    {
        var items = await Operador.GetFromJsonAsync<List<CatalogoItemDto>>("/api/catalogos/tipos-documento");

        Assert.Contains(items!, i => i.Abreviatura == "DNI");
        Assert.Contains(items!, i => i.Abreviatura == "RUC");
    }

    [Fact]
    public async Task Monedas_IncluyeSoles()
    {
        var items = await Operador.GetFromJsonAsync<List<CatalogoItemDto>>("/api/catalogos/monedas");

        Assert.Contains(items!, i => i.Abreviatura == "PEN");
    }

    [Theory]
    [InlineData("tipos-comprobante")]
    [InlineData("tipos-local")]
    [InlineData("medios-pago")]
    [InlineData("conceptos")]
    [InlineData("estados")]
    [InlineData("tipos-incidencia")]
    public async Task CatalogosDisponibles_DevuelvenElementos(string nombre)
    {
        var items = await Operador.GetFromJsonAsync<List<CatalogoItemDto>>($"/api/catalogos/{nombre}");

        Assert.NotEmpty(items!);
    }

    [Fact]
    public async Task Nombres_ListaLosCatalogos()
    {
        var nombres = await Operador.GetFromJsonAsync<List<string>>("/api/catalogos");

        Assert.Contains("monedas", nombres!);
        Assert.Contains("estados", nombres!);
    }

    [Fact]
    public async Task CatalogoInexistente_Devuelve404()
    {
        var respuesta = await Operador.GetAsync("/api/catalogos/no-existe");

        Assert.Equal(HttpStatusCode.NotFound, respuesta.StatusCode);
    }
}
