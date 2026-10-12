using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GestionContratos.Entidades;

namespace GestionContratos.Datos.Configuraciones;

public class AdendaConfiguracion : IEntityTypeConfiguration<Adenda>
{
    public void Configure(EntityTypeBuilder<Adenda> builder)
    {
        builder.ToTable("tabADENDAS");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Codigo).HasMaxLength(15).IsRequired();
        builder.Property(e => e.IdContrato).IsRequired();
        builder.Property(e => e.IdUsuarioRegistra).IsRequired();
        builder.Property(e => e.FechaAdenda).HasColumnType("smalldatetime");
        builder.Property(e => e.NuevaFechaFin).HasColumnType("smalldatetime");
        builder.Property(e => e.MontoAlquiler).HasColumnType("decimal(18,2)");
        builder.Property(e => e.MontoLuz).HasColumnType("decimal(18,2)");
        builder.Property(e => e.MontoAgua).HasColumnType("decimal(18,2)");
        builder.Property(e => e.MontoMantenimiento).HasColumnType("decimal(18,2)");
        builder.Property(e => e.MontoOtros).HasColumnType("decimal(18,2)");
        builder.Property(e => e.FechaCreacion).HasColumnType("smalldatetime").HasDefaultValueSql("getdate()");
        builder.Property(e => e.FechaModificacion).HasColumnType("smalldatetime");
        builder.Property(e => e.FechaDesactivacion).HasColumnType("smalldatetime");
        builder.HasIndex(e => e.Codigo).IsUnique();
        builder.HasOne(e => e.Contrato).WithMany(p => p.Adendas).HasForeignKey(e => e.IdContrato).HasConstraintName("fk_Adenda_Contrato").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.Estado).WithMany().HasForeignKey(e => e.IdEstado).HasConstraintName("fk_Adenda_Estado").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.UsuarioAutoriza).WithMany().HasForeignKey(e => e.IdUsuarioAutoriza).HasConstraintName("fk_Adenda_UsuAutoriza").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.UsuarioRegistra).WithMany().HasForeignKey(e => e.IdUsuarioRegistra).HasConstraintName("fk_Adenda_UsuRegistra").OnDelete(DeleteBehavior.Restrict);
    }
}
