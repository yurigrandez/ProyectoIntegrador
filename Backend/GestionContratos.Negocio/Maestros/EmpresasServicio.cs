using System.Linq.Expressions;
using GestionContratos.Comun.Excepciones;
using GestionContratos.Datos.Repositorios;
using GestionContratos.DTOs.Comunes;
using GestionContratos.DTOs.Maestros;
using GestionContratos.Entidades;
using GestionContratos.Negocio.Comunes;
using Microsoft.EntityFrameworkCore;

namespace GestionContratos.Negocio.Maestros;

public interface IEmpresasServicio
{
    Task<PaginadoDto<EmpresaDto>> ListarAsync(EmpresaFiltro filtro, CancellationToken ct = default);
    Task<EmpresaDto> ObtenerAsync(int id, CancellationToken ct = default);
    Task<EmpresaDto> CrearAsync(EmpresaGuardarDto datos, CancellationToken ct = default);
    Task<EmpresaDto> ActualizarAsync(int id, EmpresaGuardarDto datos, CancellationToken ct = default);
    /// <summary>Baja lógica. No se permite si la empresa tiene locales activos.</summary>
    Task DesactivarAsync(int id, CancellationToken ct = default);
}

public class EmpresasServicio(IUnidadTrabajo unidad, ISecuenciaGenerador secuencias) : IEmpresasServicio
{
    private static readonly Expression<Func<Empresa, EmpresaDto>> Proyeccion = e => new EmpresaDto
    {
        Id = e.Id,
        Codigo = e.Codigo,
        Nombre = e.Nombre,
        Direccion = e.Direccion,
        Ruc = e.Ruc,
        Telefono = e.Telefono,
        Movil = e.Movil,
        NombreContacto = e.NombreContacto,
        CorreoContacto = e.CorreoContacto,
        TlfContacto = e.TlfContacto,
        MovilContacto = e.MovilContacto,
        FechaCreacion = e.FechaCreacion
    };

    public async Task<PaginadoDto<EmpresaDto>> ListarAsync(EmpresaFiltro filtro, CancellationToken ct = default)
    {
        var consulta = unidad.Repositorio<Empresa>().Consultar();
        if (!string.IsNullOrWhiteSpace(filtro.Texto))
        {
            var texto = filtro.Texto.Trim();
            consulta = consulta.Where(e => e.Codigo.Contains(texto)
                || (e.Nombre != null && e.Nombre.Contains(texto))
                || (e.Ruc != null && e.Ruc.Contains(texto)));
        }
        return await consulta.OrderBy(e => e.Codigo).Select(Proyeccion).PaginarAsync(filtro, ct);
    }

    public async Task<EmpresaDto> ObtenerAsync(int id, CancellationToken ct = default) =>
        await unidad.Repositorio<Empresa>().Consultar().Where(e => e.Id == id).Select(Proyeccion).FirstOrDefaultAsync(ct)
        ?? throw new ExcepcionNoEncontrado($"No existe la empresa con id {id}.");

    public async Task<EmpresaDto> CrearAsync(EmpresaGuardarDto datos, CancellationToken ct = default)
    {
        var repositorio = unidad.Repositorio<Empresa>();
        var empresa = new Empresa();
        await Aplicar(empresa, datos, ct);
        // El código se genera al final, ya validados los datos, para no consumir números en solicitudes inválidas.
        empresa.Codigo = await GeneradorCodigo.SiguienteAsync(secuencias, "tabEMPRESAS", "EMP",
            codigo => repositorio.ConsultarTodos().AnyAsync(e => e.Codigo == codigo, ct), ct);
        await repositorio.AgregarAsync(empresa, ct);
        await unidad.GuardarAsync(ct);
        return await ObtenerAsync(empresa.Id, ct);
    }

    public async Task<EmpresaDto> ActualizarAsync(int id, EmpresaGuardarDto datos, CancellationToken ct = default)
    {
        var empresa = await unidad.Repositorio<Empresa>().ObtenerPorIdAsync(id, ct)
            ?? throw new ExcepcionNoEncontrado($"No existe la empresa con id {id}.");

        await Aplicar(empresa, datos, ct);
        await unidad.GuardarAsync(ct);
        return await ObtenerAsync(id, ct);
    }

    public async Task DesactivarAsync(int id, CancellationToken ct = default)
    {
        var repositorio = unidad.Repositorio<Empresa>();
        var empresa = await repositorio.ObtenerPorIdAsync(id, ct)
            ?? throw new ExcepcionNoEncontrado($"No existe la empresa con id {id}.");

        if (await unidad.Repositorio<Local>().ExisteAsync(l => l.IdEmpresa == id, ct))
            throw new ExcepcionNegocio("No se puede desactivar una empresa que tiene locales activos.");

        repositorio.Desactivar(empresa);
        await unidad.GuardarAsync(ct);
    }

    private async Task Aplicar(Empresa empresa, EmpresaGuardarDto datos, CancellationToken ct)
    {
        var ruc = datos.Ruc.Trim();
        if (!ValidadorDocumento.RucValido(ruc))
            throw new ExcepcionNegocio("El RUC debe tener 11 dígitos y empezar con 10, 15, 16, 17 o 20.");

        if (await unidad.Repositorio<Empresa>().Consultar().AnyAsync(e => e.Id != empresa.Id && e.Ruc == ruc, ct))
            throw new ExcepcionNegocio($"Ya existe una empresa con el RUC {ruc}.");

        empresa.Nombre = datos.Nombre.Trim();
        empresa.Direccion = Texto.Limpiar(datos.Direccion);
        empresa.Ruc = ruc;
        empresa.Telefono = Texto.Limpiar(datos.Telefono);
        empresa.Movil = Texto.Limpiar(datos.Movil);
        empresa.NombreContacto = Texto.Limpiar(datos.NombreContacto);
        empresa.CorreoContacto = Texto.Limpiar(datos.CorreoContacto);
        empresa.TlfContacto = Texto.Limpiar(datos.TlfContacto);
        empresa.MovilContacto = Texto.Limpiar(datos.MovilContacto);
    }
}
