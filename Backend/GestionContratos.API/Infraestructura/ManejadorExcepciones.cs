using GestionContratos.Comun.Excepciones;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace GestionContratos.API.Infraestructura;

/// <summary>Convierte las excepciones de negocio en respuestas ProblemDetails (RFC 7807).</summary>
public class ManejadorExcepciones(ILogger<ManejadorExcepciones> logger, IProblemDetailsService problemas) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext contexto, Exception excepcion, CancellationToken ct)
    {
        var (estado, titulo) = excepcion switch
        {
            ExcepcionNegocio => (StatusCodes.Status400BadRequest, "La solicitud no es válida"),
            ExcepcionNoEncontrado => (StatusCodes.Status404NotFound, "Recurso no encontrado"),
            ExcepcionNoAutorizado => (StatusCodes.Status401Unauthorized, "No autorizado"),
            _ => (StatusCodes.Status500InternalServerError, "Error interno del servidor")
        };

        if (estado == StatusCodes.Status500InternalServerError)
            logger.LogError(excepcion, "Error no controlado en {Metodo} {Ruta}", contexto.Request.Method, contexto.Request.Path);

        contexto.Response.StatusCode = estado;
        return await problemas.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = contexto,
            Exception = excepcion,
            ProblemDetails = new ProblemDetails
            {
                Status = estado,
                Title = titulo,
                // El detalle solo se expone para errores controlados; nunca el de un 500.
                Detail = estado == StatusCodes.Status500InternalServerError ? null : excepcion.Message
            }
        });
    }
}
