using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GestionContratos.Entidades;

namespace GestionContratos.Datos.Configuraciones;

public class ComprobanteDetalleConfiguracion : IEntityTypeConfiguration<ComprobanteDetalle>
{
    public void Configure(EntityTypeBuilder<ComprobanteDetalle> builder)
    {
        builder.ToTable("tabCOMPROBANTE_DETALLES");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.IdComprobante).IsRequired();
        builder.Property(e => e.Concepto).HasMaxLength(250);
        builder.Property(e => e.PrecioUnitario).HasColumnType("decimal(18,2)");
        builder.Property(e => e.SubTotal).HasColumnType("decimal(18,2)");
        builder.Property(e => e.Igv).HasColumnType("decimal(18,2)");
        builder.Property(e => e.FechaCreacion).HasColumnType("smalldatetime").HasDefaultValueSql("getdate()");
        builder.Property(e => e.FechaModificacion).HasColumnType("smalldatetime");
        builder.Property(e => e.FechaDesactivacion).HasColumnType("smalldatetime");
        builder.HasOne(e => e.Comprobante).WithMany(p => p.ComprobanteDetalles).HasForeignKey(e => e.IdComprobante).HasConstraintName("fk_ComDetalle_Comprobante").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.ConceptoRef).WithMany().HasForeignKey(e => e.IdConcepto).HasConstraintName("fk_ComDetalle_Concepto").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.CronogramaPago).WithMany(p => p.ComprobanteDetalles).HasForeignKey(e => e.IdCronogramaPago).HasConstraintName("fk_ComDetalle_Cronograma").OnDelete(DeleteBehavior.Restrict);
    }
}
