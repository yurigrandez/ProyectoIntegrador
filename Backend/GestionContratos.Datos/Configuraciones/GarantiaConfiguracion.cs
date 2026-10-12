using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GestionContratos.Entidades;

namespace GestionContratos.Datos.Configuraciones;

public class GarantiaConfiguracion : IEntityTypeConfiguration<Garantia>
{
    public void Configure(EntityTypeBuilder<Garantia> builder)
    {
        builder.ToTable("tabGARANTIAS");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.IdContrato).IsRequired();
        builder.Property(e => e.Monto).HasColumnType("decimal(18,2)");
        builder.Property(e => e.FechaRecepcion).HasColumnType("smalldatetime");
        builder.Property(e => e.FechaDevolucion).HasColumnType("smalldatetime");
        builder.Property(e => e.FechaCreacion).HasColumnType("smalldatetime").HasDefaultValueSql("getdate()");
        builder.Property(e => e.FechaModificacion).HasColumnType("smalldatetime");
        builder.Property(e => e.FechaDesactivacion).HasColumnType("smalldatetime");
        builder.HasOne(e => e.Contrato).WithMany(p => p.Garantias).HasForeignKey(e => e.IdContrato).HasConstraintName("fk_Garantia_Contrato").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.Estado).WithMany().HasForeignKey(e => e.IdEstado).HasConstraintName("fk_Garantia_Estado").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.MedioPago).WithMany().HasForeignKey(e => e.IdMedioPago).HasConstraintName("fk_Garantia_MedioPago").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.TipoMoneda).WithMany().HasForeignKey(e => e.IdTipoMoneda).HasConstraintName("fk_Garantia_TipoMoneda").OnDelete(DeleteBehavior.Restrict);
    }
}
