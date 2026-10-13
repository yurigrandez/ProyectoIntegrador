using GestionContratos.API.Infraestructura;
using GestionContratos.Datos;
using GestionContratos.Negocio;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.FileProviders;
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

// Si la web compilada está en wwwroot (instalación en IIS), la misma aplicación la sirve:
// un solo sitio y un solo dominio, sin proxy adicional. En desarrollo wwwroot no existe y no pasa nada.
// Opcionalmente, "Web:Carpeta" indica otra carpeta donde está la web compilada.
var carpetaWeb = builder.Configuration["Web:Carpeta"];
IFileProvider? proveedorWeb = !string.IsNullOrWhiteSpace(carpetaWeb) && Directory.Exists(carpetaWeb)
    ? new PhysicalFileProvider(carpetaWeb)
    : null;
var archivosEstaticos = new StaticFileOptions
{
    FileProvider = proveedorWeb,
    // index.html nunca se guarda en caché para que una versión nueva se vea al recargar;
    // el resto de archivos tiene un nombre con huella y puede cachearse.
    OnPrepareResponse = contexto =>
    {
        if (contexto.File.Name.Equals("index.html", StringComparison.OrdinalIgnoreCase))
            contexto.Context.Response.Headers.CacheControl = "no-cache";
    }
};
app.UseDefaultFiles(new DefaultFilesOptions { FileProvider = proveedorWeb });
app.UseStaticFiles(archivosEstaticos);

// El enrutamiento va después de los archivos estáticos: si fuera antes, la ruta comodín de abajo
// "reclamaría" /assets/app.js y los archivos de la web nunca se servirían.
app.UseRouting();
app.UseCors(ConfiguracionApi.PoliticaCors);
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Cualquier ruta de la web (por ejemplo /contratos/4 al recargar la página) devuelve index.html;
// las rutas de /api que no existen siguen respondiendo 404 y nunca devuelven la página.
app.MapFallbackToFile("{*ruta:regex(^(?!api(/|$)).*)}", "index.html", archivosEstaticos);

app.Run();

// Necesario para WebApplicationFactory en las pruebas de integración.
public partial class Program;
