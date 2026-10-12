import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth.service';
import { AulaService } from '../../../core/aula.service';
import { ChamadaService } from '../../../core/chamada.service';
import { StatusPresenca } from '../../../shared/enum/StatusPresenca';
import { MotivoFalta, MOTIVO_FALTA_OPTIONS } from '../../../shared/enum/MotivoFalta';
import { SituacaoAula } from '../../../shared/enum/SituacaoAula';
import { calcularSituacaoAula, ehAulaDeHoje } from '../../../shared/utils/aula.util';
import {
  LinhaChamada,
  atualizarMotivoFalta as atualizarMotivoFaltaUtil,
  atualizarObservacaoFalta as atualizarObservacaoFaltaUtil,
  marcarPresenca as marcarPresencaUtil,
  marcarTodosPresentes as marcarTodosPresentesUtil,
  podeCorrigirDataChamada,
  podeEditarChamada as podeEditarChamadaUtil,
  validarChamada,
} from '../../../shared/utils/chamada.util';
import { AulaComDetalhesResponseDTO } from '../../../shared/models/aula/AulaComDetalhesResponseDTO';
import { AulaResponseDTO } from '../../../shared/models/aula/AulaResponseDTO';
import { Button } from '../../../shared/components/button/button';
import { RastreabilidadeTooltip } from '../../../shared/components/rastreabilidade-tooltip/rastreabilidade-tooltip';
import { Icon } from '../../../shared/components/icon/icon';

type AbaAulaCompleta = 'alunos' | 'materiais';

/**
 * Página "Aula completa" — aberta a partir do botão no <app-aula-modal>.
 * Mostra os alunos em cartões (grade) em vez da lista do modal, mas reusa a
 * mesma lógica de chamada (ChamadaService/chamada.util) — ver os comentários
 * lá pra entender por que isso importa: antes desta página buscar o roster
 * via /api/assistidos (filtrando por status ATUAL) em vez da fonte única
 * /api/chamadas/aula/{id}, aulas antigas sumiam com alunos que foram
 * desligados depois (mesmo bug que CA-70.2 já tinha corrigido no modal). E
 * só Sociopedagógico conseguia salvar aqui — Coordenador (que também pode)
 * ficava travado por engano.
 */
@Component({
  selector: 'app-aula-completa',
  standalone: true,
  imports: [Icon, FormsModule, Button, RastreabilidadeTooltip],
  templateUrl: './aula-completa.html',
  styleUrl: './aula-completa.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AulaCompleta implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly aulaService = inject(AulaService);
  private readonly chamadaService = inject(ChamadaService);
  private readonly location = inject(Location);
  private readonly api = environment.apiUrl;

  readonly StatusPresenca = StatusPresenca;
  readonly MotivoFalta = MotivoFalta;
  readonly motivoFaltaOptions = MOTIVO_FALTA_OPTIONS;

  readonly aba = signal<AbaAulaCompleta>('alunos');
  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);
  readonly salvando = signal(false);
  readonly salvo = signal(false);
  readonly aula = signal<AulaComDetalhesResponseDTO | null>(null);
  readonly alunos = signal<LinhaChamada[]>([]);

  private readonly perfil = computed(() => this.auth.currentProfile());

  /** US-67: quem tem acesso à edição/correção de chamada (lançar ou corrigir) — mesma regra do <app-aula-modal>. */
  readonly podeEditarChamada = computed(() => podeEditarChamadaUtil(this.perfil()));

  readonly situacao = computed<SituacaoAula | null>(() => {
    const aula = this.aula();
    return aula ? calcularSituacaoAula(aula.dataAula, aula.statusAula) : null;
  });
  readonly situacaoFinalizada = computed(() => this.situacao() === SituacaoAula.FINALIZADA);

  /**
   * CA-65.3/US-67: sociopedagógico só realiza/corrige a chamada no dia da
   * aula; coordenador corrige chamada de qualquer data — mesma regra do
   * <app-aula-modal> (ver chamada.util.podeCorrigirDataChamada).
   */
  private readonly aulaEhHoje = computed(() => {
    const aula = this.aula();
    return aula ? ehAulaDeHoje(aula.dataAula) : false;
  });
  private readonly podeCorrigirData = computed(() =>
    podeCorrigirDataChamada(this.perfil(), this.aulaEhHoje()),
  );
  readonly mostrarAvisoForaDoDia = computed(() => this.podeEditarChamada() && !this.podeCorrigirData());

  /** Trava de edição pra chamada já finalizada — mesma lógica do <app-aula-modal>. */
  readonly desbloquearEdicaoChamada = signal(false);
  readonly mostrarAvisoChamadaFeita = computed(
    () =>
      this.podeEditarChamada() &&
      this.podeCorrigirData() &&
      this.situacaoFinalizada() &&
      !this.desbloquearEdicaoChamada(),
  );
  readonly textoBotaoSalvar = computed(() =>
    this.situacaoFinalizada() ? 'Salvar alterações' : 'Salvar chamada',
  );

  /** Controles de presença ficam travados nesses casos — mesma combinação em todo método de edição. */
  private readonly edicaoBloqueada = computed(
    () => !this.podeEditarChamada() || this.mostrarAvisoChamadaFeita() || this.mostrarAvisoForaDoDia(),
  );

  desbloquearEdicao(): void {
    this.desbloquearEdicaoChamada.set(true);
  }

  readonly totalPresentes = computed(
    () => this.alunos().filter((a) => a.statusPresenca === StatusPresenca.PRESENTE).length,
  );
  readonly totalFaltas = computed(
    () => this.alunos().filter((a) => a.statusPresenca === StatusPresenca.FALTA).length,
  );
  readonly totalFaltasJustificadas = computed(
    () => this.alunos().filter((a) => a.statusPresenca === StatusPresenca.FALTA_JUSTIFICADA).length,
  );

  ngOnInit(): void {
    const aulaId = Number(this.route.snapshot.paramMap.get('aulaId'));
    if (!aulaId) {
      this.erro.set('Aula não encontrada.');
      this.carregando.set(false);
      return;
    }
    this.carregarTudo(aulaId);
  }

  selecionarAba(aba: AbaAulaCompleta): void {
    this.aba.set(aba);
  }

  voltar(): void {
    this.location.back();
  }

  /**
   * Busca a aula (via /api/aulas/{id} pro básico, depois estreita a busca
   * de detalhes ao dia certo da turma em vez de trazer o histórico inteiro
   * dela) e o roster de presença (fonte única — ver ChamadaService).
   */
  private async carregarTudo(aulaId: number): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);
    this.desbloquearEdicaoChamada.set(false);
    try {
      const aulaBasica = await firstValueFrom(
        this.http.get<AulaResponseDTO>(`${this.api}/api/aulas/${aulaId}`),
      );
      if (!aulaBasica.turmaId) {
        throw new Error('Aula sem turma vinculada.');
      }

      const [aulasDoDia, alunos] = await Promise.all([
        firstValueFrom(
          this.aulaService.listarComDetalhes({
            turmaId: aulaBasica.turmaId,
            dataAula: aulaBasica.dataAula,
          }),
        ),
        this.chamadaService.carregarRoster(aulaId),
      ]);

      const aulaDetalhada = aulasDoDia.find((a) => a.aulaId === aulaId) ?? null;
      if (!aulaDetalhada) {
        throw new Error('Aula não encontrada nesta turma.');
      }

      this.aula.set(aulaDetalhada);
      this.alunos.set(alunos);
    } catch {
      this.erro.set('Não foi possível carregar os dados desta aula.');
    } finally {
      this.carregando.set(false);
    }
  }

  marcarPresenca(aluno: LinhaChamada, status: StatusPresenca): void {
    if (this.edicaoBloqueada()) return;
    this.alunos.set(marcarPresencaUtil(this.alunos(), aluno.assistidoId, status));
  }

  atualizarMotivoFalta(aluno: LinhaChamada, motivo: MotivoFalta): void {
    if (this.edicaoBloqueada()) return;
    this.alunos.set(atualizarMotivoFaltaUtil(this.alunos(), aluno.assistidoId, motivo));
  }

  atualizarObservacaoFalta(aluno: LinhaChamada, observacao: string): void {
    if (this.edicaoBloqueada()) return;
    this.alunos.set(atualizarObservacaoFaltaUtil(this.alunos(), aluno.assistidoId, observacao));
  }

  marcarTodosPresentes(): void {
    if (this.edicaoBloqueada()) return;
    this.alunos.set(marcarTodosPresentesUtil(this.alunos()));
  }

  async salvarChamada(): Promise<void> {
    const aula = this.aula();
    if (!aula || this.salvando() || this.edicaoBloqueada()) return;

    const erroValidacao = validarChamada(this.alunos());
    if (erroValidacao) {
      this.erro.set(erroValidacao);
      return;
    }

    this.salvando.set(true);
    this.erro.set(null);
    this.salvo.set(false);
    try {
      const statusAula = await this.chamadaService.salvar(aula.aulaId, aula.statusAula, this.alunos());
      this.aula.set({ ...aula, statusAula });
      this.salvo.set(true);
    } catch {
      this.erro.set('Não foi possível salvar a chamada. Tente novamente.');
    } finally {
      this.salvando.set(false);
    }
  }
}
