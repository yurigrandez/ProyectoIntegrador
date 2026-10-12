namespace GestionContratos.Entidades;

public class Cliente : EntidadBase
{
    public string Codigo { get; set; } = string.Empty;
    public string? Nombre { get; set; }
    public string? Paterno { get; set; }
    public string? Materno { get; set; }
    public int? IdTipoDocumento { get; set; }
    public string? NumeroDocumento { get; set; }
    public string? Correo { get; set; }
    public string? Direccion { get; set; }
    public string? Telefono { get; set; }
    public int? IdTipoComprobante { get; set; }

    public TipoComprobante? TipoComprobante { get; set; }
    public TipoDocumento? TipoDocumento { get; set; }

    public ICollection<Comprobante> Comprobantes { get; set; } = new List<Comprobante>();
    public ICollection<Contrato> Contratos { get; set; } = new List<Contrato>();
    public ICollection<Incidencia> Incidencias { get; set; } = new List<Incidencia>();
}
