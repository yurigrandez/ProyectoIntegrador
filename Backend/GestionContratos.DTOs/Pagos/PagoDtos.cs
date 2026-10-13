using System.ComponentModel.DataAnnotations;
using GestionContratos.DTOs.Comunes;

namespace GestionContratos.DTOs.Pagos;

public class PagoDto
{
    public int Id { get; set; }
    public int IdContrato { get; set; }
    public string? CodigoContrato { get; set; }
    public string? Cliente { get; set; }
    public int? IdCronogramaPago { get; set; }
    public int? NroCuota { get; set; }
    /// <summary>Abreviatura del concepto de la cuota: ALQ, LUZ, AGU, MAN u OTR.</summary>
    public string? Concepto { get; set; }
    public int IdMedioPago { get; set; }
    public string? MedioPago { get; set; }
    public string? Moneda { get; set; }
    public DateTime FechaPago { get; set; }
    public decimal Monto { get; set; }
    public string? NroOperacion { get; set; }
    public string? Observacion { get; set; }
    public string? UsuarioRegistra { get; set; }
    public DateTime? FechaCreacion { get; set; }
}

/// <summary>Un pago se aplica a una cuota del cronograma; puede ser parcial pero nunca mayor al saldo.</summary>
public class PagoCrearDto
{
    [Required]
    public int? IdCronogramaPago { get; set; }

    [Required]
    public int? IdMedioPago { get; set; }

    /// <summary>Si no se indica, hoy. No puede ser futura.</summary>
    public DateTime? FechaPago { get; set; }

    [Required, Range(typeof(decimal), "0.01", "1000000000")]
    public decimal? Monto { get; set; }

    [StringLength(50)]
    public string? NroOperacion { get; set; }

    [StringLength(500)]
    public string? Observacion { get; set; }
}

public class PagoFiltro : ConsultaPaginada
{
    public int? IdContrato { get; set; }
    public int? IdCliente { get; set; }
    public int? IdCronogramaPago { get; set; }
    public DateTime? Desde { get; set; }
    public DateTime? Hasta { get; set; }
}

public class AnularPagoDto
{
    [Required, StringLength(500)]
    public string Motivo { get; set; } = string.Empty;
}

/// <summary>Cliente con cuotas vencidas sin pagar por completo.</summary>
public class MorosoDto
{
    public int IdCliente { get; set; }
    public string CodigoCliente { get; set; } = string.Empty;
    public string? Cliente { get; set; }
    public int CuotasVencidas { get; set; }
    public decimal MontoVencido { get; set; }
    public int MaxDiasAtraso { get; set; }
}

public class CuotaVencidaDto
{
    public int IdCronogramaPago { get; set; }
    public int IdCliente { get; set; }
    public int IdContrato { get; set; }
    public string CodigoContrato { get; set; } = string.Empty;
    public string? CodigoLocal { get; set; }
    public string? Concepto { get; set; }
    public int NroCuota { get; set; }
    public DateTime FechaVencimiento { get; set; }
    public decimal Monto { get; set; }
    public decimal Pagado { get; set; }
    public decimal Saldo { get; set; }
    public int DiasAtraso { get; set; }
}
