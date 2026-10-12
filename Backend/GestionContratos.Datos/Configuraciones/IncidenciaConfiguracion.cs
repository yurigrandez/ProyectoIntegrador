using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GestionContratos.Entidades;

namespace GestionContratos.Datos.Configuraciones;

public class IncidenciaConfiguracion : IEntityTypeConfiguration<Incidencia>
{
    public void Configure(EntityTypeBuilder<Incidencia> builder)
    {
        builder.ToTable("tabINCIDENCIAS");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.IdUsuarioRegistra).IsRequired();
        builder.Property(e => e.IdCliente).IsRequired();
        builder.Property(e => e.IdTipoIncidente).IsRequired();
        builder.Property(e => e.FechaResolucion).HasColumnType("smalldatetime");
        builder.Property(e => e.FechaCreacion).HasColumnType("smalldatetime").HasDefaultValueSql("getdate()");
        builder.Property(e => e.FechaModificacion).HasColumnType("smalldatetime");
        builder.Property(e => e.FechaDesactivacion).HasColumnType("smalldatetime");
        builder.HasOne(e => e.Cliente).WithMany(p => p.Incidencias).HasForeignKey(e => e.IdCliente).HasConstraintName("fk_Incidente_Cliente").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.Contrato).WithMany(p => p.Incidencias).HasForeignKey(e => e.IdContrato).HasConstraintName("fk_Incidente_Contrato").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.Estado).WithMany().HasForeignKey(e => e.IdEstado).HasConstraintName("fk_Incidente_Estado").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.Local).WithMany(p => p.Incidencias).HasForeignKey(e => e.IdLocal).HasConstraintName("fk_Incidente_Local").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.TipoIncidente).WithMany().HasForeignKey(e => e.IdTipoIncidente).HasConstraintName("fk_Incidente_TipoIncidente").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.UsuarioRegistra).WithMany().HasForeignKey(e => e.IdUsuarioRegistra).HasConstraintName("fk_Incidente_UsuRegistra").OnDelete(DeleteBehavior.Restrict);
    }
}
