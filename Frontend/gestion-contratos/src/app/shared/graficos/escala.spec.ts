import { abreviar, escalaDelEje } from './escala';

describe('escala de los gráficos', () => {
  it('redondea el máximo a un número limpio y arma las marcas desde cero', () => {
    const { maximo, marcas } = escalaDelEje(26350);

    expect(maximo).toBeGreaterThanOrEqual(26350);
    expect(marcas[0]).toBe(0);
    expect(marcas[marcas.length - 1]).toBe(maximo);
    expect(marcas.length).toBeLessThanOrEqual(7);
  });

  it('usa pasos redondos (1, 2, 2.5 o 5 por potencia de 10)', () => {
    expect(escalaDelEje(26350)).toEqual({ maximo: 30000, marcas: [0, 10000, 20000, 30000] });
    expect(escalaDelEje(100)).toEqual({ maximo: 100, marcas: [0, 25, 50, 75, 100] });
    expect(escalaDelEje(9)).toEqual({ maximo: 10, marcas: [0, 2.5, 5, 7.5, 10] });
  });

  it('las marcas son crecientes y de paso constante', () => {
    const { marcas } = escalaDelEje(1234567);
    const pasos = marcas.slice(1).map((m, i) => m - marcas[i]);

    expect(new Set(pasos).size).toBe(1);
    expect(pasos[0]).toBeGreaterThan(0);
  });

  it('nunca deja el eje vacío cuando no hay datos', () => {
    expect(escalaDelEje(0)).toEqual({ maximo: 1, marcas: [0, 1] });
    expect(escalaDelEje(-5)).toEqual({ maximo: 1, marcas: [0, 1] });
    expect(escalaDelEje(Number.NaN)).toEqual({ maximo: 1, marcas: [0, 1] });
  });

  it('abrevia las marcas del eje', () => {
    expect(abreviar(0)).toBe('0');
    expect(abreviar(500)).toBe('500');
    expect(abreviar(1500)).toBe('1.5 mil');
    expect(abreviar(30000)).toBe('30 mil');
    expect(abreviar(2500000)).toBe('2.5 M');
  });
});
