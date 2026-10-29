using System.Linq.Expressions;
using GestionContratos.Comun.Excepciones;
using GestionContratos.Datos.Repositorios;
using GestionContratos.DTOs.Comunes;
using GestionContratos.DTOs.Maestros;
using GestionContratos.Entidades;
using GestionContratos.Negocio.Comunes;
using Microsoft.EntityFrameworkCore;

namespace GestionContratos.Negocio.Maestros;

public interface IClientesServicio
{
    Task<PaginadoDto<ClienteDto>> ListarAsync(ClienteFiltro filtro, CancellationToken ct = default);
    Task<ClienteDto> ObtenerAsync(int id, CancellationToken ct = default);
    Task<ClienteDto> CrearAsync(ClienteGuardarDto datos, CancellationToken ct = default);
    Task<ClienteDto> ActualizarAsync(int id, ClienteGuardarDto datos, CancellationToken ct = default);
    /// <summary>Baja lógica. No se permite si el cliente tiene contratos borrador o vigentes.</summary>
    Task DesactivarAsync(int id, CancellationToken ct = default);
}

public class ClientesServicio(IUnidadTrabajo unidad, ISecuenciaGenerador secuencias) : IClientesServicio
{
    private static readonly Expression<Func<Cliente, ClienteDto>> Proyeccion = c => new ClienteDto
    {
        Id = c.Id,
        Codigo = c.Codigo,
        Nombre = c.Nombre,
        Paterno = c.Paterno,
        Materno = c.Materno,
        IdTipoDocumento = c.IdTipoDocumento,
        TipoDocumento = c.TipoDocumento != null ? c.TipoDocumento.Abreviatura : null,
        NumeroDocumento = c.NumeroDocumento,
        Correo = c.Correo,
        Direccion = c.Direccion,
        Telefono = c.Telefono,
        IdTipoComprobante = c.IdTipoComprobante,
        TipoComprobante = c.TipoComprobante != null ? c.TipoComprobante.Abreviatura : null,
        FechaCreacion = c.FechaCreacion
    };

    public async Task<PaginadoDto<ClienteDto>> ListarAsync(ClienteFiltro filtro, CancellationToken ct = default)
    {
        var consulta = unidad.Repositorio<Cliente>().Consultar();
        if (!string.IsNullOrWhiteSpace(filtro.Texto))
        {
            var texto = filtro.Texto.Trim();
            consulta = consulta.Where(c => c.Codigo.Contains(texto)
                || (c.Nombre != null && c.Nombre.Contains(texto))
                || (c.Paterno != null && c.Paterno.Contains(texto))
                || (c.Materno != null && c.Materno.Contains(texto))
                || (c.NumeroDocumento != null && c.NumeroDocumento.Contains(texto)));
        }
        if (filtro.IdTipoDocumento is { } tipo)
            consulta = consulta.Where(c => c.IdTipoDocumento == tipo);

        return await consulta.OrderBy(c => c.Codigo).Select(Proyeccion).PaginarAsync(filtro, ct);
    }

    public async Task<ClienteDto> ObtenerAsync(int id, CancellationToken ct = default) =>
        await unidad.Repositorio<Cliente>().Consultar().Where(c => c.Id == id).Select(Proyeccion).FirstOrDefaultAsync(ct)
        ?? throw new ExcepcionNoEncontrado($"No existe el cliente con id {id}.");

    public async Task<ClienteDto> CrearAsync(ClienteGuardarDto datos, CancellationToken ct = default)
    {
        var repositorio = unidad.Repositorio<Cliente>();
        var cliente = new Cliente();
        await Aplicar(cliente, datos, ct);
        // El código se genera al final, ya validados los datos, para no consumir números en solicitudes inválidas.
        // Se incluyen los dados de baja porque la restricción única de la BD también los cuenta.
        cliente.Codigo = await GeneradorCodigo.SiguienteAsync(secuencias, "tabCLIENTES", "CLI",
            codigo => repositorio.ConsultarTodos().AnyAsync(c => c.Codigo == codigo, ct), ct);
        await repositorio.AgregarAsync(cliente, ct);
        await unidad.GuardarAsync(ct);
        return await ObtenerAsync(cliente.Id, ct);
    }

    public async Task<ClienteDto> ActualizarAsync(int id, ClienteGuardarDto datos, CancellationToken ct = default)
    {
        var cliente = await unidad.Repositorio<Cliente>().ObtenerPorIdAsync(id, ct)
            ?? throw new ExcepcionNoEncontrado($"No existe el cliente con id {id}.");

        await Aplicar(cliente, datos, ct);
        await unidad.GuardarAsync(ct);
        return await ObtenerAsync(id, ct);
    }

    public async Task DesactivarAsync(int id, CancellationToken ct = default)
    {
        var repositorio = unidad.Repositorio<Cliente>();
        var cliente = await repositorio.ObtenerPorIdAsync(id, ct)
            ?? throw new ExcepcionNoEncontrado($"No existe el cliente con id {id}.");

        var tieneContratosActivos = await unidad.Repositorio<Contrato>().Consultar()
            .AnyAsync(c => c.IdCliente == id && c.Estado != null && (c.Estado.Abreviatura == "VIG" || c.Estado.Abreviatura == "BOR"), ct);
        if (tieneContratosActivos)
            throw new ExcepcionNegocio("No se puede desactivar un cliente con contratos borrador o vigentes.");

        repositorio.Desactivar(cliente);
        await unidad.GuardarAsync(ct);
    }

    /// <summary>Valida y copia los datos editables sobre la entidad.</summary>
    private async Task Aplicar(Cliente cliente, ClienteGuardarDto datos, CancellationToken ct)
    {
        var tipoDocumento = await unidad.Repositorio<TipoDocumento>().Consultar()
            .FirstOrDefaultAsync(t => t.Id == datos.IdTipoDocumento, ct)
            ?? throw new ExcepcionNegocio("El tipo de documento indicado no existe.");

        var numero = datos.NumeroDocumento.Trim();
        if (ValidadorDocumento.Validar(tipoDocumento.Abreviatura, numero) is { } motivo)
            throw new ExcepcionNegocio(motivo);

        var duplicado = await unidad.Repositorio<Cliente>().Consultar().AnyAsync(c =>
            c.Id != cliente.Id && c.IdTipoDocumento == tipoDocumento.Id && c.NumeroDocumento == numero, ct);
        if (duplicado)
            throw new ExcepcionNegocio($"Ya existe un cliente con {tipoDocumento.Abreviatura} {numero}.");

        if (datos.IdTipoComprobante is { } idComprobante &&
            !await unidad.Repositorio<TipoComprobante>().ExisteAsync(t => t.Id == idComprobante, ct))
            throw new ExcepcionNegocio("El tipo de comprobante indicado no existe.");

        cliente.Nombre = datos.Nombre.Trim();
        cliente.Paterno = Texto.Limpiar(datos.Paterno);
        cliente.Materno = Texto.Limpiar(datos.Materno);
        cliente.IdTipoDocumento = tipoDocumento.Id;
        cliente.NumeroDocumento = numero;
        cliente.Correo = Texto.Limpiar(datos.Correo);
        cliente.Direccion = Texto.Limpiar(datos.Direccion);
        cliente.Telefono = Texto.Limpiar(datos.Telefono);
        cliente.IdTipoComprobante = datos.IdTipoComprobante;
    }
}
