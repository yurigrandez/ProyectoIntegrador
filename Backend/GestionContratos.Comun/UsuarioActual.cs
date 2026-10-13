namespace GestionContratos.Comun;

/// <summary>Usuario autenticado que ejecuta una operación (se obtiene del token JWT).</summary>
public record UsuarioActual(int Id, string Codigo, string Rol);
