import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FolhaA4 } from '../../../shared/components/folha-a4/folha-a4';
import { Icon } from '../../../shared/components/icon/icon';
import { INSTITUICAO } from '../../../shared/utils/instituicao';
import { NOME_ROBO } from '../nome';
import { agoraBr } from '../respostas/resposta';
import { RoboConversa } from '../robo-conversa.service';

interface Trecho {
  t: string;
  b: boolean;
}

/**
 * /robo/relatorio — o relatório do ADRAbot na folha A4 da ADRA (cabeçalho e
 * rodapé da instituição). "Imprimir ou salvar PDF" usa o navegador; nada fica
 * guardado: recarregou a página, o relatório some e é só pedir de novo.
 */
@Component({
  selector: 'app-robo-relatorio',
  imports: [FolhaA4, Icon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (conversa.relatorio(); as r) {
      <p class="dica no-print">
        Para guardar em PDF, use <b>Imprimir ou salvar PDF</b> e escolha <b>Salvar como PDF</b> no destino da impressão.
      </p>
      <app-folha-a4 [rotulo]="r.titulo" rotuloImprimir="Imprimir ou salvar PDF" [paisagem]="!!r.paisagem">
        <h1 class="doc-titulo">{{ r.titulo }}</h1>
        @if (r.subtitulo) {
          <p class="doc-sub">{{ r.subtitulo }}</p>
        }

        <div class="resumo">
          @for (p of r.resumo; track $index) {
            <p>@for (x of trechos(p); track $index) { @if (x.b) { <b>{{ x.t }}</b> } @else { {{ x.t }} } }</p>
          }
        </div>

        @for (tabela of r.tabelas; track $index) {
          @if (tabela.titulo) {
            <h2 class="tabela-titulo">{{ tabela.titulo }}</h2>
          }
          @if (tabela.linhas.length) {
            <div class="rolagem" role="region" tabindex="0" [attr.aria-label]="tabela.titulo || r.titulo">
            <table class="doc-tabela">
              <caption class="sr-only">{{ tabela.titulo || r.titulo }}</caption>
              <thead>
                <tr>
                  @for (c of tabela.colunas; track $index) {
                    <th scope="col" [class.num]="tabela.numericas?.includes($index)">{{ c }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (linha of tabela.linhas; track $index) {
                  <tr>
                    @for (celula of linha; track $index) {
                      <td [class.num]="tabela.numericas?.includes($index)">{{ celula }}</td>
                    }
                  </tr>
                }
              </tbody>
            </table>
            </div>
          } @else {
            <p class="vazio">Sem dados no período.</p>
          }
        }

        @if (r.criterio) {
          <p class="criterio"><b>Critério:</b> {{ r.criterio }}</p>
        }
        <p class="origem">
          Dados do Sistema ADRA em {{ agora(r.geradoEm) }}. Gerado por {{ r.geradoPor }} pelo {{ nome }}.
        </p>

        @if (r.assinatura) {
          <div class="assinatura">
            <p>{{ INSTITUICAO.cidade }}, ____ de ______________ de {{ r.geradoEm.getFullYear() }}.</p>
            <div class="linha"></div>
            <p><b>{{ INSTITUICAO.signatario }}</b></p>
            <p>{{ INSTITUICAO.cargo }}</p>
          </div>
        }
      </app-folha-a4>
    } @else {
      <div class="card card-pad vazio-tela">
        <p>O relatório não fica guardado: ao recarregar a página, ele some.</p>
        <p>Abra o <b>{{ nome }}</b> no canto da tela, faça a pergunta de novo e toque em <b>Gerar PDF</b>.</p>
        <a class="voltar" routerLink="/dashboard"><app-icon name="chevron-left" [size]="16" /> Voltar</a>
      </div>
    }
  `,
  styles: `
    .dica { max-width: 210mm; margin: 0 auto 12px; font-size: 13px; color: var(--gray-600); }
    .doc-titulo { margin: 16px 0 2px; font-size: 15pt; text-align: center; }
    .doc-sub { margin: 0 0 12px !important; text-align: center; font-size: 10pt; color: #333; }
    .resumo { display: flex; flex-direction: column; gap: 4px; margin: 6px 0 12px; font-size: 10.5pt; }
    .tabela-titulo { margin: 14px 0 4px; font-size: 11pt; }
    .rolagem { overflow-x: auto; -webkit-overflow-scrolling: touch; margin-bottom: 6px; }
    .rolagem:focus-visible { outline: 3px solid var(--color-brand-ring); outline-offset: 2px; }
    .doc-tabela { width: 100%; min-width: max-content; border-collapse: collapse; font-size: 9.5pt; }
    @media print { .rolagem { overflow: visible; } .doc-tabela { min-width: 0; } }
    @media (min-width: 720px) { .doc-tabela { min-width: 0; } }
    .doc-tabela th, .doc-tabela td { padding: 3px 6px; border: 1px solid #bbb; text-align: left; vertical-align: top; }
    .doc-tabela thead { display: table-header-group; }
    .doc-tabela thead th {
      height: auto; background: #f0f0f0; color: #111; font-size: 9.5pt; font-weight: 700;
      text-transform: none; letter-spacing: normal; white-space: normal;
    }
    .doc-tabela tbody td { color: #111; }
    .doc-tabela .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .doc-tabela tr { break-inside: avoid; }
    .vazio { font-style: italic; }
    .criterio { margin-top: 10px !important; font-size: 8.5pt; color: #333; }
    .origem { margin-top: 4px !important; font-size: 8.5pt; color: #555; }
    .assinatura { margin: 36px auto 0; width: 70%; text-align: center; font-size: 10pt; break-inside: avoid; }
    .assinatura .linha { margin: 40px 0 4px; border-top: 1px solid #111; }
    .vazio-tela { max-width: 560px; margin: 24px auto; display: flex; flex-direction: column; gap: 8px; }
    .vazio-tela p { margin: 0; }
    .voltar { display: inline-flex; align-items: center; gap: 4px; margin-top: 6px; }
  `,
})
export class RoboRelatorio {
  protected readonly conversa = inject(RoboConversa);
  protected readonly nome = NOME_ROBO;
  protected readonly INSTITUICAO = INSTITUICAO;
  protected readonly agora = agoraBr;
  protected trechos(texto: string): Trecho[] {
    return texto.split('**').map((t, i) => ({ t, b: i % 2 === 1 })).filter((x) => x.t);
  }
}
