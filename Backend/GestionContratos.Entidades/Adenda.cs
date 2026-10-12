namespace GestionContratos.Entidades;

public class Adenda : EntidadBase
{
    public string Codigo { get; set; } = string.Empty;
    public int IdContrato { get; set; }
    public int IdUsuarioRegistra { get; set; }
    public int? IdUsuarioAutoriza { get; set; }
    public DateTime? FechaAdenda { get; set; }
    public DateTime? NuevaFechaFin { get; set; }
    public decimal? MontoAlquiler { get; set; }
    public decimal? MontoLuz { get; set; }
    public decimal? MontoAgua { get; set; }
    public decimal? MontoMantenimiento { get; set; }
    public decimal? MontoOtros { get; set; }
    public string? Observaciones { get; set; }
    public int? IdEstado { get; set; }

    public Contrato Contrato { get; set; } = null!;
    public Estado? Estado { get; set; }
    public Usuario? UsuarioAutoriza { get; set; }
    public Usuario UsuarioRegistra { get; set; } = null!;
}
