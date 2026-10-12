using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GestionContratos.Entidades;

namespace GestionContratos.Datos.Configuraciones;

public class CronogramaPagoConfiguracion : IEntityTypeConfiguration<CronogramaPago>
{
    public void Configure(EntityTypeBuilder<CronogramaPago> builder)
    {
        builder.ToTable("tabCRONOGRAMA_PAGOS");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.IdContrato).IsRequired();
        builder.Property(e => e.IdConcepto).IsRequired();
        builder.Property(e => e.NroCuota).IsRequired();
        builder.Property(e => e.FechaVencimiento).HasColumnType("smalldatetime").IsRequired();
        builder.Property(e => e.Monto).HasColumnType("decimal(18,2)").IsRequired();
        builder.Property(e => e.FechaCreacion).HasColumnType("smalldatetime").HasDefaultValueSql("getdate()");
        builder.Property(e => e.FechaModificacion).HasColumnType("smalldatetime");
        builder.Property(e => e.FechaDesactivacion).HasColumnType("smalldatetime");
        builder.HasIndex(e => new { e.IdContrato, e.IdConcepto, e.NroCuota }).HasDatabaseName("uq_Cronograma_Contrato_Concepto_Cuota").IsUnique();
        builder.HasOne(e => e.Concepto).WithMany().HasForeignKey(e => e.IdConcepto).HasConstraintName("fk_Cronograma_Concepto").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.Contrato).WithMany(p => p.CronogramaPagos).HasForeignKey(e => e.IdContrato).HasConstraintName("fk_Cronograma_Contrato").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.Estado).WithMany().HasForeignKey(e => e.IdEstado).HasConstraintName("fk_Cronograma_Estado").OnDelete(DeleteBehavior.Restrict);
    }
}
