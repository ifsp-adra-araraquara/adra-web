import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { MatriculaService } from '../../../core/matricula.service';
import { EncerramentoAnoDTO, EncerramentoPreviaDTO } from '../../../shared/models/matricula/Matricula';
import { Button } from '../../../shared/components/button/button';
import { Icon } from '../../../shared/components/icon/icon';
import { Modal } from '../../../shared/components/modal/modal';
import { mensagemErro } from '../../../shared/utils/erro-http.util';

/**
 * Encerramento do ano letivo (Coordenador), depois do prazo de rematrícula:
 * mostra quem renovou e quem perde a vaga, e só encerra com confirmação.
 */
@Component({
  selector: 'app-encerramento-ano',
  imports: [Button, Icon, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="faixa" role="status">
      <app-icon name="flag" [size]="18" />
      <p class="texto">
        <b>{{ previa().ano }} ainda não foi encerrado.</b>
        {{ previa().renovaram }} de {{ previa().totalAtivas }} {{ previa().totalAtivas === 1 ? 'atendido renovou' : 'atendidos renovaram' }}
        para {{ previa().ano + 1 }}.
      </p>
      <app-button variant="secondary" size="sm" (click)="abrir()">Encerrar {{ previa().ano }}</app-button>
    </div>

    <app-modal [(open)]="aberto" [title]="'Encerrar ' + previa().ano" size="md">
      @if (erro()) {
        <div class="notice notice-error" role="alert">{{ erro() }}</div>
      }
      @if (!previa().podeEncerrar) {
        <div class="notice notice-amber" role="status">
          <app-icon name="alert-circle" />
          <span>{{ previa().motivoBloqueio }}</span>
        </div>
      }

      <ul class="numeros" role="list">
        <li>
          <b>{{ previa().renovaram }}</b> {{ previa().renovaram === 1 ? 'renovou e segue' : 'renovaram e seguem' }}
          em {{ previa().ano + 1 }}, no grupo escolhido na rematrícula.
        </li>
        <li>
          <b>{{ previa().naoRenovaram }}</b> {{ previa().naoRenovaram === 1 ? 'não renovou e' : 'não renovaram e' }}
          <b>{{ previa().naoRenovaram === 1 ? 'perde a vaga' : 'perdem a vaga' }}</b>:
          {{ previa().naoRenovaram === 1 ? 'fica desligado' : 'ficam desligados' }} em 31/12/{{ previa().ano }}.
        </li>
        <li>
          <b>{{ previa().novosNoAnoSeguinte }}</b>
          {{ previa().novosNoAnoSeguinte === 1 ? 'família nova já matriculada' : 'famílias novas já matriculadas' }}
          em {{ previa().ano + 1 }}.
        </li>
        @if (previa().disciplinarArquivados; as arquivados) {
          <li>
            <b>{{ arquivados }}</b>
            {{ arquivados === 1 ? 'registro disciplinar será arquivado' : 'registros disciplinares serão arquivados' }}:
            a contagem de ocorrências recomeça em {{ previa().ano + 1 }}. O histórico continua na ficha.
          </li>
        }
      </ul>

      @if (previa().disciplinarDocumentosPendentes || previa().disciplinarConsequenciasPendentes) {
        <p class="aviso-disciplinar" role="note">
          <app-icon name="alert-triangle" [size]="16" />
          <span>
            Antes de encerrar, confira no Disciplinar:
            @if (previa().disciplinarDocumentosPendentes; as docs) {
              {{ docs }} {{ docs === 1 ? 'documento ainda sem assinatura' : 'documentos ainda sem assinatura' }}
            }
            @if (previa().disciplinarDocumentosPendentes && previa().disciplinarConsequenciasPendentes) { e }
            @if (previa().disciplinarConsequenciasPendentes; as cons) {
              {{ cons }} {{ cons === 1 ? 'consequência não resolvida' : 'consequências não resolvidas' }}
            }.
            Eles também serão arquivados.
          </span>
        </p>
      }

      @if (previa().quemNaoRenovou.length) {
        <h3 class="subtitulo">Quem não renovou</h3>
        <ul class="nomes" role="list">
          @for (atendido of previa().quemNaoRenovou; track atendido.assistidoId) {
            <li>
              {{ atendido.nomeCompleto }}
              @if (atendido.nomeTurma) { <span class="grupo">— {{ atendido.nomeTurma }}</span> }
            </li>
          }
        </ul>
      }

      <p class="dica">
        A frequência, os grupos e as fichas de {{ previa().ano }} continuam no histórico. Depois de encerrado, o ano não
        aceita novas matrículas.
      </p>

      @if (previa().podeEncerrar) {
        <label class="check">
          <input type="checkbox" [checked]="confirmado()" (change)="confirmado.set($any($event.target).checked)" />
          <span>{{ textoConfirmacao() }}</span>
        </label>
      }

      <ng-template #footer>
        <app-button variant="secondary" (click)="aberto.set(false)">Cancelar</app-button>
        <app-button
          variant="danger"
          [disabled]="!previa().podeEncerrar || !confirmado()"
          [loading]="encerrando()"
          (click)="encerrar()"
        >
          Encerrar {{ previa().ano }}
        </app-button>
      </ng-template>
    </app-modal>
  `,
  styles: `
    .aviso-disciplinar { display: flex; gap: 8px; align-items: flex-start; margin: 8px 0 0; font-size: 13.5px; color: var(--amber-700, #92400e); }
    .faixa {
      display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px;
      padding: 12px 16px; margin-bottom: 16px;
      border: 1px solid var(--amber-400); border-radius: var(--radius-sm); background: var(--amber-50);
      color: var(--gray-800);
    }
    .texto { flex: 1 1 260px; margin: 0; font-size: 14px; line-height: 1.5; }
    .numeros { margin: 0 0 14px; padding-left: 18px; font-size: 14px; line-height: 1.6; color: var(--gray-800); }
    .subtitulo { margin: 0 0 6px; font-size: 14px; font-weight: 600; color: var(--gray-800); }
    .nomes { max-height: 220px; overflow-y: auto; margin: 0 0 14px; padding: 8px 12px 8px 28px; border: 1px solid var(--gray-200); border-radius: var(--radius-sm); font-size: 14px; line-height: 1.6; }
    .grupo { color: var(--gray-600); }
    .dica { margin: 0 0 8px; font-size: 13px; color: var(--gray-600); }
  `,
})
export class EncerramentoAno {
  private readonly service = inject(MatriculaService);

  readonly previa = input.required<EncerramentoPreviaDTO>();
  readonly encerrado = output<EncerramentoAnoDTO>();

  protected readonly aberto = signal(false);
  protected readonly confirmado = signal(false);
  protected readonly encerrando = signal(false);
  protected readonly erro = signal<string | null>(null);

  protected readonly textoConfirmacao = computed(() => {
    const n = this.previa().naoRenovaram;
    const quem = n === 1 ? '1 atendido que não renovou será desligado' : `${n} atendidos que não renovaram serão desligados`;
    return `Entendi: ${quem} e ${this.previa().ano} será encerrado.`;
  });

  protected abrir(): void {
    this.confirmado.set(false);
    this.erro.set(null);
    this.aberto.set(true);
  }

  protected async encerrar(): Promise<void> {
    if (!this.confirmado() || this.encerrando()) return;
    this.encerrando.set(true);
    this.erro.set(null);
    try {
      const resultado = await this.service.encerrar(this.previa().ano);
      this.aberto.set(false);
      this.encerrado.emit(resultado);
    } catch (e) {
      this.erro.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível encerrar o ano. Tente de novo.'));
    } finally {
      this.encerrando.set(false);
    }
  }
}
