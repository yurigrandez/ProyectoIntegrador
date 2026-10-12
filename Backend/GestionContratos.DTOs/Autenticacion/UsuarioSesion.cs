namespace GestionContratos.DTOs.Autenticacion;

public class UsuarioSesion
{
    public int Id { get; set; }
    public string Codigo { get; set; } = string.Empty;
    public string NombreCompleto { get; set; } = string.Empty;
    /// <summary>Abreviatura del tipo de usuario (ADM, OPE).</summary>
    public string Rol { get; set; } = string.Empty;
}
