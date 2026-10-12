using GestionContratos.Entidades;

namespace GestionContratos.Datos.Repositorios;

/// <summary>Agrupa los repositorios de una operación y confirma los cambios en una sola transacción.</summary>
public interface IUnidadTrabajo
{
    IRepositorio<T> Repositorio<T>() where T : EntidadBase;
    Task<int> GuardarAsync(CancellationToken ct = default);
}
