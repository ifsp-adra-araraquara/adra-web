import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';

import { Button } from '../../../shared/components/button/button';
import { Icon } from '../../../shared/components/icon/icon';
import { Modal } from '../../../shared/components/modal/modal';

/**
 * Botão "Enviar link de inscrição": mostra o link público do pré-cadastro para
 * copiar ou mandar direto pelo WhatsApp (o WhatsApp abre para escolher o contato).
 */
@Component({
  selector: 'app-link-inscricao',
  imports: [Button, Icon, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-button (click)="aberto.set(true)">
      <app-icon name="mail" [size]="16" /> Enviar link de inscrição
    </app-button>

    <app-modal [(open)]="aberto" title="Link de inscrição" size="sm" (closed)="copiado.set(false)">
      <p class="texto">Mande este link para a família preencher a inscrição pelo celular. Não precisa de login.</p>
      <label class="rotulo" for="link-inscricao">Link</label>
      <input id="link-inscricao" class="link" type="text" readonly [value]="link()" (focus)="$any($event.target).select()" />
      @if (copiado()) {
        <p class="aviso" role="status">Link copiado.</p>
      }

      <ng-template #footer>
        <app-button variant="secondary" (click)="copiar()">
          <app-icon name="check-square" [size]="16" /> Copiar link
        </app-button>
        <a class="btn whatsapp" [href]="linkWhatsApp()" target="_blank" rel="noopener">
          <app-icon name="phone" [size]="16" /> Enviar pelo WhatsApp
        </a>
      </ng-template>
    </app-modal>
  `,
  styles: `
    .texto { margin: 0 0 12px; font-size: 14px; color: var(--gray-600); }
    .rotulo { display: block; font-size: 13px; font-weight: 500; margin-bottom: 6px; color: var(--rotulo); }
    .link { width: 100%; min-height: 44px; padding: 10px 12px; font-size: 15px; border: 1px solid var(--campo-borda); border-radius: var(--radius-sm); background: var(--campo-desabilitado); }
    .aviso { margin: 8px 0 0; font-size: 13px; color: var(--color-adra-green-600); }
    .whatsapp { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; text-decoration: none; }
  `,
})
export class LinkInscricao {
  private readonly document = inject(DOCUMENT);

  /** Ano das inscrições feitas hoje (o do período de matrícula aberto). */
  readonly ano = input.required<number>();

  protected readonly aberto = signal(false);
  protected readonly copiado = signal(false);

  protected readonly link = computed(() => `${this.document.location.origin}/pre-cadastro`);
  protected readonly linkWhatsApp = computed(() => {
    const mensagem =
      `Olá! Esta é a inscrição ${this.ano()} da ADRA Araraquara. ` +
      `Preencha pelo link (leva uns 10 minutos): ${this.link()}`;
    return `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
  });

  protected async copiar(): Promise<void> {
    try {
      await this.document.defaultView?.navigator.clipboard.writeText(this.link());
      this.copiado.set(true);
    } catch {
      // Sem permissão de área de transferência: o campo fica selecionado para copiar à mão.
      (this.document.getElementById('link-inscricao') as HTMLInputElement | null)?.select();
    }
  }
}
