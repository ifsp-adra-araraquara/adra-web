import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth.service';
import { MatriculaService } from '../../../core/matricula.service';
import { PreCadastroService } from '../../../core/pre-cadastro.service';
import { Role } from '../../../shared/enum/role.enum';
import { EncerramentoPreviaDTO, PeriodoMatriculaDTO } from '../../../shared/models/matricula/Matricula';
import { PROGRAMA_TRANSFERENCIA_LABELS, ProgramaTransferencia } from '../../../shared/enum/ProgramaTransferencia';
import { PreCadastroResumoDTO, StatusPreCadastro, emAvaliacao } from '../../../shared/models/precadastro/PreCadastro';
import { Badge } from '../../../shared/components/badge/badge';
import { Icon } from '../../../shared/components/icon/icon';
import { Input } from '../../../shared/components/input/input';
import { SeletorMultiplo } from '../../../shared/components/seletor-multiplo/seletor-multiplo';
import { Select, SelectOption } from '../../../shared/components/select/select';
import { Table, TableColumn } from '../../../shared/components/table/table';
import { LinkInscricao } from './link-inscricao';
import { PeriodoMatricula } from './periodo-matricula';
import { EncerramentoAno } from './encerramento-ano';
import { anosDaLista } from './periodo-matricula.util';
import { formatarMoeda, formatarTelefone } from '../../../shared/utils/mascara.util';
import { mensagemErro } from '../../../shared/utils/erro-http.util';

const ABAS: { status: StatusPreCadastro; rotulo: string; vazio: string }[] = [
  { status: 'PENDENTE', rotulo: 'Pendentes', vazio: 'Nenhuma inscrição aguardando avaliação.' },
  { status: 'LISTA_ESPERA', rotulo: 'Lista de espera', vazio: 'Nenhuma inscrição na lista de espera.' },
  { status: 'CONVERTIDO', rotulo: 'Aprovados', vazio: 'Nenhuma inscrição aprovada ainda.' },
  { status: 'DESCARTADO', rotulo: 'Reprovados', vazio: 'Nenhuma inscrição reprovada.' },
];

const QUALQUER_PROGRAMA = 'QUALQUER_PROGRAMA';
const PROBLEMA_SAUDE = 'PROBLEMA_SAUDE';
const NAO_VISTAS = 'NAO_VISTAS';

const PROGRAMAS = Object.keys(PROGRAMA_TRANSFERENCIA_LABELS) as ProgramaTransferencia[];

const OPCOES_PROGRAMA: SelectOption<string>[] = [
  { value: QUALQUER_PROGRAMA, label: 'Recebe qualquer programa' },
  ...PROGRAMAS.map((programa) => ({ value: programa, label: PROGRAMA_TRANSFERENCIA_LABELS[programa] })),
];
const OPCOES_CONDICAO: SelectOption<string>[] = [{ value: PROBLEMA_SAUDE, label: 'Problema de saúde' }];
const OPCOES_VISUALIZACAO: SelectOption<string>[] = [{ value: NAO_VISTAS, label: 'Não vistas pela Assistente Social' }];

export interface FiltrosTriagem {
  rendaAte: number | null;
  programas: ProgramaTransferencia[];
  comProblemaSaude: boolean;
  somenteNaoVistas: boolean;
}

export function atendeFiltros(item: PreCadastroResumoDTO, filtros: FiltrosTriagem): boolean {
  if (filtros.rendaAte != null && item.rendaFamiliar != null && item.rendaFamiliar > filtros.rendaAte) return false;
  if (filtros.comProblemaSaude && !item.possuiProblemaSaude) return false;
  if (filtros.somenteNaoVistas && item.vistoAssistenteSocial) return false;
  return !filtros.programas.length || item.programasTransferencia.some((programa) => filtros.programas.includes(programa));
}

/** "Recebe qualquer programa" marca ou desmarca todos; com todos marcados, ele aparece marcado. */
export function programasMarcados(atuais: ProgramaTransferencia[]): string[] {
  return atuais.length === PROGRAMAS.length ? [QUALQUER_PROGRAMA, ...atuais] : atuais;
}

export function alternarProgramas(atuais: ProgramaTransferencia[], marcados: string[]): ProgramaTransferencia[] {
  const qualquerAntes = atuais.length === PROGRAMAS.length;
  const qualquerAgora = marcados.includes(QUALQUER_PROGRAMA);
  if (qualquerAntes !== qualquerAgora) return qualquerAgora ? [...PROGRAMAS] : [];
  return PROGRAMAS.filter((programa) => marcados.includes(programa));
}

type LinhaPreCadastro = PreCadastroResumoDTO & { posicao: number };

const TODAS_AS_LINHAS = Number.MAX_SAFE_INTEGER;

const COLUNAS_TRIAGEM: TableColumn<LinhaPreCadastro>[] = [
  { key: 'candidato', header: 'Candidato a atendido', type: 'custom' },
  { key: 'responsavel', header: 'Responsável', type: 'custom' },
  { key: 'chegada', header: 'Chegada', type: 'custom' },
  {
    key: 'renda',
    header: 'Renda',
    value: (linha) => (linha.rendaFamiliar != null ? formatarMoeda(linha.rendaFamiliar) : 'Não informada'),
  },
  {
    key: 'programas',
    header: 'Programas',
    value: (linha) => linha.programasTransferencia.map((programa) => PROGRAMA_TRANSFERENCIA_LABELS[programa]).join(', ') || '—',
  },
  { key: 'saude', header: 'Saúde', value: (linha) => (linha.possuiProblemaSaude ? 'Sim' : '—') },
  { key: 'pendencias', header: 'Pendências', type: 'custom' },
];

const COLUNAS_DECIDIDAS: TableColumn<LinhaPreCadastro>[] = [
  { key: 'candidato', header: 'Candidato a atendido', type: 'custom' },
  { key: 'responsavel', header: 'Responsável', type: 'custom' },
  { key: 'chegada', header: 'Enviado em', type: 'custom' },
  { key: 'situacao', header: 'Situação', type: 'badge', value: (linha) => linha.status },
];

const UM_DIA = 24 * 60 * 60 * 1000;

/** "hoje", "ontem", "há 3 dias" — quanto tempo a inscrição está esperando. */
export function haQuantoTempo(criadoEm: string, agora: Date): string {
  const inicioDoDia = (data: Date) => new Date(data.getFullYear(), data.getMonth(), data.getDate()).getTime();
  const dias = Math.round((inicioDoDia(agora) - inicioDoDia(new Date(criadoEm))) / UM_DIA);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  return `há ${dias} dias`;
}

/** Inscrições enviadas pelo link público, para a Coordenação e a Assistente Social avaliarem. */
@Component({
  selector: 'app-pre-cadastros',
  imports: [DatePipe, FormsModule, RouterLink, Badge, Icon, Input, LinkInscricao, PeriodoMatricula, EncerramentoAno, Select, SeletorMultiplo, Table],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page" aria-labelledby="pc-lista-titulo">
      <header class="page-header">
        <div class="page-header-texto">
          <h1 id="pc-lista-titulo">Pré-cadastros</h1>
          <p class="page-intro">Inscrições enviadas pelas famílias pelo link público.</p>
        </div>
        <div class="page-header-acoes">
          <app-link-inscricao [ano]="anoDaInscricao()" />
        </div>
      </header>

      <app-periodo-matricula [periodos]="periodos()" [podeEditar]="ehCoordenador()" (salvo)="aoSalvarPeriodo()" />
      @if (ehCoordenador() && encerramentoPendente(); as previa) {
        <app-encerramento-ano [previa]="previa" (encerrado)="aoEncerrarAno($event.ano)" />
      }
      @if (avisoEncerramento()) {
        <div class="notice notice-info" role="status">{{ avisoEncerramento() }}</div>
      }

      @if (erro()) {
        <div class="notice notice-error" role="alert">{{ erro() }}</div>
      }

      <div class="tabs" role="tablist" aria-label="Situação da inscrição">
        @for (aba of abas; track aba.status) {
          <button
            type="button"
            role="tab"
            class="tab"
            [class.active]="aba.status === status()"
            [attr.aria-selected]="aba.status === status()"
            (click)="selecionarAba(aba.status)"
          >
            {{ aba.rotulo }} <span class="count">{{ porStatus()[aba.status].length }}</span>
          </button>
        }
      </div>

      <div class="toolbar filtros">
        <div class="filtros-ano">
          <label class="sr-only" for="pc-ano">Ano da inscrição</label>
          <app-select id="pc-ano" [options]="opcoesAno()" [ngModel]="ano()" (ngModelChange)="alterarAno($event)" />
        </div>
        <div class="filtros-busca" #campoBusca>
          <app-input label="Buscar por nome" [hideLabel]="true" placeholder="Buscar por nome" [ngModel]="busca()" (ngModelChange)="busca.set($event)" />
        </div>
        @if (comFiltros()) {
          <!-- Celular: renda, programas, condições e visualização ficam atrás do botão "Filtros". -->
          <button
            type="button"
            class="btn btn-ghost botao-filtros"
            [attr.aria-expanded]="filtrosAbertos()"
            aria-controls="pc-filtros-avancados"
            (click)="filtrosAbertos.set(!filtrosAbertos())"
          >
            <app-icon name="list" [size]="16" />
            Filtros
            @if (filtrosAvancadosAtivos(); as total) { <span class="count">{{ total }}</span> }
          </button>
          <div class="filtros-renda avancado" [class.aberto]="filtrosAbertos()">
            <app-input label="Renda até (R$)" [hideLabel]="true" placeholder="Renda até R$" type="number" min="0" [ngModel]="rendaAte()" (ngModelChange)="alterarRendaAte($event)" />
          </div>
        }
      </div>

      @if (comFiltros()) {
        <div class="grupos avancado" id="pc-filtros-avancados" [class.aberto]="filtrosAbertos()">
          <app-seletor-multiplo label="Programas" [opcoes]="opcoesPrograma" [valores]="programasMarcados()" (valoresChange)="alterarProgramas($event)" />
          <app-seletor-multiplo label="Condições" [opcoes]="opcoesCondicao" [valores]="comProblemaSaude() ? [problemaSaude] : []" (valoresChange)="alterarProblemaSaude($event)" />
          <app-seletor-multiplo label="Visualização" [opcoes]="opcoesVisualizacao" [valores]="somenteNaoVistas() ? [naoVistas] : []" (valoresChange)="alterarNaoVistas($event)" />
        </div>
      }

      <div class="resultado" aria-live="polite">
        @if (filtroAtivo() && !carregando()) {
          <span>Mostrando {{ visiveis().length }} de {{ porStatus()[status()].length }}</span>
          <button type="button" class="limpar" (click)="limparFiltros(); campoBusca.querySelector('input')?.focus()">Limpar filtros</button>
        }
      </div>

      @if (carregando()) {
        <div class="card card-pad"><p class="muted">Carregando…</p></div>
      } @else if (visiveis().length === 0) {
        <div class="card card-pad"><p class="muted">{{ filtroAtivo() ? 'Nenhuma inscrição com esses filtros.' : abaAtual().vazio }}</p></div>
      } @else {
        <div class="card tabela">
          <app-table
            [label]="'Inscrições: ' + abaAtual().rotulo"
            [columns]="colunas()"
            [data]="visiveis()"
            [trackBy]="idDaLinha"
            [rowClick]="abrir"
            [pageSize]="todasAsLinhas"
          >
            <ng-template #cell let-linha let-coluna="column">
              @switch (coluna.key) {
                @case ('candidato') {
                  <div class="candidato">
                    @if (comFiltros()) {
                      <span class="posicao"><span class="sr-only">Posição na fila </span>{{ linha.posicao }}</span>
                      <span class="marcador" [class.nao-visto]="!linha.vistoAssistenteSocial">
                        @if (!linha.vistoAssistenteSocial) { <span class="sr-only">Não vista pela Assistente Social</span> }
                      </span>
                    }
                    <div class="empilhado">
                      <a class="cell-name" [routerLink]="['/pre-cadastros', linha.preCadastroId]" [queryParams]="parametrosDaUrl()">{{ linha.nomeCompleto }}</a>
                      @if (linha.idade != null) { <span class="cell-sub">{{ linha.idade }} anos</span> }
                    </div>
                  </div>
                }
                @case ('responsavel') {
                  <div class="empilhado">
                    <span>{{ linha.responsavelNome }}</span>
                    @if (linha.responsavelTelefone) {
                      <a class="tel" [href]="'tel:' + linha.responsavelTelefone">
                        <app-icon name="phone" [size]="14" /> {{ formatarTelefone(linha.responsavelTelefone) }}
                      </a>
                    }
                  </div>
                }
                @case ('chegada') {
                  <div class="empilhado">
                    <span>{{ linha.criadoEm | date: 'dd/MM/yyyy' }}</span>
                    <span class="cell-sub">{{ haQuantoTempo(linha.criadoEm) }}</span>
                  </div>
                }
                @case ('pendencias') {
                  <div class="selos">
                    @if (linha.cpfJaCadastrado) { <app-badge variant="blue" label="Rematrícula" /> }
                    @if (linha.anexosFaltando.length) {
                      <app-badge variant="amber" [label]="linha.anexosFaltando.length === 1 ? 'Falta 1 anexo' : 'Faltam ' + linha.anexosFaltando.length + ' anexos'" />
                    }
                    @if (!linha.cpfJaCadastrado && !linha.anexosFaltando.length) { — }
                  </div>
                }
              }
            </ng-template>
            <ng-template #rowActions let-linha>
              <a
                class="btn-icon"
                [routerLink]="['/pre-cadastros', linha.preCadastroId]"
                [queryParams]="parametrosDaUrl()"
                [attr.aria-label]="'Avaliar inscrição de ' + linha.nomeCompleto"
                tabindex="-1"
              ><app-icon name="chevron-right" /></a>
            </ng-template>
          </app-table>
        </div>
      }
    </section>
  `,
  styles: `
    .filtros { margin-bottom: 10px; }
    .grupos { display: flex; flex-wrap: wrap; gap: 0 28px; margin-bottom: 4px; }
    .resultado { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; font-size: 13px; color: var(--gray-600); }
    .resultado:empty { margin-bottom: 0; }
    .limpar { padding: 4px 0; border: none; background: none; font: inherit; color: var(--color-adra-green-600); text-decoration: underline; cursor: pointer; }
    .botao-filtros { display: none; }
    @media (max-width: 719px) {
      .botao-filtros { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; }
      .botao-filtros .count {
        display: inline-grid; place-items: center; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 10px;
        background: var(--color-adra-green-50); font-size: 12px; font-weight: 600;
      }
      .avancado:not(.aberto) { display: none; }
    }
    @media (min-width: 720px) {
      .filtros-busca { flex: 1; }
      .filtros-ano { width: 170px; }
      .filtros-renda { width: 180px; }
    }
    .candidato { display: flex; align-items: center; gap: 10px; }
    .marcador { flex: none; width: 8px; height: 8px; border-radius: 50%; }
    .marcador.nao-visto { background: var(--blue-600); }
    .posicao { min-width: 28px; font-size: 13px; font-weight: 600; color: var(--gray-400); font-variant-numeric: tabular-nums; }
    .empilhado { display: flex; flex-direction: column; gap: 2px; }
    .cell-name { color: var(--gray-800); text-decoration: none; }
    .cell-name:hover { color: var(--color-adra-green-600); text-decoration: underline; }
    .tel { display: inline-flex; align-items: center; gap: 6px; color: var(--color-adra-green-600); }
    .selos { display: flex; flex-wrap: wrap; gap: 6px; }
    @media (max-width: 719px) { .tabela { border: none; background: none; box-shadow: none; } }
  `,
})
export class PreCadastros implements OnInit {
  private readonly service = inject(PreCadastroService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly matriculaService = inject(MatriculaService);
  private readonly auth = inject(AuthService);

  protected readonly abas = ABAS;
  protected readonly formatarTelefone = formatarTelefone;
  protected readonly todasAsLinhas = TODAS_AS_LINHAS;
  protected readonly opcoesPrograma = OPCOES_PROGRAMA;
  protected readonly opcoesCondicao = OPCOES_CONDICAO;
  protected readonly opcoesVisualizacao = OPCOES_VISUALIZACAO;
  protected readonly problemaSaude = PROBLEMA_SAUDE;
  protected readonly naoVistas = NAO_VISTAS;
  private readonly agora = new Date();

  protected readonly ehCoordenador = computed(() => this.auth.currentProfile() === Role.COORD);
  private readonly anoCorrente = this.agora.getFullYear();
  /** null = todos os anos. Padrão: o ano das inscrições de hoje (o do período aberto). */
  protected readonly ano = signal<number | null>(this.anoCorrente);
  protected readonly anoDaInscricao = signal(this.anoCorrente);
  protected readonly periodos = signal<PeriodoMatriculaDTO[]>([]);
  protected readonly encerramentoPendente = signal<EncerramentoPreviaDTO | null>(null);
  protected readonly avisoEncerramento = signal<string | null>(null);
  protected readonly opcoesAno = computed<SelectOption<number | null>[]>(() => [
    ...anosDaLista(this.periodos(), this.anoDaInscricao(), this.anoCorrente).map((ano) => ({
      value: ano,
      label: `Inscrições ${ano}`,
    })),
    { value: null, label: 'Todos os anos' },
  ]);
  protected readonly status = signal<StatusPreCadastro>('PENDENTE');
  protected readonly busca = signal('');
  protected readonly rendaAte = signal<number | null>(null);
  protected readonly comProblemaSaude = signal(false);
  protected readonly programas = signal<ProgramaTransferencia[]>([]);
  protected readonly somenteNaoVistas = signal(false);
  /** Celular: filtros avançados recolhidos até tocar em "Filtros". */
  protected readonly filtrosAbertos = signal(false);
  protected readonly filtrosAvancadosAtivos = computed(
    () =>
      (this.rendaAte() != null ? 1 : 0) +
      this.programas().length +
      (this.comProblemaSaude() ? 1 : 0) +
      (this.somenteNaoVistas() ? 1 : 0),
  );
  protected readonly porStatus = signal<Record<StatusPreCadastro, PreCadastroResumoDTO[]>>({
    PENDENTE: [],
    LISTA_ESPERA: [],
    CONVERTIDO: [],
    DESCARTADO: [],
  });
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);

  protected readonly abaAtual = computed(() => ABAS.find((aba) => aba.status === this.status())!);
  protected readonly comFiltros = computed(() => emAvaliacao(this.status()));
  protected readonly filtroAtivo = computed(
    () =>
      !!this.busca().trim() ||
      (this.comFiltros() &&
        (this.rendaAte() != null || this.programas().length > 0 || this.comProblemaSaude() || this.somenteNaoVistas())),
  );
  protected readonly colunas = computed(() => (this.comFiltros() ? COLUNAS_TRIAGEM : COLUNAS_DECIDIDAS));
  protected readonly visiveis = computed<LinhaPreCadastro[]>(() => {
    const termo = this.busca().trim().toLocaleLowerCase('pt-BR');
    const lista = this.porStatus()[this.status()].map((item, indice) => ({ ...item, posicao: indice + 1 }));
    const porNome = termo ? lista.filter((item) => item.nomeCompleto.toLocaleLowerCase('pt-BR').includes(termo)) : lista;
    if (!this.comFiltros()) return porNome;
    const filtros = {
      rendaAte: this.rendaAte(),
      programas: this.programas(),
      comProblemaSaude: this.comProblemaSaude(),
      somenteNaoVistas: this.somenteNaoVistas(),
    };
    return porNome.filter((item) => atendeFiltros(item, filtros));
  });

  protected readonly parametrosDaUrl = computed(() => ({
    ano: this.ano() ?? 'todos',
    status: this.status() === 'PENDENTE' ? null : this.status(),
    rendaAte: this.rendaAte(),
    programas: this.programas().join(',') || null,
    saude: this.comProblemaSaude() ? 1 : null,
    naoVistas: this.somenteNaoVistas() ? 1 : null,
  }));

  protected readonly programasMarcados = computed(() => programasMarcados(this.programas()));

  ngOnInit(): void {
    this.aplicarFiltrosDaUrl();
    this.iniciar();
  }

  protected alterarAno(ano: number | null): void {
    this.ano.set(ano);
    this.atualizarUrl();
    this.carregar();
  }

  /** Abriu ou ajustou o período: a lista passa a mostrar as inscrições do ano dele. */
  protected async aoSalvarPeriodo(): Promise<void> {
    await this.carregarPeriodos();
    this.ano.set(this.anoDaInscricao());
    this.atualizarUrl();
    this.carregar();
  }

  protected async aoEncerrarAno(ano: number): Promise<void> {
    this.avisoEncerramento.set(`${ano} encerrado. Quem não renovou foi desligado em 31/12/${ano}.`);
    await this.carregarPeriodos();
    this.ano.set(this.anoDaInscricao());
    this.atualizarUrl();
    this.carregar();
  }

  /** Sem ano na URL, a lista abre no ano das inscrições de hoje (separa a matrícula do ano seguinte). */
  private async iniciar(): Promise<void> {
    const anoNaUrl = this.route.snapshot.queryParamMap.get('ano');
    await this.carregarPeriodos();
    if (anoNaUrl === 'todos') {
      this.ano.set(null);
    } else if (anoNaUrl && Number.isInteger(Number(anoNaUrl))) {
      this.ano.set(Number(anoNaUrl));
    } else {
      this.ano.set(this.anoDaInscricao());
    }
    this.carregar();
  }

  private async carregarPeriodos(): Promise<void> {
    try {
      const [periodos, inscricao, pendente] = await Promise.all([
        this.matriculaService.periodos(),
        this.service.inscricao(),
        this.ehCoordenador() ? this.matriculaService.encerramentoPendente() : Promise.resolve(null),
      ]);
      this.periodos.set(periodos);
      this.anoDaInscricao.set(inscricao.ano);
      this.encerramentoPendente.set(pendente);
    } catch {
      // Sem os períodos a lista ainda funciona, no ano corrente.
    }
  }

  protected selecionarAba(status: StatusPreCadastro): void {
    this.status.set(status);
    this.atualizarUrl();
  }

  protected alterarRendaAte(valor: number | null): void {
    this.rendaAte.set(valor);
    this.atualizarUrl();
  }

  protected alterarProgramas(marcados: string[]): void {
    this.programas.update((atuais) => alternarProgramas(atuais, marcados));
    this.atualizarUrl();
  }

  protected alterarProblemaSaude(marcados: string[]): void {
    this.comProblemaSaude.set(marcados.includes(PROBLEMA_SAUDE));
    this.atualizarUrl();
  }

  protected alterarNaoVistas(marcados: string[]): void {
    this.somenteNaoVistas.set(marcados.includes(NAO_VISTAS));
    this.atualizarUrl();
  }

  protected limparFiltros(): void {
    this.busca.set('');
    this.rendaAte.set(null);
    this.programas.set([]);
    this.comProblemaSaude.set(false);
    this.somenteNaoVistas.set(false);
    this.atualizarUrl();
  }

  protected readonly idDaLinha = (linha: LinhaPreCadastro) => linha.preCadastroId;

  protected readonly abrir = (linha: LinhaPreCadastro) =>
    this.router.navigate(['/pre-cadastros', linha.preCadastroId], { queryParams: this.parametrosDaUrl() });

  protected haQuantoTempo(criadoEm: string): string {
    return haQuantoTempo(criadoEm, this.agora);
  }

  private aplicarFiltrosDaUrl(): void {
    const params = this.route.snapshot.queryParamMap;
    const status = ABAS.find((aba) => aba.status === params.get('status'))?.status;
    const rendaAte = Number(params.get('rendaAte'));
    const programas = params.get('programas')?.split(',') ?? [];
    this.status.set(status ?? 'PENDENTE');
    this.rendaAte.set(params.get('rendaAte') && rendaAte >= 0 ? rendaAte : null);
    this.programas.set(PROGRAMAS.filter((programa) => programas.includes(programa)));
    this.comProblemaSaude.set(params.get('saude') === '1');
    this.somenteNaoVistas.set(params.get('naoVistas') === '1');
  }

  private atualizarUrl(): void {
    const destino = this.router.createUrlTree([], { relativeTo: this.route, queryParams: this.parametrosDaUrl() });
    this.location.replaceState(this.router.serializeUrl(destino));
  }

  private async carregar(): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);
    try {
      const ano = this.ano();
      const [pendentes, listaEspera, aprovados, reprovados] = await Promise.all(
        ABAS.map((aba) => this.service.listar(aba.status, ano)),
      );
      this.porStatus.set({ PENDENTE: pendentes, LISTA_ESPERA: listaEspera, CONVERTIDO: aprovados, DESCARTADO: reprovados });
    } catch (e) {
      this.erro.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível carregar os pré-cadastros.'));
    } finally {
      this.carregando.set(false);
    }
  }
}
