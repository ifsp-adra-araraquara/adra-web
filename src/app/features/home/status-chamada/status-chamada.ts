import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AulaService } from '../../../core/aula.service';
import { StatusChamada } from '../../../shared/enum/StatusChamada';
import { AulaStatusChamadaResponseDTO } from '../../../shared/models/aula/AulaStatusChamadaResponseDTO';
import { TurmaResponseDTO } from '../../../shared/models/turma/TurmaResponseDTO';
import { Table, TableColumn } from '../../../shared/components/table/table';
import { Badge } from '../../../shared/components/badge/badge';
import { Button } from '../../../shared/components/button/button';
import { Select, SelectOption } from '../../../shared/components/select/select';
import { hojeISO } from '../../../shared/utils/aula.util';

/**
 * US-71: painel do coordenador com o status de lançamento da chamada de
 * cada aula do período — "Lançada" ou "Pendente" —, sem abrir aula por
 * aula. Filtros de turma e período no mesmo padrão do calendário (US-64);
 * a ação da linha leva direto à tela de chamada daquela aula (US-66).
 *
 * Aulas canceladas/remarcadas e futuras já vêm filtradas pelo back.
 */
@Component({
  selector: 'app-status-chamada',
  imports: [FormsModule, Table, Badge, Button, Select],
  templateUrl: './status-chamada.html',
  styleUrl: './status-chamada.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusChamadaPainel implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly aulaService = inject(AulaService);
  private readonly api = environment.apiUrl;

  readonly StatusChamada = StatusChamada;

  readonly turmas = signal<TurmaResponseDTO[]>([]);
  readonly aulas = signal<AulaStatusChamadaResponseDTO[]>([]);
  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);

  readonly turmaIdFiltro = signal<number | null>(null);
  readonly dataInicioFiltro = signal<string>(primeiroDiaDoMesISO());
  readonly dataFimFiltro = signal<string>(hojeISO());

  readonly turmasOpcoes = computed<SelectOption<number>[]>(() =>
    this.turmas().map((t) => ({ value: t.turmaId, label: t.nomeTurma })),
  );

  readonly totalLancadas = computed(
    () => this.aulas().filter((a) => a.statusChamada === StatusChamada.LANCADA).length,
  );
  readonly totalPendentes = computed(
    () => this.aulas().filter((a) => a.statusChamada === StatusChamada.PENDENTE).length,
  );

  readonly colunas: TableColumn<AulaStatusChamadaResponseDTO>[] = [
    // Sem ordenação: a API já devolve por data/horário, e a tabela ordenaria o texto DD/MM/YYYY.
    { key: 'dataAula', header: 'Data', value: (a) => formatarData(a.dataAula) },
    {
      key: 'horario',
      header: 'Horário',
      value: (a) => (a.horarioInicio && a.horarioFim ? `${a.horarioInicio.slice(0, 5)} - ${a.horarioFim.slice(0, 5)}` : '-'),
    },
    { key: 'nomeTurma', header: 'Turma', sortable: true, value: (a) => a.nomeTurma ?? '-' },
    { key: 'titulo', header: 'Título', value: (a) => a.titulo ?? '-' },
    { key: 'statusChamada', header: 'Chamada', type: 'badge', sortable: true },
  ];

  readonly trackAula = (a: AulaStatusChamadaResponseDTO) => a.aulaId;

  constructor() {
    effect(() => {
      this.carregarAulas(this.turmaIdFiltro(), this.dataInicioFiltro(), this.dataFimFiltro());
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      const turmas = await firstValueFrom(this.http.get<TurmaResponseDTO[]>(`${this.api}/api/turmas`));
      this.turmas.set([...turmas].sort((a, b) => a.nomeTurma.localeCompare(b.nomeTurma)));
    } catch {
      this.erro.set('Não foi possível carregar as turmas.');
    }
  }

  /** CA-71.4: abre a tela de chamada (US-66) já na data e com a aula aberta. */
  abrirChamada(aula: AulaStatusChamadaResponseDTO): void {
    this.router.navigate(['/chamada'], { queryParams: { data: aula.dataAula, aulaId: aula.aulaId } });
  }

  private async carregarAulas(turmaId: number | null, dataInicio: string, dataFim: string): Promise<void> {
    if (dataInicio && dataFim && dataInicio > dataFim) {
      this.erro.set('A data inicial não pode ser posterior à data final.');
      this.aulas.set([]);
      return;
    }

    this.carregando.set(true);
    this.erro.set(null);
    try {
      const aulas = await firstValueFrom(
        this.aulaService.listarStatusChamada({
          turmaId: turmaId ?? undefined,
          dataInicio: dataInicio || undefined,
          dataFim: dataFim || undefined,
        }),
      );
      this.aulas.set(aulas);
    } catch {
      this.erro.set('Não foi possível carregar o status das chamadas.');
    } finally {
      this.carregando.set(false);
    }
  }
}

function primeiroDiaDoMesISO(): string {
  return `${hojeISO().slice(0, 8)}01`;
}

/** YYYY-MM-DD -> DD/MM/YYYY. */
function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}
