import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const circulo = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;

const rect = (x: number, y: number, w: number, h: number, r = 2) =>
  `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}` +
  `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;

/** Trazos de cada icono en una cuadrícula de 24x24 (estilo de línea, un solo color). */
const ICONOS = {
  panel: [rect(3, 3, 7, 9, 1), rect(14, 3, 7, 5, 1), rect(14, 12, 7, 9, 1), rect(3, 16, 7, 5, 1)],
  usuarios: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', circulo(9, 7, 4), 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  usuario: [circulo(12, 8, 4), 'M4 21v-1a7 7 0 0 1 7-7h2a7 7 0 0 1 7 7v1'],
  edificio: ['M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z', 'M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2', 'M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2', 'M10 6h4M10 10h4M10 14h4M10 18h4'],
  tienda: ['M3 9l1-5h16l1 5', 'M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0', 'M5 12v8h14v-8', 'M10 20v-5h4v5'],
  contrato: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z', 'M14 2v6h6', 'M8 13h8M8 17h8M8 9h2'],
  pago: [rect(2, 6, 20, 12, 2), circulo(12, 12, 2.5), 'M6 12h.01M18 12h.01'],
  alerta: ['m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3', 'M12 9v4', 'M12 17h.01'],
  mas: ['M5 12h14M12 5v14'],
  editar: ['M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z', 'm15 5 4 4'],
  papelera: ['M3 6h18', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', 'M10 11v6M14 11v6'],
  check: ['M20 6 9 17l-5-5'],
  x: ['M18 6 6 18M6 6l12 12'],
  buscar: [circulo(11, 11, 8), 'm21 21-4.3-4.3'],
  menu: ['M4 6h16M4 12h16M4 18h16'],
  salir: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'm16 17 5-5-5-5', 'M21 12H9'],
  'flecha-der': ['m9 18 6-6-6-6'],
  'flecha-izq': ['m15 18-6-6 6-6'],
  ojo: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z', circulo(12, 12, 3)],
  calendario: [rect(3, 4, 18, 18, 2), 'M16 2v4M8 2v4M3 10h18'],
  info: [circulo(12, 12, 10), 'M12 16v-4M12 8h.01'],
  'circulo-check': [circulo(12, 12, 10), 'm9 12 2 2 4-4'],
  'circulo-x': [circulo(12, 12, 10), 'm15 9-6 6M9 9l6 6'],
  reloj: [circulo(12, 12, 10), 'M12 6v6l4 2'],
  candado: [rect(3, 11, 18, 11, 2), 'M7 11V7a5 5 0 0 1 10 0v4'],
  refrescar: ['M3 12a9 9 0 0 1 15-6.7L21 8', 'M21 3v5h-5', 'M21 12a9 9 0 0 1-15 6.7L3 16', 'M3 21v-5h5'],
  ayuda: [circulo(12, 12, 10), 'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3', 'M12 17h.01'],
  tabla: [rect(3, 3, 18, 18, 2), 'M3 9h18M3 15h18M9 3v18'],
  grafico: ['M3 3v18h18', 'M8 17v-6M13 17V7M18 17v-4']
} as const;

export type NombreIcono = keyof typeof ICONOS;

/** Icono decorativo en línea. Si el icono comunica algo por sí solo, acompáñelo siempre de texto. */
@Component({
  selector: 'gc-icono',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.width]="tamano()" [attr.height]="tamano()" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
      @for (trazo of trazos(); track $index) {
        <path [attr.d]="trazo" />
      }
    </svg>
  `,
  styles: `
    :host { display: inline-flex; flex: 0 0 auto; line-height: 0; }
  `
})
export class Icono {
  readonly nombre = input.required<NombreIcono>();
  readonly tamano = input(20);
  protected readonly trazos = computed<readonly string[]>(() => ICONOS[this.nombre()]);
}
