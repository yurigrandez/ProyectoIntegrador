namespace GestionContratos.Entidades;

public class TipoComprobante : EntidadBase
{
    public string Abreviatura { get; set; } = string.Empty;
    public string? Nombre { get; set; }
    public string? Descripcion { get; set; }
}
