namespace GestionContratos.Entidades;

public class ComprobanteDetalle : EntidadBase
{
    public int IdComprobante { get; set; }
    public int? IdConcepto { get; set; }
    public int? IdCronogramaPago { get; set; }
    public string? Concepto { get; set; }
    public int? Cantidad { get; set; }
    public decimal? PrecioUnitario { get; set; }
    public decimal? SubTotal { get; set; }
    public decimal? Igv { get; set; }

    public Comprobante Comprobante { get; set; } = null!;
    public Concepto? ConceptoRef { get; set; }
    public CronogramaPago? CronogramaPago { get; set; }
}
