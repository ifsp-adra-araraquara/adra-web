import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Badge } from '../../../../shared/components/badge/badge';
import { Button } from '../../../../shared/components/button/button';
import { Icon } from '../../../../shared/components/icon/icon';
import { Modal } from '../../../../shared/components/modal/modal';
import { SolicitacaoDesligamentoDTO } from '../../../../shared/models/desligamento/SolicitacaoDesligamento';

const ROTULO: Record<string, { texto: string; variante: 'blue' | 'green' | 'coral' | 'gray' }> = {
  PENDENTE: { texto: 'Aguardando', variante: 'blue' },
  APROVADA: { texto: 'Aprovado', variante: 'green' },
  RECUSADA: { texto: 'Recusado', variante: 'coral' },
  CANCELADA: { texto: 'Retirado', variante: 'gray' },
};

/**
 * Pedidos de desligamento no topo de Atendidos. Coordenador: aprova ou recusa os pendentes.
 * Assistente Social: acompanha os pedidos (e retira os que ainda estão abertos).
 */
@Component({
  selector: 'app-pedidos-desligamento',
  imports: [DatePipe, FormsModule, Badge, Button, Icon, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (pedidos().length) {
      <section class="card pedidos" id="pedidos-desligamento" aria-labelledby="pd-titulo">
        <button type="button" class="pedidos-topo" [attr.aria-expanded]="aberto()" (click)="aberto.set(!aberto())">
          <app-icon name="power" [size]="18" />
          <h2 id="pd-titulo">
            Pedidos de desligamento
            @if (pendentes().length) { <span class="count count-alerta">{{ pendentes().length }} aguardando</span> }
          </h2>
          <app-icon [name]="aberto() ? 'chevron-left' : 'chevron-right'" [size]="16" class="seta" />
        </button>

        @if (aberto()) {
          <ul class="lista">
            @for (p of pedidos(); track p.solicitacaoId) {
              <li class="pedido">
                <div class="pedido-texto">
                  <span class="cell-name">{{ p.nomeAtendido }}</span>
                  <span class="cell-sub">
                    {{ p.nomeTurma || 'Sem grupo' }} · saída em {{ p.dataSaida | date: 'dd/MM/yyyy' }}
                    · pedido por {{ p.solicitadoPorNome }} em {{ p.criadoEm | date: 'dd/MM' }}
                  </span>
                  <span class="motivo"><b>Motivo:</b> {{ p.motivo }}</span>
                  @if (p.status !== 'PENDENTE' && p.decididoPorNome) {
                    <span class="cell-sub">
                      {{ rotulo(p).texto }} por {{ p.decididoPorNome }} em {{ p.decididoEm | date: 'dd/MM' }}@if (p.resposta) {: {{ p.resposta }}}
                    </span>
                  }
                </div>
                <div class="pedido-acoes">
                  <app-badge [variant]="rotulo(p).variante" [label]="rotulo(p).texto" />
                  @if (p.status === 'PENDENTE') {
                    @if (ehCoordenador()) {
                      <app-button variant="secondary" size="sm" [loading]="ocupado() === p.solicitacaoId" (click)="abrirRecusa(p)">Recusar</app-button>
                      <app-button variant="danger" size="sm" [loading]="ocupado() === p.solicitacaoId" (click)="aprovar.emit(p)">Aprovar e desligar</app-button>
                    } @else {
                      <app-button variant="secondary" size="sm" [loading]="ocupado() === p.solicitacaoId" (click)="cancelar.emit(p)">Retirar pedido</app-button>
                    }
                  }
                </div>
              </li>
            }
          </ul>
        }
      </section>
    }

    @if (recusando(); as p) {
      <app-modal [open]="true" title="Recusar desligamento" size="sm" (closed)="recusando.set(null)">
        <div modal-icon class="mh-ico ico-green"><app-icon name="rotate-ccw" /></div>
        <p class="cell-sub">Atendido: <strong>{{ p.nomeAtendido }}</strong> — continua ativo.</p>
        <label class="campo">
          <span class="rotulo">Resposta para quem pediu <span aria-hidden="true">*</span></span>
          <textarea class="input" rows="3" maxlength="500" [ngModel]="resposta()" (ngModelChange)="resposta.set($event)"></textarea>
          @if (tentouRecusar() && !resposta().trim()) {
            <span class="erro" role="alert">Explique por que o pedido foi recusado.</span>
          }
        </label>
        <ng-template #footer>
          <app-button variant="secondary" (click)="recusando.set(null)">Cancelar</app-button>
          <app-button (click)="confirmarRecusa(p)">Recusar pedido</app-button>
        </ng-template>
      </app-modal>
    }
  `,
  styles: `
    .pedidos { margin-bottom: 16px; padding: 0; overflow: hidden; }
    .pedidos-topo {
      display: flex; align-items: center; gap: 10px; width: 100%; min-height: 48px; padding: 12px 16px;
      border: 0; background: none; font: inherit; text-align: left; cursor: pointer; color: var(--gray-800);
    }
    .pedidos-topo h2 { flex: 1; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 0; font-size: 15px; font-weight: 600; }
    .seta { color: var(--gray-400); transform: rotate(90deg); }
    .lista { list-style: none; margin: 0; padding: 0 16px 8px; }
    .pedido { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 10px 16px; padding: 12px 0; border-top: 1px solid var(--gray-100); }
    .pedido-texto { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1 1 320px; }
    .pedido-texto .cell-name { overflow-wrap: anywhere; }
    .motivo { font-size: 13.5px; color: var(--gray-800); overflow-wrap: anywhere; }
    .pedido-acoes { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .campo { display: flex; flex-direction: column; gap: 4px; margin-top: 12px; }
    .rotulo { font-size: 13px; font-weight: 600; color: var(--gray-600); }
    .erro { font-size: 12.5px; color: var(--coral-600); }
  `,
})
export class PedidosDesligamento {
  readonly pedidos = input.required<SolicitacaoDesligamentoDTO[]>();
  readonly ehCoordenador = input(false);
  /** Pedido sendo processado (botão em carregamento). */
  readonly ocupado = input<number | null>(null);
  readonly aprovar = output<SolicitacaoDesligamentoDTO>();
  readonly recusar = output<{ pedido: SolicitacaoDesligamentoDTO; resposta: string }>();
  readonly cancelar = output<SolicitacaoDesligamentoDTO>();

  /** Aberto quando há pendente; o resto do tempo fica recolhido. */
  readonly aberto = signal(true);
  protected readonly pendentes = computed(() => this.pedidos().filter((p) => p.status === 'PENDENTE'));
  protected readonly recusando = signal<SolicitacaoDesligamentoDTO | null>(null);
  protected readonly resposta = signal('');
  protected readonly tentouRecusar = signal(false);

  protected rotulo(p: SolicitacaoDesligamentoDTO) {
    return ROTULO[p.status];
  }

  protected abrirRecusa(p: SolicitacaoDesligamentoDTO): void {
    this.resposta.set('');
    this.tentouRecusar.set(false);
    this.recusando.set(p);
  }

  protected confirmarRecusa(p: SolicitacaoDesligamentoDTO): void {
    this.tentouRecusar.set(true);
    if (!this.resposta().trim()) return;
    this.recusar.emit({ pedido: p, resposta: this.resposta().trim() });
    this.recusando.set(null);
  }
}
