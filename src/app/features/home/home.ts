import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { AppModule } from '../../shared/enum/module.enum';
import { DashboardType } from '../../shared/enum/dashboard-type.enum';

import { DashCoord } from './dashboards/dash-coord/dash-coord';
import { DashSocio } from './dashboards/dash-socio/dash-socio';
import { DashClinico } from './dashboards/dash-clinico/dash-clinico';
import { DashFin } from './dashboards/dash-fin/dash-fin';

import { Usuarios } from './usuarios/usuarios';
import { Acesso } from './acesso/acesso';
import { Notificacoes } from './notificacoes/notificacoes';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    DashCoord,
    DashSocio,
    DashClinico,
    DashFin,
    Usuarios,
    Acesso,
    Notificacoes
  ],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {
  auth = inject(AuthService);

  AppModule = AppModule;
  DashboardType = DashboardType;

  labels = {
    [AppModule.DASHBOARD]: 'Dashboard',
    [AppModule.USUARIOS]: 'Usuários',
    [AppModule.ACESSO]: 'Acesso',
    [AppModule.NOTIFICACOES]: 'Notificações',
    [AppModule.ASSISTIDOS]: 'Assistidos',
    [AppModule.OFICINAS]: 'Oficinas',
    [AppModule.TURMAS]: 'Turmas',
    [AppModule.CHAMADA]: 'Chamada',
    [AppModule.DISCIPLINAR]: 'Disciplinar',
    [AppModule.PRONTUARIOS]: 'Prontuários',
    [AppModule.EXPORTACAO]: 'Exportação',
    [AppModule.MATERIAIS]: 'Materiais',
    [AppModule.COMUNICADOS]: 'Comunicados'
  };
}