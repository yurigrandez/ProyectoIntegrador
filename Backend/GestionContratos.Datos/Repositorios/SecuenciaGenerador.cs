using Microsoft.EntityFrameworkCore;

namespace GestionContratos.Datos.Repositorios;

/// <summary>Entrega el siguiente número de una secuencia (tabSECUENCIA) de forma atómica.</summary>
public interface ISecuenciaGenerador
{
    /// <summary>
    /// Incrementa y devuelve el número de la secuencia (Tabla, Anio, Prefijo); la crea en 1 si no existe.
    /// Es seguro ante solicitudes simultáneas. El número se consume aunque la operación posterior falle (puede haber saltos).
    /// </summary>
    Task<int> SiguienteAsync(string tabla, string anio, string prefijo, CancellationToken ct = default);
}

public class SecuenciaGenerador(GestionContratosDbContext contexto) : ISecuenciaGenerador
{
    public async Task<int> SiguienteAsync(string tabla, string anio, string prefijo, CancellationToken ct = default)
    {
        // MERGE con HOLDLOCK: la fila se bloquea mientras se incrementa o se inserta, sin duplicados ni números repetidos.
        var resultado = await contexto.Database.SqlQuery<int>($"""
            MERGE tabSECUENCIA WITH (HOLDLOCK) AS s
            USING (SELECT {tabla} AS Tabla, {anio} AS Anio, {prefijo} AS Prefijo) AS o
               ON s.Tabla = o.Tabla AND s.Anio = o.Anio AND s.Prefijo = o.Prefijo
            WHEN MATCHED THEN UPDATE SET Numero = ISNULL(s.Numero, 0) + 1, FechaModificacion = GETDATE()
            WHEN NOT MATCHED THEN INSERT (Tabla, Anio, Prefijo, Numero) VALUES (o.Tabla, o.Anio, o.Prefijo, 1)
            OUTPUT inserted.Numero AS Value;
            """).ToListAsync(ct);
        return resultado.Single();
    }
}
