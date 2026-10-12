using System.Security.Claims;
using GestionContratos.Comun.Configuracion;
using GestionContratos.DTOs.Autenticacion;
using GestionContratos.Negocio.Autenticacion;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;

namespace GestionContratos.Pruebas.Unitarias;

public class AutenticacionUnitariaTests
{
    private readonly HasherClave _hasher = new();

    [Fact]
    public void Hasher_VerificaLaClaveOriginal()
    {
        var hash = _hasher.Generar("Secreta123*");

        Assert.True(_hasher.Verificar("Secreta123*", hash));
        Assert.False(_hasher.Verificar("otra", hash));
        Assert.NotEqual("Secreta123*", hash);
    }

    [Fact]
    public void Hasher_DosHashesDeLaMismaClaveSonDistintos()
    {
        Assert.NotEqual(_hasher.Generar("igual"), _hasher.Generar("igual"));
    }

    [Theory]
    [InlineData("")]
    [InlineData("texto-plano")]
    [InlineData("PENDIENTE_HASH")]
    public void Hasher_ValorQueNoEsHash_NoVerifica(string almacenado)
    {
        Assert.False(_hasher.Verificar("cualquiera", almacenado));
    }

    [Fact]
    public void GeneradorToken_IncluyeLosClaimsDelUsuarioYExpira()
    {
        var jwt = new JwtOpciones { Key = "clave-solo-para-pruebas-automaticas-0123456789", MinutosExpiracion = 30 };
        var generador = new GeneradorToken(Options.Create(jwt));
        var usuario = new UsuarioSesion { Id = 7, Codigo = "ADMIN", NombreCompleto = "Carlos Mendoza", Rol = "ADM" };

        var (token, expira) = generador.Generar(usuario);

        var leido = new JsonWebTokenHandler().ReadJsonWebToken(token);
        Assert.Equal("7", leido.Subject);
        Assert.Equal("ADMIN", leido.GetClaim("codigo").Value);
        Assert.Equal("ADM", leido.GetClaim(ClaimTypes.Role).Value);
        Assert.Equal(jwt.Emisor, leido.Issuer);
        Assert.InRange(expira, DateTime.UtcNow.AddMinutes(29), DateTime.UtcNow.AddMinutes(31));
    }
}
