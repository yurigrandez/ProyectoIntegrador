using System.Text.RegularExpressions;

namespace GestionContratos.Negocio.Maestros;

/// <summary>Validación del formato de los documentos de identidad (Perú).</summary>
public static partial class ValidadorDocumento
{
    [GeneratedRegex(@"^\d{8}$")]
    private static partial Regex Dni();

    [GeneratedRegex(@"^(10|15|16|17|20)\d{9}$")]
    private static partial Regex RucRegex();

    [GeneratedRegex(@"^[A-Za-z0-9]{9,12}$")]
    private static partial Regex CarneExtranjeria();

    [GeneratedRegex(@"^[A-Za-z0-9]{6,12}$")]
    private static partial Regex Pasaporte();

    /// <summary>Devuelve el motivo del rechazo, o null si el número es válido para ese tipo de documento.</summary>
    public static string? Validar(string abreviaturaTipo, string numero) => abreviaturaTipo.ToUpperInvariant() switch
    {
        "DNI" => Dni().IsMatch(numero) ? null : "El DNI debe tener 8 dígitos.",
        "RUC" => RucRegex().IsMatch(numero) ? null : "El RUC debe tener 11 dígitos y empezar con 10, 15, 16, 17 o 20.",
        "CE" => CarneExtranjeria().IsMatch(numero) ? null : "El carné de extranjería debe tener entre 9 y 12 caracteres alfanuméricos.",
        "PAS" => Pasaporte().IsMatch(numero) ? null : "El pasaporte debe tener entre 6 y 12 caracteres alfanuméricos.",
        _ => null
    };

    public static bool RucValido(string ruc) => RucRegex().IsMatch(ruc);
}
