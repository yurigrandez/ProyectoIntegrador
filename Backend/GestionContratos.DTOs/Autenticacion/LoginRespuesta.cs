namespace GestionContratos.DTOs.Autenticacion;

public class LoginRespuesta
{
    public string Token { get; set; } = string.Empty;
    public DateTime Expira { get; set; }
    public UsuarioSesion Usuario { get; set; } = new();
}
