import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  contentChild,
  input,
  model,
  output,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

/**
 * Modal padronizado — abre/fecha por um signal (`[(open)]`), fecha ao clicar fora
 * ou apertar ESC, e aceita corpo e rodapé (ações) por projeção de conteúdo.
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
@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [NgTemplateOutlet],
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
  size = input<'sm' | 'md' | 'lg'>('md');
  closeOnBackdrop = input(true);
  closeOnEscape = input(true);

  /** Emitido sempre que o modal é fechado (clique fora, ESC ou botão de fechar). */
  closed = output<void>();

  /** Rodapé opcional — projetado via `<ng-template #footer>` no conteúdo do modal. */
  footerTemplate = contentChild<TemplateRef<unknown>>('footer');

  protected onBackdropClick(): void {
    if (this.closeOnBackdrop()) {
      this.close();
    }
  }

  protected onEscapeKey(): void {
    if (this.open() && this.closeOnEscape()) {
      this.close();
    }
  }

  protected close(): void {
    this.open.set(false);
    this.closed.emit();
  }
}
