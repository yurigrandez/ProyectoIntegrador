using GestionContratos.Comun.Configuracion;
using GestionContratos.Negocio.Autenticacion;
using GestionContratos.Negocio.Catalogos;
using GestionContratos.Negocio.Maestros;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace GestionContratos.Negocio;

public static class ConfiguracionNegocio
{
    /// <summary>Registra los servicios de negocio. Jwt:Key es un secreto (user-secrets o variable Jwt__Key).</summary>
    public static IServiceCollection AgregarNegocio(this IServiceCollection servicios, IConfiguration configuracion)
    {
        servicios.Configure<JwtOpciones>(configuracion.GetSection(JwtOpciones.Seccion));

        servicios.AddSingleton<IHasherClave, HasherClave>();
        servicios.AddSingleton<IGeneradorToken, GeneradorToken>();
        servicios.AddScoped<IAuthServicio, AuthServicio>();
        servicios.AddScoped<ICatalogosServicio, CatalogosServicio>();
        servicios.AddScoped<IEmpresasServicio, EmpresasServicio>();
        servicios.AddScoped<ILocalesServicio, LocalesServicio>();
        servicios.AddScoped<IClientesServicio, ClientesServicio>();
        return servicios;
    }
}
