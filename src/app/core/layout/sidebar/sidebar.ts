import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common'; // Adicione se precisar
import { AuthService } from '../../auth.service';
import { AppModule } from '../../../shared/enum/module.enum';
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

  labels: Record<AppModule, string> = {
    [AppModule.DASHBOARD]: 'Dashboard',
    [AppModule.ASSISTIDOS]: 'Assistidos',
    [AppModule.OFICINAS]: 'Oficinas',
    [AppModule.TURMAS]: 'Turmas',
    [AppModule.CHAMADA]: 'Chamada',
    [AppModule.DISCIPLINAR]: 'Disciplinar',
    [AppModule.PRONTUARIOS]: 'Prontuários',
    [AppModule.USUARIOS]: 'Usuários',
    [AppModule.ACESSO]: 'Acesso',
    [AppModule.NOTIFICACOES]: 'Notificações',
    [AppModule.EXPORTACAO]: 'Exportação',
    [AppModule.MATERIAIS]: 'Materiais',
    [AppModule.COMUNICADOS]: 'Comunicados',
  };

  // Método chamado ao clicar em um item do menu
 selecionarModulo(item: AppModule) {
    this.auth.setModule(item); // <-- Faltava esta linha aqui!
  }
}