import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { administradorGuard } from './core/guards/administrador.guard';
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
    path: 'acesso-negado',
    loadComponent: () =>
      import('./features/acesso-negado/acesso-negado').then((m) => m.AcessoNegado),
  },
  {
    path: 'pre-cadastro',
    loadComponent: () => import('./features/pre-cadastro/pre-cadastro').then((m) => m.PreCadastro),
  },
  {
    path: '',
    loadComponent: () => import('./core/layout/layout').then((m) => m.Layout),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'painel',
        loadComponent: () => import('./features/home/painel/painel').then((m) => m.Painel),
        data: { roles: [Role.COORD] },
        canActivate: [roleGuard],
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/home/home').then((m) => m.Home),
        data: { roles: [Role.COORD, Role.ASSISTENTE, Role.EDUCADOR] },
        canActivate: [roleGuard],
      },
      {
        path: 'usuarios',
        loadComponent: () => import('./features/home/usuarios/usuarios').then((m) => m.Usuarios),
        canActivate: [administradorGuard],
      },
      {
        path: 'usuarios/convidar',
        loadComponent: () =>
          import('./features/usuarios/convidar/convidar').then((m) => m.Convidar),
        canActivate: [administradorGuard],
      },
      {
        path: 'assistidos/lote',
        loadComponent: () =>
          import('./features/home/assistidos/lote/assistidos-lote').then((m) => m.AssistidosLote),
        data: { roles: [Role.COORD, Role.ASSISTENTE] },
        canActivate: [roleGuard],
      },
      {
        path: 'assistidos/novo',
        loadComponent: () =>
          import('./features/home/assistidos/novo/assistido-novo').then((m) => m.AssistidoNovo),
        data: { roles: [Role.COORD, Role.ASSISTENTE] },
        canActivate: [roleGuard],
      },
      {
        path: 'acesso',
        loadComponent: () => import('./features/home/acesso/acesso').then((m) => m.Acesso),
        canActivate: [administradorGuard],
      },
      {
        path: 'notificacoes',
        loadComponent: () =>
          import('./features/home/notificacoes/notificacoes').then((m) => m.Notificacoes),
        canActivate: [administradorGuard],
      },
      {
        path: 'assistidos',
        loadComponent: () =>
          import('./features/home/assistidos/assistidos').then((m) => m.Assistidos),
        data: { roles: [Role.COORD, Role.ASSISTENTE, Role.EDUCADOR] },
        canActivate: [roleGuard],
      },
      {
        path: 'turmas',
        loadComponent: () => import('./features/home/turma/turma').then((m) => m.Turmas),
        data: { roles: [Role.COORD, Role.ASSISTENTE, Role.EDUCADOR] },
        canActivate: [roleGuard],
      },
      {
        path: 'oficinas',
        loadComponent: () => import('./features/home/oficinas/oficinas').then((m) => m.Oficinas),
        data: { roles: [Role.COORD, Role.ASSISTENTE, Role.EDUCADOR] },
        canActivate: [roleGuard],
      },
      {
        path: 'responsaveis',
        loadComponent: () =>
          import('./features/home/responsaveis/responsaveis').then((m) => m.Responsaveis),
        data: { roles: [Role.COORD, Role.ASSISTENTE, Role.EDUCADOR] },
        canActivate: [roleGuard],
      },
      {
        // "Aulas" foi unificada em "Turmas" (Fase 2) — redirect preserva links/favoritos antigos.
        path: 'aulas',
        redirectTo: 'turmas',
        pathMatch: 'full',
      },
      {
        path: 'pre-cadastros',
        loadComponent: () => import('./features/home/pre-cadastros/pre-cadastros').then((m) => m.PreCadastros),
        data: { roles: [Role.COORD, Role.ASSISTENTE] },
        canActivate: [roleGuard],
      },
      {
        path: 'disciplinar',
        loadComponent: () => import('./features/home/disciplinar/disciplinar').then((m) => m.Disciplinar),
        data: { roles: [Role.COORD, Role.ASSISTENTE, Role.EDUCADOR] },
        canActivate: [roleGuard],
      },
      {
        path: 'disciplinar/documento/:registroId',
        loadComponent: () =>
          import('./features/home/disciplinar/documento-disciplinar/documento-disciplinar').then(
            (m) => m.DocumentoDisciplinar,
          ),
        data: { roles: [Role.COORD, Role.ASSISTENTE, Role.EDUCADOR] },
        canActivate: [roleGuard],
      },
      {
        path: 'chamada',
        loadComponent: () => import('./features/home/chamada/chamada').then((m) => m.Chamada),
        data: { roles: [Role.COORD, Role.ASSISTENTE, Role.EDUCADOR] },
        canActivate: [roleGuard],
      },
      {
        path: 'chamada/aula/:aulaId',
        loadComponent: () =>
          import('./features/home/chamada/chamada-aula/chamada-aula').then((m) => m.ChamadaAula),
        data: { roles: [Role.COORD, Role.ASSISTENTE, Role.EDUCADOR, Role.OFICINEIRO] },
        canActivate: [roleGuard],
      },
      {
        path: 'chamada/status',
        loadComponent: () =>
          import('./features/home/status-chamada/status-chamada').then((m) => m.StatusChamadaPainel),
        data: { roles: [Role.COORD] },
        canActivate: [roleGuard],
      },
      {
        path: 'chamada/turma/:turmaId/grade',
        loadComponent: () =>
          import('./features/home/grade-frequencia-turma/grade-frequencia-turma').then(
            (m) => m.GradeFrequenciaTurma,
          ),
        data: { roles: [Role.COORD, Role.ASSISTENTE, Role.EDUCADOR] },
        canActivate: [roleGuard],
      },
      {
        path: 'aulas/:aulaId/completa',
        loadComponent: () =>
          import('./features/home/aula-completa/aula-completa').then((m) => m.AulaCompleta),
        data: { roles: [Role.COORD, Role.ASSISTENTE, Role.EDUCADOR, Role.OFICINEIRO] },
        canActivate: [roleGuard],
      },
      {
        path: 'materiais',
        loadComponent: () => import('./features/home/materiais/materiais').then((m) => m.Materiais),
        data: { roles: [Role.COORD, Role.OFICINEIRO] },
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
