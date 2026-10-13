using System.ComponentModel.DataAnnotations;
using GestionContratos.DTOs.Comunes;

namespace GestionContratos.DTOs.Contratos;

public class ContratoDto
{
    public int Id { get; set; }
    public string Codigo { get; set; } = string.Empty;
    public int IdCliente { get; set; }
    public string? Cliente { get; set; }
    public int IdLocal { get; set; }
    public string? Local { get; set; }
    public DateTime FechaInicio { get; set; }
    public DateTime FechaFin { get; set; }
    public int DiaPago { get; set; }
    public int? IdTipoMoneda { get; set; }
    public string? Moneda { get; set; }
    public decimal? MontoAlquiler { get; set; }
    public decimal? MontoLuz { get; set; }
    public decimal? MontoAgua { get; set; }
    public decimal? MontoMantenimiento { get; set; }
    public decimal? MontoOtros { get; set; }
    /// <summary>Suma de todos los montos mensuales del contrato.</summary>
    public decimal MontoMensual { get; set; }
    public string? Observaciones { get; set; }
    public int? IdEstado { get; set; }
    /// <summary>Abreviatura del estado: BOR, VIG, VEN o RES.</summary>
    public string? Estado { get; set; }
    public string? UsuarioRegistra { get; set; }
    public string? UsuarioAutoriza { get; set; }
    public DateTime? FechaCreacion { get; set; }
}

/// <summary>Datos editables de un contrato (el código se genera solo al crearlo).</summary>
public class ContratoGuardarDto
{
    [Required]
    public int? IdCliente { get; set; }

    [Required]
    public int? IdLocal { get; set; }

    [Required]
    public DateTime? FechaInicio { get; set; }

    [Required]
    public DateTime? FechaFin { get; set; }

    /// <summary>Día del mes en que vencen las cuotas; en los meses más cortos vence el último día.</summary>
    [Required, Range(1, 31)]
    public int? DiaPago { get; set; }

    /// <summary>Si no se indica, se usa soles (PEN).</summary>
    public int? IdTipoMoneda { get; set; }

    [Required, Range(typeof(decimal), "0.01", "1000000000")]
    public decimal? MontoAlquiler { get; set; }

    [Range(typeof(decimal), "0", "1000000000")]
    public decimal? MontoLuz { get; set; }

    [Range(typeof(decimal), "0", "1000000000")]
    public decimal? MontoAgua { get; set; }

    [Range(typeof(decimal), "0", "1000000000")]
    public decimal? MontoMantenimiento { get; set; }

    [Range(typeof(decimal), "0", "1000000000")]
    public decimal? MontoOtros { get; set; }

    public string? Observaciones { get; set; }
}

public class ContratoFiltro : ConsultaPaginada
{
    public int? IdCliente { get; set; }
    public int? IdLocal { get; set; }
    public int? IdEstado { get; set; }
}

public class RescindirContratoDto
{
    /// <summary>Fecha efectiva de la rescisión: entre el inicio del contrato y hoy.</summary>
    [Required]
    public DateTime? Fecha { get; set; }

    [Required, StringLength(500)]
    public string Motivo { get; set; } = string.Empty;
}

public class CuotaDto
{
    public int Id { get; set; }
    public int IdConcepto { get; set; }
    /// <summary>Abreviatura del concepto: ALQ, LUZ, AGU, MAN u OTR.</summary>
    public string? Concepto { get; set; }
    public int NroCuota { get; set; }
    public DateTime FechaVencimiento { get; set; }
    public decimal Monto { get; set; }
    public decimal Pagado { get; set; }
    public decimal Saldo { get; set; }
    public int? IdEstado { get; set; }
    /// <summary>PEN (pendiente), PAR (pago parcial) o PAG (pagada).</summary>
    public string? Estado { get; set; }
    /// <summary>Días de atraso a hoy; 0 si no está vencida o ya fue pagada.</summary>
    public int DiasAtraso { get; set; }
}

public class ResultadoActualizacionEstadosDto
{
    /// <summary>Contratos vigentes que pasaron a vencidos.</summary>
    public int ContratosVencidos { get; set; }
    /// <summary>Locales cuyo estado cambió (ocupado/disponible).</summary>
    public int LocalesActualizados { get; set; }
}
