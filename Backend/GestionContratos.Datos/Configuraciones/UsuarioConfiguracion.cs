using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GestionContratos.Entidades;

namespace GestionContratos.Datos.Configuraciones;

public class UsuarioConfiguracion : IEntityTypeConfiguration<Usuario>
{
    public void Configure(EntityTypeBuilder<Usuario> builder)
    {
        builder.ToTable("tabUSUARIOS");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Codigo).HasMaxLength(15).IsRequired();
        builder.Property(e => e.Nombre).HasMaxLength(50);
        builder.Property(e => e.Paterno).HasMaxLength(50);
        builder.Property(e => e.Materno).HasMaxLength(50);
        builder.Property(e => e.Correo).HasMaxLength(50);
        builder.Property(e => e.NumeroDocumento).HasMaxLength(25);
        builder.Property(e => e.Direccion).HasMaxLength(250);
        builder.Property(e => e.Telefono).HasMaxLength(25);
        builder.Property(e => e.FechaCreacion).HasColumnType("smalldatetime").HasDefaultValueSql("getdate()");
        builder.Property(e => e.FechaModificacion).HasColumnType("smalldatetime");
        builder.Property(e => e.FechaDesactivacion).HasColumnType("smalldatetime");
        builder.HasIndex(e => e.Codigo).IsUnique();
        builder.HasOne(e => e.TipoDocumento).WithMany().HasForeignKey(e => e.IdTipoDocumento).HasConstraintName("fk_Usuario_TipoDocumento").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.TipoUsuario).WithMany().HasForeignKey(e => e.IdTipoUsuario).HasConstraintName("fk_Usuario_TipoUsuario").OnDelete(DeleteBehavior.Restrict);
    }
}
