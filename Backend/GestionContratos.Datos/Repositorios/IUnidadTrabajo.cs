using GestionContratos.Entidades;

namespace GestionContratos.Datos.Repositorios;

/// <summary>Agrupa los repositorios de una operación y confirma los cambios en una sola transacción.</summary>
public interface IUnidadTrabajo
{
    IRepositorio<T> Repositorio<T>() where T : EntidadBase;
    Task<int> GuardarAsync(CancellationToken ct = default);

    /// <summary>
    /// Abre una transacción explícita para operaciones que deben leer, validar y escribir sin que otra
    /// solicitud las interrumpa. Si no se confirma, se revierte al liberarla.
    /// </summary>
    Task<ITransaccion> IniciarTransaccionAsync(CancellationToken ct = default);

    /// <summary>
    /// Bloquea la fila hasta que termine la transacción actual (otras solicitudes esperan su turno).
    /// Debe llamarse dentro de una transacción.
    /// </summary>
    Task BloquearAsync<T>(int id, CancellationToken ct = default) where T : EntidadBase;
}

public interface ITransaccion : IAsyncDisposable
{
    Task ConfirmarAsync(CancellationToken ct = default);
}
