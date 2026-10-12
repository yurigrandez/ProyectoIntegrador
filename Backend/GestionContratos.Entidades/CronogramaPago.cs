namespace GestionContratos.Entidades;

public class CronogramaPago : EntidadBase
{
    public int IdContrato { get; set; }
    public int IdConcepto { get; set; }
    public int NroCuota { get; set; }
    public DateTime FechaVencimiento { get; set; }
    public decimal Monto { get; set; }
    public int? IdEstado { get; set; }

    public Concepto Concepto { get; set; } = null!;
    public Contrato Contrato { get; set; } = null!;
    public Estado? Estado { get; set; }

    public ICollection<ComprobanteDetalle> ComprobanteDetalles { get; set; } = new List<ComprobanteDetalle>();
    public ICollection<Pago> Pagos { get; set; } = new List<Pago>();
}
