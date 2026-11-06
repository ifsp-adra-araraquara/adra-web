import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  TemplateRef,
  contentChild,
  inject,
  input,
  model,
  output,
  effect,
  untracked,
  viewChild,
} from '@angular/core';
import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { Icon } from '../icon/icon';
import { focarAoAbrir, prenderTab } from '../../utils/foco.util';

let nextId = 0;

/**
 * Painel lateral (drawer) — mesmo contrato do `<app-modal>` (`[(open)]`,
 * fecha com ESC ou clique fora), mas desliza da direita em vez de cobrir a
 * tela inteira, mantendo a lista por trás visível (só escurecida). Pensado
 * pra "entrar" num registro de uma tabela e ver as ações dele sem perder o
 * contexto da listagem (ex.: linha de Turmas com muitas ações).
 *
 * Uso:
 *   <app-drawer [(open)]="mostrarDrawer" title="Turma A" subtitle="Tarde · 16/20 vagas">
 *     <p>Conteúdo aqui.</p>
 *   </app-drawer>
 */
@Component({
  selector: 'app-drawer',
  imports: [Icon, NgTemplateOutlet],
  templateUrl: './drawer.html',
  styleUrl: './drawer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscapeKey()',
  },
})
export class Drawer {
  /** Visibilidade do drawer. Normalmente ligado a um signal do componente pai via `[(open)]`. */
  open = model(false);

  title = input('');
  subtitle = input('');
  closeOnBackdrop = input(true);
  closeOnEscape = input(true);

  /** Emitido sempre que o drawer é fechado (clique fora, ESC ou botão de fechar). */
  closed = output<void>();

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly document = inject(DOCUMENT);

  protected readonly titleId = `app-drawer-title-${nextId++}`;

  /** Rodapé opcional — projetado via `<ng-template #footer>` no conteúdo do drawer. */
  footerTemplate = contentChild<TemplateRef<unknown>>('footer');

  /** Diálogo aberto; recebe o foco ao abrir e prende o Tab (WCAG 2.4.3). */
  private readonly dialogo = viewChild<ElementRef<HTMLElement>>('dialogo');
  /** Quem tinha o foco antes de abrir — recebe o foco de volta ao fechar. */
  private origemFoco: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const aberto = this.open();
      untracked(() => {
        if (aberto) {
          this.origemFoco = this.document.activeElement as HTMLElement | null;
          setTimeout(() => {
            const dialogo = this.dialogo()?.nativeElement;
            if (dialogo) focarAoAbrir(dialogo);
          });
        } else if (this.origemFoco) {
          const origem = this.origemFoco;
          this.origemFoco = null;
          if (origem.isConnected) origem.focus();
        }
      });
    });
  }

  protected onKeydown(evento: KeyboardEvent): void {
    const dialogo = this.dialogo()?.nativeElement;
    if (dialogo) prenderTab(evento, dialogo);
  }

  protected onBackdropClick(): void {
    if (this.closeOnBackdrop()) {
      this.close();
    }
  }

  protected onEscapeKey(): void {
    if (this.open() && this.closeOnEscape() && this.isTopmost()) {
      this.close();
    }
  }

  /** Mesma lógica do <app-modal>: só o drawer mais "de cima" (último aberto) reage ao ESC. */
  private isTopmost(): boolean {
    const overlays = this.document.querySelectorAll('.drawer-overlay');
    return overlays[overlays.length - 1]?.parentElement === this.host.nativeElement;
  }

  protected close(): void {
    this.open.set(false);
    this.closed.emit();
  }
}
