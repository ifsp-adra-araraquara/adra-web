import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { MatriculaService } from '../../../core/matricula.service';
import { ListaAnualDTO } from '../../../shared/models/matricula/Matricula';
import { Button } from '../../../shared/components/button/button';
import { FolhaA4 } from '../../../shared/components/folha-a4/folha-a4';
import { Icon } from '../../../shared/components/icon/icon';
import { Select, SelectOption } from '../../../shared/components/select/select';
import { mensagemErro } from '../../../shared/utils/erro-http.util';
import { SITUACAO_MATRICULA, dataBr, frequencia, planilhaDaListaAnual } from './lista-anual.util';

/**
 * /assistidos/por-ano — histórico de atendidos de um ano letivo: grupo,
 * situação e frequência. Imprimir (ou salvar como PDF pelo navegador) ou
 * baixar a planilha. Gerada na hora; nada fica guardado no sistema.
 */
@Component({
  selector: 'app-lista-anual',
  imports: [FormsModule, RouterLink, Button, FolhaA4, Icon, Select],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ferramentas no-print">
      <a class="btn-voltar" routerLink="/assistidos">
        <app-icon name="chevron-left" /> Atendidos
      </a>
      <h1 class="titulo-tela">Atendidos por ano</h1>
      <div class="linha">
        <div class="campo-ano">
          <label for="la-ano">Ano</label>
          <app-select id="la-ano" [options]="opcoesAno()" [ngModel]="ano()" (ngModelChange)="trocarAno($event)" />
        </div>
        <app-button variant="secondary" size="sm" [disabled]="!lista()" [loading]="exportando()" (click)="baixarPlanilha()">
          <app-icon name="download" [size]="16" /> Baixar planilha (.xlsx)
        </app-button>
      </div>
      <p class="dica">
        Para guardar em PDF, use <b>Imprimir ou salvar PDF</b> e escolha <b>Salvar como PDF</b> no destino da impressão.
      </p>
      @if (erro()) {
        <div class="notice notice-error" role="alert">{{ erro() }}</div>
      }
    </div>

    @if (carregando()) {
      <p class="muted no-print" role="status">Carregando…</p>
    } @else if (lista(); as l) {
      <app-folha-a4 [rotulo]="'Atendidos ' + l.ano" rotuloImprimir="Imprimir ou salvar PDF">
        <h2 class="doc-titulo">Atendidos {{ l.ano }}</h2>
        <p class="doc-sub">
          {{ l.atendidos.length }} matriculados ·
          @if (l.totalAtivas) { {{ l.totalAtivas }} ativos · }
          @if (l.totalEncerradas) { {{ l.totalEncerradas }} concluíram o ano · }
          {{ l.totalDesligadas }} saíram durante o ano
          <br />
          {{ l.encerrado ? 'Ano encerrado.' : 'Ano em andamento.' }} Frequência até {{ dataBr(l.frequenciaAte) }}.
        </p>

        @if (l.atendidos.length) {
          <table class="doc-tabela">
            <caption class="sr-only">Atendidos matriculados em {{ l.ano }}</caption>
            <thead>
              <tr>
                <th scope="col" class="num">Nº</th>
                <th scope="col">Nome</th>
                <th scope="col">Nascimento</th>
                <th scope="col">Grupo</th>
                <th scope="col">Entrada</th>
                <th scope="col">Saída</th>
                <th scope="col">Situação</th>
                <th scope="col" class="num">Freq.</th>
              </tr>
            </thead>
            <tbody>
              @for (linha of l.atendidos; track linha.assistidoId; let i = $index) {
                <tr>
                  <td class="num col-num">{{ i + 1 }}</td>
                  <td class="col-nome">{{ linha.nomeCompleto }}</td>
                  <td data-label="Nascimento">{{ dataBr(linha.dataNascimento) }}</td>
                  <td data-label="Grupo">{{ linha.grupo || '—' }}</td>
                  <td data-label="Entrada">{{ dataBr(linha.entrada) || '—' }}</td>
                  <td data-label="Saída">{{ dataBr(linha.saida) || '—' }}</td>
                  <td data-label="Situação">{{ situacao[linha.statusMatricula] }}</td>
                  <td class="num" data-label="Frequência">{{ frequencia(linha) }}</td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <p class="doc-vazio">Nenhum atendido matriculado em {{ l.ano }}.</p>
        }
      </app-folha-a4>
    } @else if (!erro()) {
      <div class="card card-pad no-print"><p class="muted">Ainda não há matrículas.</p></div>
    }
  `,
  styles: `
    .ferramentas { max-width: 210mm; margin: 0 auto 16px; }
    .titulo-tela { margin: 8px 0 12px; font-size: 22px; }
    .linha { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; }
    .campo-ano { display: flex; flex-direction: column; gap: 4px; width: 160px; }
    .campo-ano label { font-size: 13px; font-weight: 600; color: var(--gray-600); }
    .dica { margin: 10px 0 0; font-size: 13px; color: var(--gray-600); }
    .doc-titulo { margin: 18px 0 4px; font-size: 14pt; text-align: center; }
    .doc-sub { margin: 0 0 12px !important; text-align: center; font-size: 9.5pt; color: #333; }
    .doc-tabela { width: 100%; border-collapse: collapse; font-size: 9pt; }
    .doc-tabela th, .doc-tabela td { padding: 3px 5px; border: 1px solid #bbb; text-align: left; vertical-align: top; }
    /* Sobrescreve o cabeçalho padrão das tabelas da tela (altura fixa, caixa alta). */
    .doc-tabela thead th {
      height: auto; background: #f0f0f0; color: #111; font-size: 9pt; font-weight: 700;
      text-transform: none; letter-spacing: normal; white-space: normal;
    }
    .doc-tabela tbody td { color: #111; }
    .doc-tabela .num { text-align: right; white-space: nowrap; }
    .doc-tabela tr { break-inside: avoid; }
    .doc-vazio { text-align: center; }
    /* Só na tela do celular: cada linha vira um cartão. A impressão/PDF continua em tabela. */
    @media screen and (max-width: 719px) {
      .doc-tabela, .doc-tabela tbody, .doc-tabela tr, .doc-tabela td { display: block; }
      .doc-tabela thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
      .doc-tabela tr { display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; padding: 8px 10px; margin-bottom: 8px; border: 1px solid #ddd; border-radius: 6px; }
      .doc-tabela td { border: none; padding: 1px 0; font-size: 10pt; }
      .doc-tabela td.col-num { grid-column: 1; color: #666; }
      .doc-tabela td.col-nome { grid-column: 2; font-weight: 700; }
      .doc-tabela td[data-label] { grid-column: 1 / -1; display: flex; justify-content: space-between; gap: 12px; text-align: right; }
      .doc-tabela td[data-label]::before { content: attr(data-label); color: #666; font-weight: 600; text-align: left; }
    }
  `,
})
export class ListaAnual implements OnInit {
  private readonly service = inject(MatriculaService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  protected readonly situacao = SITUACAO_MATRICULA;
  protected readonly dataBr = dataBr;
  protected readonly frequencia = frequencia;

  protected readonly anos = signal<number[]>([]);
  protected readonly ano = signal<number | null>(null);
  protected readonly lista = signal<ListaAnualDTO | null>(null);
  protected readonly carregando = signal(true);
  protected readonly exportando = signal(false);
  protected readonly erro = signal<string | null>(null);

  protected readonly opcoesAno = computed<SelectOption<number | null>[]>(() =>
    this.anos().map((ano) => ({ value: ano, label: String(ano) })),
  );

  async ngOnInit(): Promise<void> {
    try {
      const anos = await this.service.anos();
      this.anos.set(anos);
      const pedido = Number(this.route.snapshot.queryParamMap.get('ano'));
      const anoCorrente = new Date().getFullYear();
      const inicial = anos.includes(pedido) ? pedido : anos.includes(anoCorrente) ? anoCorrente : (anos[0] ?? null);
      if (inicial != null) {
        await this.carregar(inicial);
      }
    } catch (e) {
      this.erro.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível carregar os anos.'));
    } finally {
      this.carregando.set(false);
    }
  }

  protected async trocarAno(ano: number | null): Promise<void> {
    if (ano == null || ano === this.ano()) return;
    this.router.navigate([], { relativeTo: this.route, queryParams: { ano }, replaceUrl: true });
    await this.carregar(ano);
  }

  protected async baixarPlanilha(): Promise<void> {
    const lista = this.lista();
    if (!lista || this.exportando()) return;
    this.exportando.set(true);
    this.erro.set(null);
    try {
      const arquivo = await planilhaDaListaAnual(lista);
      const url = URL.createObjectURL(arquivo);
      const link = this.document.createElement('a');
      link.href = url;
      link.download = `atendidos-${lista.ano}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      this.erro.set('Não foi possível gerar a planilha. Tente de novo.');
    } finally {
      this.exportando.set(false);
    }
  }

  private async carregar(ano: number): Promise<void> {
    this.ano.set(ano);
    this.erro.set(null);
    try {
      this.lista.set(await this.service.listaDoAno(ano));
    } catch (e) {
      this.lista.set(null);
      this.erro.set(mensagemErro(e as HttpErrorResponse, `Não foi possível carregar a lista de ${ano}.`));
    }
  }
}
