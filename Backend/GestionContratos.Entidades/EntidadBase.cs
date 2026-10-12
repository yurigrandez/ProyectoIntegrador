namespace GestionContratos.Entidades;

/// <summary>Columnas comunes a todas las tablas. FechaDesactivacion marca la baja lógica.</summary>
public abstract class EntidadBase
{
    public int Id { get; set; }
    public DateTime? FechaCreacion { get; set; }
    public DateTime? FechaModificacion { get; set; }
    public DateTime? FechaDesactivacion { get; set; }
}
