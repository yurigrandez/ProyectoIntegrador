namespace GestionContratos.Entidades;

public class Usuario : EntidadBase
{
    public string Codigo { get; set; } = string.Empty;
    public string? Nombre { get; set; }
    public string? Paterno { get; set; }
    public string? Materno { get; set; }
    public string? Correo { get; set; }
    public string? Clave { get; set; }
    public int? IdTipoUsuario { get; set; }
    public int? IdTipoDocumento { get; set; }
    public string? NumeroDocumento { get; set; }
    public string? Direccion { get; set; }
    public string? Telefono { get; set; }

    public TipoDocumento? TipoDocumento { get; set; }
    public TipoUsuario? TipoUsuario { get; set; }
}
