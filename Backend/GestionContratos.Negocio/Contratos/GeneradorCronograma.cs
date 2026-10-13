namespace GestionContratos.Negocio.Contratos;

/// <summary>Una cuota calculada, antes de guardarse.</summary>
public record CuotaCalculada(int IdConcepto, int NroCuota, DateTime FechaVencimiento, decimal Monto);

/// <summary>
/// Calcula el cronograma de cuotas mensuales de un contrato.
///
/// Reglas:
///  - Hay una cuota por cada mes que empieza dentro de la vigencia (el último mes se cobra completo aunque
///    el contrato termine antes de cumplirlo).
///  - Cada cuota vence el día de pago del mes que le corresponde; si el mes es más corto, el último día.
///  - La primera cuota se cobra completa. Si el día de pago del primer mes ya pasó al iniciar el contrato,
///    vence el día de inicio (entrega del local).
///  - Ninguna cuota vence después de la fecha de fin del contrato.
/// </summary>
public static class GeneradorCronograma
{
    public static IReadOnlyList<CuotaCalculada> Generar(
        DateTime inicio, DateTime fin, int diaPago, IEnumerable<(int IdConcepto, decimal Monto)> conceptos)
    {
        inicio = inicio.Date;
        fin = fin.Date;
        var montos = conceptos.Where(c => c.Monto > 0).ToList();
        var cuotas = new List<CuotaCalculada>();
        var primerDiaMes = new DateTime(inicio.Year, inicio.Month, 1);

        for (var nro = 1; inicio.AddMonths(nro - 1) <= fin; nro++)
        {
            var mes = primerDiaMes.AddMonths(nro - 1);
            var vencimiento = mes.AddDays(Math.Min(diaPago, DateTime.DaysInMonth(mes.Year, mes.Month)) - 1);
            if (vencimiento < inicio) vencimiento = inicio;
            if (vencimiento > fin) vencimiento = fin;

            foreach (var (idConcepto, monto) in montos)
                cuotas.Add(new CuotaCalculada(idConcepto, nro, vencimiento, monto));
        }
        return cuotas;
    }
}
