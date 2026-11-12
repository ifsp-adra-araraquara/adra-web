import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ListaEventoService } from '../../../core/lista-evento.service';
import { FolhaA4 } from '../../../shared/components/folha-a4/folha-a4';
import { Icon } from '../../../shared/components/icon/icon';
import { Input } from '../../../shared/components/input/input';
import { Select, SelectOption } from '../../../shared/components/select/select';
import { AtendidoListaEventoDTO } from '../../../shared/models/lista/ListaEvento';
import { TurmaResponseDTO } from '../../../shared/models/turma/TurmaResponseDTO';
import { mensagemErro } from '../../../shared/utils/erro-http.util';
import { calcularIdade } from '../../../shared/utils/idade.util';
import { formatarTelefone } from '../../../shared/utils/mascara.util';
import { OrdemLista, montarBlocos } from './lista-evento.util';

/**
 * /turmas/lista-evento?grupos=1,2 — lista de presença para passeio, evento ou apresentação
 * (pedido da ADRA de 12/11/2026). O Coordenador marca os grupos, dá um título e imprime
 * ou salva em PDF: nomes em ordem alfabética, numerados, com presença e assinatura.
 * Sem título, a folha sai com linhas para preencher à mão.
 */
@Component({
  selector: 'app-lista-evento',
  imports: [FormsModule, FolhaA4, Icon, Input, Select],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ferramentas no-print">
      <h1 class="titulo-tela">Lista para evento ou passeio</h1>

      <div class="form-row">
        <app-input label="Título do evento ou passeio" placeholder="Ex.: Passeio ao zoológico" [ngModel]="titulo()" (ngModelChange)="titulo.set($event)" />
      </div>
      <div class="form-row duas">
        <app-input label="Data (opcional)" type="date" [ngModel]="data()" (ngModelChange)="data.set($event)" />
        <app-input label="Local (opcional)" [ngModel]="local()" (ngModelChange)="local.set($event)" />
      </div>

      <fieldset class="grupos">
        <legend>Grupos na lista</legend>
        <div class="grupos-atalhos">
          <button type="button" class="link" (click)="marcarTodos()">Marcar todos</button>
          <button type="button" class="link" (click)="limparGrupos()">Limpar</button>
        </div>
        @for (t of turmasAtivas(); track t.turmaId) {
          <label class="grupo-opcao">
            <input type="checkbox" [checked]="selecionados().has(t.turmaId)" (change)="alternarGrupo(t.turmaId)" />
            {{ t.nomeTurma }}
          </label>
        } @empty {
          <p class="muted">Nenhum grupo ativo.</p>
        }
      </fieldset>

      <div class="form-row duas">
        <div class="campo">
          <label for="le-ordem">Ordem</label>
          <app-select id="le-ordem" [options]="opcoesOrdem" [ngModel]="ordem()" (ngModelChange)="ordem.set($event)" />
        </div>
        <fieldset class="colunas">
          <legend>Colunas extras</legend>
          <label><input type="checkbox" [checked]="comIdade()" (change)="comIdade.set(!comIdade())" /> Idade</label>
          <label>
            <input type="checkbox" [checked]="comResponsavel()" (change)="alternarResponsavel()" />
            Responsável e telefone
          </label>
        </fieldset>
      </div>
      @if (comResponsavel()) {
        <p class="aviso-dados">A folha vai ter nome e telefone dos responsáveis: guarde com cuidado e descarte depois do evento.</p>
      }
      <p class="dica">
        Para guardar em PDF, use <b>Imprimir ou salvar PDF</b> e escolha <b>Salvar como PDF</b> no destino da impressão.
      </p>
      @if (erro()) {
        <div class="notice notice-error" role="alert"><app-icon name="alert-circle" /><span>{{ erro() }}</span></div>
      }
    </div>

    @if (!selecionados().size) {
      <div class="card card-pad no-print"><p class="muted">Marque pelo menos um grupo para montar a lista.</p></div>
    } @else if (carregando() && !atendidos().length) {
      <p class="muted no-print" role="status">Carregando…</p>
    } @else {
      <app-folha-a4 [rotulo]="tituloDocumento()" rotuloImprimir="Imprimir ou salvar PDF">
        @if (titulo().trim()) {
          <h2 class="doc-titulo">{{ titulo().trim() }}</h2>
        } @else {
          <p class="doc-preencher">Evento/passeio: <span class="linha-preencher longa"></span></p>
        }
        <p class="doc-sub">
          @if (data()) { Data: {{ dataBr(data()) }} } @else { Data: <span class="linha-preencher"></span> }
          ·
          @if (local().trim()) { Local: {{ local().trim() }} } @else { Local: <span class="linha-preencher"></span> }
        </p>
        <p class="doc-sub">{{ nomesGrupos() }} · {{ atendidos().length }} atendidos</p>

        @if (atendidos().length) {
          <table class="doc-tabela">
            <caption class="sr-only">Lista de presença</caption>
            <thead>
              <tr>
                <th scope="col" class="num">Nº</th>
                <th scope="col">Nome</th>
                @if (colunaGrupo()) { <th scope="col">Grupo</th> }
                @if (comIdade()) { <th scope="col" class="num">Idade</th> }
                @if (comResponsavel()) { <th scope="col">Responsável / telefone</th> }
                <th scope="col" class="presenca">Presença</th>
                <th scope="col" class="assinatura">Assinatura do atendido</th>
              </tr>
            </thead>
            <tbody>
              @for (bloco of blocos(); track bloco.titulo) {
                @if (bloco.titulo) {
                  <tr class="grupo-titulo"><th scope="rowgroup" [attr.colspan]="totalColunas()">{{ bloco.titulo }} · {{ bloco.linhas.length }}</th></tr>
                }
                @for (linha of bloco.linhas; track linha.assistidoId) {
                  <tr>
                    <td class="num col-num">{{ linha.numero }}</td>
                    <td class="col-nome">{{ linha.nomeCompleto }}</td>
                    @if (colunaGrupo()) { <td data-label="Grupo">{{ linha.nomeTurma }}</td> }
                    @if (comIdade()) { <td class="num" data-label="Idade">{{ idade(linha.dataNascimento) }}</td> }
                    @if (comResponsavel()) {
                      <td data-label="Responsável">
                        {{ linha.responsavelNome || '—' }}
                        @if (linha.responsavelTelefone) { <br />{{ formatarTelefone(linha.responsavelTelefone) }} }
                      </td>
                    }
                    <td class="presenca" data-label="Presença"><span class="caixa" aria-hidden="true"></span></td>
                    <td class="assinatura" data-label="Assinatura"></td>
                  </tr>
                }
              }
            </tbody>
          </table>
        } @else {
          <p class="doc-vazio">Nenhum atendido ativo nos grupos marcados.</p>
        }

        <div class="assinaturas">
          <p><span class="linha-assinatura"></span>Responsável pelo evento</p>
          <p><span class="linha-assinatura"></span>Coordenação ADRA</p>
        </div>
      </app-folha-a4>
    }
  `,
  styles: `
    .ferramentas { max-width: 210mm; margin: 0 auto 16px; display: grid; gap: 12px; }
    .titulo-tela { margin: 8px 0 0; font-size: 22px; }
    .form-row { display: grid; gap: 12px; }
    .campo { display: flex; flex-direction: column; gap: 4px; }
    .campo label, legend { font-size: 13px; font-weight: 600; color: var(--gray-600); }
    fieldset { margin: 0; padding: 0; border: 0; min-width: 0; }
    .grupos { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 6px 16px; }
    .grupos legend { margin-bottom: 4px; }
    .grupos-atalhos { grid-column: 1 / -1; display: flex; gap: 16px; }
    .link { padding: 0; border: 0; background: none; font: inherit; font-size: 13px; color: var(--color-adra-green-600); text-decoration: underline; cursor: pointer; }
    .grupo-opcao, .colunas label { display: flex; align-items: center; gap: 8px; min-height: 36px; font-size: 14px; color: var(--gray-800); }
    .grupo-opcao input, .colunas input { width: 18px; height: 18px; accent-color: var(--color-adra-green-600); }
    .aviso-dados { margin: 0; font-size: 13px; color: var(--amber-700, #92400e); }
    .dica { margin: 0; font-size: 13px; color: var(--gray-600); }
    @media (min-width: 720px) {
      .form-row.duas { grid-template-columns: 1fr 1fr; align-items: end; }
    }

    .doc-titulo { margin: 16px 0 4px; font-size: 15pt; text-align: center; }
    .doc-preencher { margin: 16px 0 4px !important; font-size: 12pt; text-align: center; }
    .doc-sub { margin: 0 0 6px !important; text-align: center; font-size: 10pt; color: #333; }
    .linha-preencher { display: inline-block; width: 40mm; border-bottom: 1px solid #111; }
    .linha-preencher.longa { width: 110mm; max-width: 60vw; }
    .doc-tabela { width: 100%; margin-top: 8px; border-collapse: collapse; font-size: 10pt; }
    .doc-tabela th, .doc-tabela td { padding: 3px 6px; border: 1px solid #999; text-align: left; color: #111; vertical-align: middle; }
    .doc-tabela thead th {
      height: auto; background: #f0f0f0; font-size: 9pt; font-weight: 700;
      text-transform: none; letter-spacing: normal; white-space: nowrap;
    }
    .doc-tabela tbody td { height: 9mm; }
    .doc-tabela .num { text-align: right; white-space: nowrap; width: 1%; }
    .doc-tabela .presenca { width: 1%; text-align: center; }
    .doc-tabela .assinatura { width: 38%; }
    .doc-tabela tr { break-inside: avoid; }
    .doc-tabela .grupo-titulo th { background: #f7f7f7; font-size: 9.5pt; text-align: left; }
    .caixa { display: inline-block; width: 4.5mm; height: 4.5mm; border: 1px solid #111; }
    .doc-vazio { text-align: center; }
    .assinaturas { display: flex; justify-content: space-around; gap: 24px; margin-top: 28px; font-size: 9pt; text-align: center; }
    .linha-assinatura { display: block; width: 65mm; max-width: 40vw; border-top: 1px solid #111; margin: 0 auto 4px; }

    /* Só na tela do celular: cada linha vira um cartão. A impressão/PDF continua em tabela. */
    @media screen and (max-width: 719px) {
      .doc-tabela, .doc-tabela tbody, .doc-tabela tr, .doc-tabela td, .doc-tabela th { display: block; }
      .doc-tabela thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
      .doc-tabela tr { display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; padding: 8px 10px; margin-bottom: 8px; border: 1px solid #ddd; border-radius: 6px; }
      .doc-tabela td, .doc-tabela .grupo-titulo th { border: none; padding: 1px 0; height: auto; width: auto; }
      .doc-tabela .grupo-titulo { display: block; border: 0; padding: 4px 0; margin: 6px 0 2px; background: none; }
      .doc-tabela td.col-num { grid-column: 1; color: #666; }
      .doc-tabela td.col-nome { grid-column: 2; font-weight: 700; }
      .doc-tabela td[data-label] { grid-column: 1 / -1; display: flex; justify-content: space-between; gap: 12px; text-align: right; }
      .doc-tabela td[data-label]::before { content: attr(data-label); color: #666; font-weight: 600; text-align: left; }
      /* Presença e assinatura são para o papel: na prévia do celular só atrapalham. */
      .doc-tabela td.assinatura, .doc-tabela td.presenca { display: none; }
    }
  `,
})
export class ListaEvento implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly service = inject(ListaEventoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly formatarTelefone = formatarTelefone;
  protected readonly opcoesOrdem: SelectOption<OrdemLista>[] = [
    { value: 'alfabetica', label: 'Alfabética (todos juntos)' },
    { value: 'grupo', label: 'Separada por grupo' },
  ];

  protected readonly titulo = signal('');
  protected readonly data = signal('');
  protected readonly local = signal('');
  protected readonly ordem = signal<OrdemLista>('alfabetica');
  protected readonly comIdade = signal(false);
  protected readonly comResponsavel = signal(false);
  protected readonly turmas = signal<TurmaResponseDTO[]>([]);
  protected readonly selecionados = signal<ReadonlySet<number>>(new Set());
  protected readonly atendidos = signal<AtendidoListaEventoDTO[]>([]);
  protected readonly carregando = signal(false);
  protected readonly erro = signal<string | null>(null);
  private pedido = 0;

  protected readonly turmasAtivas = computed(() =>
    this.turmas()
      .filter((t) => t.ativo)
      .sort((a, b) => a.nomeTurma.localeCompare(b.nomeTurma, 'pt-BR')),
  );
  protected readonly blocos = computed(() => montarBlocos(this.atendidos(), this.ordem()));
  /** Coluna "Grupo" só faz sentido com mais de um grupo na ordem alfabética. */
  protected readonly colunaGrupo = computed(() => this.ordem() === 'alfabetica' && this.selecionados().size > 1);
  protected readonly totalColunas = computed(
    () => 4 + (this.colunaGrupo() ? 1 : 0) + (this.comIdade() ? 1 : 0) + (this.comResponsavel() ? 1 : 0),
  );
  protected readonly nomesGrupos = computed(() => {
    const nomes = this.turmasAtivas()
      .filter((t) => this.selecionados().has(t.turmaId))
      .map((t) => t.nomeTurma);
    return (nomes.length === 1 ? 'Grupo: ' : 'Grupos: ') + nomes.join(', ');
  });
  protected readonly tituloDocumento = computed(() => this.titulo().trim() || 'Lista de presença');

  async ngOnInit(): Promise<void> {
    const grupos = (this.route.snapshot.queryParamMap.get('grupos') ?? '')
      .split(',')
      .map(Number)
      .filter((id) => Number.isInteger(id) && id > 0);
    try {
      this.turmas.set(await firstValueFrom(this.http.get<TurmaResponseDTO[]>(`${environment.apiUrl}/api/turmas`)));
    } catch (e) {
      this.erro.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível carregar os grupos.'));
    }
    const ativos = new Set(this.turmasAtivas().map((t) => t.turmaId));
    this.selecionados.set(new Set(grupos.filter((id) => ativos.has(id))));
    await this.carregar();
  }

  protected alternarGrupo(turmaId: number): void {
    const novo = new Set(this.selecionados());
    if (novo.has(turmaId)) novo.delete(turmaId);
    else novo.add(turmaId);
    this.selecionados.set(novo);
    this.aposMudarGrupos();
  }

  protected marcarTodos(): void {
    this.selecionados.set(new Set(this.turmasAtivas().map((t) => t.turmaId)));
    this.aposMudarGrupos();
  }

  protected limparGrupos(): void {
    this.selecionados.set(new Set());
    this.aposMudarGrupos();
  }

  protected alternarResponsavel(): void {
    this.comResponsavel.set(!this.comResponsavel());
    this.carregar();
  }

  protected idade(dataNascimento: string | null): string {
    const anos = calcularIdade(dataNascimento);
    return anos == null ? '—' : String(anos);
  }

  protected dataBr(iso: string): string {
    return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
  }

  /** Grupos na URL: recarregar ou compartilhar o link mantém a seleção. */
  private aposMudarGrupos(): void {
    const grupos = [...this.selecionados()].join(',');
    this.router.navigate([], { relativeTo: this.route, queryParams: { grupos: grupos || null }, replaceUrl: true });
    this.carregar();
  }

  private async carregar(): Promise<void> {
    const ids = [...this.selecionados()];
    const pedido = ++this.pedido;
    if (!ids.length) {
      this.atendidos.set([]);
      return;
    }
    this.carregando.set(true);
    this.erro.set(null);
    try {
      const lista = await this.service.atendidos(ids, this.comResponsavel());
      if (pedido === this.pedido) this.atendidos.set(lista);
    } catch (e) {
      if (pedido === this.pedido) {
        this.atendidos.set([]);
        this.erro.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível montar a lista.'));
      }
    } finally {
      if (pedido === this.pedido) this.carregando.set(false);
    }
  }
}
