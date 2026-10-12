using GestionContratos.Entidades;

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
}
