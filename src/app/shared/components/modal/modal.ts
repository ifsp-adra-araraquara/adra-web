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
} from '@angular/core';
import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { Icon } from '../icon/icon';

/** Acima disso, clicar fora não fecha o modal (modo 'auto'). */
const MAXIMO_CAMPOS_FECHAR_CLICANDO_FORA = 5;

/** Campos que o usuário preenche (botões, hidden e file não contam). */
const SELETOR_CAMPOS = 'input:not([type="hidden"]):not([type="file"]):not([type="button"]):not([type="submit"]), select, textarea';

/**
 * Modal padronizado — abre/fecha por um signal (`[(open)]`), fecha ao clicar fora
 * ou apertar ESC, e aceita corpo e rodapé (ações) por projeção de conteúdo.
 *
 * Clique fora (`closeOnBackdrop`): por padrão ('auto') só fecha se o modal tiver
 * até 5 campos de formulário — formulários maiores não se perdem num clique errado.
 * Passe `true`/`false` para forçar.
 *
 * Uso:
 *   <app-modal [(open)]="mostrarModal" title="Nova oficina">
 *     <p>Corpo do modal aqui.</p>
 *
 *     <ng-template #footer>
 *       <button class="btn btn-ghost" (click)="mostrarModal.set(false)">Cancelar</button>
 *       <button class="btn" (click)="salvar()">Salvar</button>
 *     </ng-template>
 *   </app-modal>
 */
let nextId = 0;

@Component({
  selector: 'app-modal',
  imports: [Icon, NgTemplateOutlet],
  templateUrl: './modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscapeKey()',
  },
})
export class Modal {
  /** Visibilidade do modal. Normalmente ligado a um signal do componente pai via `[(open)]`. */
  open = model(false);

  title = input('');
  subtitle = input('');
  size = input<'sm' | 'md' | 'lg'>('md');
  closeOnBackdrop = input<boolean | 'auto'>('auto');
  closeOnEscape = input(true);

  /** Emitido sempre que o modal é fechado (clique fora, ESC ou botão de fechar). */
  closed = output<void>();

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly document = inject(DOCUMENT);

  protected readonly titleId = `app-modal-title-${nextId++}`;

  /** Rodapé opcional — projetado via `<ng-template #footer>` no conteúdo do modal. */
  footerTemplate = contentChild<TemplateRef<unknown>>('footer');

  /** Só conta como "clique fora" se o botão também foi pressionado fora (evita fechar ao arrastar seleção de texto). */
  private pressionouNoFundo = false;

  protected onBackdropMouseDown(evento: MouseEvent): void {
    this.pressionouNoFundo = evento.target === evento.currentTarget;
  }

  protected onBackdropClick(evento: MouseEvent): void {
    const foraDoModal = this.pressionouNoFundo && evento.target === evento.currentTarget;
    this.pressionouNoFundo = false;
    if (foraDoModal && this.podeFecharClicandoFora()) {
      this.close();
    }
  }

  private podeFecharClicandoFora(): boolean {
    const config = this.closeOnBackdrop();
    if (config !== 'auto') return config;
    const corpo = (this.host.nativeElement as HTMLElement).querySelector('.modal');
    const campos = corpo?.querySelectorAll(SELETOR_CAMPOS).length ?? 0;
    return campos <= MAXIMO_CAMPOS_FECHAR_CLICANDO_FORA;
  }

  protected onEscapeKey(): void {
    if (this.open() && this.closeOnEscape() && this.isTopmost()) {
      this.close();
    }
  }

  private isTopmost(): boolean {
    const overlays = this.document.querySelectorAll('.modal-overlay');
    return overlays[overlays.length - 1]?.parentElement === this.host.nativeElement;
  }

  protected close(): void {
    this.open.set(false);
    this.closed.emit();
  }
}
