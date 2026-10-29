import { Routes } from '@angular/router';
import { adminGuard, authGuard, soloVisitanteGuard } from './core/auth/auth.guards';
import { salirSinGuardarGuard } from './core/ui/salir-sin-guardar.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [soloVisitanteGuard],
    title: 'Ingresar',
    loadComponent: () => import('./features/login/login').then((m) => m.Login)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'panel' },
      { path: 'panel', title: 'Panel', loadComponent: () => import('./features/panel/panel').then((m) => m.Panel) },

      { path: 'clientes', title: 'Clientes', loadComponent: () => import('./features/clientes/clientes-lista').then((m) => m.ClientesLista) },
      { path: 'clientes/nuevo', title: 'Nuevo cliente', canDeactivate: [salirSinGuardarGuard], loadComponent: () => import('./features/clientes/cliente-form').then((m) => m.ClienteForm) },
      { path: 'clientes/:id/editar', title: 'Editar cliente', canDeactivate: [salirSinGuardarGuard], loadComponent: () => import('./features/clientes/cliente-form').then((m) => m.ClienteForm) },

      { path: 'empresas', title: 'Empresas', loadComponent: () => import('./features/empresas/empresas-lista').then((m) => m.EmpresasLista) },
      { path: 'empresas/nueva', title: 'Nueva empresa', canActivate: [adminGuard], canDeactivate: [salirSinGuardarGuard], loadComponent: () => import('./features/empresas/empresa-form').then((m) => m.EmpresaForm) },
      { path: 'empresas/:id/editar', title: 'Editar empresa', canActivate: [adminGuard], canDeactivate: [salirSinGuardarGuard], loadComponent: () => import('./features/empresas/empresa-form').then((m) => m.EmpresaForm) },

      { path: 'locales', title: 'Locales', loadComponent: () => import('./features/locales/locales-lista').then((m) => m.LocalesLista) },
      { path: 'locales/nuevo', title: 'Nuevo local', canActivate: [adminGuard], canDeactivate: [salirSinGuardarGuard], loadComponent: () => import('./features/locales/local-form').then((m) => m.LocalForm) },
      { path: 'locales/:id/editar', title: 'Editar local', canActivate: [adminGuard], canDeactivate: [salirSinGuardarGuard], loadComponent: () => import('./features/locales/local-form').then((m) => m.LocalForm) },

      { path: 'contratos', title: 'Contratos', loadComponent: () => import('./features/contratos/contratos-lista').then((m) => m.ContratosLista) },
      { path: 'contratos/nuevo', title: 'Nuevo contrato', canDeactivate: [salirSinGuardarGuard], loadComponent: () => import('./features/contratos/contrato-form').then((m) => m.ContratoForm) },
      { path: 'contratos/:id', title: 'Contrato', loadComponent: () => import('./features/contratos/contrato-detalle').then((m) => m.ContratoDetalle) },
      { path: 'contratos/:id/editar', title: 'Editar contrato', canDeactivate: [salirSinGuardarGuard], loadComponent: () => import('./features/contratos/contrato-form').then((m) => m.ContratoForm) },

      { path: 'pagos', title: 'Pagos', loadComponent: () => import('./features/pagos/pagos-lista').then((m) => m.PagosLista) },
      { path: 'deudas', title: 'Deudas vencidas', loadComponent: () => import('./features/deudas/deudas').then((m) => m.Deudas) },

      { path: '**', title: 'No encontrada', loadComponent: () => import('./features/no-encontrada/no-encontrada').then((m) => m.NoEncontrada) }
    ]
  },
  { path: '**', redirectTo: '' }
];
