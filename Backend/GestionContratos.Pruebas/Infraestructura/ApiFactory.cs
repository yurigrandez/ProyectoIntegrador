using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;

namespace GestionContratos.Pruebas.Infraestructura;

/// <summary>
/// Levanta la API completa contra la base de datos de PRUEBAS (SQL Server local, no en memoria).
/// La cadena de conexión no está en el repositorio: se lee de user-secrets de este proyecto
/// (ConnectionStrings:GestionContratosPruebas) o de la variable de entorno
/// ConnectionStrings__GestionContratosPruebas. Ver docs/Configuracion.md.
/// </summary>
public class ApiFactory : WebApplicationFactory<Program>
{
    // Clave de firma solo para pruebas: no es un secreto real.
    private const string JwtKeyPruebas = "clave-solo-para-pruebas-automaticas-0123456789";

    private readonly string _cadenaConexion = ObtenerCadenaPruebas();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Entorno "Testing": la API no carga los user-secrets de desarrollo (ni su BD).
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:GestionContratos", _cadenaConexion);
        builder.UseSetting("Jwt:Key", JwtKeyPruebas);
    }

    /// <summary>
    /// Borra definitivamente los datos que crearon las pruebas (códigos que empiezan con el prefijo).
    /// Orden: primero locales, luego clientes y empresas, por las llaves foráneas.
    /// </summary>
    public async Task LimpiarAsync(string prefijo)
    {
        await using var conexion = new SqlConnection(_cadenaConexion);
        await conexion.OpenAsync();
        foreach (var tabla in new[] { "tabLOCALES", "tabCLIENTES", "tabEMPRESAS" })
        {
            await using var comando = conexion.CreateCommand();
            comando.CommandText = $"delete from {tabla} where Codigo like @prefijo";
            comando.Parameters.AddWithValue("@prefijo", prefijo + "%");
            await comando.ExecuteNonQueryAsync();
        }
    }

    private static string ObtenerCadenaPruebas()
    {
        var configuracion = new ConfigurationBuilder()
            .AddUserSecrets<ApiFactory>(optional: true)
            .AddEnvironmentVariables()
            .Build();

        var cadena = configuracion.GetConnectionString("GestionContratosPruebas");
        if (string.IsNullOrWhiteSpace(cadena))
        {
            throw new InvalidOperationException(
                "Falta la cadena de conexión de pruebas. Cree la BD con " +
                "'sqlcmd -S localhost -f 65001 -b -v NombreBD=dbALQUILERES_TEST -i Instalar.sql' (carpeta ScriptBD) y use: " +
                "dotnet user-secrets set \"ConnectionStrings:GestionContratosPruebas\" \"<cadena>\" " +
                "--project GestionContratos.Pruebas. Ver docs/Configuracion.md.");
        }

        // Protección: las pruebas escriben y borran datos; nunca deben apuntar a la BD de desarrollo.
        var bd = new SqlConnectionStringBuilder(cadena).InitialCatalog;
        if (!bd.EndsWith("_TEST", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException($"La BD de pruebas debe terminar en '_TEST' (actual: '{bd}').");

        return cadena;
    }
}
