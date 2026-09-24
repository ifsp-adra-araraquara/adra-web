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
import { FormsModule } from '@angular/forms';
import { CalendarOptions, EventClickArg, EventContentArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import { AulaService, FiltroListaAulas } from '../../../core/aula.service';
import { AulaComDetalhesResponseDTO } from '../../../shared/models/aula/AulaComDetalhesResponseDTO';
import { OficinaResponseDTO } from '../../../shared/models/oficina/OficinaResponseDTO';
import { TurmaResponseDTO } from '../../../shared/models/turma/TurmaResponseDTO';
import { StatusAula } from '../../../shared/enum/StatusAula';
import { BadgeVariant, resolveBadgeStatus } from '../../../shared/utils/badge-status.util';
import { Select, SelectOption } from '../../../shared/components/select/select';
import { RecorrenciaAulasModal } from '../recorrencia-aulas-modal/recorrencia-aulas-modal';
import { AulaStatusModal } from '../aula-status-modal/aula-status-modal';

@Component({
  selector: 'app-calendario-aulas',
  standalone: true,
  imports: [FormsModule, Select, FullCalendarModule, RecorrenciaAulasModal, AulaStatusModal],
  templateUrl: './calendario-aulas.html',
  styleUrl: './calendario-aulas.css',
})
export class CalendarioAulas implements OnInit {
  protected readonly aulaService = inject(AulaService);

  /** Referência ao componente do FullCalendar — necessária pra trocar de
   * visão (Mês/Semana) via API (`changeView`), já que `initialView` só
   * define a visão na primeira renderização e não reage a mudanças depois. */
  @ViewChild('calendario') private readonly calendarioRef?: FullCalendarComponent;

  /** Passadas pelo pai (Aulas) — já carregadas lá, evita nova chamada. */
  readonly turmas = input.required<TurmaResponseDTO[]>();
  readonly oficinas = input.required<OficinaResponseDTO[]>();
  /** Só Coordenador gera aulas e edita status; Sociopedagógico só visualiza (decisão confirmada). */
  readonly podeGerenciar = input.required<boolean>();

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
    green: { bg: 'var(--green-50)', text: 'var(--green-600)' },
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
  readonly visualizacao = signal<'dayGridMonth' | 'timeGridWeek'>('dayGridMonth');

  readonly mostrarRecorrencia = signal(false);
  readonly aulaSelecionada = signal<AulaComDetalhesResponseDTO | null>(null);

  readonly calendarOptions = computed<CalendarOptions>(() => ({
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
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
  }));

  readonly eventosCalendario = computed<EventInput[]>(() =>
    this.aulaService.aulas().map((aula) => {
      const info = resolveBadgeStatus(aula.statusAula);
      const cores = this.CORES_STATUS[info?.variant ?? 'gray'];
      const titulo = aula.titulo ?? aula.nomeTurma ?? 'Aula';
      return {
        id: String(aula.aulaId),
        title: aula.nomeOficineiro ? `${titulo} · ${aula.nomeOficineiro}` : titulo,
        start: aula.horarioInicio ? `${aula.dataAula}T${aula.horarioInicio}` : aula.dataAula,
        end: aula.horarioFim ? `${aula.dataAula}T${aula.horarioFim}` : undefined,
        backgroundColor: cores.bg,
        borderColor: cores.bg,
        textColor: cores.text,
        extendedProps: { aula },
      };
    })
  );

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

  alternarVisualizacao(view: 'dayGridMonth' | 'timeGridWeek') {
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

  /**
   * Renderiza cada evento como mini-card (horário / título / subtítulo) em
   * vez de uma linha de texto truncada crua. Puramente visual — não toca em
   * nenhum dado, só como `aula` já carregada é exibida.
   */
  private renderEventContent(arg: EventContentArg) {
    const aula = arg.event.extendedProps['aula'] as AulaComDetalhesResponseDTO;
    const wrapper = document.createElement('div');
    wrapper.className = 'evt';

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