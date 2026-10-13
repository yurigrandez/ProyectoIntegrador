using GestionContratos.API.Infraestructura;
using GestionContratos.Datos;
using GestionContratos.Negocio;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Secretos (cadena de conexión, Jwt:Key): user-secrets en desarrollo y variables de entorno
// en los demás ambientes. Nunca en appsettings.json. Ver docs/Configuracion.md.
builder.Services
    .AgregarDatos(builder.Configuration)
    .AgregarNegocio(builder.Configuration)
    .AgregarAutenticacionJwt(builder.Configuration);

builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ManejadorExcepciones>();
builder.Services.AgregarOpenApiConJwt();
builder.Services.AgregarCorsAngular(builder.Configuration);
builder.Services.AddHostedService<ActualizadorEstadosContratos>();

var app = builder.Build();

app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(); // documentación interactiva en /scalar
}

app.UseHttpsRedirection();
app.UseCors(ConfiguracionApi.PoliticaCors);
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

// Necesario para WebApplicationFactory en las pruebas de integración.
public partial class Program;
