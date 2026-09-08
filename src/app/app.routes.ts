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
import { Turmas } from './features/home/turma/turma';

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

    ]
  }
];