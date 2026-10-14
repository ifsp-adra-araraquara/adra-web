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
import { CalendarOptions, EventClickArg, EventContentArg, EventInput } from '@fullcalendar/core';
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

type CalendarView = 'dayGridMonth' | 'timeGridWeek' | 'listWeek';

@Component({
  selector: 'app-calendario-aulas',
  standalone: true,
  imports: [FormsModule, Select, Button, Modal, FullCalendarModule, RecorrenciaAulasModal, AulaStatusModal],
  templateUrl: './calendario-aulas.html',
  styleUrl: './calendario-aulas.css',
})
export class CalendarioAulas implements OnInit {
  protected readonly aulaService = inject(AulaService);
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

  protected readonly oficinasOpcoes = computed<SelectOption<number>[]>(() =>
    this.oficinas().map((o) => ({ value: o.oficinaId, label: o.nomeOficina }))
  );

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
    events: this.eventosCalendario(),
    eventContent: (arg: EventContentArg) => this.renderEventContent(arg),
    eventClick: (arg: EventClickArg) => this.abrirDetalheAula(arg),
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
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    this.dataInicioFiltro.set(primeiroDia.toISOString().slice(0, 10));
    this.dataFimFiltro.set(ultimoDia.toISOString().slice(0, 10));
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

  private abrirDiaSelecionado(arg: DateClickArg): void {
    this.diaSelecionado.set(arg.dateStr);
  }

  fecharPainelDia(): void {
    this.diaSelecionado.set(null);
  }

  abrirChamadaDaAula(aula: AulaComDetalhesResponseDTO): void {
    this.router.navigate(['/chamada'], { queryParams: { data: aula.dataAula, aulaId: aula.aulaId } });
  }

  /**
   * Renderiza cada evento como mini-card (horário / título / subtítulo) em
   * vez de uma linha de texto truncada crua. Puramente visual — não toca em
   * nenhum dado, só como `aula` já carregada é exibida.
   */
  private renderEventContent(arg: EventContentArg) {
    const aula = arg.event.extendedProps['aula'] as AulaComDetalhesResponseDTO;
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