/**
 * Máximo "redondo" para el eje de un gráfico y sus marcas: 26 350 -> máximo 30 000 con marcas 0, 10 000, 20 000, 30 000.
 * Devuelve siempre al menos dos marcas (0 y un máximo positivo) para que el eje nunca quede vacío.
 */
export function escalaDelEje(valorMaximo: number, marcasObjetivo = 4): { maximo: number; marcas: number[] } {
  if (!Number.isFinite(valorMaximo) || valorMaximo <= 0) return { maximo: 1, marcas: [0, 1] };

  const pasoBruto = valorMaximo / marcasObjetivo;
  const magnitud = Math.pow(10, Math.floor(Math.log10(pasoBruto)));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * magnitud).find((p) => p >= pasoBruto) ?? 10 * magnitud;
  const cantidad = Math.ceil(valorMaximo / paso);
  const marcas = Array.from({ length: cantidad + 1 }, (_, i) => Number((i * paso).toFixed(6)));
  return { maximo: marcas[marcas.length - 1], marcas };
}

/** Valor abreviado para las marcas del eje: 1500 -> "1.5 mil"; 2 500 000 -> "2.5 M". */
export function abreviar(valor: number): string {
  const absoluto = Math.abs(valor);
  const recortar = (n: number) => String(Number(n.toFixed(1)));
  if (absoluto >= 1_000_000) return `${recortar(valor / 1_000_000)} M`;
  if (absoluto >= 1_000) return `${recortar(valor / 1_000)} mil`;
  return String(valor);
}
