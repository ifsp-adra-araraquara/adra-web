import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { AppModule } from '../../shared/enum/module.enum';
import { MODULE_LABELS } from '../../shared/enum/module-labels';
import { DashboardType } from '../../shared/enum/dashboard-type.enum';
import { DashCoord } from './dashboards/dash-coord/dash-coord';
import { DashSocio } from './dashboards/dash-socio/dash-socio';
import { DashClinico } from './dashboards/dash-clinico/dash-clinico';
import { DashFin } from './dashboards/dash-fin/dash-fin';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [DashCoord, DashSocio, DashClinico, DashFin],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {
  auth = inject(AuthService);
  DashboardType = DashboardType;
  AppModule = AppModule;
  labels = MODULE_LABELS;
}