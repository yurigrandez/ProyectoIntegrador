using System.Security.Claims;
using System.Text;
using GestionContratos.Comun.Configuracion;
using GestionContratos.DTOs.Autenticacion;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace GestionContratos.Negocio.Autenticacion;

public class GeneradorToken(IOptions<JwtOpciones> opciones) : IGeneradorToken
{
    private readonly JwtOpciones _jwt = opciones.Value;

    public (string Token, DateTime Expira) Generar(UsuarioSesion usuario)
    {
        var expira = DateTime.UtcNow.AddMinutes(_jwt.MinutosExpiracion);
        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(
            [
                new Claim(JwtRegisteredClaimNames.Sub, usuario.Id.ToString()),
                new Claim("codigo", usuario.Codigo),
                new Claim("nombre", usuario.NombreCompleto),
                new Claim(ClaimTypes.Role, usuario.Rol)
            ]),
            Issuer = _jwt.Emisor,
            Audience = _jwt.Audiencia,
            Expires = expira,
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Key)), SecurityAlgorithms.HmacSha256)
        };
        return (new JsonWebTokenHandler().CreateToken(descriptor), expira);
    }
}
