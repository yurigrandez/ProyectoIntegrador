import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Avisos } from './shared/avisos/avisos';
import { Confirmacion } from './shared/confirmacion/confirmacion';

@Component({
  selector: 'gc-root',
  imports: [RouterOutlet, Avisos, Confirmacion],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <router-outlet />
    <gc-avisos />
    <gc-confirmacion />
  `
})
export class App {}
