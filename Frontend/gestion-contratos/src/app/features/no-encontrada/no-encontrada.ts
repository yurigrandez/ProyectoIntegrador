import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Vacio } from '../../shared/vacio/vacio';

@Component({
  selector: 'gc-no-encontrada',
  imports: [RouterLink, Vacio],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pagina">
      <div class="tarjeta">
        <gc-vacio icono="ayuda" titulo="No encontramos esa página"
                  texto="Puede que la dirección esté mal escrita o que la página ya no exista. Use el menú de la izquierda para ir a donde necesita.">
          <a class="btn btn-primario" routerLink="/panel">Ir al panel</a>
        </gc-vacio>
      </div>
    </div>
  `
})
export class NoEncontrada {}
