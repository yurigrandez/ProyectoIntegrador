using GestionContratos.Datos.Repositorios;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace GestionContratos.Datos;

public static class ConfiguracionDatos
{
    public const string NombreCadenaConexion = "GestionContratos";

    /// <summary>
    /// Registra el DbContext y la unidad de trabajo. La cadena de conexión NO está en el repositorio:
    /// se lee de ConnectionStrings:GestionContratos (user-secrets en desarrollo,
    /// variable de entorno ConnectionStrings__GestionContratos en los demás ambientes).
    /// </summary>
    public static IServiceCollection AgregarDatos(this IServiceCollection servicios, IConfiguration configuracion)
    {
        var cadena = configuracion.GetConnectionString(NombreCadenaConexion);
        if (string.IsNullOrWhiteSpace(cadena))
        {
            throw new InvalidOperationException(
                $"Falta la cadena de conexión 'ConnectionStrings:{NombreCadenaConexion}'. " +
                "En desarrollo use: dotnet user-secrets set \"ConnectionStrings:GestionContratos\" \"<cadena>\" " +
                "--project GestionContratos.API. En otros ambientes defina la variable de entorno " +
                "ConnectionStrings__GestionContratos. Ver docs/Configuracion.md.");
        }

        servicios.AddDbContext<GestionContratosDbContext>(o => o.UseSqlServer(cadena));
        servicios.AddScoped<IUnidadTrabajo, UnidadTrabajo>();
        return servicios;
    }
}
