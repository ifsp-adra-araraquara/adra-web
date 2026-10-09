import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  input,
  output,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Icon, IconName } from '../icon/icon';

export interface ActionMenuItem {
  id: string;
  label: string;
  icon: IconName;
  /** Ação destrutiva (ex.: inativar): exibida em coral, separada das demais. */
  danger?: boolean;
}

const LARGURA_MENU = 220;
const MARGEM = 8;

/**
 * Botão "⋯" que abre um menu de ações da linha/cartão (padrão WAI-ARIA menu
 * button). O painel usa `position: fixed` calculado a partir do botão, então
 * não é cortado pelo `overflow` da tabela; fecha ao rolar, redimensionar,
 * clicar fora ou com Esc (devolvendo o foco ao botão).
 */
@Component({
  selector: 'app-action-menu',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'aoClicarFora($event)',
    '(window:resize)': 'fechar(false)',
  },
  template: `
    <button
      #gatilho
      type="button"
      class="btn-icon"
      aria-haspopup="menu"
      [attr.aria-expanded]="aberto()"
      [attr.aria-controls]="aberto() ? menuId : null"
      [attr.aria-label]="label()"
      (click)="alternar()"
      (keydown.arrowdown)="abrirComFoco($event, 0)"
      (keydown.arrowup)="abrirComFoco($event, -1)"
    >
      <app-icon name="more-horizontal" />
    </button>

    @if (aberto()) {
      <div
        class="action-menu"
        role="menu"
        [id]="menuId"
        [attr.aria-label]="label()"
        [style.top.px]="posicao().top"
        [style.left.px]="posicao().left"
        [class.action-menu--acima]="posicao().acima"
        (keydown)="navegar($event)"
      >
        @for (item of itens(); track item.id) {
          @if (item.danger && !$first) {
            <div class="action-menu-sep" role="separator"></div>
          }
          <button
            #opcao
            type="button"
            role="menuitem"
            tabindex="-1"
            class="action-menu-item"
            [class.action-menu-item--danger]="item.danger"
            (click)="selecionar(item)"
          >
            <app-icon [name]="item.icon" />
            {{ item.label }}
          </button>
        }
      </div>
    }
  `,
  styles: `
    :host { display: inline-flex; }
    .action-menu {
      position: fixed; z-index: 300; width: ${LARGURA_MENU}px; padding: 6px;
      background: #fff; border: 1px solid var(--gray-100); border-radius: var(--radius);
      box-shadow: var(--shadow-lg); animation: action-menu-in .12s var(--ease) both;
      transform-origin: top right;
    }
    .action-menu--acima { transform-origin: bottom right; }
    .action-menu-item {
      display: flex; align-items: center; gap: 10px; width: 100%; min-height: 44px;
      padding: 10px 12px; border: none; border-radius: var(--radius-sm); background: none;
      color: var(--gray-800); font: inherit; font-size: 14px; font-weight: 500; text-align: left;
      transition: background .12s, color .12s;
    }
    .action-menu-item app-icon { color: var(--gray-600); }
    .action-menu-item:hover, .action-menu-item:focus-visible {
      background: var(--color-brand-soft); color: var(--color-adra-green-600); outline: none;
    }
    .action-menu-item:hover app-icon, .action-menu-item:focus-visible app-icon { color: var(--color-brand); }
    .action-menu-item--danger, .action-menu-item--danger app-icon { color: var(--coral-600); }
    .action-menu-item--danger:hover, .action-menu-item--danger:focus-visible { background: var(--coral-50); color: var(--coral-600); }
    .action-menu-item--danger:hover app-icon, .action-menu-item--danger:focus-visible app-icon { color: var(--coral-600); }
    .action-menu-sep { height: 1px; margin: 6px 4px; background: var(--gray-100); }
    @keyframes action-menu-in { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { .action-menu { animation: none; } }
  `,
})
export class ActionMenu {
  /** Nome acessível do botão e do menu, ex.: "Ações de Maria Souza". */
  label = input.required<string>();
  itens = input.required<ActionMenuItem[]>();
  selecionado = output<string>();

  private static proximoId = 0;
  protected readonly menuId = `action-menu-${ActionMenu.proximoId++}`;
  protected readonly aberto = signal(false);
  protected readonly posicao = signal({ top: 0, left: 0, acima: false });

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);
  private readonly documento = inject(DOCUMENT);
  private readonly gatilho = viewChild.required<ElementRef<HTMLButtonElement>>('gatilho');
  private readonly opcoes = viewChildren<ElementRef<HTMLButtonElement>>('opcao');

  // Rolagem de qualquer contêiner (inclusive o overflow da tabela) desloca o
  // botão — fecha em vez de deixar o painel "solto" na tela.
  private readonly aoRolar = () => this.fechar(false);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.documento.removeEventListener('scroll', this.aoRolar, true));
  }

  protected alternar(): void {
    if (this.aberto()) {
      this.fechar(false);
    } else {
      this.abrir(0);
    }
  }

  protected abrirComFoco(evento: Event, indice: number): void {
    evento.preventDefault();
    this.abrir(indice);
  }

  private abrir(indiceFoco: number): void {
    const r = this.gatilho().nativeElement.getBoundingClientRect();
    const janela = this.documento.defaultView!;
    const alturaEstimada = this.itens().length * 46 + 24;
    const acima = r.bottom + alturaEstimada + MARGEM > janela.innerHeight && r.top > alturaEstimada + MARGEM;
    const left = Math.min(Math.max(MARGEM, r.right - LARGURA_MENU), janela.innerWidth - LARGURA_MENU - MARGEM);
    const top = acima ? r.top - alturaEstimada - 4 : r.bottom + 4;

    this.posicao.set({ top, left, acima });
    this.aberto.set(true);
    this.documento.addEventListener('scroll', this.aoRolar, true);
    // espera o @if renderizar as opções antes de mover o foco
    afterNextRender(() => this.focar(indiceFoco), { injector: this.injector });
  }

  protected fechar(devolverFoco: boolean): void {
    if (!this.aberto()) return;
    this.aberto.set(false);
    this.documento.removeEventListener('scroll', this.aoRolar, true);
    if (devolverFoco) this.gatilho().nativeElement.focus();
  }

  protected selecionar(item: ActionMenuItem): void {
    this.fechar(true);
    this.selecionado.emit(item.id);
  }

  protected aoClicarFora(evento: MouseEvent): void {
    if (this.aberto() && !this.host.nativeElement.contains(evento.target as Node)) {
      this.fechar(false);
    }
  }

  protected navegar(evento: KeyboardEvent): void {
    const opcoes = this.opcoes().map((o) => o.nativeElement);
    const atual = opcoes.indexOf(this.documento.activeElement as HTMLButtonElement);
    const mover: Record<string, number> = {
      ArrowDown: atual + 1,
      ArrowUp: atual - 1,
      Home: 0,
      End: opcoes.length - 1,
    };
    if (evento.key in mover) {
      evento.preventDefault();
      this.focar(mover[evento.key]);
    } else if (evento.key === 'Escape') {
      evento.preventDefault();
      this.fechar(true);
    } else if (evento.key === 'Tab') {
      this.fechar(false);
    }
  }

  private focar(indice: number): void {
    const opcoes = this.opcoes();
    if (!opcoes.length) return;
    const i = (indice + opcoes.length) % opcoes.length;
    opcoes[i].nativeElement.focus();
  }
}
