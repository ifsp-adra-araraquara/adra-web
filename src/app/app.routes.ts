import { Routes } from '@angular/router';
import { Login } from './features/login/login';
import { Home } from './features/home/home';
import { Usuarios } from './features/home/usuarios/usuarios';
import { AcessoNegado } from './features/acesso-negado/acesso-negado';
import { Layout } from './core/layout/layout';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { Role } from './shared/enum/role.enum';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'acesso-negado', component: AcessoNegado },

  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        component: Home,
        data: { roles: [Role.COORD, Role.SOCIO] },
        canActivate: [roleGuard]
      },
      {
        path: 'usuarios',
        component: Usuarios,
        data: { roles: [Role.ADMIN] },
        canActivate: [roleGuard]
      }
    ]
  }
];