using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GestionContratos.Entidades;

namespace GestionContratos.Datos.Configuraciones;

public class SecuenciaConfiguracion : IEntityTypeConfiguration<Secuencia>
{
    public void Configure(EntityTypeBuilder<Secuencia> builder)
    {
        builder.ToTable("tabSECUENCIA");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Tabla).HasColumnType("varchar(50)").IsRequired();
        builder.Property(e => e.Anio).HasColumnType("char(4)").IsRequired();
        builder.Property(e => e.Prefijo).HasColumnType("char(3)").IsRequired();
        builder.Property(e => e.FechaCreacion).HasColumnType("smalldatetime").HasDefaultValueSql("getdate()");
        builder.Property(e => e.FechaModificacion).HasColumnType("smalldatetime");
        builder.Property(e => e.FechaDesactivacion).HasColumnType("smalldatetime");
        builder.HasIndex(e => new { e.Tabla, e.Anio, e.Prefijo }).HasDatabaseName("uq_Secuencia_Tabla_Anio_Prefijo").IsUnique();
    }
}
