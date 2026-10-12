using GestionContratos.Comun.Excepciones;
using GestionContratos.Datos.Repositorios;
using GestionContratos.DTOs.Autenticacion;
using GestionContratos.Entidades;
using Microsoft.EntityFrameworkCore;

namespace GestionContratos.Negocio.Autenticacion;

public class AuthServicio(IUnidadTrabajo unidad, IHasherClave hasher, IGeneradorToken generadorToken) : IAuthServicio
{
    public async Task<LoginRespuesta> LoginAsync(LoginSolicitud solicitud, CancellationToken ct = default)
    {
        var usuario = await unidad.Repositorio<Usuario>().Consultar()
            .Include(u => u.TipoUsuario)
            .FirstOrDefaultAsync(u => u.Codigo == solicitud.Codigo, ct);

        // Mismo mensaje para usuario inexistente y clave incorrecta: no revela cuál falló.
        if (usuario is null || usuario.Clave is null || !hasher.Verificar(solicitud.Clave, usuario.Clave))
            throw new ExcepcionNoAutorizado("Usuario o clave incorrectos.");

        if (usuario.TipoUsuario is null)
            throw new ExcepcionNoAutorizado("El usuario no tiene un tipo de usuario asignado.");

        var sesion = new UsuarioSesion
        {
            Id = usuario.Id,
            Codigo = usuario.Codigo,
            NombreCompleto = string.Join(' ', new[] { usuario.Nombre, usuario.Paterno, usuario.Materno }
                .Where(p => !string.IsNullOrWhiteSpace(p))),
            Rol = usuario.TipoUsuario.Abreviatura
        };
        var (token, expira) = generadorToken.Generar(sesion);
        return new LoginRespuesta { Token = token, Expira = expira, Usuario = sesion };
    }
}
