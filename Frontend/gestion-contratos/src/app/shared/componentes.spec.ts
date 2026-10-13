import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { IngresoMensual } from '../core/api/modelos';
import { Campo, mensajeDeValidacion } from './campo/campo';
import { Estado } from './estado/estado';
import { BarraApilada, Segmento } from './graficos/barra-apilada';
import { BarrasHorizontales, FilaBarra } from './graficos/barras-horizontales';
import { ColumnasIngresos } from './graficos/columnas-ingresos';
import { Kpi } from './kpi/kpi';
import { Modal } from './modal/modal';
import { Paginacion, paginasVisibles } from './paginacion/paginacion';

const html = (fixture: { nativeElement: unknown }) => fixture.nativeElement as HTMLElement;
const texto = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('paginación', () => {
  it('muestra todas las páginas cuando son pocas', () => {
    expect(paginasVisibles(1, 1)).toEqual([1]);
    expect(paginasVisibles(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('resume con puntos suspensivos cuando son muchas', () => {
    expect(paginasVisibles(1, 20)).toEqual([1, 2, '…', 20]);
    expect(paginasVisibles(10, 20)).toEqual([1, '…', 9, 10, 11, '…', 20]);
    expect(paginasVisibles(20, 20)).toEqual([1, '…', 19, 20]);
  });

  it('indica el rango visible, desactiva los extremos y avisa el cambio de página', () => {
    const fixture = TestBed.createComponent(Paginacion);
    fixture.componentRef.setInput('pagina', 1);
    fixture.componentRef.setInput('tamano', 15);
    fixture.componentRef.setInput('total', 40);
    const cambios: number[] = [];
    fixture.componentInstance.cambiar.subscribe((p) => cambios.push(p));
    fixture.detectChanges();

    expect(texto(html(fixture).querySelector('.resumen'))).toBe('Mostrando 1–15 de 40');
    const botones = html(fixture).querySelectorAll<HTMLButtonElement>('button');
    expect(botones[0].disabled).toBe(true); // anterior
    html(fixture).querySelector<HTMLButtonElement>('button[aria-label="Página siguiente"]')!.click();
    html(fixture).querySelector<HTMLButtonElement>('button[aria-label="Página 3"]')!.click();
    expect(cambios).toEqual([2, 3]);
  });

  it('no muestra botones si todo cabe en una página', () => {
    const fixture = TestBed.createComponent(Paginacion);
    fixture.componentRef.setInput('pagina', 1);
    fixture.componentRef.setInput('tamano', 15);
    fixture.componentRef.setInput('total', 4);
    fixture.detectChanges();

    expect(texto(html(fixture).querySelector('.resumen'))).toBe('Mostrando 1–4 de 4');
    expect(html(fixture).querySelectorAll('button')).toHaveLength(0);
  });
});

describe('campo de formulario', () => {
  it('traduce los errores de validación a lenguaje sencillo', () => {
    expect(mensajeDeValidacion({ required: true })).toBe('Este dato es obligatorio.');
    expect(mensajeDeValidacion({ email: true })).toContain('correo válido');
    expect(mensajeDeValidacion({ maxlength: { requiredLength: 8, actualLength: 9 } })).toBe('Use como máximo 8 caracteres.');
    expect(mensajeDeValidacion({ min: { min: 1, actual: 0 } })).toBe('El valor mínimo es 1.');
    expect(mensajeDeValidacion({ documento: { mensaje: 'El DNI debe tener 8 dígitos.' } })).toBe('El DNI debe tener 8 dígitos.');
    expect(mensajeDeValidacion(null)).toBeNull();
  });

  @Component({
    imports: [Campo, ReactiveFormsModule],
    template: `<gc-campo para="nombre" etiqueta="Nombre" [control]="control" [requerido]="true" ayuda="Como figura en el documento"><input id="nombre" [formControl]="control" /></gc-campo>`
  })
  class Anfitrion {
    control = new FormControl('', Validators.required);
  }

  it('enlaza la etiqueta con el control y muestra la ayuda mientras no haya error', async () => {
    const fixture = TestBed.createComponent(Anfitrion);
    await fixture.whenStable();

    const etiqueta = html(fixture).querySelector('label')!;
    expect(etiqueta.getAttribute('for')).toBe('nombre');
    expect(texto(etiqueta)).toContain('*');
    expect(html(fixture).querySelector('.error')).toBeNull();
    expect(texto(html(fixture).querySelector('.ayuda'))).toBe('Como figura en el documento');
    // El único elemento con ese id es el control, no el contenedor.
    expect(html(fixture).querySelectorAll('#nombre')).toHaveLength(1);
  });

  it('muestra el error solo después de que la persona tocó el campo', async () => {
    const fixture = TestBed.createComponent(Anfitrion);
    await fixture.whenStable();
    expect(html(fixture).querySelector('.error')).toBeNull();

    fixture.componentInstance.control.markAsTouched();
    fixture.detectChanges();

    expect(texto(html(fixture).querySelector('.error'))).toBe('Este dato es obligatorio.');
    expect(html(fixture).querySelector('.ayuda')).toBeNull();
  });
});

describe('etiqueta de estado', () => {
  const crear = (tipo: 'contrato' | 'cuota' | 'local', valor: string | null, diasAtraso = 0) => {
    const fixture = TestBed.createComponent(Estado);
    fixture.componentRef.setInput('tipo', tipo);
    fixture.componentRef.setInput('valor', valor);
    fixture.componentRef.setInput('diasAtraso', diasAtraso);
    fixture.detectChanges();
    return html(fixture).querySelector('.insignia')!;
  };

  it.each([
    ['contrato', 'BOR', 'Borrador', 'neutro'],
    ['contrato', 'VIG', 'Vigente', 'ok'],
    ['contrato', 'VEN', 'Vencido', 'aviso'],
    ['contrato', 'RES', 'Rescindido', 'peligro'],
    ['cuota', 'PAG', 'Pagada', 'ok'],
    ['cuota', 'PAR', 'Pago parcial', 'aviso'],
    ['local', 'OCU', 'Ocupado', 'ok'],
    ['local', 'MAN', 'Mantenimiento', 'aviso']
  ] as const)('%s %s se ve como "%s"', (tipo, valor, esperado, tono) => {
    const insignia = crear(tipo, valor);

    expect(texto(insignia)).toBe(esperado);
    expect(insignia.classList.contains(tono)).toBe(true);
    expect(insignia.querySelector('svg')).not.toBeNull(); // nunca solo color: lleva icono y texto
  });

  it('una cuota con atraso se muestra como vencida aunque esté pendiente', () => {
    const insignia = crear('cuota', 'PEN', 12);

    expect(texto(insignia)).toBe('Vencida');
    expect(insignia.classList.contains('peligro')).toBe(true);
  });

  it('muestra el valor tal cual si no lo conoce', () => {
    expect(texto(crear('contrato', 'XYZ'))).toBe('XYZ');
    expect(texto(crear('contrato', null))).toBe('—');
  });
});

describe('modal', () => {
  @Component({
    imports: [Modal],
    template: `
      @if (abierto()) {
        <gc-modal titulo="Registrar un pago" (cerrar)="abierto.set(false); cierres = cierres + 1">
          <input id="dentro" />
          <button pie type="button" id="aceptar">Aceptar</button>
        </gc-modal>
      }
    `
  })
  class Anfitrion {
    abierto = signal(true);
    cierres = 0;
  }

  it('muestra el título, atrapa el foco dentro y bloquea el desplazamiento del fondo', async () => {
    const fixture = TestBed.createComponent(Anfitrion);
    await fixture.whenStable();
    const dialogo = html(fixture).querySelector('[role=dialog]')!;

    expect(dialogo.getAttribute('aria-modal')).toBe('true');
    expect(texto(dialogo.querySelector('h2'))).toBe('Registrar un pago');
    expect(dialogo.getAttribute('aria-labelledby')).toBe(dialogo.querySelector('h2')!.id);
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.activeElement?.id).toBe('dentro'); // enfoca el primer campo
  });

  it('se cierra con Escape y devuelve el desplazamiento del fondo', async () => {
    const fixture = TestBed.createComponent(Anfitrion);
    await fixture.whenStable();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();

    expect(fixture.componentInstance.cierres).toBe(1);
    expect(html(fixture).querySelector('[role=dialog]')).toBeNull();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('se cierra al tocar fuera y con el botón de cerrar', async () => {
    const fixture = TestBed.createComponent(Anfitrion);
    await fixture.whenStable();

    html(fixture).querySelector<HTMLElement>('.fondo')!.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.cierres).toBe(1);

    fixture.componentInstance.abierto.set(true);
    await fixture.whenStable();
    html(fixture).querySelector<HTMLButtonElement>('button[aria-label="Cerrar ventana"]')!.click();
    expect(fixture.componentInstance.cierres).toBe(2);
  });
});

describe('indicador (KPI)', () => {
  it('muestra la etiqueta, el valor y el detalle, y resalta lo que requiere atención', () => {
    const fixture = TestBed.createComponent(Kpi);
    fixture.componentRef.setInput('etiqueta', 'Deuda vencida');
    fixture.componentRef.setInput('valor', 'S/ 16,050.00');
    fixture.componentRef.setInput('detalle', '12 cuotas atrasadas');
    fixture.componentRef.setInput('tono', 'alerta');
    fixture.detectChanges();

    expect(texto(html(fixture).querySelector('.etiqueta'))).toBe('Deuda vencida');
    expect(texto(html(fixture).querySelector('.valor'))).toBe('S/ 16,050.00');
    expect(texto(html(fixture).querySelector('.detalle'))).toBe('12 cuotas atrasadas');
    expect(html(fixture).querySelector('.kpi')!.classList.contains('alerta')).toBe(true);
    expect(html(fixture).querySelector('[role=meter]')).toBeNull();
  });

  it('limita la barra de avance entre 0 y 100', () => {
    const fixture = TestBed.createComponent(Kpi);
    fixture.componentRef.setInput('etiqueta', 'Cobrado');
    fixture.componentRef.setInput('valor', 'S/ 1');
    fixture.componentRef.setInput('progreso', 135);
    fixture.detectChanges();

    expect(html(fixture).querySelector('[role=meter]')!.getAttribute('aria-valuenow')).toBe('100');
  });
});

describe('gráficos', () => {
  describe('barras horizontales', () => {
    const filas: FilaBarra[] = [
      { etiqueta: 'LOC-001', valor: 80000, detalle: '48 pagos' },
      { etiqueta: 'LOC-002', valor: 40000 },
      { etiqueta: 'LOC-003', valor: 0 }
    ];
    const crear = (valores: FilaBarra[]) => {
      const fixture = TestBed.createComponent(BarrasHorizontales);
      fixture.componentRef.setInput('filas', valores);
      fixture.componentRef.setInput('formato', (n: number) => `S/ ${n}`);
      fixture.detectChanges();
      return fixture;
    };

    it('dibuja cada barra en proporción a la mayor y omite las de valor cero', () => {
      const fixture = crear(filas);
      const marcas = [...html(fixture).querySelectorAll<HTMLElement>('.marca')];

      expect(marcas).toHaveLength(2);
      expect(marcas.map((m) => m.style.getPropertyValue('--p'))).toEqual(['1', '0.5']);
      expect(texto(html(fixture).querySelectorAll('.valor')[2])).toBe('S/ 0'); // el valor igual se informa
    });

    it('cada barra se puede enfocar y expone su valor a los lectores de pantalla', () => {
      const marca = html(crear(filas)).querySelector<HTMLElement>('.marca')!;

      expect(marca.tabIndex).toBe(0);
      expect(marca.getAttribute('aria-label')).toBe('LOC-001: S/ 80000');
    });

    it('ofrece una vista de tabla equivalente', () => {
      const fixture = crear(filas);

      html(fixture).querySelector<HTMLButtonElement>('.encabezado button')!.click();
      fixture.detectChanges();

      expect(html(fixture).querySelector('.marca')).toBeNull();
      expect(html(fixture).querySelectorAll('tbody tr')).toHaveLength(3);
      expect(texto(html(fixture).querySelector('tbody tr'))).toContain('LOC-001');
    });

    it('muestra el texto de "sin datos" cuando no hay filas', () => {
      const fixture = crear([]);
      fixture.componentRef.setInput('textoSinDatos', 'No hay deuda vencida.');
      fixture.detectChanges();

      expect(texto(html(fixture).querySelector('.sin-datos'))).toBe('No hay deuda vencida.');
    });
  });

  describe('barra apilada', () => {
    const segmentos: Segmento[] = [
      { etiqueta: 'Ocupados', valor: 8, color: 'var(--graf-azul)' },
      { etiqueta: 'Disponibles', valor: 3, color: 'var(--graf-naranja)' },
      { etiqueta: 'En mantenimiento', valor: 1, color: 'var(--graf-violeta)' }
    ];

    it('reparte los tramos según el valor y muestra siempre la leyenda con números', () => {
      const fixture = TestBed.createComponent(BarraApilada);
      fixture.componentRef.setInput('segmentos', segmentos);
      fixture.detectChanges();

      const tramos = [...html(fixture).querySelectorAll<HTMLElement>('.tramo')];
      expect(tramos.map((t) => t.style.flexGrow)).toEqual(['8', '3', '1']);
      const leyenda = [...html(fixture).querySelectorAll('.leyenda li')].map((li) => texto(li));
      expect(leyenda[0]).toContain('8 Ocupados (66.7%)');
      expect(leyenda[2]).toContain('1 En mantenimiento (8.3%)');
      expect(html(fixture).querySelector('[role=img]')!.getAttribute('aria-label')).toBe('8 ocupados, 3 disponibles, 1 en mantenimiento');
    });

    it('omite el tramo de valor cero y avisa si no hay datos', () => {
      const fixture = TestBed.createComponent(BarraApilada);
      fixture.componentRef.setInput('segmentos', [{ ...segmentos[0], valor: 0 }, segmentos[1]]);
      fixture.detectChanges();
      expect(html(fixture).querySelectorAll('.tramo')).toHaveLength(1);

      fixture.componentRef.setInput('segmentos', []);
      fixture.componentRef.setInput('textoSinDatos', 'Sin locales.');
      fixture.detectChanges();
      expect(texto(html(fixture).querySelector('.sin-datos'))).toBe('Sin locales.');
    });
  });

  describe('columnas de ingresos', () => {
    const meses: IngresoMensual[] = [
      { mes: '2026-08-01T00:00:00', esperado: 26350, cobrado: 21100, diferencia: -5250, porcCobranza: 80.08 },
      { mes: '2026-09-01T00:00:00', esperado: 26350, cobrado: 21100, diferencia: -5250, porcCobranza: 80.08 },
      { mes: '2026-10-01T00:00:00', esperado: 26350, cobrado: 15850, diferencia: -10500, porcCobranza: 60.15 }
    ];

    it('dibuja un grupo por mes con alturas proporcionales a un eje redondeado', () => {
      const fixture = TestBed.createComponent(ColumnasIngresos);
      fixture.componentRef.setInput('meses', meses);
      fixture.detectChanges();

      const grupos = html(fixture).querySelectorAll('.mes');
      expect(grupos).toHaveLength(3);
      const octubre = grupos[2];
      const [esperado, cobrado] = [...octubre.querySelectorAll<HTMLElement>('.columna')].map((c) => parseFloat(c.style.height));
      expect(esperado).toBeCloseTo((26350 / 30000) * 100, 1); // el eje llega a 30 mil
      expect(cobrado).toBeCloseTo((15850 / 30000) * 100, 1);
      expect(cobrado).toBeLessThan(esperado);
    });

    it('cada mes se puede enfocar y describe lo cobrado frente a lo esperado', () => {
      const fixture = TestBed.createComponent(ColumnasIngresos);
      fixture.componentRef.setInput('meses', meses);
      fixture.detectChanges();
      const octubre = html(fixture).querySelectorAll<HTMLElement>('.mes')[2];

      expect(octubre.tabIndex).toBe(0);
      expect(octubre.getAttribute('aria-label')).toMatch(/oct 2026: cobrado S\/\s?15,850\.00 de S\/\s?26,350\.00 esperados/);
      expect(texto(octubre.querySelector('.tip'))).toContain('60.15%');
    });

    it('incluye la leyenda y una vista de tabla con los mismos datos', () => {
      const fixture = TestBed.createComponent(ColumnasIngresos);
      fixture.componentRef.setInput('meses', meses);
      fixture.detectChanges();
      expect(texto(html(fixture).querySelector('.leyenda'))).toContain('Esperado');
      expect(texto(html(fixture).querySelector('.leyenda'))).toContain('Cobrado');

      html(fixture).querySelector<HTMLButtonElement>('.encabezado button')!.click();
      fixture.detectChanges();

      expect(html(fixture).querySelectorAll('tbody tr')).toHaveLength(3);
      expect(texto(html(fixture).querySelectorAll('tbody tr')[2])).toContain('oct 2026');
    });

    it('con todos los valores en cero igual dibuja el eje sin romperse', () => {
      const fixture = TestBed.createComponent(ColumnasIngresos);
      fixture.componentRef.setInput('meses', [{ mes: '2026-10-01', esperado: 0, cobrado: 0, diferencia: 0, porcCobranza: 0 }]);
      fixture.detectChanges();

      expect(html(fixture).querySelectorAll('.eje-y span').length).toBeGreaterThanOrEqual(2);
    });
  });
});
