using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GestionContratos.Entidades;

namespace GestionContratos.Datos.Configuraciones;

public class LocalConfiguracion : IEntityTypeConfiguration<Local>
{
    public void Configure(EntityTypeBuilder<Local> builder)
    {
        builder.ToTable("tabLOCALES");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Codigo).HasMaxLength(15).IsRequired();
        builder.Property(e => e.IdTipoLocal).IsRequired();
        builder.Property(e => e.IdEmpresa).IsRequired();
        builder.Property(e => e.Direccion).HasMaxLength(250);
        builder.Property(e => e.TotalM2).HasColumnType("decimal(18,2)");
        builder.Property(e => e.Dimensiones).HasMaxLength(150);
        builder.Property(e => e.ImgFrontis).HasColumnType("varbinary(max)");
        builder.Property(e => e.FechaCreacion).HasColumnType("smalldatetime").HasDefaultValueSql("getdate()");
        builder.Property(e => e.FechaModificacion).HasColumnType("smalldatetime");
        builder.Property(e => e.FechaDesactivacion).HasColumnType("smalldatetime");
        builder.HasIndex(e => e.Codigo).IsUnique();
        builder.HasOne(e => e.Empresa).WithMany(p => p.Locales).HasForeignKey(e => e.IdEmpresa).HasConstraintName("fk_Locales_Empresas").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.Estado).WithMany().HasForeignKey(e => e.IdEstado).HasConstraintName("fk_Locales_Estado").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.TipoLocal).WithMany().HasForeignKey(e => e.IdTipoLocal).HasConstraintName("fk_Locales_TipoLocal").OnDelete(DeleteBehavior.Restrict);
    }
}
