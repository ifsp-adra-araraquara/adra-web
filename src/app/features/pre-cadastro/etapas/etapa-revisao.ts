import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { Button } from '../../../shared/components/button/button';
import { Icon } from '../../../shared/components/icon/icon';
import { ChaveEtapa, FormularioPreCadastro, paraPayload } from '../pre-cadastro-form.util';
import { SecaoRevisao, secoesRevisao } from '../resumo-inscricao';
import { AnexosPreCadastro } from '../../../shared/models/precadastro/PreCadastro';

const enviado = (quantidade: number) => (quantidade ? `Enviado (${quantidade})` : 'Não enviado — levar na entrevista');

function secaoDocumentos(anexos: AnexosPreCadastro): SecaoRevisao {
  return {
    chave: 'documentos',
    titulo: 'Documentos e foto',
    itens: [
      { rotulo: 'Comprovante de endereço', valor: enviado(anexos.comprovanteEndereco.length) },
      { rotulo: 'Foto do atendido', valor: anexos.foto ? 'Enviada' : 'Não enviada — levar na entrevista' },
      { rotulo: 'Documento do atendido', valor: enviado(anexos.documentosCrianca.length) },
      { rotulo: 'Documento do responsável', valor: enviado(anexos.documentosResponsavel.length) },
    ],
  };
}

@Component({
  selector: 'app-etapa-revisao',
  imports: [Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="intro">Confira as respostas antes de enviar. Toque em "Editar" para corrigir.</p>
    @for (secao of secoes(); track secao.chave) {
      <section class="secao" [attr.aria-labelledby]="'rev-' + secao.chave">
        <div class="secao__topo">
          <h3 [id]="'rev-' + secao.chave">{{ secao.titulo }}</h3>
          <app-button variant="secondary" size="sm" (click)="editar.emit(secao.chave)">
            <app-icon name="edit" [size]="16" /> Editar <span class="sr-only">{{ secao.titulo }}</span>
          </app-button>
        </div>
        <dl>
          @for (item of secao.itens; track item.rotulo) {
            <div>
              <dt>{{ item.rotulo }}</dt>
              <dd>{{ item.valor }}</dd>
            </div>
          }
        </dl>
      </section>
    }
  `,
  styles: `
    .intro { margin: 0 0 16px; font-size: 15px; color: var(--gray-600); }
    .secao { padding: 14px 16px; margin-bottom: 12px; border: 1px solid var(--borda); border-radius: var(--radius); }
    .secao__topo { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
    h3 { margin: 0; font-size: 15px; font-weight: 600; color: var(--gray-800); }
    dl { margin: 0; display: grid; gap: 8px; }
    dt { font-size: 12px; color: var(--gray-600); }
    dd { margin: 0; font-size: 14px; color: var(--gray-800); overflow-wrap: anywhere; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
  `,
})
export class EtapaRevisao {
  form = input.required<FormularioPreCadastro>();
  anexos = input.required<AnexosPreCadastro>();
  editar = output<ChaveEtapa>();

  protected readonly secoes = computed(() => [
    ...secoesRevisao(paraPayload(this.form())),
    secaoDocumentos(this.anexos()),
  ]);
}
