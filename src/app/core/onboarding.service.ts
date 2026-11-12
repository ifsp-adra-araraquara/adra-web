import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Driver, driver } from 'driver.js';
import { AuthService } from './auth.service';
import { Role } from '../shared/enum/role.enum';

const CHAVE_VISTO = 'adra.onboarding.visto';

/**
 * Tour guiado de primeiro acesso (driver.js) cobrindo a jornada unificada
 * Turmas → abrir uma turma → Chamada do dia. Só faz sentido pra
 * Coordenador/Educador Social — são os únicos perfis com acesso às duas
 * telas (Oficineiro tem sua própria área consolidada em /oficineiro; Admin
 * só gerencia usuários).
 *
 * Fica marcado como "visto" (localStorage, mesmo padrão de `adra.token` /
 * `adra.sidebar.collapsed`) assim que o tour é fechado — por Concluir, Esc,
 * clique fora ou no X — e não volta a aparecer sozinho depois disso.
 * Reentrada manual via `iniciarTour()` (botão de ajuda no topbar do Layout).
 */
@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  private driverAtivo: Driver | null = null;

  /** Coordenador (Grupos → Chamada) e Educador Social (Chamada) têm tour mapeado. */
  podeVerTour(): boolean {
    const perfil = this.auth.currentProfile();
    return perfil === Role.COORD || perfil === Role.EDUCADOR;
  }

  jaViu(): boolean {
    return localStorage.getItem(CHAVE_VISTO) === 'true';
  }

  private marcarComoVisto(): void {
    localStorage.setItem(CHAVE_VISTO, 'true');
  }

  /** Disparo automático pós-login — roda no máximo uma vez por navegador/perfil elegível. */
  iniciarSeNecessario(): void {
    if (this.jaViu() || !this.podeVerTour()) return;
    this.iniciarTour();
  }

  /** Reentrada manual ("Ver tutorial" no topbar) — ignora a flag "já viu". */
  iniciarTour(): void {
    if (!this.podeVerTour() || this.driverAtivo?.isActive()) return;
    this.driverAtivo = this.construirTour();
    this.driverAtivo.drive();
  }

  /**
   * Nos passos que apontam pra sidebar, no mobile/tablet ela só existe
   * visível quando o drawer está aberto (desktop ≥1200px é sempre visível —
   * ver sidebar.css). Sem isso, o driver.js tentaria destacar um elemento
   * fora da tela.
   */
  private abrirMenuMobileSeFechado(): void {
    if (window.matchMedia('(min-width: 1200px)').matches) return;
    const botaoMenu = document.querySelector<HTMLButtonElement>('.menu-btn');
    if (botaoMenu?.getAttribute('aria-expanded') === 'false') {
      botaoMenu.click();
    }
  }

  /** Passos que pulam de página: navega e só avança o tour quando a navegação resolver — o elemento do próximo passo é esperado via `waitForElement`. */
  private irPara(caminho: string, driverObj: Driver): void {
    this.router.navigateByUrl(caminho).then(() => driverObj.moveNext());
  }

  private construirTour(): Driver {
    // Educador Social só tem Chamada e Calendário: o tour não passa por Grupos.
    const educador = this.auth.currentProfile() === Role.EDUCADOR;
    const driverObj = driver({
      showProgress: true,
      allowClose: true,
      smoothScroll: true,
      // Generoso de propósito: alguns passos esperam uma navegação de rota
      // + chamada de API terminar (ex.: tabela de Turmas/Chamada carregando).
      waitForElement: 4000,
      nextBtnText: 'Próximo',
      prevBtnText: 'Voltar',
      doneBtnText: 'Concluir',
      // Visual próprio (ver "ONBOARDING TOUR" em styles.css) em vez do
      // azul/branco genérico padrão da lib — mesma paleta do resto do app.
      popoverClass: 'adra-tour-popover',
      overlayColor: 'var(--color-adra-green-900)', // aplicado via style.fill pela lib
      overlayOpacity: 0.5, // mesma opacidade do .modal-overlay
      onDestroyed: () => this.marcarComoVisto(),
      steps: [
        {
          popover: {
            title: 'Bem-vindo(a) ao Sistema de Gestão ADRA',
            description: educador
              ? 'Um tour rápido pelo seu dia a dia: a Chamada dos grupos e o Calendário.'
              : 'Um tour rápido pela jornada principal do dia a dia: Grupos → abrir um grupo → Chamada.',
          },
        },
        {
          element: '[data-tour="sidebar-nav"]',
          onHighlightStarted: () => this.abrirMenuMobileSeFechado(),
          popover: {
            title: 'Menu lateral',
            description: educador
              ? 'Por aqui você abre a Chamada e o Calendário.'
              : 'Por aqui você navega entre todas as áreas do sistema.',
            side: 'right',
            // Educador Social não tem Grupos: segue direto para a Chamada.
            ...(educador ? {} : { onNextClick: () => this.irPara('/turmas', driverObj) }),
          },
        },
        ...(educador
          ? []
          : [
              {
                element: '[data-tour="turmas-tabela"]',
                popover: {
                  title: 'Grupos',
                  description:
                    'Cada linha é um grupo. Clique no ícone "→" ("Abrir grupo") pra ver atendidos, oficinas e as demais ações dele num só lugar.',
                  side: 'top' as const,
                },
              },
            ]),
        {
          element: '[data-tour="nav-chamada"]',
          onHighlightStarted: () => this.abrirMenuMobileSeFechado(),
          popover: {
            title: 'Chamada',
            description: 'Quando quiser lançar a chamada do dia, é por aqui.',
            side: 'right',
            onNextClick: () => this.irPara('/chamada', driverObj),
          },
        },
        {
          element: '[data-tour="chamada-tabela"]',
          popover: {
            title: 'Chamada do dia',
            description: educador
              ? 'Clique no grupo de hoje para fazer a chamada.'
              : 'Clique em uma aula de hoje (ou já passada, se você for Coordenador) para abrir a chamada.',
            side: 'top',
          },
        },
      ],
    });

    return driverObj;
  }
}
