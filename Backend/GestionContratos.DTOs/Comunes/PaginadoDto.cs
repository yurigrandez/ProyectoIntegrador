using System.ComponentModel.DataAnnotations;

namespace GestionContratos.DTOs.Comunes;

public class PaginadoDto<T>
{
    public IReadOnlyList<T> Items { get; set; } = [];
    public int Total { get; set; }
    public int Pagina { get; set; }
    public int Tamano { get; set; }
    public int TotalPaginas => Tamano <= 0 ? 0 : (int)Math.Ceiling((double)Total / Tamano);
}

/// <summary>Parámetros comunes de los listados: paginación y búsqueda de texto libre.</summary>
public class ConsultaPaginada
{
    [Range(1, int.MaxValue)]
    public int Pagina { get; set; } = 1;

    [Range(1, 100)]
    public int Tamano { get; set; } = 20;

    /// <summary>Texto a buscar en código, nombre y demás campos descriptivos.</summary>
    [StringLength(100)]
    public string? Texto { get; set; }
}
