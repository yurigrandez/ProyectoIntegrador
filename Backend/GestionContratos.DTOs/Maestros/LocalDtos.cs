using System.ComponentModel.DataAnnotations;
using GestionContratos.DTOs.Comunes;

namespace GestionContratos.DTOs.Maestros;

public class LocalDto
{
    public int Id { get; set; }
    public string Codigo { get; set; } = string.Empty;
    public int IdTipoLocal { get; set; }
    public string? TipoLocal { get; set; }
    public int IdEmpresa { get; set; }
    public string? Empresa { get; set; }
    public string? Direccion { get; set; }
    public int? Interior { get; set; }
    public decimal? TotalM2 { get; set; }
    public string? Dimensiones { get; set; }
    public int? NroPisos { get; set; }
    public int? IdEstado { get; set; }
    /// <summary>Abreviatura del estado: DIS, OCU o MAN.</summary>
    public string? Estado { get; set; }
    public DateTime? FechaCreacion { get; set; }
}

/// <summary>Datos editables de un local (la foto del frontis se gestionará aparte).</summary>
public class LocalGuardarDto
{
    [Required]
    public int? IdTipoLocal { get; set; }

    [Required]
    public int? IdEmpresa { get; set; }

    [StringLength(250)]
    public string? Direccion { get; set; }

    [Range(0, int.MaxValue)]
    public int? Interior { get; set; }

    [Range(typeof(decimal), "0.01", "100000")]
    public decimal? TotalM2 { get; set; }

    [StringLength(150)]
    public string? Dimensiones { get; set; }

    [Range(1, 200)]
    public int? NroPisos { get; set; }

    /// <summary>
    /// Solo Disponible (DIS) o Mantenimiento (MAN). Ocupado (OCU) lo define el contrato vigente.
    /// Si no se indica: al crear queda Disponible, al editar se conserva.
    /// </summary>
    public int? IdEstado { get; set; }
}

public class LocalCrearDto : LocalGuardarDto
{
    [Required, StringLength(15)]
    public string Codigo { get; set; } = string.Empty;
}

public class LocalFiltro : ConsultaPaginada
{
    public int? IdEmpresa { get; set; }
    public int? IdTipoLocal { get; set; }
    public int? IdEstado { get; set; }
}
