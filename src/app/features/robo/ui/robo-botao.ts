import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

import { AuthService } from '../../../core/auth.service';
import { NOME_ROBO } from '../nome';
import { RoboConversa } from '../robo-conversa.service';
import { RoboMascote } from './robo-mascote';
import { RoboPainel } from './robo-painel';

/** A rota (ou uma filha) pediu o botão recolhido: tem barra de ações fixa no rodapé. */
function recolhidoNa(rota: ActivatedRouteSnapshot | null): boolean {
  for (let r = rota; r; r = r.firstChild) if (r.data['roboRecolhido']) return true;
  return false;
}

/**
 * ADRAbot — botão flutuante no canto das telas internas. A janela (e com ela
 * o motor, o catálogo e as respostas) só é baixada na primeira vez que a
 * pessoa abre o robô.
 *
 * Telas com barra fixa no rodapé (Salvar chamada, Salvar cadastro…) marcam
 * `data: { roboRecolhido: true }` na rota: no celular o botão some ali para
 * não cobrir o "Salvar", e o robô continua no atalho do topo.
 */
@Component({
  selector: 'app-robo-botao',
  imports: [RoboMascote, RoboPainel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (temPerfil()) {
      @defer (when conversa.aberto()) {
        @if (conversa.aberto()) {
          <app-robo-painel />
        }
      }
      <button
        #botao
        type="button"
        class="flutuante no-print"
        [class.aberto]="conversa.aberto()"
        [class.recolhido]="recolhido()"
        [attr.aria-expanded]="conversa.aberto()"
        [attr.aria-label]="conversa.aberto() ? 'Fechar o ' + nome : 'Abrir o ' + nome + ', assistente do sistema'"
        [title]="nome"
        (click)="alternar()"
      >
        <app-robo-mascote [tamanho]="48" [estado]="conversa.aberto() ? 'parado' : 'acenando'" />
      </button>
    }
  `,
  styles: `
    /* Base: celular. Camada acima do conteúdo (30) e abaixo do menu lateral (40–50) e dos modais (200). */
    .flutuante {
      position: fixed; z-index: 35;
      right: calc(14px + env(safe-area-inset-right, 0px)); bottom: calc(14px + env(safe-area-inset-bottom, 0px));
      width: 58px; height: 58px; padding: 0; border-radius: 50%; border: 3px solid #fff;
      display: grid; place-items: center; cursor: pointer; touch-action: manipulation;
      background: var(--color-brand);
      box-shadow: 0 6px 18px color-mix(in srgb, var(--color-adra-green-900) 35%, transparent);
      transition: transform .15s ease;
    }
    .flutuante:hover { transform: translateY(-2px); }
    .flutuante:focus-visible { outline: 3px solid var(--color-brand-ring); outline-offset: 3px; }
    /* Celular: a conversa cobre a tela (fecha pelo X) e o botão não cobre barras de "Salvar". */
    .flutuante.aberto, .flutuante.recolhido { display: none; }

    @media (min-width: 600px) and (min-height: 560px) {
      .flutuante { width: 64px; height: 64px; right: calc(20px + env(safe-area-inset-right, 0px)); bottom: calc(20px + env(safe-area-inset-bottom, 0px)); }
      .flutuante.aberto { display: grid; }
      /* Tablet/computador: sobe acima da barra de "Salvar" do rodapé. */
      .flutuante.recolhido { display: grid; bottom: calc(88px + env(safe-area-inset-bottom, 0px)); }
    }
    @media (forced-colors: active) { .flutuante { border-color: ButtonText; } }
    @media (prefers-reduced-motion: reduce) { .flutuante { transition: none; } }
  `,
})
export class RoboBotao {
  protected readonly conversa = inject(RoboConversa);
  protected readonly nome = NOME_ROBO;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly botao = viewChild<ElementRef<HTMLButtonElement>>('botao');

  /** Só os quatro perfis da ADRA têm o que perguntar (o Administrador só gerencia usuários). */
  protected readonly temPerfil = computed(() => !!this.auth.currentProfile());

  protected readonly recolhido = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      startWith(null),
      map(() => recolhidoNa(this.router.routerState.snapshot.root)),
    ),
    { initialValue: false },
  );

  private estavaAberto = false;

  constructor() {
    // Ao fechar, o foco volta para quem abriu (WCAG 2.4.3).
    effect(() => {
      const aberto = this.conversa.aberto();
      untracked(() => {
        if (this.estavaAberto && !aberto) setTimeout(() => this.conversa.devolverFoco(this.botao()?.nativeElement));
        this.estavaAberto = aberto;
      });
    });
  }

  protected alternar(): void {
    if (this.conversa.aberto()) this.conversa.fechar();
    else void this.conversa.abrir(this.botao()?.nativeElement);
  }
}
