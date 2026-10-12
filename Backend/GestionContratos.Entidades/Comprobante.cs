namespace GestionContratos.Entidades;

public class Comprobante : EntidadBase
{
    public int IdEmpresa { get; set; }
    public int IdTipoComprobante { get; set; }
    public string NroComprobante { get; set; } = string.Empty;
    public int IdCliente { get; set; }
    public int? IdContrato { get; set; }
    public int IdUsuarioRegistra { get; set; }
    public DateTime? FechaEmision { get; set; }
    public int? IdTipoMoneda { get; set; }
    public string? Observacion { get; set; }
    public decimal? SubTotal { get; set; }
    public decimal? Igv { get; set; }
    public decimal? ImporteTotal { get; set; }

    public Cliente Cliente { get; set; } = null!;
    public Contrato? Contrato { get; set; }
    public Empresa Empresa { get; set; } = null!;
    public TipoComprobante TipoComprobante { get; set; } = null!;
    public TipoMoneda? TipoMoneda { get; set; }
    public Usuario UsuarioRegistra { get; set; } = null!;

    public ICollection<ComprobanteDetalle> ComprobanteDetalles { get; set; } = new List<ComprobanteDetalle>();
    public ICollection<Pago> Pagos { get; set; } = new List<Pago>();
}
