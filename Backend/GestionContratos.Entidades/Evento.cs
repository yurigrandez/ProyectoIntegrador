namespace GestionContratos.Entidades;

public class Evento : EntidadBase
{
    public string? Estacion { get; set; }
    public string? Entidad { get; set; }
    public int? IdUsuario { get; set; }
    public string? CodigoUsuario { get; set; }
    public string? Mensaje { get; set; }
}
