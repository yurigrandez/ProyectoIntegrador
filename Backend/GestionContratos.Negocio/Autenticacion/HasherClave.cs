using BCrypt.Net;

namespace GestionContratos.Negocio.Autenticacion;

/// <summary>Hash de claves con BCrypt (la sal va dentro del hash).</summary>
public class HasherClave : IHasherClave
{
    private const int FactorTrabajo = 11;

    public string Generar(string clave) => BCrypt.Net.BCrypt.HashPassword(clave, FactorTrabajo);

    public bool Verificar(string clave, string hash)
    {
        if (string.IsNullOrEmpty(hash))
            return false;

        try
        {
            return BCrypt.Net.BCrypt.Verify(clave, hash);
        }
        catch (SaltParseException)
        {
            return false; // el valor guardado no es un hash BCrypt válido
        }
    }
}
