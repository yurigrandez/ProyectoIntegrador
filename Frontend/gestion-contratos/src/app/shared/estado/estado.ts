import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icono, NombreIcono } from '../icono/icono';

export type TipoEstado = 'contrato' | 'cuota' | 'local';
type Tono = 'ok' | 'aviso' | 'peligro' | 'info' | 'neutro';

interface Presentacion {
  texto: string;
  tono: Tono;
  icono: NombreIcono;
}

const PRESENTACION: Record<TipoEstado, Record<string, Presentacion>> = {
  contrato: {
    BOR: { texto: 'Borrador', tono: 'neutro', icono: 'editar' },
    VIG: { texto: 'Vigente', tono: 'ok', icono: 'circulo-check' },
    VEN: { texto: 'Vencido', tono: 'aviso', icono: 'reloj' },
    RES: { texto: 'Rescindido', tono: 'peligro', icono: 'circulo-x' }
  },
  cuota: {
    PEN: { texto: 'Pendiente', tono: 'neutro', icono: 'reloj' },
    PAR: { texto: 'Pago parcial', tono: 'aviso', icono: 'pago' },
    PAG: { texto: 'Pagada', tono: 'ok', icono: 'circulo-check' }
  },
  local: {
    DIS: { texto: 'Disponible', tono: 'info', icono: 'tienda' },
    OCU: { texto: 'Ocupado', tono: 'ok', icono: 'circulo-check' },
    MAN: { texto: 'Mantenimiento', tono: 'aviso', icono: 'alerta' }
  }
};

/** Etiqueta de estado con color, icono y texto (nunca solo color). Una cuota con atraso se muestra como "Vencida". */
@Component({
  selector: 'gc-estado',
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="insignia" [class]="p().tono">
      <gc-icono [nombre]="p().icono" [tamano]="14" />{{ p().texto }}
    </span>
  `
})
export class Estado {
  readonly tipo = input.required<TipoEstado>();
  readonly valor = input<string | null | undefined>(null);
  /** Solo para cuotas: días de atraso; si es mayor que cero la cuota se marca como vencida. */
  readonly diasAtraso = input(0);

  protected readonly p = computed<Presentacion>(() => {
    if (this.tipo() === 'cuota' && this.diasAtraso() > 0) {
      return { texto: 'Vencida', tono: 'peligro', icono: 'alerta' };
    }
    const valor = this.valor() ?? '';
    return PRESENTACION[this.tipo()][valor] ?? { texto: valor || '—', tono: 'neutro', icono: 'info' };
  });
}
