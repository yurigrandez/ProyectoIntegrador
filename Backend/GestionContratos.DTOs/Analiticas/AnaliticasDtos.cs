using System.ComponentModel.DataAnnotations;

namespace GestionContratos.DTOs.Analiticas;

/// <summary>Filtro común de las analíticas: sin empresa se consideran todas.</summary>
public class AnaliticaFiltro
{
    public int? IdEmpresa { get; set; }
}

public class IngresosFiltro : AnaliticaFiltro
{
    /// <summary>Primer mes del rango (se usa el mes de la fecha). Por defecto, 11 meses antes de <c>Hasta</c>.</summary>
    public DateTime? Desde { get; set; }

    /// <summary>Último mes del rango (se usa el mes de la fecha). Por defecto, el mes actual.</summary>
    public DateTime? Hasta { get; set; }
}

public class PorVencerFiltro : AnaliticaFiltro
{
    /// <summary>Contratos cuyo plazo termina dentro de estos días (1 a 365).</summary>
    [Range(1, 365)]
    public int Dias { get; set; } = 90;
}

public class TopFiltro : AnaliticaFiltro
{
    [Range(1, 50)]
    public int Top { get; set; } = 5;

    /// <summary>Solo pagos desde esta fecha (inclusive). Sin fecha: todo el historial.</summary>
    public DateTime? Desde { get; set; }

    /// <summary>Solo pagos hasta esta fecha (inclusive).</summary>
    public DateTime? Hasta { get; set; }
}

/// <summary>Indicadores principales del dashboard, a la fecha de corte.</summary>
public class ResumenDto
{
    public DateTime FechaCorte { get; set; }

    public int TotalLocales { get; set; }
    public int LocalesOcupados { get; set; }
    public int LocalesDisponibles { get; set; }
    public int LocalesEnMantenimiento { get; set; }
    /// <summary>Ocupados sobre el total de locales, en porcentaje.</summary>
    public decimal PorcOcupacion { get; set; }

    /// <summary>Contratos autorizados (vigentes) a la fecha, incluidos los que aún no inician.</summary>
    public int ContratosVigentes { get; set; }

    /// <summary>Cuotas que vencen en el mes actual.</summary>
    public decimal EsperadoMes { get; set; }
    /// <summary>Pagos recibidos en el mes actual (de cualquier cuota).</summary>
    public decimal CobradoMes { get; set; }
    public decimal PorcCobranzaMes { get; set; }

    public decimal MontoVencido { get; set; }
    public int CuotasVencidas { get; set; }
    public int ClientesMorosos { get; set; }

    /// <summary>Contratos vigentes que terminan en los próximos 30 días.</summary>
    public int ContratosPorVencer30 { get; set; }
    /// <summary>Ídem, en los próximos 60 días (incluye los de 30).</summary>
    public int ContratosPorVencer60 { get; set; }
    /// <summary>Ídem, en los próximos 90 días (incluye los de 30 y 60).</summary>
    public int ContratosPorVencer90 { get; set; }
}

public class OcupacionDto
{
    public int IdEmpresa { get; set; }
    public string? Empresa { get; set; }
    public int TotalLocales { get; set; }
    /// <summary>Locales con un contrato vigente que cubre la fecha de hoy.</summary>
    public int Ocupados { get; set; }
    public int EnMantenimiento { get; set; }
    public int Disponibles { get; set; }
    public decimal PorcOcupacion { get; set; }
}

public class IngresoMensualDto
{
    /// <summary>Primer día del mes.</summary>
    public DateTime Mes { get; set; }
    /// <summary>Suma de las cuotas que vencen en el mes.</summary>
    public decimal Esperado { get; set; }
    /// <summary>Suma de los pagos recibidos en el mes.</summary>
    public decimal Cobrado { get; set; }
    public decimal Diferencia { get; set; }
    /// <summary>Cobrado sobre esperado del mes, en porcentaje (puede superar 100 si se pagan cuotas atrasadas).</summary>
    public decimal PorcCobranza { get; set; }
}

public class MorosidadResumenDto
{
    public decimal MontoVencido { get; set; }
    public int CuotasVencidas { get; set; }
    public int ClientesMorosos { get; set; }
    public int MaxDiasAtraso { get; set; }
    /// <summary>Deuda por antigüedad: 1-30, 31-60, 61-90 y más de 90 días de atraso.</summary>
    public IReadOnlyList<AntiguedadDeudaDto> Antiguedad { get; set; } = [];
}

public class AntiguedadDeudaDto
{
    public string Rango { get; set; } = string.Empty;
    public int DesdeDias { get; set; }
    /// <summary>Null en el último rango (sin tope).</summary>
    public int? HastaDias { get; set; }
    public int Cuotas { get; set; }
    public decimal Monto { get; set; }
}

public class ContratoPorVencerDto
{
    public int IdContrato { get; set; }
    public string CodigoContrato { get; set; } = string.Empty;
    public int IdCliente { get; set; }
    public string? Cliente { get; set; }
    public int IdLocal { get; set; }
    public string? CodigoLocal { get; set; }
    public DateTime FechaFin { get; set; }
    public int DiasRestantes { get; set; }
    public decimal MontoMensual { get; set; }
}

public class TopLocalDto
{
    public int IdLocal { get; set; }
    public string CodigoLocal { get; set; } = string.Empty;
    public string? Direccion { get; set; }
    public int CantidadPagos { get; set; }
    public decimal TotalCobrado { get; set; }
}

public class TopClienteDto
{
    public int IdCliente { get; set; }
    public string CodigoCliente { get; set; } = string.Empty;
    public string? Cliente { get; set; }
    public int CantidadPagos { get; set; }
    public decimal TotalCobrado { get; set; }
}
