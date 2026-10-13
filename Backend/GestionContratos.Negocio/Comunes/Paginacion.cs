using GestionContratos.DTOs.Comunes;
using Microsoft.EntityFrameworkCore;

namespace GestionContratos.Negocio.Comunes;

public static class Paginacion
{
    /// <summary>Cuenta el total y devuelve solo la página pedida (la consulta debe venir ya ordenada).</summary>
    public static async Task<PaginadoDto<T>> PaginarAsync<T>(
        this IQueryable<T> consulta, ConsultaPaginada parametros, CancellationToken ct)
    {
        var total = await consulta.CountAsync(ct);
        var items = await consulta
            .Skip((parametros.Pagina - 1) * parametros.Tamano)
            .Take(parametros.Tamano)
            .ToListAsync(ct);
        return new PaginadoDto<T> { Items = items, Total = total, Pagina = parametros.Pagina, Tamano = parametros.Tamano };
    }
}
