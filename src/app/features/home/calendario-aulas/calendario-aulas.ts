import {
  Component,
  OnInit,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CalendarOptions, DatesSetArg, EventClickArg, EventContentArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import { AulaService, FiltroListaAulas } from '../../../core/aula.service';
import { AuthService } from '../../../core/auth.service';
import { AulaComDetalhesResponseDTO } from '../../../shared/models/aula/AulaComDetalhesResponseDTO';
import { OficinaResponseDTO } from '../../../shared/models/oficina/OficinaResponseDTO';
import { TurmaResponseDTO } from '../../../shared/models/turma/TurmaResponseDTO';
import { StatusAula } from '../../../shared/enum/StatusAula';
import { BadgeVariant, resolveBadgeStatus } from '../../../shared/utils/badge-status.util';
import { podeEditarChamada } from '../../../shared/utils/chamada.util';
import { Select, SelectOption } from '../../../shared/components/select/select';
import { Button } from '../../../shared/components/button/button';
import { Modal } from '../../../shared/components/modal/modal';
import { RecorrenciaAulasModal } from '../recorrencia-aulas-modal/recorrencia-aulas-modal';
import { AulaStatusModal } from '../aula-status-modal/aula-status-modal';
import { ExcecaoCalendarioService } from '../../../core/excecao-calendario.service';
import { TIPO_EXCECAO_INFO, TipoExcecaoCalendario } from '../../../shared/enum/TipoExcecaoCalendario';
import {
  ExcecaoCalendarioRequestDTO,
  ExcecaoCalendarioResponseDTO,
} from '../../../shared/models/excecao/ExcecaoCalendarioDTO';
import { Input as AppInput } from '../../../shared/components/input/input';
import { mensagemErro } from '../../../shared/utils/erro-http.util';
import { HttpErrorResponse } from '@angular/common/http';
import { feriadosNacionais } from '../../../shared/utils/feriados.util';

/** Dia sem aula exibido: cadastrado pela ADRA (excecaoId) ou feriado nacional calculado (excecaoId null). */
interface DiaSemAula {
  data: string;
  tipo: TipoExcecaoCalendario;
  descricao: string | null;
  excecaoId: number | null;
}

type CalendarView = 'dayGridMonth' | 'timeGridWeek' | 'listWeek';

@Component({
  selector: 'app-calendario-aulas',
  standalone: true,
  imports: [FormsModule, Select, Button, Modal, FullCalendarModule, RecorrenciaAulasModal, AulaStatusModal, AppInput],
  templateUrl: './calendario-aulas.html',
  styleUrl: './calendario-aulas.css',
})
export class CalendarioAulas implements OnInit {
  protected readonly aulaService = inject(AulaService);
  protected readonly excecaoService = inject(ExcecaoCalendarioService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Referência ao componente do FullCalendar — necessária pra trocar de
   * visão (Mês/Semana) via API (`changeView`), já que `initialView` só
   * define a visão na primeira renderização e não reage a mudanças depois. */
  @ViewChild('calendario') private readonly calendarioRef?: FullCalendarComponent;

  /** Passadas pelo pai (Aulas) — já carregadas lá, evita nova chamada. */
  readonly turmas = input.required<TurmaResponseDTO[]>();
  readonly oficinas = input.required<OficinaResponseDTO[]>();
  /** Só Coordenador gera aulas e edita status; Sociopedagógico só visualiza (decisão confirmada). */
  readonly podeGerenciar = input.required<boolean>();
  /**
   * Restringe os eventos mostrados às turmas desta lista (usado pelo
   * oficineiro, que só pode ver o calendário das turmas dele). `null`
   * (padrão) mostra tudo, como no calendário do coordenador/sociopedagógico.
   */
  readonly turmaIdsPermitidos = input<number[] | null>(null);

  /** Filtro de oficina: "Todas as oficinas" é uma opção real (null), não placeholder desabilitado. */
  protected readonly oficinasOpcoes = computed<SelectOption<number | null>[]>(() => [
    { value: null, label: 'Todas as oficinas' },
    ...this.oficinas().map((o) => ({ value: o.oficinaId, label: o.nomeOficina })),
  ]);

  /** Legenda de status na toolbar — um item por valor do enum. */
  protected readonly legendaStatus = Object.values(StatusAula).map((status) => ({
    status,
    label: resolveBadgeStatus(status)?.label ?? status,
    variant: resolveBadgeStatus(status)?.variant ?? ('gray' as BadgeVariant),
  }));

  /** Mapa de variante do app-badge -> cores CSS var reais de styles.css (sem hex novo). */
  private readonly CORES_STATUS: Record<BadgeVariant, { bg: string; text: string }> = {
    green: { bg: 'var(--color-adra-green-50)', text: 'var(--color-adra-green-600)' },
    teal: { bg: 'var(--teal-50)', text: 'var(--teal-600)' },
    blue: { bg: 'var(--blue-50)', text: 'var(--blue-600)' },
    amber: { bg: 'var(--amber-50)', text: 'var(--amber-600)' },
    coral: { bg: 'var(--coral-50)', text: 'var(--coral-600)' },
    red: { bg: 'var(--red-50)', text: 'var(--red-600)' },
    gray: { bg: 'var(--gray-100)', text: 'var(--gray-600)' },
  };

  /** Legenda dos dias sem aula (férias, feriado, ponto facultativo, evento/passeio...). */
  protected readonly legendaExcecoes = Object.values(TipoExcecaoCalendario).map((tipo) => ({
    tipo,
    ...TIPO_EXCECAO_INFO[tipo],
  }));

  readonly oficinaIdFiltro = signal<number | null>(null);
  readonly dataInicioFiltro = signal<string>('');
  readonly dataFimFiltro = signal<string>('');
  private readonly isWide = inject(DOCUMENT).defaultView?.matchMedia?.('(min-width: 720px)')?.matches ?? true;
  readonly visualizacao = signal<CalendarView>(this.isWide ? 'dayGridMonth' : 'listWeek');

  readonly mostrarRecorrencia = signal(false);
  readonly aulaSelecionada = signal<AulaComDetalhesResponseDTO | null>(null);

  readonly calendarOptions = computed<CalendarOptions>(() => ({
    plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
    initialView: this.visualizacao(),
    locale: 'pt-br',
    headerToolbar: { left: 'prev,next title', center: '', right: 'today' },
    buttonText: { today: 'Hoje' },
    height: 'auto',
    eventDisplay: 'block',
    dayMaxEvents: 3,
    events: this.todosEventos(),
    eventContent: (arg: EventContentArg) => this.renderEventContent(arg),
    eventClick: (arg: EventClickArg) => this.abrirDetalheAula(arg),
    dayCellClassNames: (arg) => (this.excecoesPorData().has(this.dataIso(arg.date)) ? ['dia-sem-aula'] : []),
    // Setas ‹ › / "Hoje" / troca de visão: busca as aulas do período que ficou visível.
    datesSet: (arg: DatesSetArg) => this.aoMudarPeriodo(arg),
    dateClick: (arg: DateClickArg) => this.abrirDiaSelecionado(arg),
  }));

  readonly eventosCalendario = computed<EventInput[]>(() => {
    const permitidas = this.turmaIdsPermitidos();
    const aulas = permitidas
      ? this.aulaService.aulas().filter((aula) => aula.turmaId != null && permitidas.includes(aula.turmaId))
      : this.aulaService.aulas();

    return aulas.map((aula) => {
      const info = resolveBadgeStatus(aula.statusAula);
      const variant = info?.variant ?? 'gray';
      const cores = this.CORES_STATUS[variant];
      const titulo = aula.titulo ?? aula.nomeTurma ?? 'Aula';
      return {
        id: String(aula.aulaId),
        title: aula.nomeOficineiro ? `${titulo} · ${aula.nomeOficineiro}` : titulo,
        start: aula.horarioInicio ? `${aula.dataAula}T${aula.horarioInicio}` : aula.dataAula,
        end: aula.horarioFim ? `${aula.dataAula}T${aula.horarioFim}` : undefined,
        backgroundColor: cores.bg,
        borderColor: cores.bg,
        textColor: cores.text,
        extendedProps: { aula, variant },
      };
    });
  });

  /**
   * Dias sem aula do período: os cadastrados pela ADRA + feriados nacionais
   * (calculados no front). Um dia cadastrado prevalece sobre o feriado.
   */
  readonly diasSemAula = computed<DiaSemAula[]>(() => {
    const cadastrados: DiaSemAula[] = this.excecaoService.excecoes().map((e) => ({
      data: e.dataExcecao,
      tipo: e.tipo,
      descricao: e.descricao,
      excecaoId: e.excecaoId,
    }));
    const datasCadastradas = new Set(cadastrados.map((d) => d.data));

    const inicio = this.dataInicioFiltro() || this.dataIso(new Date());
    const fim = this.dataFimFiltro() || inicio;
    const anos = new Set([Number(inicio.slice(0, 4)), Number(fim.slice(0, 4))]);
    const nacionais: DiaSemAula[] = [...anos]
      .flatMap((ano) => feriadosNacionais(ano))
      .filter((f) => !datasCadastradas.has(f.data))
      .map((f) => ({ data: f.data, tipo: f.tipo, descricao: f.nome, excecaoId: null }));

    return [...cadastrados, ...nacionais];
  });

  /** Data 'YYYY-MM-DD' -> dia sem aula. */
  readonly excecoesPorData = computed(() => new Map(this.diasSemAula().map((d) => [d.data, d] as const)));

  /** Cada dia sem aula vira um fundo colorido + um rótulo no topo do dia. */
  private readonly eventosExcecao = computed<EventInput[]>(() =>
    this.diasSemAula().flatMap((excecao) => {
      const info = TIPO_EXCECAO_INFO[excecao.tipo] ?? TIPO_EXCECAO_INFO[TipoExcecaoCalendario.OUTRO];
      const cores = this.CORES_STATUS[info.variant];
      return [
        {
          id: `exc-fundo-${excecao.data}`,
          start: excecao.data,
          allDay: true,
          display: 'background',
          backgroundColor: cores.bg,
        },
        {
          id: `exc-${excecao.data}`,
          title: excecao.descricao ? `${info.label}: ${excecao.descricao}` : info.label,
          start: excecao.data,
          allDay: true,
          backgroundColor: cores.bg,
          borderColor: cores.bg,
          textColor: cores.text,
          extendedProps: { excecao, variant: info.variant },
        },
      ];
    }),
  );

  readonly todosEventos = computed<EventInput[]>(() => [...this.eventosExcecao(), ...this.eventosCalendario()]);

  constructor() {
    effect(() => {
      const filtro: FiltroListaAulas = {
        oficinaId: this.oficinaIdFiltro() ?? undefined,
        dataInicio: this.dataInicioFiltro() || undefined,
        dataFim: this.dataFimFiltro() || undefined,
      };
      this.aulaService.listarComDetalhes(filtro).subscribe();
    });
  }

  ngOnInit() {
    this.excecaoService.carregar();
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    this.dataInicioFiltro.set(this.dataIso(primeiroDia));
    this.dataFimFiltro.set(this.dataIso(ultimoDia));
  }

  /** Período visível do calendário mudou (setas, "Hoje", Mês/Semana/Lista): recarrega as aulas dele. */
  private aoMudarPeriodo(arg: DatesSetArg): void {
    const inicio = this.dataIso(arg.start);
    const fimExclusivo = new Date(arg.end);
    fimExclusivo.setDate(fimExclusivo.getDate() - 1);
    const fim = this.dataIso(fimExclusivo);
    // datesSet roda durante a renderização do FullCalendar: adia a escrita nos signals.
    queueMicrotask(() => {
      if (this.dataInicioFiltro() !== inicio) this.dataInicioFiltro.set(inicio);
      if (this.dataFimFiltro() !== fim) this.dataFimFiltro.set(fim);
    });
  }

  /** Campo "De" alterado à mão: leva o calendário até essa data. */
  irParaData(valor: string): void {
    this.dataInicioFiltro.set(valor);
    if (valor) this.calendarioRef?.getApi().gotoDate(valor);
  }

  alternarVisualizacao(view: CalendarView) {
    this.visualizacao.set(view);
    this.calendarioRef?.getApi().changeView(view);
  }

  abrirRecorrencia() {
    if (this.podeGerenciar()) this.mostrarRecorrencia.set(true);
  }

  aoGerarAulas() {
    this.mostrarRecorrencia.set(false);
    this.aulaService
      .listarComDetalhes({
        oficinaId: this.oficinaIdFiltro() ?? undefined,
        dataInicio: this.dataInicioFiltro() || undefined,
        dataFim: this.dataFimFiltro() || undefined,
      })
      .subscribe();
  }

  private abrirDetalheAula(arg: EventClickArg) {
    const excecao = arg.event.extendedProps['excecao'] as DiaSemAula | undefined;
    if (excecao) {
      this.diaSelecionado.set(excecao.data);
      return;
    }
    if (!this.podeGerenciar()) return; // sociopedagógico só visualiza
    this.aulaSelecionada.set(arg.event.extendedProps['aula'] as AulaComDetalhesResponseDTO);
  }

  fecharModalStatus() {
    this.aulaSelecionada.set(null);
  }

  /* ============================================================
   * CLICAR NO DIA — lista as aulas daquele dia e, pra Coordenador/
   * Sociopedagógico, linka direto pro fluxo de chamada já existente
   * (/chamada?data=&aulaId=, o mesmo mecanismo que StatusChamadaPainel
   * já usa). Oficineiro só visualiza (ele não tem acesso a /chamada).
   * ============================================================ */
  readonly diaSelecionado = signal<string | null>(null);

  protected readonly podeIrParaChamada = computed(() => podeEditarChamada(this.auth.currentProfile()));

  protected readonly tituloPainelDia = computed(() => {
    const dia = this.diaSelecionado();
    if (!dia) return '';
    const data = new Date(`${dia}T00:00:00`);
    const formatado = data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    return formatado.charAt(0).toUpperCase() + formatado.slice(1);
  });

  protected readonly aulasDoDiaSelecionado = computed<AulaComDetalhesResponseDTO[]>(() => {
    const dia = this.diaSelecionado();
    if (!dia) return [];
    const permitidas = this.turmaIdsPermitidos();
    const doDia = this.aulaService.aulas().filter((a) => a.dataAula === dia);
    const filtradas = permitidas ? doDia.filter((a) => a.turmaId != null && permitidas.includes(a.turmaId)) : doDia;
    return [...filtradas].sort((a, b) => (a.horarioInicio ?? '').localeCompare(b.horarioInicio ?? ''));
  });

  /** Dia sem aula do dia aberto no painel (se houver). */
  protected readonly excecaoDoDiaSelecionado = computed(() => {
    const dia = this.diaSelecionado();
    if (!dia) return null;
    const excecao = this.excecoesPorData().get(dia);
    return excecao ? { ...excecao, info: TIPO_EXCECAO_INFO[excecao.tipo] } : null;
  });

  private dataIso(data: Date): string {
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
  }

  /* ============================================================
   * DIAS SEM AULA — só Coordenador cadastra/remove (mesma regra do back)
   * ============================================================ */
  readonly mostrarDiasSemAula = signal(false);
  readonly salvandoExcecao = signal(false);
  readonly erroExcecao = signal<string | null>(null);
  formExcecao: ExcecaoCalendarioRequestDTO = this.excecaoVazia();

  protected readonly tipoExcecaoOpcoes: SelectOption<TipoExcecaoCalendario>[] = Object.values(TipoExcecaoCalendario).map(
    (tipo) => ({ value: tipo, label: TIPO_EXCECAO_INFO[tipo].label }),
  );

  /** Próximos dias sem aula (de hoje em diante), para conferir e remover. */
  protected readonly proximasExcecoes = computed(() => {
    const hoje = this.dataIso(new Date());
    return this.excecaoService.excecoes().filter((e) => e.dataExcecao >= hoje);
  });

  protected rotuloTipo(tipo: TipoExcecaoCalendario): string {
    return TIPO_EXCECAO_INFO[tipo]?.label ?? tipo;
  }

  private excecaoVazia(): ExcecaoCalendarioRequestDTO {
    return { dataExcecao: '', dataFim: '', tipo: TipoExcecaoCalendario.FERIAS, descricao: '' };
  }

  abrirDiasSemAula(): void {
    this.formExcecao = this.excecaoVazia();
    this.erroExcecao.set(null);
    this.mostrarDiasSemAula.set(true);
  }

  atualizarCampoExcecao<K extends keyof ExcecaoCalendarioRequestDTO>(campo: K, valor: ExcecaoCalendarioRequestDTO[K]): void {
    this.formExcecao = { ...this.formExcecao, [campo]: valor };
  }

  async salvarExcecao(): Promise<void> {
    if (this.salvandoExcecao()) return;
    const { dataExcecao, dataFim } = this.formExcecao;
    if (!dataExcecao) {
      this.erroExcecao.set('Informe a data (ou a data inicial do período).');
      return;
    }
    if (dataFim && dataFim < dataExcecao) {
      this.erroExcecao.set('A data final deve ser igual ou depois da inicial.');
      return;
    }

    this.salvandoExcecao.set(true);
    this.erroExcecao.set(null);
    try {
      await this.excecaoService.cadastrar({
        ...this.formExcecao,
        dataFim: dataFim || null,
        descricao: this.formExcecao.descricao?.trim() || null,
      });
      this.formExcecao = this.excecaoVazia();
      this.aoGerarAulas(); // aulas planejadas nesses dias viram canceladas
    } catch (erro) {
      this.erroExcecao.set(mensagemErro(erro as HttpErrorResponse, 'Não foi possível salvar o dia sem aula.'));
    } finally {
      this.salvandoExcecao.set(false);
    }
  }

  async removerExcecao(excecao: ExcecaoCalendarioResponseDTO): Promise<void> {
    try {
      await this.excecaoService.remover(excecao.excecaoId);
    } catch (erro) {
      this.erroExcecao.set(mensagemErro(erro as HttpErrorResponse, 'Não foi possível remover.'));
    }
  }

  private abrirDiaSelecionado(arg: DateClickArg): void {
    this.diaSelecionado.set(arg.dateStr);
  }

  fecharPainelDia(): void {
    this.diaSelecionado.set(null);
  }

  abrirChamadaDaAula(aula: AulaComDetalhesResponseDTO): void {
    this.router.navigate(['/chamada/aula', aula.aulaId]);
  }

  /**
   * Renderiza cada evento como mini-card (horário / título / subtítulo) em
   * vez de uma linha de texto truncada crua. Puramente visual — não toca em
   * nenhum dado, só como `aula` já carregada é exibida.
   */
  private renderEventContent(arg: EventContentArg) {
    const excecao = arg.event.extendedProps['excecao'] as DiaSemAula | undefined;
    if (excecao) {
      const variante = arg.event.extendedProps['variant'] as BadgeVariant;
      const rotulo = document.createElement('div');
      rotulo.className = 'evt evt-sem-aula';
      rotulo.style.setProperty('--evt-accent', `var(--${variante}-400)`);
      const titulo = document.createElement('span');
      titulo.className = 'evt-titulo';
      titulo.textContent = arg.event.title;
      titulo.title = arg.event.title;
      rotulo.appendChild(titulo);
      return { domNodes: [rotulo] };
    }

    const aula = arg.event.extendedProps['aula'] as AulaComDetalhesResponseDTO | undefined;
    // Fundo colorido dos dias sem aula (display: 'background') não tem conteúdo.
    if (!aula) return { domNodes: [] };
    const variant = (arg.event.extendedProps['variant'] as BadgeVariant) ?? 'gray';
    const wrapper = document.createElement('div');
    wrapper.className = 'evt';
    wrapper.style.setProperty('--evt-accent', `var(--${variant}-400)`);

    if (aula.horarioInicio) {
      const hora = document.createElement('span');
      hora.className = 'evt-hora';
      hora.textContent = aula.horarioInicio.slice(0, 5);
      wrapper.appendChild(hora);
    }

    const tituloTexto = aula.titulo ?? aula.nomeTurma ?? 'Aula';
    const titulo = document.createElement('span');
    titulo.className = 'evt-titulo';
    titulo.textContent = tituloTexto;
    titulo.title = tituloTexto; // tooltip nativo quando truncar
    wrapper.appendChild(titulo);

    if (aula.nomeOficineiro) {
      const sub = document.createElement('span');
      sub.className = 'evt-sub';
      sub.textContent = aula.nomeOficineiro;
      sub.title = aula.nomeOficineiro;
      wrapper.appendChild(sub);
    }

    return { domNodes: [wrapper] };
  }
}