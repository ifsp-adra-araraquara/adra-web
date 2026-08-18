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
import { Assistidos } from './assistidos/assistidos';

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
    Notificacoes,
    Assistidos
  ],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {
  auth = inject(AuthService);

  AppModule = AppModule;
  DashboardType = DashboardType;
}