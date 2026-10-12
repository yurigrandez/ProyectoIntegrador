namespace GestionContratos.Entidades;

public class Contrato : EntidadBase
{
    public string Codigo { get; set; } = string.Empty;
    public int IdCliente { get; set; }
    public int IdUsuarioRegistra { get; set; }
    public int? IdUsuarioAutoriza { get; set; }
    public int IdLocal { get; set; }
    public DateTime FechaInicio { get; set; }
    public DateTime FechaFin { get; set; }
    public byte DiaPago { get; set; }
    public int? IdTipoMoneda { get; set; }
    public decimal? MontoAlquiler { get; set; }
    public decimal? MontoLuz { get; set; }
    public decimal? MontoAgua { get; set; }
    public decimal? MontoMantenimiento { get; set; }
    public decimal? MontoOtros { get; set; }
    public string? Observaciones { get; set; }
    public int? IdEstado { get; set; }

    public Cliente Cliente { get; set; } = null!;
    public Estado? Estado { get; set; }
    public Local Local { get; set; } = null!;
    public TipoMoneda? TipoMoneda { get; set; }
    public Usuario? UsuarioAutoriza { get; set; }
    public Usuario UsuarioRegistra { get; set; } = null!;

    public ICollection<Adenda> Adendas { get; set; } = new List<Adenda>();
    public ICollection<Comprobante> Comprobantes { get; set; } = new List<Comprobante>();
    public ICollection<CronogramaPago> CronogramaPagos { get; set; } = new List<CronogramaPago>();
    public ICollection<DocumentoContrato> DocumentosContrato { get; set; } = new List<DocumentoContrato>();
    public ICollection<Garantia> Garantias { get; set; } = new List<Garantia>();
    public ICollection<Incidencia> Incidencias { get; set; } = new List<Incidencia>();
    public ICollection<Pago> Pagos { get; set; } = new List<Pago>();
}
