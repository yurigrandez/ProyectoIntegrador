namespace GestionContratos.Entidades;

public class Empresa : EntidadBase
{
    public string Codigo { get; set; } = string.Empty;
    public string? Nombre { get; set; }
    public string? Direccion { get; set; }
    public string? Ruc { get; set; }
    public string? Telefono { get; set; }
    public string? Movil { get; set; }
    public string? NombreContacto { get; set; }
    public string? CorreoContacto { get; set; }
    public string? TlfContacto { get; set; }
    public string? MovilContacto { get; set; }
    public byte[]? ImgEmpresa { get; set; }
    public string? ExtensionImg { get; set; }

    public ICollection<Comprobante> Comprobantes { get; set; } = new List<Comprobante>();
    public ICollection<Local> Locales { get; set; } = new List<Local>();
}
