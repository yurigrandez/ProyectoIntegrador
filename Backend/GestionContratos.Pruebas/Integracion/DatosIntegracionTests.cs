using GestionContratos.Datos;
using GestionContratos.Datos.Repositorios;
using GestionContratos.Entidades;
using GestionContratos.Pruebas.Infraestructura;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace GestionContratos.Pruebas.Integracion;

/// <summary>Auditoría y baja lógica sobre la BD de pruebas. Cada prueba se revierte con rollback.</summary>
public class DatosIntegracionTests(ApiFactory fabrica) : IClassFixture<ApiFactory>
{
    private static Cliente NuevoCliente() => new()
    {
        Codigo = "T" + Guid.NewGuid().ToString("N")[..10],
        Nombre = "Cliente de prueba"
    };

    [Fact]
    public async Task Agregar_AsignaFechaCreacionAutomaticamente()
    {
        using var alcance = fabrica.Services.CreateScope();
        var contexto = alcance.ServiceProvider.GetRequiredService<GestionContratosDbContext>();
        var unidad = alcance.ServiceProvider.GetRequiredService<IUnidadTrabajo>();
        await using var transaccion = await contexto.Database.BeginTransactionAsync();

        var cliente = NuevoCliente();
        await unidad.Repositorio<Cliente>().AgregarAsync(cliente);
        await unidad.GuardarAsync();

        Assert.NotNull(cliente.FechaCreacion);
        Assert.Null(cliente.FechaModificacion);
        await transaccion.RollbackAsync();
    }

    [Fact]
    public async Task Actualizar_AsignaFechaModificacionYConservaFechaCreacion()
    {
        using var alcance = fabrica.Services.CreateScope();
        var contexto = alcance.ServiceProvider.GetRequiredService<GestionContratosDbContext>();
        var unidad = alcance.ServiceProvider.GetRequiredService<IUnidadTrabajo>();
        await using var transaccion = await contexto.Database.BeginTransactionAsync();
        var cliente = NuevoCliente();
        await unidad.Repositorio<Cliente>().AgregarAsync(cliente);
        await unidad.GuardarAsync();
        var creacion = cliente.FechaCreacion;

        cliente.Nombre = "Nombre modificado";
        await unidad.GuardarAsync();

        Assert.NotNull(cliente.FechaModificacion);
        Assert.Equal(creacion, cliente.FechaCreacion);
        await transaccion.RollbackAsync();
    }

    [Fact]
    public async Task Desactivar_OcultaElRegistroEnLasConsultas()
    {
        using var alcance = fabrica.Services.CreateScope();
        var contexto = alcance.ServiceProvider.GetRequiredService<GestionContratosDbContext>();
        var unidad = alcance.ServiceProvider.GetRequiredService<IUnidadTrabajo>();
        var repositorio = unidad.Repositorio<Cliente>();
        await using var transaccion = await contexto.Database.BeginTransactionAsync();
        var cliente = NuevoCliente();
        await repositorio.AgregarAsync(cliente);
        await unidad.GuardarAsync();

        repositorio.Desactivar(cliente);
        await unidad.GuardarAsync();

        Assert.False(await repositorio.ExisteAsync(c => c.Id == cliente.Id));
        Assert.True(await contexto.Clientes.IgnoreQueryFilters().AnyAsync(c => c.Id == cliente.Id));
        await transaccion.RollbackAsync();
    }

    [Fact]
    public async Task Consultar_CargaRelacionesDelModelo()
    {
        using var alcance = fabrica.Services.CreateScope();
        var unidad = alcance.ServiceProvider.GetRequiredService<IUnidadTrabajo>();

        var contrato = await unidad.Repositorio<Contrato>().Consultar()
            .Include(c => c.Cliente).Include(c => c.Local).Include(c => c.CronogramaPagos)
            .FirstAsync(c => c.CronogramaPagos.Any());

        Assert.NotNull(contrato.Cliente);
        Assert.NotNull(contrato.Local);
        Assert.NotEmpty(contrato.CronogramaPagos);
    }
}
