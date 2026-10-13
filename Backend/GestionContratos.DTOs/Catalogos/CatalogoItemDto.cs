namespace GestionContratos.DTOs.Catalogos;

/// <summary>Elemento de un catálogo, para llenar listas desplegables.</summary>
public class CatalogoItemDto
{
    public int Id { get; set; }
    public string Abreviatura { get; set; } = string.Empty;
    public string? Nombre { get; set; }
}
