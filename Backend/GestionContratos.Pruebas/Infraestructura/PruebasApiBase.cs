using System.Net.Http.Headers;
using System.Net.Http.Json;
using GestionContratos.DTOs.Autenticacion;
using GestionContratos.DTOs.Catalogos;
using GestionContratos.DTOs.Comunes;
using GestionContratos.DTOs.Maestros;

namespace GestionContratos.Pruebas.Infraestructura;

/// <summary>
/// Base de las pruebas de integración de la API: clientes HTTP autenticados como ADMIN y OPERADOR,
/// ids de catálogo y limpieza de los datos creados. Los datos de las pruebas llevan un prefijo propio
/// en el código, así varias clases pueden correr en paralelo sin pisarse.
/// </summary>
public abstract class PruebasApiBase(ApiFactory fabrica) : IClassFixture<ApiFactory>, IAsyncLifetime
{
    protected const string ClaveDemo = "Demo123*";

    /// <summary>Prefijo de los códigos creados por esta clase de pruebas (máx. 7 caracteres).</summary>
    protected string Prefijo { get; } = "ZT" + Guid.NewGuid().ToString("N")[..5];

    protected HttpClient Anonimo { get; private set; } = null!;
    protected HttpClient Admin { get; private set; } = null!;
    protected HttpClient Operador { get; private set; } = null!;

    protected int IdDni { get; private set; }
    protected int IdRuc { get; private set; }
    protected int IdTipoLocal { get; private set; }
    protected int IdEstadoDisponible { get; private set; }
    protected int IdEstadoOcupado { get; private set; }
    protected int IdEstadoMantenimiento { get; private set; }

    /// <summary>Empresa de demostración (EMP001), que ya tiene locales y contratos.</summary>
    protected int IdEmpresaDemo { get; private set; }

    private int _contador;

    public async Task InitializeAsync()
    {
        Anonimo = fabrica.CreateClient();
        Admin = await Autenticar("ADMIN");
        Operador = await Autenticar("OPERADOR");

        IdDni = await IdCatalogo("tipos-documento", "DNI");
        IdRuc = await IdCatalogo("tipos-documento", "RUC");
        IdTipoLocal = await IdCatalogo("tipos-local", "LC");
        IdEstadoDisponible = await IdCatalogo("estados", "DIS");
        IdEstadoOcupado = await IdCatalogo("estados", "OCU");
        IdEstadoMantenimiento = await IdCatalogo("estados", "MAN");

        var empresas = await Admin.GetFromJsonAsync<PaginadoDto<EmpresaDto>>("/api/empresas?texto=EMP001");
        IdEmpresaDemo = empresas!.Items.Single(e => e.Codigo == "EMP001").Id;
    }

    public Task DisposeAsync() => fabrica.LimpiarAsync(Prefijo);

    /// <summary>Código único para un dato de prueba, con el prefijo de la clase.</summary>
    protected string NuevoCodigo(string tipo) => $"{Prefijo}{tipo}{Interlocked.Increment(ref _contador)}";

    protected static string NuevoDni() => Random.Shared.Next(10_000_000, 99_999_999).ToString();

    protected static string NuevoRuc() => "20" + Random.Shared.NextInt64(100_000_000, 999_999_999);

    protected ClienteCrearDto NuevoCliente(string? nombre = null) => new()
    {
        Codigo = NuevoCodigo("C"),
        Nombre = nombre ?? "Cliente de prueba",
        Paterno = "Apellido",
        IdTipoDocumento = IdDni,
        NumeroDocumento = NuevoDni(),
        Correo = "prueba@correo.pe"
    };

    protected EmpresaCrearDto NuevaEmpresa() => new()
    {
        Codigo = NuevoCodigo("E"),
        Nombre = "Empresa de prueba S.A.C.",
        Ruc = NuevoRuc()
    };

    protected LocalCrearDto NuevoLocal(int? idEmpresa = null) => new()
    {
        Codigo = NuevoCodigo("L"),
        IdEmpresa = idEmpresa ?? IdEmpresaDemo,
        IdTipoLocal = IdTipoLocal,
        Direccion = "Calle de prueba 123",
        TotalM2 = 30m
    };

    private async Task<HttpClient> Autenticar(string codigo)
    {
        var cliente = fabrica.CreateClient();
        var respuesta = await cliente.PostAsJsonAsync("/api/auth/login", new LoginSolicitud { Codigo = codigo, Clave = ClaveDemo });
        respuesta.EnsureSuccessStatusCode();
        var login = await respuesta.Content.ReadFromJsonAsync<LoginRespuesta>();
        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", login!.Token);
        return cliente;
    }

    private async Task<int> IdCatalogo(string catalogo, string abreviatura)
    {
        var items = await Admin.GetFromJsonAsync<List<CatalogoItemDto>>($"/api/catalogos/{catalogo}");
        return items!.Single(i => i.Abreviatura == abreviatura).Id;
    }
}
