using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GestionContratos.Entidades;

namespace GestionContratos.Datos.Configuraciones;

public class ComprobanteConfiguracion : IEntityTypeConfiguration<Comprobante>
{
    public void Configure(EntityTypeBuilder<Comprobante> builder)
    {
        builder.ToTable("tabCOMPROBANTES");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.IdEmpresa).IsRequired();
        builder.Property(e => e.IdTipoComprobante).IsRequired();
        builder.Property(e => e.NroComprobante).HasMaxLength(10).IsRequired();
        builder.Property(e => e.IdCliente).IsRequired();
        builder.Property(e => e.IdUsuarioRegistra).IsRequired();
        builder.Property(e => e.FechaEmision).HasColumnType("smalldatetime");
        builder.Property(e => e.SubTotal).HasColumnType("decimal(18,2)");
        builder.Property(e => e.Igv).HasColumnType("decimal(18,2)");
        builder.Property(e => e.ImporteTotal).HasColumnType("decimal(18,2)");
        builder.Property(e => e.FechaCreacion).HasColumnType("smalldatetime").HasDefaultValueSql("getdate()");
        builder.Property(e => e.FechaModificacion).HasColumnType("smalldatetime");
        builder.Property(e => e.FechaDesactivacion).HasColumnType("smalldatetime");
        builder.HasIndex(e => new { e.IdEmpresa, e.IdTipoComprobante, e.NroComprobante }).HasDatabaseName("uq_Comprobante_Empresa_Tipo_Nro").IsUnique();
        builder.HasOne(e => e.Cliente).WithMany(p => p.Comprobantes).HasForeignKey(e => e.IdCliente).HasConstraintName("fk_Comprobante_Cliente").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.Contrato).WithMany(p => p.Comprobantes).HasForeignKey(e => e.IdContrato).HasConstraintName("fk_Comprobante_Contrato").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.Empresa).WithMany(p => p.Comprobantes).HasForeignKey(e => e.IdEmpresa).HasConstraintName("fk_Comprobante_Empresa").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.TipoComprobante).WithMany().HasForeignKey(e => e.IdTipoComprobante).HasConstraintName("fk_Comprobante_TipoComprobante").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.TipoMoneda).WithMany().HasForeignKey(e => e.IdTipoMoneda).HasConstraintName("fk_Comprobante_TipoMoneda").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.UsuarioRegistra).WithMany().HasForeignKey(e => e.IdUsuarioRegistra).HasConstraintName("fk_Comprobante_UsuRegistra").OnDelete(DeleteBehavior.Restrict);
    }
}
