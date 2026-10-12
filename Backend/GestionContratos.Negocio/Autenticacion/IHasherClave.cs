namespace GestionContratos.Negocio.Autenticacion;

public interface IHasherClave
{
    string Generar(string clave);
    bool Verificar(string clave, string hash);
}
