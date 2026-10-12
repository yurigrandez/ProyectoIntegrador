namespace GestionContratos.Comun.Configuracion;

/// <summary>
/// Sección "Jwt" de la configuración. Key es un secreto: solo user-secrets o variable de entorno Jwt__Key.
/// </summary>
public class JwtOpciones
{
    public const string Seccion = "Jwt";

    public string Emisor { get; set; } = "GestionContratos";
    public string Audiencia { get; set; } = "GestionContratos.Clientes";
    public int MinutosExpiracion { get; set; } = 60;
    public string Key { get; set; } = string.Empty;
}
