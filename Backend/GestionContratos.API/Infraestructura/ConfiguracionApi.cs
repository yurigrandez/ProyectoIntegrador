using System.Security.Claims;
using System.Text;
using GestionContratos.Comun.Configuracion;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;

namespace GestionContratos.API.Infraestructura;

public static class ConfiguracionApi
{
    public const string PoliticaCors = "Angular";
    private const int LongitudMinimaKey = 32;

    public static IServiceCollection AgregarAutenticacionJwt(this IServiceCollection servicios, IConfiguration configuracion)
    {
        var jwt = configuracion.GetSection(JwtOpciones.Seccion).Get<JwtOpciones>() ?? new JwtOpciones();
        if (string.IsNullOrWhiteSpace(jwt.Key) || jwt.Key.Length < LongitudMinimaKey)
        {
            throw new InvalidOperationException(
                $"Falta 'Jwt:Key' o tiene menos de {LongitudMinimaKey} caracteres. En desarrollo use: " +
                "dotnet user-secrets set \"Jwt:Key\" \"<clave aleatoria>\" --project GestionContratos.API. " +
                "En otros ambientes defina la variable de entorno Jwt__Key. Ver docs/Configuracion.md.");
        }

        servicios.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(o =>
            {
                o.MapInboundClaims = false; // se conservan los nombres de claim del token (sub, codigo...)
                o.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwt.Emisor,
                    ValidateAudience = true,
                    ValidAudience = jwt.Audiencia,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
                    ClockSkew = TimeSpan.FromMinutes(1),
                    NameClaimType = "codigo",
                    RoleClaimType = ClaimTypes.Role
                };
            });
        servicios.AddAuthorization();
        return servicios;
    }

    public static IServiceCollection AgregarOpenApiConJwt(this IServiceCollection servicios)
    {
        servicios.AddOpenApi(o => o.AddDocumentTransformer((documento, _, _) =>
        {
            documento.Components ??= new OpenApiComponents();
            documento.Components.SecuritySchemes = new Dictionary<string, IOpenApiSecurityScheme>
            {
                ["Bearer"] = new OpenApiSecurityScheme
                {
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                    Description = "Token obtenido en POST /api/auth/login"
                }
            };
            documento.Security =
            [
                new OpenApiSecurityRequirement { [new OpenApiSecuritySchemeReference("Bearer", documento)] = [] }
            ];
            return Task.CompletedTask;
        }));
        return servicios;
    }

    /// <summary>Orígenes permitidos en Cors:Origenes (por defecto, el servidor de desarrollo de Angular).</summary>
    public static IServiceCollection AgregarCorsAngular(this IServiceCollection servicios, IConfiguration configuracion)
    {
        var origenes = configuracion.GetSection("Cors:Origenes").Get<string[]>() is { Length: > 0 } o
            ? o
            : ["http://localhost:4200"];
        servicios.AddCors(c => c.AddPolicy(PoliticaCors, p => p.WithOrigins(origenes).AllowAnyHeader().AllowAnyMethod()));
        return servicios;
    }
}
