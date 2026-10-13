using System.Net;
using GestionContratos.Pruebas.Infraestructura;
using Microsoft.AspNetCore.Hosting;

namespace GestionContratos.Pruebas.Integracion;

/// <summary>La API sirve la web compilada cuando existe en wwwroot (instalación en IIS).</summary>
public class HospedajeWebTests : IClassFixture<HospedajeWebTests.ApiConWeb>, IDisposable
{
    public class ApiConWeb : ApiFactory
    {
        public string CarpetaWeb { get; } = Path.Combine(Path.GetTempPath(), "gc-web-" + Guid.NewGuid().ToString("N")[..8]);

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            Directory.CreateDirectory(Path.Combine(CarpetaWeb, "assets"));
            File.WriteAllText(Path.Combine(CarpetaWeb, "index.html"), "<html><body><gc-root>PAGINA-INICIO</gc-root></body></html>");
            File.WriteAllText(Path.Combine(CarpetaWeb, "assets", "app-ABC123.js"), "console.log('app');");
            base.ConfigureWebHost(builder);
            builder.UseSetting("Web:Carpeta", CarpetaWeb);
        }

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            if (disposing && Directory.Exists(CarpetaWeb)) Directory.Delete(CarpetaWeb, recursive: true);
        }
    }

    private readonly HttpClient _cliente;

    public HospedajeWebTests(ApiConWeb fabrica) => _cliente = fabrica.CreateClient();

    public void Dispose() => _cliente.Dispose();

    [Fact]
    public async Task LaRaizDevuelveLaPaginaDeInicioSinCache()
    {
        var respuesta = await _cliente.GetAsync("/");

        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        Assert.Contains("PAGINA-INICIO", await respuesta.Content.ReadAsStringAsync());
        Assert.Equal("no-cache", respuesta.Headers.CacheControl?.ToString());
    }

    [Theory]
    [InlineData("/contratos/4")]
    [InlineData("/panel")]
    [InlineData("/clientes/nuevo")]
    public async Task LasRutasDeLaWebDevuelvenLaPaginaDeInicioAlRecargar(string ruta)
    {
        var respuesta = await _cliente.GetAsync(ruta);

        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        Assert.Contains("PAGINA-INICIO", await respuesta.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task LosArchivosDeLaWebSeSirvenTalCual()
    {
        var respuesta = await _cliente.GetAsync("/assets/app-ABC123.js");

        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        Assert.Contains("console.log", await respuesta.Content.ReadAsStringAsync());
        Assert.NotEqual("no-cache", respuesta.Headers.CacheControl?.ToString());
    }

    [Theory]
    [InlineData("/api/no-existe")]
    [InlineData("/api/auth/no-existe")]
    [InlineData("/api")]
    public async Task UnaRutaDeApiInexistenteDevuelve404ENuncaLaPagina(string ruta)
    {
        var respuesta = await _cliente.GetAsync(ruta);

        Assert.Equal(HttpStatusCode.NotFound, respuesta.StatusCode);
        Assert.DoesNotContain("PAGINA-INICIO", await respuesta.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task LaApiSigueFuncionandoJuntoALaWeb()
    {
        var salud = await _cliente.GetAsync("/api/salud");
        var protegida = await _cliente.GetAsync("/api/clientes");

        Assert.Equal(HttpStatusCode.OK, salud.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, protegida.StatusCode);
    }
}
