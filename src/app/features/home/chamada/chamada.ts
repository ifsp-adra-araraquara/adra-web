import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { ChamadaService } from '../../../core/chamada.service';
import { Role } from '../../../shared/enum/role.enum';
import { StatusChamada } from '../../../shared/enum/StatusChamada';
import { ChamadasDoDiaDTO, GrupoDoDiaDTO, StatusChamadaDiaDTO } from '../../../shared/models/chamada/ChamadaGrupo';
import { hojeISO } from '../../../shared/utils/aula.util';
import { dataBr } from '../../../shared/utils/disciplinar.util';
import { Badge } from '../../../shared/components/badge/badge';
import { Button } from '../../../shared/components/button/button';
import { Icon } from '../../../shared/components/icon/icon';
import { NavegadorData } from '../../../shared/components/navegador-data/navegador-data';

type Aba = 'dia' | 'pendentes';

/** Quantos dias para trás a aba "Pendentes" procura chamadas não feitas. */
const DIAS_PENDENTES = 60;

/**
 * FT-17 — entrada da chamada: os grupos que têm chamada no dia escolhido,
 * com o status de cada um. Tocar num grupo abre `/chamada/grupo/:turmaId/:data`.
 * Todos navegam entre os dias; quem pode editar cada dia é decidido na tela do grupo.
 * O Coordenador também vê a aba "Pendentes": dias de chamada sem lançamento.
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
  private readonly chamadaService = inject(ChamadaService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly hojeISO = hojeISO;
  readonly dataBr = dataBr;
  readonly StatusChamada = StatusChamada;

  readonly ehCoordenador = computed(() => this.auth.currentProfile() === Role.COORD);
  readonly aba = signal<Aba>('dia');
  readonly pendentes = signal<StatusChamadaDiaDTO[]>([]);

  readonly dataSelecionada = signal<string>(hojeISO());
  readonly dia = signal<ChamadasDoDiaDTO | null>(null);
  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);

  readonly tituloDia = computed(() =>
    this.dataSelecionada() === hojeISO() ? 'Hoje' : dataBr(this.dataSelecionada()),
  );

  ngOnInit(): void {
    // Links antigos (/chamada?aulaId=) abrem a chamada do grupo daquela aula.
    const aulaId = Number(this.route.snapshot.queryParamMap.get('aulaId'));
    if (Number.isInteger(aulaId) && aulaId > 0) {
      this.router.navigate(['/chamada/aula', aulaId], { replaceUrl: true });
      return;
    }
    const data = this.route.snapshot.queryParamMap.get('data');
    if (data) this.dataSelecionada.set(data);
    // Painel do Coordenador: "Ver as pendentes" abre direto na aba.
    if (this.ehCoordenador() && this.route.snapshot.queryParamMap.get('aba') === 'pendentes') this.aba.set('pendentes');

    this.carregarDia();
    if (this.ehCoordenador()) this.carregarPendentes();
  }

  onDataChange(valor: string): void {
    if (!valor) return;
    this.dataSelecionada.set(valor);
    this.carregarDia();
  }

  abrir(grupo: GrupoDoDiaDTO): void {
    this.router.navigate(['/chamada/grupo', grupo.turmaId, this.dataSelecionada()]);
  }

  abrirPendente(pendente: StatusChamadaDiaDTO): void {
    this.router.navigate(['/chamada/grupo', pendente.turmaId, pendente.data]);
  }

  irParaStatusChamadas(): void {
    this.router.navigate(['/chamada/status']);
  }

  /** "Lançada por Maria às 09:12". */
  lancadaPor(grupo: GrupoDoDiaDTO): string {
    if (!grupo.lancadaPorNome) return '';
    const hora = grupo.lancadaEm ? ` às ${grupo.lancadaEm.slice(11, 16)}` : '';
    return `${grupo.lancadaPorNome}${hora}`;
  }

  private async carregarPendentes(): Promise<void> {
    const [ano, mes, dia] = hojeISO().split('-').map(Number);
    const inicio = new Date(ano, mes - 1, dia - DIAS_PENDENTES);
    const ontem = new Date(ano, mes - 1, dia - 1);
    try {
      const status = await this.chamadaService.carregarStatus(paraISO(inicio), paraISO(ontem));
      this.pendentes.set(status.filter((s) => s.status === StatusChamada.PENDENTE));
    } catch {
      this.pendentes.set([]);
    }
  }

  private async carregarDia(): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);
    try {
      this.dia.set(await this.chamadaService.carregarDia(this.dataSelecionada()));
    } catch {
      this.erro.set('Não foi possível carregar os grupos desta data.');
    } finally {
      this.carregando.set(false);
    }
  }
}

function paraISO(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}
