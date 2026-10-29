using System.Collections.Concurrent;
using System.Text.Json;

namespace GestionContratos.Pruebas.Infraestructura;

/// <summary>
/// Anota los ids de las empresas, locales y clientes que crea la API durante una clase de pruebas, para borrarlos al final.
/// Los códigos ahora los genera el sistema, así que ya no sirven para reconocer los datos de prueba.
/// </summary>
public class RegistroCreados
{
    public ConcurrentBag<int> Clientes { get; } = [];
    public ConcurrentBag<int> Locales { get; } = [];
    public ConcurrentBag<int> Empresas { get; } = [];
}

/// <summary>Observa las respuestas de la API y anota en el registro lo que se crea.</summary>
public class RegistrarCreadosHandler(RegistroCreados registro) : DelegatingHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage solicitud, CancellationToken ct)
    {
        var respuesta = await base.SendAsync(solicitud, ct);
        if (solicitud.Method != HttpMethod.Post || !respuesta.IsSuccessStatusCode) return respuesta;

        var destino = solicitud.RequestUri?.AbsolutePath.TrimEnd('/').ToLowerInvariant() switch
        {
            "/api/clientes" => registro.Clientes,
            "/api/locales" => registro.Locales,
            "/api/empresas" => registro.Empresas,
            _ => null
        };
        if (destino is null) return respuesta;

        await respuesta.Content.LoadIntoBufferAsync();
        using var documento = JsonDocument.Parse(await respuesta.Content.ReadAsStringAsync(ct));
        destino.Add(documento.RootElement.GetProperty("id").GetInt32());
        return respuesta;
    }
}
