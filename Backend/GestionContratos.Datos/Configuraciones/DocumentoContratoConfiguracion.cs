using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GestionContratos.Entidades;

namespace GestionContratos.Datos.Configuraciones;

public class DocumentoContratoConfiguracion : IEntityTypeConfiguration<DocumentoContrato>
{
    public void Configure(EntityTypeBuilder<DocumentoContrato> builder)
    {
        builder.ToTable("tabDOCUMENTOS_CONTRATO");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.IdContrato).IsRequired();
        builder.Property(e => e.IdUsuarioRegistra).IsRequired();
        builder.Property(e => e.Nombre).HasMaxLength(150);
        builder.Property(e => e.Descripcion).HasMaxLength(250);
        builder.Property(e => e.Archivo).HasColumnType("varbinary(max)");
        builder.Property(e => e.Extension).HasMaxLength(5);
        builder.Property(e => e.FechaCreacion).HasColumnType("smalldatetime").HasDefaultValueSql("getdate()");
        builder.Property(e => e.FechaModificacion).HasColumnType("smalldatetime");
        builder.Property(e => e.FechaDesactivacion).HasColumnType("smalldatetime");
        builder.HasOne(e => e.Contrato).WithMany(p => p.DocumentosContrato).HasForeignKey(e => e.IdContrato).HasConstraintName("fk_DocContrato_Contrato").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.UsuarioRegistra).WithMany().HasForeignKey(e => e.IdUsuarioRegistra).HasConstraintName("fk_DocContrato_UsuRegistra").OnDelete(DeleteBehavior.Restrict);
    }
}
