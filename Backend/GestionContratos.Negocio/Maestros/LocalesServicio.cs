using System.Linq.Expressions;
using GestionContratos.Comun.Excepciones;
using GestionContratos.Datos.Repositorios;
using GestionContratos.DTOs.Comunes;
using GestionContratos.DTOs.Maestros;
using GestionContratos.Entidades;
using GestionContratos.Negocio.Comunes;
using Microsoft.EntityFrameworkCore;

namespace GestionContratos.Negocio.Maestros;

public interface ILocalesServicio
{
    Task<PaginadoDto<LocalDto>> ListarAsync(LocalFiltro filtro, CancellationToken ct = default);
    Task<LocalDto> ObtenerAsync(int id, CancellationToken ct = default);
    Task<LocalDto> CrearAsync(LocalCrearDto datos, CancellationToken ct = default);
    Task<LocalDto> ActualizarAsync(int id, LocalGuardarDto datos, CancellationToken ct = default);
    /// <summary>Baja lógica. No se permite si el local tiene contratos borrador o vigentes.</summary>
    Task DesactivarAsync(int id, CancellationToken ct = default);
}

public class LocalesServicio(IUnidadTrabajo unidad) : ILocalesServicio
{
    private const string Disponible = "DIS";
    private const string Ocupado = "OCU";
    private const string Mantenimiento = "MAN";

    private static readonly Expression<Func<Local, LocalDto>> Proyeccion = l => new LocalDto
    {
        Id = l.Id,
        Codigo = l.Codigo,
        IdTipoLocal = l.IdTipoLocal,
        TipoLocal = l.TipoLocal.Tipo,
        IdEmpresa = l.IdEmpresa,
        Empresa = l.Empresa.Nombre,
        Direccion = l.Direccion,
        Interior = l.Interior,
        TotalM2 = l.TotalM2,
        Dimensiones = l.Dimensiones,
        NroPisos = l.NroPisos,
        IdEstado = l.IdEstado,
        Estado = l.Estado != null ? l.Estado.Abreviatura : null,
        FechaCreacion = l.FechaCreacion
    };

    public async Task<PaginadoDto<LocalDto>> ListarAsync(LocalFiltro filtro, CancellationToken ct = default)
    {
        var consulta = unidad.Repositorio<Local>().Consultar();
        if (!string.IsNullOrWhiteSpace(filtro.Texto))
        {
            var texto = filtro.Texto.Trim();
            consulta = consulta.Where(l => l.Codigo.Contains(texto) || (l.Direccion != null && l.Direccion.Contains(texto)));
        }
        if (filtro.IdEmpresa is { } empresa) consulta = consulta.Where(l => l.IdEmpresa == empresa);
        if (filtro.IdTipoLocal is { } tipo) consulta = consulta.Where(l => l.IdTipoLocal == tipo);
        if (filtro.IdEstado is { } estado) consulta = consulta.Where(l => l.IdEstado == estado);

        return await consulta.OrderBy(l => l.Codigo).Select(Proyeccion).PaginarAsync(filtro, ct);
    }

    public async Task<LocalDto> ObtenerAsync(int id, CancellationToken ct = default) =>
        await unidad.Repositorio<Local>().Consultar().Where(l => l.Id == id).Select(Proyeccion).FirstOrDefaultAsync(ct)
        ?? throw new ExcepcionNoEncontrado($"No existe el local con id {id}.");

    public async Task<LocalDto> CrearAsync(LocalCrearDto datos, CancellationToken ct = default)
    {
        var repositorio = unidad.Repositorio<Local>();
        var codigo = datos.Codigo.Trim();
        if (await repositorio.ConsultarTodos().AnyAsync(l => l.Codigo == codigo, ct))
            throw new ExcepcionNegocio($"Ya existe un local con el código '{codigo}'.");

        var local = new Local { Codigo = codigo };
        await Aplicar(local, datos, ct);
        await repositorio.AgregarAsync(local, ct);
        await unidad.GuardarAsync(ct);
        return await ObtenerAsync(local.Id, ct);
    }

    public async Task<LocalDto> ActualizarAsync(int id, LocalGuardarDto datos, CancellationToken ct = default)
    {
        var local = await unidad.Repositorio<Local>().ObtenerPorIdAsync(id, ct)
            ?? throw new ExcepcionNoEncontrado($"No existe el local con id {id}.");

        await Aplicar(local, datos, ct);
        await unidad.GuardarAsync(ct);
        return await ObtenerAsync(id, ct);
    }

    public async Task DesactivarAsync(int id, CancellationToken ct = default)
    {
        var repositorio = unidad.Repositorio<Local>();
        var local = await repositorio.ObtenerPorIdAsync(id, ct)
            ?? throw new ExcepcionNoEncontrado($"No existe el local con id {id}.");

        var tieneContratosActivos = await unidad.Repositorio<Contrato>().Consultar()
            .AnyAsync(c => c.IdLocal == id && c.Estado != null && (c.Estado.Abreviatura == "VIG" || c.Estado.Abreviatura == "BOR"), ct);
        if (tieneContratosActivos)
            throw new ExcepcionNegocio("No se puede desactivar un local con contratos borrador o vigentes.");

        repositorio.Desactivar(local);
        await unidad.GuardarAsync(ct);
    }

    private async Task Aplicar(Local local, LocalGuardarDto datos, CancellationToken ct)
    {
        if (!await unidad.Repositorio<Empresa>().ExisteAsync(e => e.Id == datos.IdEmpresa, ct))
            throw new ExcepcionNegocio("La empresa indicada no existe.");
        if (!await unidad.Repositorio<TipoLocal>().ExisteAsync(t => t.Id == datos.IdTipoLocal, ct))
            throw new ExcepcionNegocio("El tipo de local indicado no existe.");

        local.IdEstado = await ResolverEstado(local, datos.IdEstado, ct);
        local.IdEmpresa = datos.IdEmpresa!.Value;
        local.IdTipoLocal = datos.IdTipoLocal!.Value;
        local.Direccion = Texto.Limpiar(datos.Direccion);
        local.Interior = datos.Interior;
        local.TotalM2 = datos.TotalM2;
        local.Dimensiones = Texto.Limpiar(datos.Dimensiones);
        local.NroPisos = datos.NroPisos;
    }

    /// <summary>
    /// El estado Ocupado lo define el contrato vigente: no se asigna ni se cambia a mano.
    /// Al crear, sin estado indicado queda Disponible; al editar se conserva el actual.
    /// </summary>
    private async Task<int?> ResolverEstado(Local local, int? idSolicitado, CancellationToken ct)
    {
        var estados = unidad.Repositorio<Estado>().Consultar();
        var esNuevo = local.Id == 0;

        if (idSolicitado is null)
            return esNuevo
                ? await estados.Where(e => e.Abreviatura == Disponible).Select(e => (int?)e.Id).FirstOrDefaultAsync(ct)
                : local.IdEstado;

        var abreviatura = await estados.Where(e => e.Id == idSolicitado).Select(e => e.Abreviatura).FirstOrDefaultAsync(ct)
            ?? throw new ExcepcionNegocio("El estado indicado no existe.");
        if (abreviatura is not (Disponible or Mantenimiento))
            throw new ExcepcionNegocio("El estado de un local solo puede ser Disponible o Mantenimiento; Ocupado lo define el contrato vigente.");

        if (!esNuevo && idSolicitado != local.IdEstado)
        {
            var actual = await estados.Where(e => e.Id == local.IdEstado).Select(e => e.Abreviatura).FirstOrDefaultAsync(ct);
            if (actual == Ocupado)
                throw new ExcepcionNegocio("No se puede cambiar el estado de un local ocupado por un contrato vigente.");
        }
        return idSolicitado;
    }
}
