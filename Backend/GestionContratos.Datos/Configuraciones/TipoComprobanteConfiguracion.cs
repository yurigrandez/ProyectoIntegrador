using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GestionContratos.Entidades;

namespace GestionContratos.Datos.Configuraciones;

public class TipoComprobanteConfiguracion : IEntityTypeConfiguration<TipoComprobante>
{
    public void Configure(EntityTypeBuilder<TipoComprobante> builder)
    {
        builder.ToTable("tabTIPO_COMPROBANTES");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Abreviatura).HasMaxLength(10).IsRequired();
        builder.Property(e => e.Nombre).HasMaxLength(25);
        builder.Property(e => e.Descripcion).HasMaxLength(100);
        builder.Property(e => e.FechaCreacion).HasColumnType("smalldatetime").HasDefaultValueSql("getdate()");
        builder.Property(e => e.FechaModificacion).HasColumnType("smalldatetime");
        builder.Property(e => e.FechaDesactivacion).HasColumnType("smalldatetime");
        builder.HasIndex(e => e.Abreviatura).IsUnique();
    }
}
