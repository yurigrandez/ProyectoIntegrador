namespace GestionContratos.Entidades;

public class Pago : EntidadBase
{
    public int IdContrato { get; set; }
    public int? IdCronogramaPago { get; set; }
    public int? IdComprobante { get; set; }
    public int IdMedioPago { get; set; }
    public int IdTipoMoneda { get; set; }
    public int IdUsuarioRegistra { get; set; }
    public DateTime FechaPago { get; set; }
    public decimal Monto { get; set; }
    public string? NroOperacion { get; set; }
    public string? Observacion { get; set; }

    public Comprobante? Comprobante { get; set; }
    public Contrato Contrato { get; set; } = null!;
    public CronogramaPago? CronogramaPago { get; set; }
    public MedioPago MedioPago { get; set; } = null!;
    public TipoMoneda TipoMoneda { get; set; } = null!;
    public Usuario UsuarioRegistra { get; set; } = null!;
}
