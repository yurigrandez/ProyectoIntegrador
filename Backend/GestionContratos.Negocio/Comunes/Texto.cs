namespace GestionContratos.Negocio.Comunes;

public static class Texto
{
    /// <summary>Recorta espacios y convierte el texto vacío en null.</summary>
    public static string? Limpiar(string? valor) => string.IsNullOrWhiteSpace(valor) ? null : valor.Trim();
}
