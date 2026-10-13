using System.Linq.Expressions;
using GestionContratos.Entidades;
using Microsoft.EntityFrameworkCore;

namespace GestionContratos.Datos.Repositorios;

public class Repositorio<T>(GestionContratosDbContext contexto) : IRepositorio<T> where T : EntidadBase
{
    protected DbSet<T> Conjunto => contexto.Set<T>();

    public IQueryable<T> Consultar() => Conjunto.AsNoTracking();

    public IQueryable<T> ConsultarTodos() => Conjunto.IgnoreQueryFilters().AsNoTracking();

    public IQueryable<T> ConsultarConSeguimiento() => Conjunto;

    public Task<T?> ObtenerPorIdAsync(int id, CancellationToken ct = default) =>
        Conjunto.FirstOrDefaultAsync(e => e.Id == id, ct);

    public Task<T?> ObtenerAsync(Expression<Func<T, bool>> condicion, CancellationToken ct = default) =>
        Conjunto.FirstOrDefaultAsync(condicion, ct);

    public Task<bool> ExisteAsync(Expression<Func<T, bool>> condicion, CancellationToken ct = default) =>
        Conjunto.AnyAsync(condicion, ct);

    public async Task AgregarAsync(T entidad, CancellationToken ct = default) =>
        await Conjunto.AddAsync(entidad, ct);

    public void Actualizar(T entidad) => Conjunto.Update(entidad);

    public void Desactivar(T entidad) => entidad.FechaDesactivacion = DateTime.Now;
}
