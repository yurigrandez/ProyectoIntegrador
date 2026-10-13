using GestionContratos.Negocio.Contratos;

namespace GestionContratos.Pruebas.Unitarias;

public class GeneradorCronogramaTests
{
    private const int Alquiler = 1, Mantenimiento = 2, Luz = 3;

    private static IReadOnlyList<CuotaCalculada> Generar(DateTime inicio, DateTime fin, int diaPago, decimal alquiler = 1000m, decimal mant = 0m, decimal luz = 0m) =>
        GeneradorCronograma.Generar(inicio, fin, diaPago, [(Alquiler, alquiler), (Mantenimiento, mant), (Luz, luz)]);

    [Fact]
    public void ContratoDeUnAnio_GeneraDoceCuotasMensualesEnElDiaDePago()
    {
        var cuotas = Generar(new DateTime(2027, 1, 1), new DateTime(2027, 12, 31), diaPago: 15);

        Assert.Equal(12, cuotas.Count);
        Assert.Equal(Enumerable.Range(1, 12), cuotas.Select(c => c.NroCuota));
        Assert.All(cuotas, c => Assert.Equal(15, c.FechaVencimiento.Day));
        Assert.Equal(new DateTime(2027, 1, 15), cuotas[0].FechaVencimiento);
        Assert.Equal(new DateTime(2027, 12, 15), cuotas[11].FechaVencimiento);
    }

    [Fact]
    public void ConceptosConMontoCero_NoGeneranCuotas()
    {
        var cuotas = Generar(new DateTime(2027, 1, 1), new DateTime(2027, 3, 31), 1, alquiler: 500m, mant: 50m, luz: 0m);

        Assert.Equal(6, cuotas.Count);
        Assert.DoesNotContain(cuotas, c => c.IdConcepto == Luz);
        Assert.Equal(3, cuotas.Count(c => c.IdConcepto == Mantenimiento));
    }

    [Fact]
    public void VariosConceptos_ComparteNumeroDeCuotaYVencimiento()
    {
        var cuotas = Generar(new DateTime(2027, 5, 1), new DateTime(2027, 5, 31), 10, alquiler: 800m, mant: 80m);

        Assert.Equal(2, cuotas.Count);
        Assert.All(cuotas, c =>
        {
            Assert.Equal(1, c.NroCuota);
            Assert.Equal(new DateTime(2027, 5, 10), c.FechaVencimiento);
        });
    }

    [Theory]
    [InlineData(2027, 2, 28)]
    [InlineData(2028, 2, 29)] // año bisiesto
    [InlineData(2027, 4, 30)]
    [InlineData(2027, 5, 31)]
    public void DiaDePago31_UsaElUltimoDiaDeMesesCortos(int anio, int mes, int ultimoDia)
    {
        var inicio = new DateTime(anio, mes, 1);
        var cuotas = Generar(inicio, inicio.AddMonths(1).AddDays(-1), diaPago: 31);

        Assert.Single(cuotas);
        Assert.Equal(new DateTime(anio, mes, ultimoDia), cuotas[0].FechaVencimiento);
    }

    [Fact]
    public void PrimeraCuota_SeCobraCompletaYVenceElDiaDeInicioSiElDiaDePagoYaPaso()
    {
        // Inicia el 20 de marzo y el día de pago es el 5: la primera cuota vence al entregar el local.
        var cuotas = Generar(new DateTime(2027, 3, 20), new DateTime(2027, 6, 19), diaPago: 5);

        Assert.Equal(3, cuotas.Count);
        Assert.Equal(new DateTime(2027, 3, 20), cuotas[0].FechaVencimiento);
        Assert.Equal(new DateTime(2027, 4, 5), cuotas[1].FechaVencimiento);
        Assert.Equal(new DateTime(2027, 5, 5), cuotas[2].FechaVencimiento);
        Assert.All(cuotas, c => Assert.Equal(1000m, c.Monto)); // sin prorrateo
    }

    [Fact]
    public void PrimeraCuota_ConDiaDePagoPosteriorAlInicio_VenceEnElDiaDePago()
    {
        var cuotas = Generar(new DateTime(2027, 3, 3), new DateTime(2027, 4, 2), diaPago: 25);

        Assert.Equal(new DateTime(2027, 3, 25), cuotas[0].FechaVencimiento);
    }

    [Fact]
    public void VigenciaQueNoCompletaElUltimoMes_CobraEseMesCompleto()
    {
        // Del 1 de enero al 15 de marzo: enero, febrero y marzo.
        var cuotas = Generar(new DateTime(2027, 1, 1), new DateTime(2027, 3, 15), diaPago: 1);

        Assert.Equal(3, cuotas.Count);
        Assert.Equal(1000m, cuotas[2].Monto);
    }

    [Fact]
    public void NingunaCuotaVenceDespuesDelFinDelContrato()
    {
        var cuotas = Generar(new DateTime(2027, 3, 1), new DateTime(2027, 3, 10), diaPago: 25);

        Assert.Single(cuotas);
        Assert.Equal(new DateTime(2027, 3, 10), cuotas[0].FechaVencimiento);
    }

    [Fact]
    public void InicioEnDia31_NoSaltaMeses()
    {
        // 31 de enero a 27 de febrero: el segundo período empezaría el 28 de febrero, ya fuera del plazo.
        var cuotas = Generar(new DateTime(2027, 1, 31), new DateTime(2027, 2, 27), diaPago: 31);

        Assert.Single(cuotas);
    }

    [Fact]
    public void IgnoraLaHoraDeLasFechas()
    {
        var cuotas = Generar(new DateTime(2027, 1, 1, 15, 30, 0), new DateTime(2027, 1, 31, 23, 59, 0), diaPago: 1);

        Assert.Single(cuotas);
        Assert.Equal(new DateTime(2027, 1, 1), cuotas[0].FechaVencimiento);
    }
}
