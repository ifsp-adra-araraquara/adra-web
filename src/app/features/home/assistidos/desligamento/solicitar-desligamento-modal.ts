import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Button } from '../../../../shared/components/button/button';
import { Icon } from '../../../../shared/components/icon/icon';
import { Input } from '../../../../shared/components/input/input';
import { Modal } from '../../../../shared/components/modal/modal';
import { hojeISO } from '../../../../shared/utils/aula.util';

/** Assistente Social: pede o desligamento; o atendido segue ativo até o Coordenador decidir. */
@Component({
  selector: 'app-solicitar-desligamento-modal',
  imports: [FormsModule, Button, Icon, Input, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [open]="true" title="Solicitar desligamento" size="sm" (closed)="cancelado.emit()">
      <div modal-icon class="mh-ico ico-coral"><app-icon name="power" /></div>
      <p class="cell-sub">Atendido: <strong>{{ nomeAtendido() }}</strong></p>
      <div class="notice notice-info">
        <app-icon name="alert-circle" />
        <span>O pedido vai para o Coordenador. Até ele aprovar, o atendido continua ativo nos grupos e na chamada.</span>
      </div>
      @if (erro()) {
        <div class="notice notice-error" role="alert">{{ erro() }}</div>
      }
      <app-input label="Data de saída" type="date" [required]="true" [ngModel]="dataSaida()" (ngModelChange)="dataSaida.set($event)" />
      <label class="campo">
        <span class="rotulo">Motivo <span aria-hidden="true">*</span></span>
        <textarea class="input" rows="4" maxlength="500" [ngModel]="motivo()" (ngModelChange)="motivo.set($event)"
                  [attr.aria-invalid]="tentou() && !motivo().trim()"></textarea>
        @if (tentou() && !motivo().trim()) {
          <span class="erro" role="alert">Informe o motivo do desligamento.</span>
        }
        <span class="dica">Fica só para a equipe: não aparece no aviso nem no e-mail do Coordenador.</span>
      </label>
      <ng-template #footer>
        <app-button variant="secondary" (click)="cancelado.emit()">Cancelar</app-button>
        <app-button variant="danger" [loading]="enviando()" (click)="enviar()">Enviar pedido</app-button>
      </ng-template>
    </app-modal>
  `,
  styles: `
    .campo { display: flex; flex-direction: column; gap: 4px; margin-top: 12px; }
    .rotulo { font-size: 13px; font-weight: 600; color: var(--gray-600); }
    .dica { font-size: 12px; color: var(--gray-600); }
    .erro { font-size: 12.5px; color: var(--coral-600); }
  `,
})
export class SolicitarDesligamentoModal {
  readonly nomeAtendido = input.required<string>();
  readonly enviando = input(false);
  readonly erro = input<string | null>(null);
  readonly enviado = output<{ dataSaida: string; motivo: string }>();
  readonly cancelado = output<void>();

  protected readonly dataSaida = signal(hojeISO());
  protected readonly motivo = signal('');
  protected readonly tentou = signal(false);
  protected readonly valido = computed(() => !!this.dataSaida() && !!this.motivo().trim());

  protected enviar(): void {
    this.tentou.set(true);
    if (!this.valido()) return;
    this.enviado.emit({ dataSaida: this.dataSaida(), motivo: this.motivo().trim() });
  }
}
