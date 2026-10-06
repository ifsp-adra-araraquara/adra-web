import { Routes } from '@angular/router';
import { Login } from './features/login/login';
import { SolicitarSenha } from './features/login/recuperacao-senha/solicitar/solicitar-senha';
import { RedefinirSenha } from './features/login/recuperacao-senha/redefinir/redefinir-senha';
import { DefinirSenhaConvite } from './features/convite/definir-senha-convite';
import { Convidar } from './features/usuarios/convidar/convidar';
import { Home } from './features/home/home';
import { Usuarios } from './features/home/usuarios/usuarios';
import { AcessoNegado } from './features/acesso-negado/acesso-negado';
import { Layout } from './core/layout/layout';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { Role } from './shared/enum/role.enum';
import { Assistidos } from './features/home/assistidos/assistidos';
import { Responsaveis } from './features/home/responsaveis/responsaveis';
import { Turmas } from './features/home/turma/turma';
import { Oficinas } from './features/home/oficinas/oficinas';
import { Materiais } from './features/home/materiais/materiais';
import { Oficineiro } from './features/home/oficineiro/oficineiro';
import { AulaCompleta } from './features/home/aula-completa/aula-completa';
import { Showcase } from './features/showcase/showcase';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'esqueci-senha', component: SolicitarSenha },
  { path: 'redefinir-senha', component: RedefinirSenha },
  { path: 'convite/:token', component: DefinirSenhaConvite },
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
      },
      {
        path: 'usuarios/convidar',
        component: Convidar,
        data: { roles: [Role.ADMIN] },
        canActivate: [roleGuard]
      },
      {
        path: 'assistidos', 
        component: Assistidos,
        data: {  roles: [Role.COORD, Role.SOCIO]  },
        canActivate: [roleGuard]
      },
      {
        path: 'turmas', 
        component: Turmas,
        data: {  roles: [Role.COORD, Role.SOCIO]  },
        canActivate: [roleGuard]
      },
      {
        path: 'oficinas',
        component: Oficinas,
        data: { roles: [Role.COORD, Role.SOCIO] },
        canActivate: [roleGuard]
      },
      {
        path: 'responsaveis',
        component: Responsaveis,
        data: { roles: [Role.COORD, Role.SOCIO] },
        canActivate: [roleGuard]
      },
      {
        // "Aulas" foi unificada em "Turmas" (Fase 2) — redirect preserva links/favoritos antigos.
        path: 'aulas',
        redirectTo: 'turmas',
        pathMatch: 'full'
      },
      {
        path: 'chamada',
        loadComponent: () => import('./features/home/chamada/chamada').then((m) => m.Chamada),
        data: { roles: [Role.COORD, Role.SOCIO] },
        canActivate: [roleGuard]
      },
      {
        path: 'chamada/status',
        loadComponent: () =>
          import('./features/home/status-chamada/status-chamada').then((m) => m.StatusChamadaPainel),
        data: { roles: [Role.COORD] },
        canActivate: [roleGuard]
      },
      {
        path: 'chamada/turma/:turmaId/grade',
        loadComponent: () =>
          import('./features/home/grade-frequencia-turma/grade-frequencia-turma').then(
            (m) => m.GradeFrequenciaTurma,
          ),
        data: { roles: [Role.COORD, Role.SOCIO] },
        canActivate: [roleGuard]
      },
      {
        path: 'aulas/:aulaId/completa',
        component: AulaCompleta,
        data: { roles: [Role.COORD, Role.SOCIO, Role.OFICINEIRO] },
        canActivate: [roleGuard]
      },
      {
        path: 'materiais',
        component: Materiais,
        data: { roles: [Role.ADMIN, Role.COORD, Role.OFICINEIRO] },
        canActivate: [roleGuard]
      },
      {
        path: 'oficineiro',
        component: Oficineiro,
        data: { roles: [Role.OFICINEIRO] },
        canActivate: [roleGuard]
      },
      {
        path: 'showcase',
        component: Showcase
      },
    ]
  }
];