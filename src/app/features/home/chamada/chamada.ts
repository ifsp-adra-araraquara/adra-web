import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth.service';
import { Role } from '../../../shared/enum/role.enum';
import { AulaComDetalhesResponseDTO } from '../../../shared/models/aula/AulaComDetalhesResponseDTO';
import { AulaModal } from '../../../shared/components/aula-modal/aula-modal';
import { calcularSituacaoAula, ehAulaDeHoje, hojeISO, podeAbrirAula } from '../../../shared/utils/aula.util';
import { podeCorrigirDataChamada } from '../../../shared/utils/chamada.util';
import { SituacaoAula } from '../../../shared/enum/SituacaoAula';
import { BadgeVariant } from '../../../shared/utils/badge-status.util';
import { Badge } from '../../../shared/components/badge/badge';
import { Input } from '../../../shared/components/input/input';
import { Button } from '../../../shared/components/button/button';
import { Icon } from '../../../shared/components/icon/icon';

/**
 * Tela "Chamada" do sociopedagogico (também acessível ao coordenador):
 * mostra, por padrao, as aulas de hoje (de todas as turmas). O filtro de
 * data pra trocar o dia e encontrar aulas passadas/futuras só aparece pro
 * coordenador (CA-65.3) — o sociopedagogico fica travado em hoje, tanto no
 * filtro (escondido) quanto em `podeAbrir` (defesa em profundidade caso a
 * lista traga alguma aula de outro dia).
 * Reaproveita o mesmo <app-aula-modal> das outras telas de aula — pro
 * sociopedagogico, clicar numa aula abre a chamada.
 *
 * Não confundir com a tela "Aulas" (`features/home/aulas`): aquela é o
 * painel de acompanhamento do coordenador (turmas → aulas → alunos, sem
 * abrir aula); esta aqui é o fluxo do dia a dia pra efetivamente tomar
 * chamada.
 */
@Component({
  selector: 'app-chamada',
  standalone: true,
  imports: [Icon, FormsModule, AulaModal, Badge, Input, Button],
  templateUrl: './chamada.html',
  styleUrl: './chamada.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Chamada implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly api = environment.apiUrl;

  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly aulas = signal<AulaComDetalhesResponseDTO[]>([]);
  readonly dataSelecionada = signal<string>(hojeISO());
  readonly aulaAberta = signal<AulaComDetalhesResponseDTO | null>(null);

  readonly hojeISO = hojeISO;

  /**
   * Só o coordenador escolhe o dia da chamada (filtro de data liberado);
   * o sociopedagógico só realiza a chamada do dia — a tela fica travada em
   * hoje pra esse perfil (ver template e `podeAbrir`/`ngOnInit`).
   */
  private readonly perfil = computed(() => this.auth.currentProfile());
  readonly ehCoordenador = computed(() => this.perfil() === Role.COORD);

  /**
   * US-71 (CA-71.4): o painel de status das chamadas chega aqui com
   * `?data=YYYY-MM-DD&aulaId=N` — a tela já abre naquele dia e com a
   * chamada da aula aberta. A data só é aceita pro coordenador; pro
   * sociopedagógico continua valendo a trava em hoje.
   */
  private aulaIdParaAbrir: number | null = null;

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const dataParam = params.get('data');
    const aulaIdParam = Number(params.get('aulaId'));
    if (this.ehCoordenador() && dataParam) {
      this.dataSelecionada.set(dataParam);
    }
    if (Number.isInteger(aulaIdParam) && aulaIdParam > 0) {
      this.aulaIdParaAbrir = aulaIdParam;
    }

    if (!this.ehCoordenador() && this.dataSelecionada() !== hojeISO()) {
      this.dataSelecionada.set(hojeISO());
    }
    this.carregarAulas();
  }

  irParaStatusChamadas(): void {
    this.router.navigate(['/chamada/status']);
  }

  voltar(): void {
    this.location.back();
  }

  onDataChange(valor: string): void {
    if (!valor || !this.ehCoordenador()) return;
    this.dataSelecionada.set(valor);
    this.carregarAulas();
  }

  irParaHoje(): void {
    this.onDataChange(hojeISO());
  }

  abrirAula(aula: AulaComDetalhesResponseDTO): void {
    if (!this.podeAbrir(aula)) return;
    this.aulaAberta.set(aula);
  }

  fecharAulaModal(): void {
    this.aulaAberta.set(null);
  }

  aoSalvarChamada(): void {
    this.carregarAulas();
  }

  podeAbrir(aula: AulaComDetalhesResponseDTO): boolean {
    if (!podeAbrirAula(aula.dataAula, aula.statusAula)) return false;
    // CA-65.3: mesma regra de `chamada.util.podeCorrigirDataChamada` (não
    // reimplementada aqui) — sociopedagógico só realiza a chamada do dia;
    // aulas passadas ficam fora do alcance dele, coordenador abre qualquer uma.
    return podeCorrigirDataChamada(this.perfil(), ehAulaDeHoje(aula.dataAula));
  }

  ehHoje(aula: AulaComDetalhesResponseDTO): boolean {
    return ehAulaDeHoje(aula.dataAula);
  }

  situacaoAula(aula: AulaComDetalhesResponseDTO) {
    return calcularSituacaoAula(aula.dataAula, aula.statusAula);
  }

  /**
   * Nesta tela, "Disponível" (aula de hoje/passada sem chamada lançada) vira
   * um rótulo de ação direto — só aqui, via override de `app-badge`
   * ([variant]/[label] em vez de [status]), sem tocar no mapa global de
   * badges nem afetar outras telas que mostram o mesmo `SituacaoAula`.
   */
  rotuloAcao(aula: AulaComDetalhesResponseDTO): { variant: BadgeVariant; label: string } | null {
    if (this.situacaoAula(aula) !== SituacaoAula.DISPONIVEL) return null;
    return { variant: 'blue', label: 'Fazer chamada' };
  }

  private async carregarAulas(): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);
    try {
      const aulas = await firstValueFrom(
        this.http.get<AulaComDetalhesResponseDTO[]>(`${this.api}/api/aulas/com-detalhes`, {
          params: { dataAula: this.dataSelecionada() },
        }),
      );
      this.aulas.set(
        [...aulas].sort((a, b) => (a.horarioInicio ?? '').localeCompare(b.horarioInicio ?? '')),
      );

      if (this.aulaIdParaAbrir != null) {
        const aula = aulas.find((a) => a.aulaId === this.aulaIdParaAbrir);
        this.aulaIdParaAbrir = null;
        if (aula) this.abrirAula(aula);
      }
    } catch {
      this.erro.set('Não foi possível carregar as aulas desta data.');
    } finally {
      this.carregando.set(false);
    }
  }
}
