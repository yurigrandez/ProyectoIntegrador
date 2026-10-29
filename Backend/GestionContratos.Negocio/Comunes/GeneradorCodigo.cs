using GestionContratos.Datos.Repositorios;

namespace GestionContratos.Negocio.Comunes;

/// <summary>
/// Genera el código automático de los maestros (empresas, locales y clientes) con el formato PREF-NNNN,
/// tomando el número de tabSECUENCIA (una sola serie por tabla, sin reinicio anual).
/// </summary>
public static class GeneradorCodigo
{
    /// <summary>Año fijo de la serie: los códigos de maestros no se reinician cada año.</summary>
    private const string SerieUnica = "0000";

    /// <param name="existe">Indica si el código ya está usado (incluidos los dados de baja), para saltar códigos cargados a mano.</param>
    public static async Task<string> SiguienteAsync(ISecuenciaGenerador secuencias, string tabla, string prefijo,
        Func<string, Task<bool>> existe, CancellationToken ct = default)
    {
        while (true)
        {
            var numero = await secuencias.SiguienteAsync(tabla, SerieUnica, prefijo, ct);
            var codigo = $"{prefijo}-{numero:0000}";
            if (!await existe(codigo)) return codigo;
        }
    }
}
