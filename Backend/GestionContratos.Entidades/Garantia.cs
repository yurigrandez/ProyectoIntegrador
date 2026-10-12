namespace GestionContratos.Entidades;

public class Garantia : EntidadBase
{
    public int IdContrato { get; set; }
    public int? IdTipoMoneda { get; set; }
    public int? IdMedioPago { get; set; }
    public decimal? Monto { get; set; }
    public DateTime? FechaRecepcion { get; set; }
    public DateTime? FechaDevolucion { get; set; }
    public string? Observaciones { get; set; }
    public int? IdEstado { get; set; }

    public Contrato Contrato { get; set; } = null!;
    public Estado? Estado { get; set; }
    public MedioPago? MedioPago { get; set; }
    public TipoMoneda? TipoMoneda { get; set; }
}
