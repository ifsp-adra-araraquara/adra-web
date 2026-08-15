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

  private secoesPorModulo: Record<string, string> = {
    DASHBOARD: 'Principal',
    ASSISTIDOS: 'Gestão',
    OFICINAS: 'Gestão',
    TURMAS: 'Gestão',
    CHAMADA: 'Pedagógico',
    MATERIAIS: 'Pedagógico',
    COMUNICADOS: 'Pedagógico',
    DISCIPLINAR: 'Especializado',
    PRONTUARIOS: 'Especializado',
    EXPORTACAO: 'Financeiro',
    USUARIOS: 'Conta',
    ACESSO: 'Conta',
    NOTIFICACOES: 'Conta',
  };

  private ordemSecoes = ['Principal', 'Gestão', 'Especializado', 'Pedagógico', 'Financeiro', 'Conta'];

  navAgrupado = computed(() => {
    const modulosDoUsuario = this.auth.modulos();

    const grupos: { secao: string; itens: { codigo: AppModule; nomeExibicao: string }[] }[] = [];

    for (const secao of this.ordemSecoes) {
      const itensDaSecao = modulosDoUsuario
        .filter(m => this.secoesPorModulo[m.codigo] === secao)
        .map(m => ({ codigo: m.codigo.toLowerCase() as AppModule, nomeExibicao: m.nomeExibicao }));

      if (itensDaSecao.length > 0) {
        grupos.push({ secao, itens: itensDaSecao });
      }
    }

    return grupos;
  });

  iniciais = computed(() => {
    const nome = this.auth.currentUser()?.name ?? '';
    return nome
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0]?.toUpperCase())
      .join('');
  });

  selecionarModulo(codigo: AppModule) {
    this.auth.setModule(codigo);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}