using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using GestionContratos.DTOs.Autenticacion;
using GestionContratos.Pruebas.Infraestructura;

namespace GestionContratos.Pruebas.Integracion;

public class AuthIntegracionTests(ApiFactory fabrica) : IClassFixture<ApiFactory>
{
    private const string ClaveDemo = "Demo123*";
    private readonly HttpClient _cliente = fabrica.CreateClient();

    private Task<HttpResponseMessage> Login(string codigo, string clave) =>
        _cliente.PostAsJsonAsync("/api/auth/login", new LoginSolicitud { Codigo = codigo, Clave = clave });

    [Fact]
    public async Task Salud_ConectaConLaBaseDeDatos()
    {
        var respuesta = await _cliente.GetAsync("/api/salud");

        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
    }

    [Fact]
    public async Task Login_CredencialesCorrectas_DevuelveTokenYRol()
    {
        var respuesta = await Login("ADMIN", ClaveDemo);

        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        var cuerpo = await respuesta.Content.ReadFromJsonAsync<LoginRespuesta>();
        Assert.NotNull(cuerpo);
        Assert.False(string.IsNullOrWhiteSpace(cuerpo.Token));
        Assert.Equal("ADM", cuerpo.Usuario.Rol);
        Assert.True(cuerpo.Expira > DateTime.UtcNow);
    }

    [Fact]
    public async Task Login_ClaveIncorrecta_Devuelve401()
    {
        var respuesta = await Login("ADMIN", "clave-equivocada");

        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
    }

    [Fact]
    public async Task Login_UsuarioInexistente_Devuelve401()
    {
        var respuesta = await Login("NOEXISTE", ClaveDemo);

        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
    }

    [Fact]
    public async Task Login_SinDatos_Devuelve400()
    {
        var respuesta = await Login("", "");

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task Yo_SinToken_Devuelve401()
    {
        var respuesta = await _cliente.GetAsync("/api/auth/yo");

        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
    }

    [Fact]
    public async Task Yo_ConToken_DevuelveElUsuarioAutenticado()
    {
        var login = await (await Login("OPERADOR", ClaveDemo)).Content.ReadFromJsonAsync<LoginRespuesta>();
        using var solicitud = new HttpRequestMessage(HttpMethod.Get, "/api/auth/yo");
        solicitud.Headers.Authorization = new AuthenticationHeaderValue("Bearer", login!.Token);

        var respuesta = await _cliente.SendAsync(solicitud);

        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        var usuario = await respuesta.Content.ReadFromJsonAsync<UsuarioSesion>();
        Assert.Equal("OPERADOR", usuario!.Codigo);
        Assert.Equal("OPE", usuario.Rol);
    }

    [Fact]
    public async Task Yo_ConTokenManipulado_Devuelve401()
    {
        var login = await (await Login("ADMIN", ClaveDemo)).Content.ReadFromJsonAsync<LoginRespuesta>();
        using var solicitud = new HttpRequestMessage(HttpMethod.Get, "/api/auth/yo");
        solicitud.Headers.Authorization = new AuthenticationHeaderValue("Bearer", login!.Token + "x");

        var respuesta = await _cliente.SendAsync(solicitud);

        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
    }
}
