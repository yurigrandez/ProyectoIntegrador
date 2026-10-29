using GestionContratos.Datos.Repositorios;
using GestionContratos.Negocio.Comunes;

namespace GestionContratos.Pruebas.Unitarias;

public class GeneradorCodigoTests
{
    private sealed class SecuenciaFalsa : ISecuenciaGenerador
    {
        private int _numero;
        public string? UltimoAnio { get; private set; }

        public Task<int> SiguienteAsync(string tabla, string anio, string prefijo, CancellationToken ct = default)
        {
            UltimoAnio = anio;
            return Task.FromResult(++_numero);
        }
    }

    [Fact]
    public async Task Siguiente_DevuelveElPrefijoYElNumeroConCuatroDigitos()
    {
        var codigo = await GeneradorCodigo.SiguienteAsync(new SecuenciaFalsa(), "tabEMPRESAS", "EMP", _ => Task.FromResult(false));

        Assert.Equal("EMP-0001", codigo);
    }

    [Fact]
    public async Task Siguiente_UsaUnaSolaSerieSinReinicioAnual()
    {
        var secuencia = new SecuenciaFalsa();

        await GeneradorCodigo.SiguienteAsync(secuencia, "tabLOCALES", "LOC", _ => Task.FromResult(false));

        Assert.Equal("0000", secuencia.UltimoAnio);
    }

    [Fact]
    public async Task Siguiente_SaltaLosCodigosQueYaExisten()
    {
        var ocupados = new HashSet<string> { "CLI-0001", "CLI-0002" };

        var codigo = await GeneradorCodigo.SiguienteAsync(new SecuenciaFalsa(), "tabCLIENTES", "CLI",
            c => Task.FromResult(ocupados.Contains(c)));

        Assert.Equal("CLI-0003", codigo);
    }
}
