using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GestionContratos.Entidades;

namespace GestionContratos.Datos.Configuraciones;

public class PagoConfiguracion : IEntityTypeConfiguration<Pago>
{
    public void Configure(EntityTypeBuilder<Pago> builder)
    {
        builder.ToTable("tabPAGOS");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.IdContrato).IsRequired();
        builder.Property(e => e.IdMedioPago).IsRequired();
        builder.Property(e => e.IdTipoMoneda).IsRequired();
        builder.Property(e => e.IdUsuarioRegistra).IsRequired();
        builder.Property(e => e.FechaPago).HasColumnType("smalldatetime").IsRequired();
        builder.Property(e => e.Monto).HasColumnType("decimal(18,2)").IsRequired();
        builder.Property(e => e.NroOperacion).HasMaxLength(50);
        builder.Property(e => e.FechaCreacion).HasColumnType("smalldatetime").HasDefaultValueSql("getdate()");
        builder.Property(e => e.FechaModificacion).HasColumnType("smalldatetime");
        builder.Property(e => e.FechaDesactivacion).HasColumnType("smalldatetime");
        builder.HasOne(e => e.Comprobante).WithMany(p => p.Pagos).HasForeignKey(e => e.IdComprobante).HasConstraintName("fk_Pago_Comprobante").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.Contrato).WithMany(p => p.Pagos).HasForeignKey(e => e.IdContrato).HasConstraintName("fk_Pago_Contrato").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.CronogramaPago).WithMany(p => p.Pagos).HasForeignKey(e => e.IdCronogramaPago).HasConstraintName("fk_Pago_Cronograma").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.MedioPago).WithMany().HasForeignKey(e => e.IdMedioPago).HasConstraintName("fk_Pago_MedioPago").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.TipoMoneda).WithMany().HasForeignKey(e => e.IdTipoMoneda).HasConstraintName("fk_Pago_TipoMoneda").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.UsuarioRegistra).WithMany().HasForeignKey(e => e.IdUsuarioRegistra).HasConstraintName("fk_Pago_UsuRegistra").OnDelete(DeleteBehavior.Restrict);
    }
}
