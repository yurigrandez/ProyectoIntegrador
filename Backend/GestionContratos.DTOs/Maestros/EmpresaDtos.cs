using System.ComponentModel.DataAnnotations;
using GestionContratos.DTOs.Comunes;

namespace GestionContratos.DTOs.Maestros;

public class EmpresaDto
{
    public int Id { get; set; }
    public string Codigo { get; set; } = string.Empty;
    public string? Nombre { get; set; }
    public string? Direccion { get; set; }
    public string? Ruc { get; set; }
    public string? Telefono { get; set; }
    public string? Movil { get; set; }
    public string? NombreContacto { get; set; }
    public string? CorreoContacto { get; set; }
    public string? TlfContacto { get; set; }
    public string? MovilContacto { get; set; }
    public DateTime? FechaCreacion { get; set; }
}

/// <summary>Datos editables de una empresa (el logo se gestionará aparte). El código lo genera el sistema al crearla.</summary>
public class EmpresaGuardarDto
{
    [Required, StringLength(100)]
    public string Nombre { get; set; } = string.Empty;

    [StringLength(250)]
    public string? Direccion { get; set; }

    [Required, StringLength(11)]
    public string Ruc { get; set; } = string.Empty;

    [StringLength(25)]
    public string? Telefono { get; set; }

    [StringLength(15)]
    public string? Movil { get; set; }

    [StringLength(150)]
    public string? NombreContacto { get; set; }

    [EmailAddress, StringLength(50)]
    public string? CorreoContacto { get; set; }

    [StringLength(15)]
    public string? TlfContacto { get; set; }

    [StringLength(15)]
    public string? MovilContacto { get; set; }
}

public class EmpresaFiltro : ConsultaPaginada;
