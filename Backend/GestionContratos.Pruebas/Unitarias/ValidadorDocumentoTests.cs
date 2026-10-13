using GestionContratos.Negocio.Maestros;

namespace GestionContratos.Pruebas.Unitarias;

public class ValidadorDocumentoTests
{
    [Theory]
    [InlineData("DNI", "12345678")]
    [InlineData("dni", "00000001")]
    [InlineData("RUC", "20512345678")]
    [InlineData("RUC", "10412345678")]
    [InlineData("CE", "001234567")]
    [InlineData("PAS", "AB123456")]
    [InlineData("OTR", "lo-que-sea")] // tipos sin regla propia no se validan
    public void Validar_FormatoCorrecto_DevuelveNull(string tipo, string numero)
    {
        Assert.Null(ValidadorDocumento.Validar(tipo, numero));
    }

    [Theory]
    [InlineData("DNI", "1234567")]      // corto
    [InlineData("DNI", "123456789")]    // largo
    [InlineData("DNI", "1234567A")]     // letra
    [InlineData("RUC", "30512345678")]  // prefijo no válido
    [InlineData("RUC", "2051234567")]   // 10 dígitos
    [InlineData("CE", "123")]
    [InlineData("PAS", "12")]
    public void Validar_FormatoIncorrecto_DevuelveMotivo(string tipo, string numero)
    {
        Assert.False(string.IsNullOrWhiteSpace(ValidadorDocumento.Validar(tipo, numero)));
    }

    [Theory]
    [InlineData("20512345678", true)]
    [InlineData("15123456789", true)]
    [InlineData("99123456789", false)]
    [InlineData("", false)]
    public void RucValido_ReconoceElFormato(string ruc, bool esperado)
    {
        Assert.Equal(esperado, ValidadorDocumento.RucValido(ruc));
    }
}
