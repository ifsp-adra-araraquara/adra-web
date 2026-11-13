import { ChangeDetectionStrategy, Component, inject, computed, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth.service';
import { AppModule } from '../../../shared/enum/module.enum';
import { EntidadeArquivo } from '../../../shared/enum/EntidadeArquivo';
import { Role } from '../../../shared/enum/role.enum';
import { Router } from '@angular/router';
import { Avatar } from '../../../shared/components/avatar/avatar';
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
  'PRONTUARIOS',
  'EXPORTACAO',
  'ACESSO',
  'NOTIFICACOES',
  'AULAS',
  'MATERIAIS',
]);

type ItemMenu = { codigo: AppModule; rota: AppModule; nomeExibicao: string };

/**
 * Menu do Oficineiro: a área dele é uma rota só (/oficineiro) com abas, então os itens ficam aqui e
 * não nos módulos do banco. `rota` é o valor de `?aba=` (ver `AuthService.setModule`/`currentModule`).
 * Mesmas seções dos outros perfis, começando pelo Calendário.
 */
const MENU_OFICINEIRO: { secao: string; itens: ItemMenu[] }[] = [
  { secao: 'Principal', itens: [{ codigo: AppModule.DASHBOARD, rota: AppModule.DASHBOARD, nomeExibicao: 'Calendário' }] },
  { secao: 'Gestão', itens: [{ codigo: AppModule.TURMAS, rota: AppModule.TURMAS, nomeExibicao: 'Grupos' }] },
  { secao: 'Pedagógico', itens: [{ codigo: AppModule.SEMANARIOS, rota: AppModule.SEMANARIOS, nomeExibicao: 'Semanário' }] },
];

@Component({
  selector: 'app-sidebar',
  imports: [Avatar, Icon, CommonModule, BrandLogo, TooltipDirective],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
  auth = inject(AuthService);
  router = inject(Router);
  readonly EntidadeArquivo = EntidadeArquivo;

  open = model(false);
  collapsed = model(false);

  /**
   * Ordem das chaves = ordem no menu. O Coordenador começa pelo Painel (só ele tem);
   * os demais perfis, pelo Calendário.
   */
  private secoesPorModulo: Record<string, string> = {
    PAINEL: 'Principal',
    DASHBOARD: 'Principal',
    PRE_CADASTRO: 'Gestão',
    ASSISTIDOS: 'Gestão',
    RESPONSAVEIS: 'Gestão',
    TURMAS: 'Gestão',
    OFICINAS: 'Gestão',
    SEMANARIOS: 'Gestão',
    CHAMADA: 'Pedagógico',
    DISCIPLINAR: 'Pedagógico',
    MATERIAIS: 'Pedagógico',
    COMUNICADOS: 'Pedagógico',
    PRONTUARIOS: 'Especializado',
    EXPORTACAO: 'Financeiro',
    USUARIOS: 'Conta',
    ACESSO: 'Conta',
    NOTIFICACOES: 'Conta',
    AULAS: 'Pedagógico',
  };

  private ordemSecoes = ['Principal', 'Gestão', 'Especializado', 'Pedagógico', 'Financeiro', 'Conta'];

  /** Dentro de cada seção, os itens seguem a ordem de `secoesPorModulo`. */
  private ordemModulos = Object.keys(this.secoesPorModulo);

  /** Chave do ícone (ver @switch em sidebar.html) exibido para cada módulo. */
  private iconesPorModulo: Record<string, IconName> = {
    PAINEL: 'activity',
    DASHBOARD: 'calendar',
    ASSISTIDOS: 'users',
    PRE_CADASTRO: 'user-plus',
    RESPONSAVEIS: 'user-check',
    OFICINAS: 'layers',
    SEMANARIOS: 'file-text',
    TURMAS: 'grid',
    CHAMADA: 'check-square',
    DISCIPLINAR: 'flag',
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
    ASSISTIDOS: 'Atendidos',
    TURMAS: 'Grupos',
  };

  navAgrupado = computed(() => {
    const perfil = this.auth.currentProfile();
    if (perfil === Role.OFICINEIRO) return MENU_OFICINEIRO;

    const modulosDoUsuario = this.auth.modulos().filter(m => {
      if (MODULOS_OCULTOS.has(m.codigo)) return false;
      // COMUNICADOS ainda não tem tela de verdade (a aba do Oficineiro foi retirada).
      if (m.codigo === 'COMUNICADOS') return false;
      // Oficinas é só da Coordenação (a Assistente Social continua vendo as oficinas de cada grupo em "Grupos").
      // Semanários (de todas as oficinas) também: o Oficineiro vê os dele na própria área.
      if ((m.codigo === 'OFICINAS' || m.codigo === 'SEMANARIOS') && perfil !== Role.COORD) return false;
      return true;
    });

    const grupos: { secao: string; itens: ItemMenu[] }[] = [];

    // Mesmas seções para todos os perfis (Educador Social: Principal com Calendário; Pedagógico com
    // Chamada e Disciplinar). Seção sem item não aparece.
    for (const secao of this.ordemSecoes) {
      const itensDaSecao = modulosDoUsuario
        .filter(m => this.secoesPorModulo[m.codigo] === secao)
        .sort((a, b) => this.ordemModulos.indexOf(a.codigo) - this.ordemModulos.indexOf(b.codigo))
        .map(m => ({
          codigo: m.codigo.toLowerCase() as AppModule,
          rota: (m.rota?.slice(1) ?? m.codigo.toLowerCase()) as AppModule,
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

  emMeuPerfil = computed(() => this.auth.currentModule() === ('perfil' as AppModule));

  selecionarModulo(codigo: AppModule) {
    this.auth.setModule(codigo);
    this.open.set(false);
  }

  abrirPerfil(): void {
    this.router.navigate(['/perfil']);
    this.open.set(false);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
