import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/auth.service';
import { AulaService } from '../../../core/aula.service';
import { Role } from '../../../shared/enum/role.enum';
import { SituacaoAula } from '../../../shared/enum/SituacaoAula';
import { StatusChamada } from '../../../shared/enum/StatusChamada';
import { AulaComDetalhesResponseDTO } from '../../../shared/models/aula/AulaComDetalhesResponseDTO';
import { AulaStatusChamadaResponseDTO } from '../../../shared/models/aula/AulaStatusChamadaResponseDTO';
import { calcularSituacaoAula, hojeISO } from '../../../shared/utils/aula.util';
import { dataBr } from '../../../shared/utils/disciplinar.util';
import { BadgeVariant } from '../../../shared/utils/badge-status.util';
import { Badge } from '../../../shared/components/badge/badge';
import { Button } from '../../../shared/components/button/button';
import { Icon } from '../../../shared/components/icon/icon';
import { NavegadorData } from '../../../shared/components/navegador-data/navegador-data';

type Aba = 'dia' | 'pendentes';

/** Quantos dias para trás a aba "Pendentes" procura chamadas não feitas. */
const DIAS_PENDENTES = 60;

/**
 * FT-06 — entrada da chamada, no modelo "Aulas de hoje / Pendentes de
 * chamada" do app do professor da Sistema Quality. Tocar numa aula abre a
 * tela própria da chamada (`/chamada/aula/:id`), sem modal.
 *
 * Sociopedagógico fica travado em hoje (CA-65.3); o Coordenador troca o dia
 * e vê a aba "Pendentes" (chamadas de dias passados que ninguém lançou).
 */
@Component({
  selector: 'app-chamada',
  imports: [Badge, Button, Icon, NavegadorData],
  templateUrl: './chamada.html',
  styleUrl: './chamada.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Chamada implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly aulaService = inject(AulaService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly hojeISO = hojeISO;
  readonly dataBr = dataBr;

  readonly ehCoordenador = computed(() => this.auth.currentProfile() === Role.COORD);
  readonly aba = signal<Aba>('dia');

  readonly dataSelecionada = signal<string>(hojeISO());
  readonly aulas = signal<AulaComDetalhesResponseDTO[]>([]);
  readonly pendentes = signal<AulaStatusChamadaResponseDTO[]>([]);
  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);

  readonly tituloDia = computed(() =>
    this.dataSelecionada() === hojeISO() ? 'Hoje' : dataBr(this.dataSelecionada()),
  );

  ngOnInit(): void {
    // Links antigos (/chamada?data=&aulaId=) vão direto para a tela da aula.
    const aulaId = Number(this.route.snapshot.queryParamMap.get('aulaId'));
    if (Number.isInteger(aulaId) && aulaId > 0) {
      this.router.navigate(['/chamada/aula', aulaId], { replaceUrl: true });
      return;
    }
    const data = this.route.snapshot.queryParamMap.get('data');
    if (this.ehCoordenador() && data) this.dataSelecionada.set(data);

    this.carregarDia();
    if (this.ehCoordenador()) this.carregarPendentes();
  }

  trocarAba(aba: Aba): void {
    this.aba.set(aba);
  }

  onDataChange(valor: string): void {
    if (!valor || !this.ehCoordenador()) return;
    this.dataSelecionada.set(valor);
    this.carregarDia();
  }

  abrir(aulaId: number): void {
    this.router.navigate(['/chamada/aula', aulaId]);
  }

  irParaStatusChamadas(): void {
    this.router.navigate(['/chamada/status']);
  }

  horario(inicio: string | null, fim: string | null): string {
    if (!inicio) return '—';
    return fim ? `${inicio.slice(0, 5)}–${fim.slice(0, 5)}` : inicio.slice(0, 5);
  }

  /** Chip de estado do cartão: ação quando dá para fazer a chamada, situação nos demais casos. */
  estado(aula: AulaComDetalhesResponseDTO): { variant: BadgeVariant; label: string } {
    switch (calcularSituacaoAula(aula.dataAula, aula.statusAula)) {
      case SituacaoAula.FINALIZADA:
        return { variant: 'green', label: 'Realizada' };
      case SituacaoAula.CANCELADA:
        return { variant: 'gray', label: 'Cancelada' };
      case SituacaoAula.PENDENTE:
        return { variant: 'gray', label: 'Futura' };
      default:
        return { variant: 'blue', label: 'Fazer chamada' };
    }
  }

  private async carregarDia(): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);
    try {
      const aulas = await firstValueFrom(this.aulaService.listarComDetalhes({ dataAula: this.dataSelecionada() }));
      this.aulas.set([...aulas].sort((a, b) => (a.horarioInicio ?? '').localeCompare(b.horarioInicio ?? '')));
    } catch {
      this.erro.set('Não foi possível carregar as aulas desta data.');
    } finally {
      this.carregando.set(false);
    }
  }

  private async carregarPendentes(): Promise<void> {
    const [ano, mes, dia] = hojeISO().split('-').map(Number);
    const inicio = new Date(ano, mes - 1, dia - DIAS_PENDENTES);
    const dataInicio = `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, '0')}-${String(inicio.getDate()).padStart(2, '0')}`;
    try {
      const aulas = await firstValueFrom(this.aulaService.listarStatusChamada({ dataInicio, dataFim: hojeISO() }));
      this.pendentes.set(
        aulas
          .filter((a) => a.statusChamada === StatusChamada.PENDENTE && a.dataAula < hojeISO())
          .sort((a, b) => b.dataAula.localeCompare(a.dataAula) || (a.horarioInicio ?? '').localeCompare(b.horarioInicio ?? '')),
      );
    } catch {
      this.pendentes.set([]);
    }
  }
}
