import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { DashboardType } from '../../shared/enum/dashboard-type.enum';
import { DashCoord } from './dashboards/dash-coord/dash-coord';
import { DashSocio } from './dashboards/dash-socio/dash-socio';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [DashCoord, DashSocio],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {
  auth = inject(AuthService);
  DashboardType = DashboardType;
}