namespace GestionContratos.Entidades;

public class DocumentoContrato : EntidadBase
{
    public int IdContrato { get; set; }
    public int IdUsuarioRegistra { get; set; }
    public string? Nombre { get; set; }
    public string? Descripcion { get; set; }
    public byte[]? Archivo { get; set; }
    public string? Extension { get; set; }

    public Contrato Contrato { get; set; } = null!;
    public Usuario UsuarioRegistra { get; set; } = null!;
}
