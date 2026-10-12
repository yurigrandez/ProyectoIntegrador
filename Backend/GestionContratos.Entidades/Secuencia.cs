namespace GestionContratos.Entidades;

public class Secuencia : EntidadBase
{
    public string Tabla { get; set; } = string.Empty;
    public string Anio { get; set; } = string.Empty;
    public string Prefijo { get; set; } = string.Empty;
    public int? Numero { get; set; }
}
