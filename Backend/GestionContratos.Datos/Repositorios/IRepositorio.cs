using System.Linq.Expressions;
using GestionContratos.Entidades;

namespace GestionContratos.Datos.Repositorios;

public interface IRepositorio<T> where T : EntidadBase
{
    /// <summary>Consulta sin seguimiento de cambios, ya filtrada por baja lógica.</summary>
    IQueryable<T> Consultar();

    Task<T?> ObtenerPorIdAsync(int id, CancellationToken ct = default);
    Task<T?> ObtenerAsync(Expression<Func<T, bool>> condicion, CancellationToken ct = default);
    Task<bool> ExisteAsync(Expression<Func<T, bool>> condicion, CancellationToken ct = default);
    Task AgregarAsync(T entidad, CancellationToken ct = default);
    void Actualizar(T entidad);

    /// <summary>Baja lógica: asigna FechaDesactivacion.</summary>
    void Desactivar(T entidad);
}
