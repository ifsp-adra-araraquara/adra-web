import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common'; // Adicione se precisar
import { AuthService } from '../../auth.service';
import { AppModule } from '../../../shared/enum/module.enum';
import { MODULE_LABELS } from '../../../shared/enum/module-labels';
import { DashboardType } from '../../../shared/enum/dashboard-type.enum'; // Importe o enum correspondente

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule], // Removemos o RouterLink daqui pois não usaremos rotas para isso
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar {
  auth = inject(AuthService);
  AppModule = AppModule;

  labels = MODULE_LABELS;

  // Método chamado ao clicar em um item do menu
 selecionarModulo(item: AppModule) {
    this.auth.setModule(item); // <-- Faltava esta linha aqui!
  }
}