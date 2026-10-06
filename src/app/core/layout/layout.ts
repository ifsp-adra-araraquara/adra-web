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
import { RouterOutlet } from '@angular/router';
import { Sidebar } from './sidebar/sidebar';
import { OnboardingService } from '../onboarding.service';
import { TooltipDirective } from '../../shared/components/tooltip/tooltip';

const CHAVE_SIDEBAR_COLAPSADA = 'adra.sidebar.collapsed';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, Sidebar, TooltipDirective],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'closeMenu()',
  },
})
export class Layout {
  private readonly onboarding = inject(OnboardingService);

  menuOpen = signal(false);
  sidebarCollapsed = signal(localStorage.getItem(CHAVE_SIDEBAR_COLAPSADA) === 'true');
  private menuButton = viewChild.required<ElementRef<HTMLButtonElement>>('menuButton');

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
