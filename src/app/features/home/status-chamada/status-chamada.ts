import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ChamadaService } from '../../../core/chamada.service';
import { StatusChamada } from '../../../shared/enum/StatusChamada';
import { StatusChamadaDiaDTO } from '../../../shared/models/chamada/ChamadaGrupo';
import { TurmaResponseDTO } from '../../../shared/models/turma/TurmaResponseDTO';
import { Table, TableColumn } from '../../../shared/components/table/table';
import { Badge } from '../../../shared/components/badge/badge';
import { Select, SelectOption } from '../../../shared/components/select/select';
import { hojeISO } from '../../../shared/utils/aula.util';
import { Icon } from '../../../shared/components/icon/icon';
import { TooltipDirective } from '../../../shared/components/tooltip/tooltip';

/**
 * US-71: relatório do Coordenador com a situação da chamada de cada grupo
 * em cada dia do período — "Lançada" ou "Pendente" —, sem abrir grupo por
 * grupo. Pendente = dia de chamada do grupo, até hoje, sem lançamento
 * (feriados e dias sem atividade não entram). A ação da linha abre a chamada.
 */
@Component({
  selector: 'app-status-chamada',
  imports: [TooltipDirective, Icon, FormsModule, Table, Badge, Select],
  templateUrl: './status-chamada.html',
  styleUrl: './status-chamada.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusChamadaPainel implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly chamadaService = inject(ChamadaService);
  private readonly api = environment.apiUrl;

  readonly StatusChamada = StatusChamada;

  readonly turmas = signal<TurmaResponseDTO[]>([]);
  private readonly doPeriodo = signal<StatusChamadaDiaDTO[]>([]);
  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);

  readonly turmaIdFiltro = signal<number | null>(null);
  readonly dataInicioFiltro = signal<string>(primeiroDiaDoMesISO());
  readonly dataFimFiltro = signal<string>(hojeISO());

  readonly turmasOpcoes = computed<SelectOption<number>[]>(() =>
    this.turmas().map((t) => ({ value: t.turmaId, label: t.nomeTurma })),
  );

  readonly chamadas = computed(() => {
    const turmaId = this.turmaIdFiltro();
    return turmaId == null ? this.doPeriodo() : this.doPeriodo().filter((c) => c.turmaId === turmaId);
  });
  readonly totalLancadas = computed(() => this.chamadas().filter((c) => c.status === StatusChamada.LANCADA).length);
  readonly totalPendentes = computed(() => this.chamadas().filter((c) => c.status === StatusChamada.PENDENTE).length);

  readonly colunas: TableColumn<StatusChamadaDiaDTO>[] = [
    // Sem ordenação: a API já devolve por data, e a tabela ordenaria o texto DD/MM/YYYY.
    { key: 'data', header: 'Data', value: (c) => formatarData(c.data) },
    { key: 'nomeTurma', header: 'Grupo', sortable: true },
    { key: 'status', header: 'Chamada', type: 'badge', sortable: true },
    { key: 'lancadaPorNome', header: 'Lançada por', value: (c) => c.lancadaPorNome ?? '-' },
  ];

  readonly trackChamada = (c: StatusChamadaDiaDTO) => `${c.turmaId}-${c.data}`;

  constructor() {
    effect(() => {
      this.carregar(this.dataInicioFiltro(), this.dataFimFiltro());
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      const turmas = await firstValueFrom(this.http.get<TurmaResponseDTO[]>(`${this.api}/api/turmas`));
      this.turmas.set([...turmas].sort((a, b) => a.nomeTurma.localeCompare(b.nomeTurma)));
    } catch {
      this.erro.set('Não foi possível carregar os grupos.');
    }
  }

  abrirChamada(chamada: StatusChamadaDiaDTO): void {
    this.router.navigate(['/chamada/grupo', chamada.turmaId, chamada.data]);
  }

  voltar(): void {
    this.location.back();
  }

  private async carregar(inicio: string, fim: string): Promise<void> {
    if (!inicio || !fim) {
      this.doPeriodo.set([]);
      return;
    }
    if (inicio > fim) {
      this.erro.set('A data inicial não pode ser posterior à data final.');
      this.doPeriodo.set([]);
      return;
    }

    this.carregando.set(true);
    this.erro.set(null);
    try {
      this.doPeriodo.set(await this.chamadaService.carregarStatus(inicio, fim));
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
