import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { administradorGuard } from './core/guards/administrador.guard';
import { roleGuard } from './core/guards/role.guard';
import { Role } from './shared/enum/role.enum';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', title: 'Entrar', loadComponent: () => import('./features/login/login').then((m) => m.Login) },
  {
    path: 'esqueci-senha',
    title: 'Recuperar senha',
    loadComponent: () =>
      import('./features/login/recuperacao-senha/solicitar/solicitar-senha').then(
        (m) => m.SolicitarSenha,
      ),
  },
  {
    path: 'redefinir-senha',
    title: 'Nova senha',
    loadComponent: () =>
      import('./features/login/recuperacao-senha/redefinir/redefinir-senha').then(
        (m) => m.RedefinirSenha,
      ),
  },
  {
    path: 'acesso-negado',
    title: 'Acesso negado',
    loadComponent: () =>
      import('./features/acesso-negado/acesso-negado').then((m) => m.AcessoNegado),
  },
  {
    path: 'pre-cadastro',
    title: 'Pré-cadastro',
    loadComponent: () => import('./features/pre-cadastro/pre-cadastro').then((m) => m.PreCadastro),
  },
  {
    path: '',
    loadComponent: () => import('./core/layout/layout').then((m) => m.Layout),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'perfil',
        title: 'Meu Perfil',
        loadComponent: () => import('./features/home/perfil/meu-perfil').then((m) => m.MeuPerfil),
      },
      {
        path: 'painel',
        title: 'Painel',
        loadComponent: () => import('./features/home/painel/painel').then((m) => m.Painel),
        data: { roles: [Role.COORD] },
        canActivate: [roleGuard],
      },
      {
        path: 'dashboard',
        title: 'Calendário',
        loadComponent: () => import('./features/home/home').then((m) => m.Home),
        data: { roles: [Role.COORD, Role.ASSISTENTE, Role.EDUCADOR] },
        canActivate: [roleGuard],
      },
      {
        path: 'usuarios',
        title: 'Usuários',
        loadComponent: () => import('./features/home/usuarios/usuarios').then((m) => m.Usuarios),
        canActivate: [administradorGuard],
      },
      {
        path: 'usuarios/convidar',
        title: 'Convidar usuário',
        loadComponent: () =>
          import('./features/usuarios/convidar/convidar').then((m) => m.Convidar),
        canActivate: [administradorGuard],
      },
      {
        path: 'assistidos/lote',
        title: 'Importar atendidos',
        loadComponent: () =>
          import('./features/home/assistidos/lote/assistidos-lote').then((m) => m.AssistidosLote),
        data: { roles: [Role.COORD, Role.ASSISTENTE] },
        canActivate: [roleGuard],
      },
      {
        path: 'assistidos/novo',
        title: 'Novo atendido',
        loadComponent: () =>
          import('./features/home/assistidos/novo/assistido-novo').then((m) => m.AssistidoNovo),
        data: { roles: [Role.COORD, Role.ASSISTENTE] },
        canActivate: [roleGuard],
      },
      {
        path: 'acesso',
        title: 'Acesso',
        loadComponent: () => import('./features/home/acesso/acesso').then((m) => m.Acesso),
        canActivate: [administradorGuard],
      },
      {
        path: 'notificacoes',
        title: 'Notificações',
        loadComponent: () =>
          import('./features/home/notificacoes/notificacoes').then((m) => m.Notificacoes),
        canActivate: [administradorGuard],
      },
      {
        path: 'assistidos',
        title: 'Atendidos',
        loadComponent: () =>
          import('./features/home/assistidos/assistidos').then((m) => m.Assistidos),
        data: { roles: [Role.COORD, Role.ASSISTENTE] },
        canActivate: [roleGuard],
      },
      {
        path: 'turmas',
        title: 'Grupos',
        loadComponent: () => import('./features/home/turma/turma').then((m) => m.Turmas),
        data: { roles: [Role.COORD, Role.ASSISTENTE] },
        canActivate: [roleGuard],
      },
      {
        path: 'oficinas',
        title: 'Oficinas',
        loadComponent: () => import('./features/home/oficinas/oficinas').then((m) => m.Oficinas),
        data: { roles: [Role.COORD, Role.ASSISTENTE] },
        canActivate: [roleGuard],
      },
      {
        path: 'responsaveis',
        title: 'Responsáveis',
        loadComponent: () =>
          import('./features/home/responsaveis/responsaveis').then((m) => m.Responsaveis),
        data: { roles: [Role.COORD, Role.ASSISTENTE] },
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
        title: 'Pré-cadastros',
        loadComponent: () => import('./features/home/pre-cadastros/pre-cadastros').then((m) => m.PreCadastros),
        data: { roles: [Role.COORD, Role.ASSISTENTE] },
        canActivate: [roleGuard],
      },
      {
        path: 'pre-cadastros/:id',
        title: 'Avaliar pré-cadastro',
        loadComponent: () =>
          import('./features/home/pre-cadastros/avaliacao/avaliacao-pre-cadastro').then((m) => m.AvaliacaoPreCadastro),
        data: { roles: [Role.COORD, Role.ASSISTENTE] },
        canActivate: [roleGuard],
      },
      {
        path: 'pre-cadastros/:id/ficha',
        title: 'Ficha de cadastro social',
        loadComponent: () =>
          import('./features/home/ficha-cadastro-social/ficha-pre-cadastro').then((m) => m.FichaPreCadastro),
        data: { roles: [Role.COORD, Role.ASSISTENTE] },
        canActivate: [roleGuard],
      },
      {
        path: 'assistidos/prazo-de-guarda',
        title: 'Prazo de guarda',
        loadComponent: () =>
          import('./features/home/guarda-dados/guarda-dados').then((m) => m.GuardaDados),
        data: { roles: [Role.COORD] },
        canActivate: [roleGuard],
      },
      {
        path: 'assistidos/por-ano',
        title: 'Atendidos por ano',
        loadComponent: () =>
          import('./features/home/lista-anual/lista-anual').then((m) => m.ListaAnual),
        data: { roles: [Role.COORD, Role.ASSISTENTE] },
        canActivate: [roleGuard],
      },
      {
        path: 'assistidos/:id/ficha-social',
        title: 'Ficha de cadastro social',
        loadComponent: () =>
          import('./features/home/ficha-cadastro-social/ficha-assistido').then((m) => m.FichaAssistido),
        data: { roles: [Role.COORD, Role.ASSISTENTE] },
        canActivate: [roleGuard],
      },
      {
        path: 'disciplinar',
        title: 'Disciplinar',
        loadComponent: () => import('./features/home/disciplinar/disciplinar').then((m) => m.Disciplinar),
        data: { roles: [Role.COORD, Role.ASSISTENTE] },
        canActivate: [roleGuard],
      },
      {
        path: 'disciplinar/documento/:registroId',
        title: 'Documento disciplinar',
        loadComponent: () =>
          import('./features/home/disciplinar/documento-disciplinar/documento-disciplinar').then(
            (m) => m.DocumentoDisciplinar,
          ),
        data: { roles: [Role.COORD, Role.ASSISTENTE] },
        canActivate: [roleGuard],
      },
      {
        path: 'chamada',
        title: 'Chamada',
        loadComponent: () => import('./features/home/chamada/chamada').then((m) => m.Chamada),
        data: { roles: [Role.COORD, Role.ASSISTENTE, Role.EDUCADOR] },
        canActivate: [roleGuard],
      },
      {
        path: 'chamada/grupo/:turmaId/:data',
        title: 'Chamada do grupo',
        loadComponent: () =>
          import('./features/home/chamada/chamada-grupo/chamada-grupo').then((m) => m.ChamadaGrupo),
        data: { roles: [Role.COORD, Role.ASSISTENTE, Role.EDUCADOR] },
        canActivate: [roleGuard],
      },
      {
        path: 'chamada/status',
        title: 'Situação das chamadas',
        loadComponent: () =>
          import('./features/home/status-chamada/status-chamada').then((m) => m.StatusChamadaPainel),
        data: { roles: [Role.COORD] },
        canActivate: [roleGuard],
      },
      {
        path: 'chamada/turma/:turmaId/grade',
        title: 'Grade de frequência',
        loadComponent: () =>
          import('./features/home/grade-frequencia-turma/grade-frequencia-turma').then(
            (m) => m.GradeFrequenciaTurma,
          ),
        data: { roles: [Role.COORD, Role.ASSISTENTE, Role.EDUCADOR] },
        canActivate: [roleGuard],
      },
      {
        path: 'chamada/turma/:turmaId/lista',
        title: 'Lista de frequência',
        loadComponent: () =>
          import('./features/home/lista-frequencia/lista-frequencia').then((m) => m.ListaFrequenciaPagina),
        data: { roles: [Role.COORD, Role.ASSISTENTE, Role.EDUCADOR] },
        canActivate: [roleGuard],
      },
      {
        path: 'materiais',
        title: 'Materiais',
        loadComponent: () => import('./features/home/materiais/materiais').then((m) => m.Materiais),
        data: { roles: [Role.COORD, Role.OFICINEIRO] },
        canActivate: [roleGuard],
      },
      {
        path: 'oficineiro',
        title: 'Minhas oficinas',
        loadComponent: () =>
          import('./features/home/oficineiro/oficineiro').then((m) => m.Oficineiro),
        data: { roles: [Role.OFICINEIRO] },
        canActivate: [roleGuard],
      },
      {
        path: 'showcase',
        title: 'Componentes',
        loadComponent: () => import('./features/showcase/showcase').then((m) => m.Showcase),
      },
    ],
  },
];
