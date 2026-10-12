using System.Linq.Expressions;
using GestionContratos.Entidades;
using Microsoft.EntityFrameworkCore;

namespace GestionContratos.Datos;

public class GestionContratosDbContext(DbContextOptions<GestionContratosDbContext> opciones) : DbContext(opciones)
{
    public DbSet<Adenda> Adendas => Set<Adenda>();
    public DbSet<Cliente> Clientes => Set<Cliente>();
    public DbSet<ComprobanteDetalle> ComprobanteDetalles => Set<ComprobanteDetalle>();
    public DbSet<Comprobante> Comprobantes => Set<Comprobante>();
    public DbSet<Concepto> Conceptos => Set<Concepto>();
    public DbSet<Contrato> Contratos => Set<Contrato>();
    public DbSet<CronogramaPago> CronogramaPagos => Set<CronogramaPago>();
    public DbSet<DocumentoContrato> DocumentosContrato => Set<DocumentoContrato>();
    public DbSet<Empresa> Empresas => Set<Empresa>();
    public DbSet<Estado> Estados => Set<Estado>();
    public DbSet<Evento> Eventos => Set<Evento>();
    public DbSet<Garantia> Garantias => Set<Garantia>();
    public DbSet<Incidencia> Incidencias => Set<Incidencia>();
    public DbSet<Local> Locales => Set<Local>();
    public DbSet<MedioPago> MediosPago => Set<MedioPago>();
    public DbSet<Pago> Pagos => Set<Pago>();
    public DbSet<Secuencia> Secuencias => Set<Secuencia>();
    public DbSet<TipoComprobante> TiposComprobante => Set<TipoComprobante>();
    public DbSet<TipoDocumento> TiposDocumento => Set<TipoDocumento>();
    public DbSet<TipoIncidencia> TiposIncidencia => Set<TipoIncidencia>();
    public DbSet<TipoLocal> TiposLocal => Set<TipoLocal>();
    public DbSet<TipoMoneda> TiposMoneda => Set<TipoMoneda>();
    public DbSet<TipoUsuario> TiposUsuario => Set<TipoUsuario>();
    public DbSet<Usuario> Usuarios => Set<Usuario>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(GestionContratosDbContext).Assembly);

        // Baja lógica: toda consulta excluye los registros con FechaDesactivacion
        // (usar IgnoreQueryFilters() para incluirlos).
        foreach (var tipo in modelBuilder.Model.GetEntityTypes().Where(t => typeof(EntidadBase).IsAssignableFrom(t.ClrType)))
        {
            var parametro = Expression.Parameter(tipo.ClrType, "e");
            var filtro = Expression.Lambda(
                Expression.Equal(
                    Expression.Property(parametro, nameof(EntidadBase.FechaDesactivacion)),
                    Expression.Constant(null, typeof(DateTime?))),
                parametro);
            modelBuilder.Entity(tipo.ClrType).HasQueryFilter(filtro);
        }
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        AplicarAuditoria();
        return base.SaveChangesAsync(cancellationToken);
    }

    public override int SaveChanges()
    {
        AplicarAuditoria();
        return base.SaveChanges();
    }

    /// <summary>Completa FechaCreacion y FechaModificacion (hora local, igual que getdate() de SQL Server).</summary>
    private void AplicarAuditoria()
    {
        var ahora = DateTime.Now;
        foreach (var entrada in ChangeTracker.Entries<EntidadBase>())
        {
            if (entrada.State == EntityState.Added)
            {
                entrada.Entity.FechaCreacion ??= ahora;
            }
            else if (entrada.State == EntityState.Modified)
            {
                entrada.Property(e => e.FechaCreacion).IsModified = false;
                entrada.Entity.FechaModificacion = ahora;
            }
        }
    }
}
