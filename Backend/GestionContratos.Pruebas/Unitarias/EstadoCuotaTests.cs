using GestionContratos.Negocio.Pagos;

namespace GestionContratos.Pruebas.Unitarias;

public class EstadoCuotaTests
{
    [Theory]
    [InlineData(1000, 0, "PEN")]
    [InlineData(1000, 0.01, "PAR")]
    [InlineData(1000, 999.99, "PAR")]
    [InlineData(1000, 1000, "PAG")]
    [InlineData(1000, 1200, "PAG")] // el sobrepago se impide al registrar, pero el cálculo no debe fallar
    public void Calcular_SegunLoPagado(double monto, double pagado, string esperado)
    {
        Assert.Equal(esperado, EstadoCuota.Calcular((decimal)monto, (decimal)pagado));
    }
}
