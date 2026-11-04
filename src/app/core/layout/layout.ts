import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, skip } from 'rxjs';
import { Sidebar } from './sidebar/sidebar';
import { OnboardingService } from '../onboarding.service';
import { TooltipDirective } from '../../shared/components/tooltip/tooltip';
import { Icon } from '../../shared/components/icon/icon';
import { Notificacoes } from '../../shared/components/notificacoes/notificacoes';

const CHAVE_SIDEBAR_COLAPSADA = 'adra.sidebar.collapsed';

@Component({
  selector: 'app-layout',
  imports: [Icon, Notificacoes, RouterOutlet, Sidebar, TooltipDirective],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'closeMenu()',
  },
})
export class Layout {
  private readonly onboarding = inject(OnboardingService);
  private readonly document = inject(DOCUMENT);

  menuOpen = signal(false);
  sidebarCollapsed = signal(localStorage.getItem(CHAVE_SIDEBAR_COLAPSADA) === 'true');
  private menuButton = viewChild.required<ElementRef<HTMLButtonElement>>('menuButton');
  private conteudo = viewChild.required<ElementRef<HTMLElement>>('conteudo');

  /** Lido pelo leitor de tela ao trocar de tela (o título da aba já vem da rota). */
  readonly anuncioTela = signal('');

  /** Botão "Ver tutorial" só aparece pra quem o tour (Fase 5) realmente cobre — ver OnboardingService. */
  readonly mostrarAjudaTour = computed(() => this.onboarding.podeVerTour());

  constructor() {
    effect(() => {
      localStorage.setItem(CHAVE_SIDEBAR_COLAPSADA, String(this.sidebarCollapsed()));
    });

    // Espera o primeiro paint (sidebar/topbar já no DOM) antes de medir
    // onde destacar o primeiro passo do tour.
    afterNextRender(() => {
      setTimeout(() => this.onboarding.iniciarSeNecessario(), 600);
    });

    // WCAG 2.4.3: ao trocar de tela, o foco vai para o conteúdo novo e o leitor de tela
    // anuncia o título. A primeira navegação fica de fora para não roubar o foco ao entrar.
    inject(Router).events.pipe(
      filter((evento) => evento instanceof NavigationEnd),
      skip(1),
      takeUntilDestroyed(),
    ).subscribe(() => setTimeout(() => {
      this.anuncioTela.set(this.document.title);
      this.focarConteudo();
    }));
  }

  /** "Pular para o conteúdo" (WCAG 2.4.1): leva o foco direto para a tela, sem passar pelo menu. */
  pularParaConteudo(evento: Event): void {
    evento.preventDefault();
    this.focarConteudo();
  }

  private focarConteudo(): void {
    this.conteudo().nativeElement.focus({ preventScroll: true });
  }

  abrirTutorial(): void {
    this.onboarding.iniciarTour();
  }

  closeMenu(): void {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
    this.menuButton().nativeElement.focus();
  }
}
