using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GestionContratos.Entidades;

namespace GestionContratos.Datos.Configuraciones;

public class ContratoConfiguracion : IEntityTypeConfiguration<Contrato>
{
    public void Configure(EntityTypeBuilder<Contrato> builder)
    {
        builder.ToTable("tabCONTRATOS");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Codigo).HasMaxLength(15).IsRequired();
        builder.Property(e => e.IdCliente).IsRequired();
        builder.Property(e => e.IdUsuarioRegistra).IsRequired();
        builder.Property(e => e.IdLocal).IsRequired();
        builder.Property(e => e.FechaInicio).HasColumnType("smalldatetime").IsRequired();
        builder.Property(e => e.FechaFin).HasColumnType("smalldatetime").IsRequired();
        builder.Property(e => e.DiaPago).IsRequired();
        builder.Property(e => e.MontoAlquiler).HasColumnType("decimal(18,2)");
        builder.Property(e => e.MontoLuz).HasColumnType("decimal(18,2)");
        builder.Property(e => e.MontoAgua).HasColumnType("decimal(18,2)");
        builder.Property(e => e.MontoMantenimiento).HasColumnType("decimal(18,2)");
        builder.Property(e => e.MontoOtros).HasColumnType("decimal(18,2)");
        builder.Property(e => e.FechaCreacion).HasColumnType("smalldatetime").HasDefaultValueSql("getdate()");
        builder.Property(e => e.FechaModificacion).HasColumnType("smalldatetime");
        builder.Property(e => e.FechaDesactivacion).HasColumnType("smalldatetime");
        builder.HasIndex(e => e.Codigo).IsUnique();
        builder.HasOne(e => e.Cliente).WithMany(p => p.Contratos).HasForeignKey(e => e.IdCliente).HasConstraintName("fk_Contrato_Cliente").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.Estado).WithMany().HasForeignKey(e => e.IdEstado).HasConstraintName("fk_Contrato_Estado").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.Local).WithMany(p => p.Contratos).HasForeignKey(e => e.IdLocal).HasConstraintName("fk_Contrato_Local").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.TipoMoneda).WithMany().HasForeignKey(e => e.IdTipoMoneda).HasConstraintName("fk_Contrato_TipoMoneda").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.UsuarioAutoriza).WithMany().HasForeignKey(e => e.IdUsuarioAutoriza).HasConstraintName("fk_Contrato_UsuAutoriza").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.UsuarioRegistra).WithMany().HasForeignKey(e => e.IdUsuarioRegistra).HasConstraintName("fk_Contrato_UsuRegistra").OnDelete(DeleteBehavior.Restrict);
    }
}
