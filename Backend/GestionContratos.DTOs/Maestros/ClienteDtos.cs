using System.ComponentModel.DataAnnotations;
using GestionContratos.DTOs.Comunes;

namespace GestionContratos.DTOs.Maestros;

public class ClienteDto
{
    public int Id { get; set; }
    public string Codigo { get; set; } = string.Empty;
    /// <summary>Nombre de la persona o razón social si es empresa.</summary>
    public string? Nombre { get; set; }
    public string? Paterno { get; set; }
    public string? Materno { get; set; }
    public int? IdTipoDocumento { get; set; }
    public string? TipoDocumento { get; set; }
    public string? NumeroDocumento { get; set; }
    public string? Correo { get; set; }
    public string? Direccion { get; set; }
    public string? Telefono { get; set; }
    public int? IdTipoComprobante { get; set; }
    public string? TipoComprobante { get; set; }
    public DateTime? FechaCreacion { get; set; }
}

/// <summary>Datos editables de un cliente.</summary>
public class ClienteGuardarDto
{
    [Required, StringLength(50)]
    public string Nombre { get; set; } = string.Empty;

    [StringLength(50)]
    public string? Paterno { get; set; }

    [StringLength(50)]
    public string? Materno { get; set; }

    [Required]
    public int? IdTipoDocumento { get; set; }

    [Required, StringLength(25)]
    public string NumeroDocumento { get; set; } = string.Empty;

    [EmailAddress, StringLength(50)]
    public string? Correo { get; set; }

    [StringLength(250)]
    public string? Direccion { get; set; }

    [StringLength(25)]
    public string? Telefono { get; set; }

    public int? IdTipoComprobante { get; set; }
}

public class ClienteFiltro : ConsultaPaginada
{
    public int? IdTipoDocumento { get; set; }
}
