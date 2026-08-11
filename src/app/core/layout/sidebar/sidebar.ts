import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth.service';
import { AppModule } from '../../../shared/enum/module.enum';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar {
  auth = inject(AuthService);
  router = inject(Router);
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

  // Define a qual seção cada módulo pertence
  private secoesPorModulo: Record<AppModule, string> = {
    [AppModule.DASHBOARD]: 'Principal',

    [AppModule.ASSISTIDOS]: 'Gestão',
    [AppModule.OFICINAS]: 'Gestão',
    [AppModule.TURMAS]: 'Gestão',

    [AppModule.CHAMADA]: 'Pedagógico',
    [AppModule.MATERIAIS]: 'Pedagógico',
    [AppModule.COMUNICADOS]: 'Pedagógico',

    [AppModule.DISCIPLINAR]: 'Especializado',
    [AppModule.PRONTUARIOS]: 'Especializado',

    [AppModule.EXPORTACAO]: 'Financeiro',

    [AppModule.USUARIOS]: 'Conta',
    [AppModule.ACESSO]: 'Conta',
    [AppModule.NOTIFICACOES]: 'Conta',
  };

  // Ordem fixa em que as seções devem aparecer na sidebar
  private ordemSecoes = ['Principal', 'Gestão', 'Especializado', 'Pedagógico', 'Financeiro', 'Conta'];

  // Agrupa dinamicamente os itens permitidos para o perfil logado
  navAgrupado = computed(() => {
    const itensPermitidos = this.auth.profileConfig()?.nav ?? [];

    const grupos: { secao: string; itens: AppModule[] }[] = [];

    for (const secao of this.ordemSecoes) {
      const itensDaSecao = itensPermitidos.filter(
        (item: AppModule) => this.secoesPorModulo[item] === secao
      );

      if (itensDaSecao.length > 0) {
        grupos.push({ secao, itens: itensDaSecao });
      }
    }

    return grupos;
  });

  selecionarModulo(item: AppModule) {
    this.auth.setModule(item);
  }


 logout(): void {
  this.auth.logout(); // Chama o método do serviço
  this.router.navigate(['/']); // Redireciona para o login
}


}