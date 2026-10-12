using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GestionContratos.Entidades;

namespace GestionContratos.Datos.Configuraciones;

public class EmpresaConfiguracion : IEntityTypeConfiguration<Empresa>
{
    public void Configure(EntityTypeBuilder<Empresa> builder)
    {
        builder.ToTable("tabEMPRESAS");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Codigo).HasMaxLength(15).IsRequired();
        builder.Property(e => e.Nombre).HasMaxLength(100);
        builder.Property(e => e.Direccion).HasMaxLength(250);
        builder.Property(e => e.Ruc).HasMaxLength(11);
        builder.Property(e => e.Telefono).HasMaxLength(25);
        builder.Property(e => e.Movil).HasMaxLength(15);
        builder.Property(e => e.NombreContacto).HasMaxLength(150);
        builder.Property(e => e.CorreoContacto).HasMaxLength(50);
        builder.Property(e => e.TlfContacto).HasMaxLength(15);
        builder.Property(e => e.MovilContacto).HasMaxLength(15);
        builder.Property(e => e.FechaCreacion).HasColumnType("smalldatetime").HasDefaultValueSql("getdate()");
        builder.Property(e => e.FechaModificacion).HasColumnType("smalldatetime");
        builder.Property(e => e.FechaDesactivacion).HasColumnType("smalldatetime");
        builder.Property(e => e.ImgEmpresa).HasColumnType("varbinary(max)");
        builder.Property(e => e.ExtensionImg).HasMaxLength(5);
        builder.HasIndex(e => e.Codigo).IsUnique();
    }
}
