import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { Role } from './shared/enum/role.enum';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./features/login/login').then((m) => m.Login) },
  {
    path: 'esqueci-senha',
    loadComponent: () =>
      import('./features/login/recuperacao-senha/solicitar/solicitar-senha').then(
        (m) => m.SolicitarSenha,
      ),
  },
  {
    path: 'redefinir-senha',
    loadComponent: () =>
      import('./features/login/recuperacao-senha/redefinir/redefinir-senha').then(
        (m) => m.RedefinirSenha,
      ),
  },
  {
    path: 'convite/:token',
    loadComponent: () =>
      import('./features/convite/definir-senha-convite').then((m) => m.DefinirSenhaConvite),
  },
  {
    path: 'acesso-negado',
    loadComponent: () =>
      import('./features/acesso-negado/acesso-negado').then((m) => m.AcessoNegado),
  },
  {
    path: '',
    loadComponent: () => import('./core/layout/layout').then((m) => m.Layout),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/home/home').then((m) => m.Home),
        data: { roles: [Role.COORD, Role.SOCIO] },
        canActivate: [roleGuard],
      },
      {
        path: 'usuarios',
        loadComponent: () => import('./features/home/usuarios/usuarios').then((m) => m.Usuarios),
        data: { roles: [Role.ADMIN] },
        canActivate: [roleGuard],
      },
      {
        path: 'usuarios/convidar',
        loadComponent: () =>
          import('./features/usuarios/convidar/convidar').then((m) => m.Convidar),
        data: { roles: [Role.ADMIN] },
        canActivate: [roleGuard],
      },
      {
        path: 'acesso',
        loadComponent: () => import('./features/home/acesso/acesso').then((m) => m.Acesso),
        data: { roles: [Role.ADMIN] },
        canActivate: [roleGuard],
      },
      {
        path: 'notificacoes',
        loadComponent: () =>
          import('./features/home/notificacoes/notificacoes').then((m) => m.Notificacoes),
        data: { roles: [Role.ADMIN] },
        canActivate: [roleGuard],
      },
      {
        path: 'assistidos',
        loadComponent: () =>
          import('./features/home/assistidos/assistidos').then((m) => m.Assistidos),
        data: { roles: [Role.COORD, Role.SOCIO] },
        canActivate: [roleGuard],
      },
      {
        path: 'turmas',
        loadComponent: () => import('./features/home/turma/turma').then((m) => m.Turmas),
        data: { roles: [Role.COORD, Role.SOCIO] },
        canActivate: [roleGuard],
      },
      {
        path: 'oficinas',
        loadComponent: () => import('./features/home/oficinas/oficinas').then((m) => m.Oficinas),
        data: { roles: [Role.COORD, Role.SOCIO] },
        canActivate: [roleGuard],
      },
      {
        path: 'responsaveis',
        loadComponent: () =>
          import('./features/home/responsaveis/responsaveis').then((m) => m.Responsaveis),
        data: { roles: [Role.COORD, Role.SOCIO] },
        canActivate: [roleGuard],
      },
      {
        path: 'aulas',
        loadComponent: () => import('./features/home/aulas/aulas').then((m) => m.Aulas),
        data: { roles: [Role.COORD, Role.SOCIO] },
        canActivate: [roleGuard],
      },
      {
        path: 'chamada',
        loadComponent: () => import('./features/home/chamada/chamada').then((m) => m.Chamada),
        data: { roles: [Role.COORD, Role.SOCIO] },
        canActivate: [roleGuard],
      },
      {
        path: 'aulas/:aulaId/completa',
        loadComponent: () =>
          import('./features/home/aula-completa/aula-completa').then((m) => m.AulaCompleta),
        data: { roles: [Role.COORD, Role.SOCIO, Role.OFICINEIRO] },
        canActivate: [roleGuard],
      },
      {
        path: 'materiais',
        loadComponent: () => import('./features/home/materiais/materiais').then((m) => m.Materiais),
        data: { roles: [Role.ADMIN, Role.COORD, Role.OFICINEIRO] },
        canActivate: [roleGuard],
      },
      {
        path: 'oficineiro',
        loadComponent: () =>
          import('./features/home/oficineiro/oficineiro').then((m) => m.Oficineiro),
        data: { roles: [Role.OFICINEIRO] },
        canActivate: [roleGuard],
      },
      {
        path: 'showcase',
        loadComponent: () => import('./features/showcase/showcase').then((m) => m.Showcase),
      },
    ],
  },
];
