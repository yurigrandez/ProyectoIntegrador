using System.ComponentModel.DataAnnotations;

namespace GestionContratos.DTOs.Autenticacion;

public class LoginSolicitud
{
    [Required, StringLength(15)]
    public string Codigo { get; set; } = string.Empty;

    [Required, StringLength(100)]
    public string Clave { get; set; } = string.Empty;
}
