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
        // Los estados se actualizan solo cuando una prueba lo pide, para que los resultados sean predecibles.
        builder.UseSetting("Contratos:ActualizacionAutomatica", "false");
    }

    /// <summary>
    /// Borra definitivamente los datos que crearon las pruebas: todo lo que cuelga de clientes, locales y
    /// empresas cuyo código empieza con el prefijo (pagos, cronogramas, eventos y contratos incluidos).
    /// </summary>
    public async Task LimpiarAsync(string prefijo)
    {
        const string contratosDePrueba = """
            from tabCONTRATOS c
            where c.IdCliente in (select Id from tabCLIENTES where Codigo like @prefijo)
               or c.IdLocal in (select Id from tabLOCALES where Codigo like @prefijo)
            """;
        var comandos = new[]
        {
            $"delete from tabPAGOS where IdContrato in (select c.Id {contratosDePrueba})",
            $"delete from tabCRONOGRAMA_PAGOS where IdContrato in (select c.Id {contratosDePrueba})",
            $"delete e from tabEVENTOS e where e.Entidad in ('CONTRATO', 'PAGO') and exists (select 1 {contratosDePrueba} and e.Mensaje like '%' + c.Codigo + '%')",
            $"delete from tabCONTRATOS where Id in (select c.Id {contratosDePrueba})",
            "delete from tabLOCALES where Codigo like @prefijo",
            "delete from tabCLIENTES where Codigo like @prefijo",
            "delete from tabEMPRESAS where Codigo like @prefijo"
        };
        foreach (var sql in comandos)
            await EjecutarAsync(sql, ("@prefijo", prefijo + "%"));
    }

    /// <summary>Ejecuta una sentencia SQL directa sobre la BD de pruebas (para preparar o verificar datos).</summary>
    public async Task EjecutarAsync(string sql, params (string Nombre, object Valor)[] parametros)
    {
        await using var conexion = new SqlConnection(_cadenaConexion);
        await conexion.OpenAsync();
        await using var comando = conexion.CreateCommand();
        comando.CommandText = sql;
        foreach (var (nombre, valor) in parametros) comando.Parameters.AddWithValue(nombre, valor);
        await comando.ExecuteNonQueryAsync();
    }

    /// <summary>Devuelve el primer valor de la primera fila de una consulta SQL sobre la BD de pruebas.</summary>
    public async Task<T> EscalarAsync<T>(string sql, params (string Nombre, object Valor)[] parametros)
    {
        await using var conexion = new SqlConnection(_cadenaConexion);
        await conexion.OpenAsync();
        await using var comando = conexion.CreateCommand();
        comando.CommandText = sql;
        foreach (var (nombre, valor) in parametros) comando.Parameters.AddWithValue(nombre, valor);
        return (T)Convert.ChangeType((await comando.ExecuteScalarAsync())!, typeof(T));
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
