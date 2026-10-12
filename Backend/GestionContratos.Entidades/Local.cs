namespace GestionContratos.Entidades;

public class Local : EntidadBase
{
    public string Codigo { get; set; } = string.Empty;
    public int IdTipoLocal { get; set; }
    public int IdEmpresa { get; set; }
    public string? Direccion { get; set; }
    public int? Interior { get; set; }
    public decimal? TotalM2 { get; set; }
    public string? Dimensiones { get; set; }
    public int? NroPisos { get; set; }
    public byte[]? ImgFrontis { get; set; }
    public int? IdEstado { get; set; }

    public Empresa Empresa { get; set; } = null!;
    public Estado? Estado { get; set; }
    public TipoLocal TipoLocal { get; set; } = null!;

    public ICollection<Contrato> Contratos { get; set; } = new List<Contrato>();
    public ICollection<Incidencia> Incidencias { get; set; } = new List<Incidencia>();
}
