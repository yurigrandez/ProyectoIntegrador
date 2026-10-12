using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GestionContratos.Entidades;

namespace GestionContratos.Datos.Configuraciones;

public class EventoConfiguracion : IEntityTypeConfiguration<Evento>
{
    public void Configure(EntityTypeBuilder<Evento> builder)
    {
        builder.ToTable("tabEVENTOS");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Estacion).HasMaxLength(25);
        builder.Property(e => e.Entidad).HasMaxLength(15);
        builder.Property(e => e.CodigoUsuario).HasMaxLength(15);
        builder.Property(e => e.Mensaje).HasColumnName("mensaje");
        builder.Property(e => e.FechaCreacion).HasColumnType("smalldatetime").HasDefaultValueSql("getdate()");
        builder.Property(e => e.FechaModificacion).HasColumnType("smalldatetime");
        builder.Property(e => e.FechaDesactivacion).HasColumnType("smalldatetime");
    }
}
