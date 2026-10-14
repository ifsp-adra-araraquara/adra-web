import { ChangeDetectionStrategy, Component, inject, computed, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth.service';
import { AppModule } from '../../../shared/enum/module.enum';
import { Role } from '../../../shared/enum/role.enum';
import { Router } from '@angular/router';
import { BrandLogo } from '../../../shared/components/brand-logo/brand-logo';
import { TooltipDirective } from '../../../shared/components/tooltip/tooltip';
import { Icon, IconName } from '../../../shared/components/icon/icon';

/**
 * Módulos que ainda não têm rota/componente funcional implementado — ficam
 * ocultos da navbar pra não virar link morto. Não mexe no enum nem na
 * entitlement vinda do backend: assim que a feature existir de verdade,
 * basta remover a entrada daqui.
 *
 * AULAS é um caso à parte: a rota existe (redireciona pra /turmas), mas o
 * item de menu some porque a funcionalidade foi unificada em "Turmas"
 * (Fase 2) — não é mais uma tela própria.
 */
const MODULOS_OCULTOS = new Set([
  'DISCIPLINAR',
  'PRONTUARIOS',
  'EXPORTACAO',
  'ACESSO',
  'NOTIFICACOES',
  'AULAS',
]);

@Component({
  selector: 'app-sidebar',
  imports: [Icon, CommonModule, BrandLogo, TooltipDirective],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
  auth = inject(AuthService);
  router = inject(Router);

  open = model(false);
  collapsed = model(false);

  private secoesPorModulo: Record<string, string> = {
    DASHBOARD: 'Principal',
    ASSISTIDOS: 'Gestão',
    RESPONSAVEIS: 'Gestão',
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
    AULAS: 'Pedagógico',
  };

  private ordemSecoes = ['Principal', 'Gestão', 'Especializado', 'Pedagógico', 'Financeiro', 'Conta'];

  /** Chave do ícone (ver @switch em sidebar.html) exibido para cada módulo. */
  private iconesPorModulo: Record<string, IconName> = {
    DASHBOARD: 'calendar',
    ASSISTIDOS: 'users',
    RESPONSAVEIS: 'user-check',
    OFICINAS: 'layers',
    TURMAS: 'grid',
    CHAMADA: 'check-square',
    AULAS: 'calendar',
    MATERIAIS: 'book',
    COMUNICADOS: 'bell',
    USUARIOS: 'shield',
  };

  iconeModulo(codigo: AppModule): IconName {
    return this.iconesPorModulo[codigo.toUpperCase()] ?? 'circle';
  }

  /**
   * Rótulo exibido na sidebar, quando diferente do `nomeExibicao` que vem do
   * backend — só texto, nunca o `codigo` usado pro roteamento (`setModule`).
   * "Dashboard" virou "Calendário" (Fase 4): a tela agora mostra o
   * calendário de verdade, mas o módulo/rota no backend continua "dashboard".
   */
  private readonly rotulosOverride: Record<string, string> = {
    DASHBOARD: 'Calendário',
  };

  navAgrupado = computed(() => {
    const perfil = this.auth.currentProfile();
    const modulosDoUsuario = this.auth.modulos().filter(m => {
      if (MODULOS_OCULTOS.has(m.codigo)) return false;
      // COMUNICADOS só existe de fato dentro da área do Oficineiro por enquanto.
      if (m.codigo === 'COMUNICADOS' && perfil !== Role.OFICINEIRO) return false;
      return true;
    });

    const grupos: { secao: string; itens: { codigo: AppModule; nomeExibicao: string }[] }[] = [];

    for (const secao of this.ordemSecoes) {
      const itensDaSecao = modulosDoUsuario
        .filter(m => this.secoesPorModulo[m.codigo] === secao)
        .map(m => ({
          codigo: m.codigo.toLowerCase() as AppModule,
          nomeExibicao: this.rotulosOverride[m.codigo] ?? m.nomeExibicao,
        }));

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
    this.open.set(false);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}