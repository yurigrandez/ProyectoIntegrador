namespace GestionContratos.Entidades;

public class Incidencia : EntidadBase
{
    public int IdUsuarioRegistra { get; set; }
    public int IdCliente { get; set; }
    public int? IdLocal { get; set; }
    public int? IdContrato { get; set; }
    public int IdTipoIncidente { get; set; }
    public string? Descripcion { get; set; }
    public int? IdEstado { get; set; }
    public DateTime? FechaResolucion { get; set; }
    public string? Solucion { get; set; }

    public Cliente Cliente { get; set; } = null!;
    public Contrato? Contrato { get; set; }
    public Estado? Estado { get; set; }
    public Local? Local { get; set; }
    public TipoIncidencia TipoIncidente { get; set; } = null!;
    public Usuario UsuarioRegistra { get; set; } = null!;
}
