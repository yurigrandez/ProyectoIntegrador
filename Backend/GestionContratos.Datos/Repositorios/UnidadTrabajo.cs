using GestionContratos.Entidades;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace GestionContratos.Datos.Repositorios;

public class UnidadTrabajo(GestionContratosDbContext contexto) : IUnidadTrabajo
{
    private readonly Dictionary<Type, object> _repositorios = [];

    public IRepositorio<T> Repositorio<T>() where T : EntidadBase
    {
        if (!_repositorios.TryGetValue(typeof(T), out var repositorio))
        {
            repositorio = new Repositorio<T>(contexto);
            _repositorios[typeof(T)] = repositorio;
        }
        return (IRepositorio<T>)repositorio;
    }

    public Task<int> GuardarAsync(CancellationToken ct = default) => contexto.SaveChangesAsync(ct);

    public async Task<ITransaccion> IniciarTransaccionAsync(CancellationToken ct = default) =>
        new Transaccion(await contexto.Database.BeginTransactionAsync(ct));

    public async Task BloquearAsync<T>(int id, CancellationToken ct = default) where T : EntidadBase
    {
        // El nombre de la tabla sale del modelo de EF (nunca de datos del usuario); el id va como parámetro.
        var tabla = contexto.Model.FindEntityType(typeof(T))?.GetTableName()
                    ?? throw new InvalidOperationException($"{typeof(T).Name} no está mapeada a una tabla.");
#pragma warning disable EF1002 // solo el nombre de tabla (tomado del modelo) se concatena; el id va parametrizado
        await contexto.Database.ExecuteSqlRawAsync(
            $"SELECT Id FROM [{tabla}] WITH (UPDLOCK, ROWLOCK) WHERE Id = {{0}}", [id], ct);
#pragma warning restore EF1002
    }

    private sealed class Transaccion(IDbContextTransaction transaccion) : ITransaccion
    {
        public Task ConfirmarAsync(CancellationToken ct = default) => transaccion.CommitAsync(ct);
        public ValueTask DisposeAsync() => transaccion.DisposeAsync();
    }
}
