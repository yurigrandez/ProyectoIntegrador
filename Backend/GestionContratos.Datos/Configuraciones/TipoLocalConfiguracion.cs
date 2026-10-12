using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GestionContratos.Entidades;

namespace GestionContratos.Datos.Configuraciones;

public class TipoLocalConfiguracion : IEntityTypeConfiguration<TipoLocal>
{
    public void Configure(EntityTypeBuilder<TipoLocal> builder)
    {
        builder.ToTable("tabTIPO_LOCALES");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Tipo).HasColumnName("TipoLocal").HasMaxLength(5).IsRequired();
        builder.Property(e => e.Descripcion).HasMaxLength(150);
        builder.Property(e => e.FechaCreacion).HasColumnType("smalldatetime").HasDefaultValueSql("getdate()");
        builder.Property(e => e.FechaModificacion).HasColumnType("smalldatetime");
        builder.Property(e => e.FechaDesactivacion).HasColumnType("smalldatetime");
        builder.HasIndex(e => e.Tipo).IsUnique();
    }
}
