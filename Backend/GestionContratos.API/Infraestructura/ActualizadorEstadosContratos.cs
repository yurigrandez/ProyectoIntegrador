using GestionContratos.Negocio.Contratos;

namespace GestionContratos.API.Infraestructura;

/// <summary>
/// Tarea de fondo: al iniciar la API y luego cada cierto número de horas marca como vencidos los contratos
/// cuyo plazo terminó y actualiza el estado ocupado/disponible de los locales.
/// Se desactiva con Contratos:ActualizacionAutomatica=false; el intervalo es Contratos:HorasEntreActualizaciones.
/// </summary>
public class ActualizadorEstadosContratos(
    IServiceScopeFactory alcances, IConfiguration configuracion, ILogger<ActualizadorEstadosContratos> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        if (!configuracion.GetValue("Contratos:ActualizacionAutomatica", true))
            return;

        var intervalo = TimeSpan.FromHours(Math.Max(1, configuracion.GetValue("Contratos:HorasEntreActualizaciones", 6)));
        using var temporizador = new PeriodicTimer(intervalo);
        do
        {
            try
            {
                using var alcance = alcances.CreateScope();
                var resultado = await alcance.ServiceProvider.GetRequiredService<IContratosServicio>().ActualizarEstadosAsync(ct);
                logger.LogInformation("Estados actualizados: {Vencidos} contratos vencidos, {Locales} locales cambiaron de estado",
                    resultado.ContratosVencidos, resultado.LocalesActualizados);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "No se pudieron actualizar los estados de contratos y locales");
            }
        }
        while (await SiguienteAsync(temporizador, ct));
    }

    private static async Task<bool> SiguienteAsync(PeriodicTimer temporizador, CancellationToken ct)
    {
        try { return await temporizador.WaitForNextTickAsync(ct); }
        catch (OperationCanceledException) { return false; }
    }
}
