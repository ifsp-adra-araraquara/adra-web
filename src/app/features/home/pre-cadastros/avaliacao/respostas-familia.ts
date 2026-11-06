import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { PreCadastroRequestDTO, PreCadastroResponseDTO } from '../../../../shared/models/precadastro/PreCadastro';
import { secoesRevisao } from '../../../pre-cadastro/resumo-inscricao';

/** Tudo o que a família respondeu no link público, só leitura, para conferir antes de aprovar. */
@Component({
  selector: 'app-respostas-familia',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: block;' },
  template: `
    @if (secoes(); as lista) {
      @for (secao of lista; track secao.chave) {
        <section class="secao" [attr.aria-labelledby]="'resp-' + secao.chave">
          <h3 [id]="'resp-' + secao.chave">{{ secao.titulo }}</h3>
          <dl>
            @for (item of secao.itens; track item.rotulo) {
              <div><dt>{{ item.rotulo }}</dt><dd>{{ item.valor || '—' }}</dd></div>
            }
          </dl>
        </section>
      }
    } @else {
      <p class="muted">Enviado pelo formulário antigo: só há nome, nascimento e responsável.</p>
    }
  `,
  styles: `
    .secao + .secao { margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--gray-100); }
    h3 { margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: .4px; color: var(--color-adra-green-600); }
    dl { margin: 0; display: grid; gap: 8px; }
    dt { font-size: 12px; color: var(--gray-600); }
    dd { margin: 0; font-size: 14px; color: var(--gray-800); overflow-wrap: anywhere; white-space: pre-line; }
  `,
})
export class RespostasFamilia {
  detalhe = input.required<PreCadastroResponseDTO>();

  protected readonly secoes = computed(() => {
    const d = this.detalhe();
    if (!d.cpf || !d.dados.termos) return null;
    return secoesRevisao({ ...d, site: '' } as PreCadastroRequestDTO);
  });
}
