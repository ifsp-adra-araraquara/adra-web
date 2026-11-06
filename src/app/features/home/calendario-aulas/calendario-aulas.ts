import {
  Component,
  OnInit,
  ViewChild,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarOptions, DatesSetArg, EventClickArg, EventContentArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import { BadgeVariant } from '../../../shared/utils/badge-status.util';
import { Select, SelectOption } from '../../../shared/components/select/select';
import { Button } from '../../../shared/components/button/button';
import { Modal } from '../../../shared/components/modal/modal';
import { ExcecaoCalendarioService } from '../../../core/excecao-calendario.service';
import { NotaCalendarioService } from '../../../core/nota-calendario.service';
import { TIPO_EXCECAO_INFO, TipoExcecaoCalendario } from '../../../shared/enum/TipoExcecaoCalendario';
import {
  ExcecaoCalendarioRequestDTO,
  ExcecaoCalendarioResponseDTO,
} from '../../../shared/models/excecao/ExcecaoCalendarioDTO';
import {
  NotaCalendarioRequestDTO,
  NotaCalendarioResponseDTO,
} from '../../../shared/models/nota/NotaCalendarioDTO';
import { Input as AppInput } from '../../../shared/components/input/input';
import { mensagemErro } from '../../../shared/utils/erro-http.util';
import { HttpErrorResponse } from '@angular/common/http';
import { feriadosNacionais } from '../../../shared/utils/feriados.util';

/** Dia sem chamada exibido: cadastrado pela ADRA (excecaoId) ou feriado nacional calculado (excecaoId null). */
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
  imports: [FormsModule, Select, Button, Modal, FullCalendarModule, AppInput],
  templateUrl: './calendario-aulas.html',
  styleUrl: './calendario-aulas.css',
})
export class CalendarioAulas implements OnInit {
  protected readonly excecaoService = inject(ExcecaoCalendarioService);
  protected readonly notaService = inject(NotaCalendarioService);

  /** Referência ao componente do FullCalendar — necessária pra trocar de
   * visão (Mês/Semana) via API (`changeView`), já que `initialView` só
   * define a visão na primeira renderização e não reage a mudanças depois. */
  @ViewChild('calendario') private readonly calendarioRef?: FullCalendarComponent;

  /** Só o Coordenador cadastra notas e dias sem chamada; os outros perfis só visualizam. */
  readonly podeGerenciar = input.required<boolean>();
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

  /** Legenda dos dias sem chamada (férias, feriado, ponto facultativo, evento/passeio...). */
  protected readonly legendaExcecoes = Object.values(TipoExcecaoCalendario).map((tipo) => ({
    tipo,
    ...TIPO_EXCECAO_INFO[tipo],
  }));

  readonly dataInicioFiltro = signal<string>('');
  readonly dataFimFiltro = signal<string>('');
  private readonly isWide = inject(DOCUMENT).defaultView?.matchMedia?.('(min-width: 720px)')?.matches ?? true;
  readonly visualizacao = signal<CalendarView>(this.isWide ? 'dayGridMonth' : 'listWeek');

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
    eventClick: (arg: EventClickArg) => this.abrirDiaDoEvento(arg),
    dayCellClassNames: (arg) => (this.excecoesPorData().has(this.dataIso(arg.date)) ? ['dia-sem-aula'] : []),
    // Setas ‹ › / "Hoje" / troca de visão: guarda o período que ficou visível.
    datesSet: (arg: DatesSetArg) => this.aoMudarPeriodo(arg),
    dateClick: (arg: DateClickArg) => this.abrirDiaSelecionado(arg),
  }));

  /**
   * Dias sem chamada do período: os cadastrados pela ADRA + feriados nacionais
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

  /** Data 'YYYY-MM-DD' -> dia sem chamada. */
  readonly excecoesPorData = computed(() => new Map(this.diasSemAula().map((d) => [d.data, d] as const)));

  /** Cada dia sem chamada vira um fundo colorido + um rótulo no topo do dia. */
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

  /** Notas/eventos globais cadastrados pela Coordenação — visíveis para todos. */
  private readonly eventosNotas = computed<EventInput[]>(() =>
    this.notaService.notas().map((nota) => {
      const cores = this.CORES_STATUS['coral'];
      const horarioCurto = nota.horario ? nota.horario.slice(0, 5) : null;
      return {
        id: `nota-${nota.notaId}`,
        title: horarioCurto ? `${horarioCurto} · ${nota.titulo}` : nota.titulo,
        start: nota.horario ? `${nota.dataNota}T${nota.horario}` : nota.dataNota,
        allDay: !nota.horario,
        backgroundColor: cores.bg,
        borderColor: cores.bg,
        textColor: cores.text,
        extendedProps: { nota, variant: 'coral' as BadgeVariant },
      };
    }),
  );

  readonly todosEventos = computed<EventInput[]>(() => [
    ...this.eventosExcecao(),
    ...this.eventosNotas(),
  ]);

  ngOnInit() {
    this.excecaoService.carregar();
    this.notaService.carregar();
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    this.dataInicioFiltro.set(this.dataIso(primeiroDia));
    this.dataFimFiltro.set(this.dataIso(ultimoDia));
  }

  /** Período visível do calendário mudou (setas, "Hoje", Mês/Semana/Lista): guarda o período (anos dos feriados). */
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

  private abrirDiaDoEvento(arg: EventClickArg) {
    const excecao = arg.event.extendedProps['excecao'] as DiaSemAula | undefined;
    if (excecao) {
      this.diaSelecionado.set(excecao.data);
      return;
    }
    const nota = arg.event.extendedProps['nota'] as NotaCalendarioResponseDTO | undefined;
    if (nota) {
      this.diaSelecionado.set(nota.dataNota);
    }
  }

  /* ============================================================
   * CLICAR NO DIA — mostra o dia sem chamada e as notas daquele dia.
   * ============================================================ */
  readonly diaSelecionado = signal<string | null>(null);

  protected readonly tituloPainelDia = computed(() => {
    const dia = this.diaSelecionado();
    if (!dia) return '';
    const data = new Date(`${dia}T00:00:00`);
    const formatado = data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    return formatado.charAt(0).toUpperCase() + formatado.slice(1);
  });

  /** Notas globais do dia aberto no painel (se houver). */
  protected readonly notasDoDiaSelecionado = computed<NotaCalendarioResponseDTO[]>(() => {
    const dia = this.diaSelecionado();
    if (!dia) return [];
    return this.notaService
      .notas()
      .filter((n) => n.dataNota === dia)
      .sort((a, b) => (a.horario ?? '').localeCompare(b.horario ?? ''));
  });

  /** Dia sem chamada do dia aberto no painel (se houver). */
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
   * NOTAS GLOBAIS DO CALENDÁRIO — só Coordenador cadastra/edita/remove
   * ============================================================ */
  readonly mostrarNotasCalendario = signal(false);
  readonly notaEditandoId = signal<number | null>(null);
  readonly salvandoNota = signal(false);
  readonly erroNota = signal<string | null>(null);
  formNota: NotaCalendarioRequestDTO = this.notaVazia();

  /** Próximas notas globais (de hoje em diante). */
  protected readonly proximasNotas = computed(() => {
    const hoje = this.dataIso(new Date());
    return this.notaService.notas().filter((n) => n.dataNota >= hoje);
  });

  private notaVazia(dataNota = ''): NotaCalendarioRequestDTO {
    return { dataNota, horario: '', titulo: '', descricao: '' };
  }

  abrirNotasCalendario(dataPredefinida?: string): void {
    this.notaEditandoId.set(null);
    this.formNota = this.notaVazia(dataPredefinida ?? '');
    this.erroNota.set(null);
    this.mostrarNotasCalendario.set(true);
  }

  abrirNovaNotaNoDia(): void {
    const dia = this.diaSelecionado() ?? '';
    this.diaSelecionado.set(null);
    this.abrirNotasCalendario(dia);
  }

  editarNota(nota: NotaCalendarioResponseDTO): void {
    this.diaSelecionado.set(null);
    this.notaEditandoId.set(nota.notaId);
    this.formNota = {
      dataNota: nota.dataNota,
      horario: nota.horario ? nota.horario.slice(0, 5) : '',
      titulo: nota.titulo,
      descricao: nota.descricao ?? '',
    };
    this.erroNota.set(null);
    this.mostrarNotasCalendario.set(true);
  }

  cancelarEdicaoNota(): void {
    this.notaEditandoId.set(null);
    this.formNota = this.notaVazia();
    this.erroNota.set(null);
  }

  atualizarCampoNota<K extends keyof NotaCalendarioRequestDTO>(campo: K, valor: NotaCalendarioRequestDTO[K]): void {
    this.formNota = { ...this.formNota, [campo]: valor };
  }

  async salvarNota(): Promise<void> {
    if (this.salvandoNota()) return;
    const { dataNota, horario, titulo, descricao } = this.formNota;
    if (!dataNota) {
      this.erroNota.set('Informe a data da nota.');
      return;
    }
    if (!titulo || !titulo.trim()) {
      this.erroNota.set('Informe o título da nota.');
      return;
    }

    this.salvandoNota.set(true);
    this.erroNota.set(null);
    try {
      const payload: NotaCalendarioRequestDTO = {
        dataNota,
        horario: horario?.trim() || null,
        titulo: titulo.trim(),
        descricao: descricao?.trim() || null,
      };
      const editandoId = this.notaEditandoId();
      if (editandoId != null) {
        await this.notaService.atualizar(editandoId, payload);
        this.notaEditandoId.set(null);
      } else {
        await this.notaService.cadastrar(payload);
      }
      this.formNota = this.notaVazia();
    } catch (erro) {
      this.erroNota.set(mensagemErro(erro as HttpErrorResponse, 'Não foi possível salvar a nota do calendário.'));
    } finally {
      this.salvandoNota.set(false);
    }
  }

  async removerNota(nota: NotaCalendarioResponseDTO): Promise<void> {
    try {
      await this.notaService.remover(nota.notaId);
      if (this.notaEditandoId() === nota.notaId) {
        this.cancelarEdicaoNota();
      }
    } catch (erro) {
      this.erroNota.set(mensagemErro(erro as HttpErrorResponse, 'Não foi possível remover a nota.'));
    }
  }

  /* ============================================================
   * DIAS SEM CHAMADA — só Coordenador cadastra/remove (mesma regra do back)
   * ============================================================ */
  readonly mostrarDiasSemAula = signal(false);
  readonly salvandoExcecao = signal(false);
  readonly erroExcecao = signal<string | null>(null);
  formExcecao: ExcecaoCalendarioRequestDTO = this.excecaoVazia();

  protected readonly tipoExcecaoOpcoes: SelectOption<TipoExcecaoCalendario>[] = Object.values(TipoExcecaoCalendario).map(
    (tipo) => ({ value: tipo, label: TIPO_EXCECAO_INFO[tipo].label }),
  );

  /** Próximos dias sem chamada (de hoje em diante), para conferir e remover. */
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
    } catch (erro) {
      this.erroExcecao.set(mensagemErro(erro as HttpErrorResponse, 'Não foi possível salvar o dia sem chamada.'));
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

  /**
   * Renderiza cada evento como mini-card (horário / título / subtítulo) em
   * vez de uma linha de texto truncada crua. Puramente visual.
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

    const nota = arg.event.extendedProps['nota'] as NotaCalendarioResponseDTO | undefined;
    if (nota) {
      const variante = (arg.event.extendedProps['variant'] as BadgeVariant) ?? 'coral';
      const wrapper = document.createElement('div');
      wrapper.className = 'evt evt-nota';
      wrapper.style.setProperty('--evt-accent', `var(--${variante}-400)`);
      if (nota.horario) {
        const hora = document.createElement('span');
        hora.className = 'evt-hora';
        hora.textContent = nota.horario.slice(0, 5);
        wrapper.appendChild(hora);
      }
      const titulo = document.createElement('span');
      titulo.className = 'evt-titulo';
      titulo.textContent = nota.titulo;
      titulo.title = nota.descricao ? `${nota.titulo} — ${nota.descricao}` : nota.titulo;
      wrapper.appendChild(titulo);
      if (nota.descricao) {
        const sub = document.createElement('span');
        sub.className = 'evt-sub';
        sub.textContent = nota.descricao;
        sub.title = nota.descricao;
        wrapper.appendChild(sub);
      }
      return { domNodes: [wrapper] };
    }

    // Fundo colorido dos dias sem chamada (display: 'background') não tem conteúdo.
    return { domNodes: [] };
  }
}