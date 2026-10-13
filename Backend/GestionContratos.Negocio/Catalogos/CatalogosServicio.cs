using System.Linq.Expressions;
using GestionContratos.Comun.Excepciones;
using GestionContratos.Datos.Repositorios;
using GestionContratos.DTOs.Catalogos;
using GestionContratos.Entidades;
using Microsoft.EntityFrameworkCore;

namespace GestionContratos.Negocio.Catalogos;

public interface ICatalogosServicio
{
    /// <summary>Nombres de catálogo disponibles (los de la ruta api/catalogos/{nombre}).</summary>
    IReadOnlyCollection<string> Nombres { get; }

    /// <exception cref="ExcepcionNoEncontrado">El catálogo no existe.</exception>
    Task<IReadOnlyList<CatalogoItemDto>> ListarAsync(string nombre, CancellationToken ct = default);
}

public class CatalogosServicio : ICatalogosServicio
{
    private readonly IUnidadTrabajo _unidad;
    private readonly Dictionary<string, Func<CancellationToken, Task<IReadOnlyList<CatalogoItemDto>>>> _catalogos;

    public CatalogosServicio(IUnidadTrabajo unidad)
    {
        _unidad = unidad;
        _catalogos = new()
        {
            ["tipos-documento"] = ct => Leer<TipoDocumento>(t => t.Abreviatura, t => new CatalogoItemDto { Id = t.Id, Abreviatura = t.Abreviatura, Nombre = t.Nombre }, ct),
            ["tipos-comprobante"] = ct => Leer<TipoComprobante>(t => t.Abreviatura, t => new CatalogoItemDto { Id = t.Id, Abreviatura = t.Abreviatura, Nombre = t.Nombre }, ct),
            ["tipos-local"] = ct => Leer<TipoLocal>(t => t.Tipo, t => new CatalogoItemDto { Id = t.Id, Abreviatura = t.Tipo, Nombre = t.Descripcion }, ct),
            ["monedas"] = ct => Leer<TipoMoneda>(t => t.Abreviatura, t => new CatalogoItemDto { Id = t.Id, Abreviatura = t.Abreviatura, Nombre = t.Nombre }, ct),
            ["medios-pago"] = ct => Leer<MedioPago>(t => t.Abreviatura, t => new CatalogoItemDto { Id = t.Id, Abreviatura = t.Abreviatura, Nombre = t.Nombre }, ct),
            ["conceptos"] = ct => Leer<Concepto>(t => t.Abreviatura, t => new CatalogoItemDto { Id = t.Id, Abreviatura = t.Abreviatura, Nombre = t.Nombre }, ct),
            ["estados"] = ct => Leer<Estado>(t => t.Abreviatura, t => new CatalogoItemDto { Id = t.Id, Abreviatura = t.Abreviatura, Nombre = t.Nombre }, ct),
            ["tipos-incidencia"] = ct => Leer<TipoIncidencia>(t => t.Abreviatura, t => new CatalogoItemDto { Id = t.Id, Abreviatura = t.Abreviatura, Nombre = t.Nombre }, ct)
        };
    }

    public IReadOnlyCollection<string> Nombres => _catalogos.Keys;

    public async Task<IReadOnlyList<CatalogoItemDto>> ListarAsync(string nombre, CancellationToken ct = default)
    {
        if (!_catalogos.TryGetValue(nombre.ToLowerInvariant(), out var lector))
            throw new ExcepcionNoEncontrado($"No existe el catálogo '{nombre}'. Disponibles: {string.Join(", ", Nombres)}.");
        return await lector(ct);
    }

    private async Task<IReadOnlyList<CatalogoItemDto>> Leer<T>(
        Expression<Func<T, string>> orden, Expression<Func<T, CatalogoItemDto>> proyeccion, CancellationToken ct)
        where T : EntidadBase =>
        await _unidad.Repositorio<T>().Consultar().OrderBy(orden).Select(proyeccion).ToListAsync(ct);
}
