using GestionContratos.DTOs.Autenticacion;

namespace GestionContratos.Negocio.Autenticacion;

public interface IGeneradorToken
{
    (string Token, DateTime Expira) Generar(UsuarioSesion usuario);
}
