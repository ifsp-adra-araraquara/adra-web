import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../../core/auth.service';
import { AulaService } from '../../../../core/aula.service';
import { ChamadaService } from '../../../../core/chamada.service';
import { DisciplinarService } from '../../../../core/disciplinar.service';
import { Role } from '../../../../shared/enum/role.enum';
import { StatusPresenca } from '../../../../shared/enum/StatusPresenca';
import { MotivoFalta, MOTIVO_FALTA_LABELS, MOTIVO_FALTA_OPTIONS } from '../../../../shared/enum/MotivoFalta';
import { SituacaoAula } from '../../../../shared/enum/SituacaoAula';
import { AulaComDetalhesResponseDTO } from '../../../../shared/models/aula/AulaComDetalhesResponseDTO';
import { SinalizacaoDisciplinarDTO } from '../../../../shared/models/disciplinar/Disciplinar';
import { calcularSituacaoAula, ehAulaDeHoje } from '../../../../shared/utils/aula.util';
import { dataBr } from '../../../../shared/utils/disciplinar.util';
import {
  DIAS_FAIXA_HISTORICO,
  aniversarioNaAula,
  LIMIAR_FALTAS_CONSECUTIVAS,
  LIMIAR_JUSTIFICADAS_CONSECUTIVAS,
  LinhaChamada,
  ROTULO_PRESENCA,
  SIGLA_PRESENCA,
  atualizarMotivoFalta,
  atualizarObservacaoFalta,
  contarFaltasConsecutivas,
  contarJustificadasConsecutivas,
  filtrarPorNome,
  marcarPresenca,
  podeCorrigirDataChamada,
  podeEditarChamada,
  proximoStatusPresenca,
  rotuloAutorizados,
  validarChamada,
} from '../../../../shared/utils/chamada.util';
import { AniversarioCards } from '../../../../shared/components/aniversario-cards/aniversario-cards';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import { Badge } from '../../../../shared/components/badge/badge';
import { Button } from '../../../../shared/components/button/button';
import { Icon } from '../../../../shared/components/icon/icon';
import { Modal } from '../../../../shared/components/modal/modal';
import { GradeMensal } from '../../../../shared/components/grade-mensal/grade-mensal';

type Aba = 'alunos' | 'grade' | 'detalhes';

/**
 * FT-06 — tela da chamada de uma aula, no modelo do app do professor da
 * Sistema Quality: abas Alunos | Detalhes, um botão por aluno que cicla
 * P → F → FJ, contadores no rodapé e "Atualizar chamada" depois de salva.
 * Todos os pontos de entrada (Chamada, Calendário, Turmas, Status das
 * chamadas, ficha do assistido, área do oficineiro) navegam para cá.
 *
 * Regras de quem edita continuam as de `chamada.util` (US-67): Coordenador
 * em qualquer data, Sociopedagógico só no dia, Oficineiro só lê.
 */
@Component({
  selector: 'app-chamada-aula',
  imports: [FormsModule, AniversarioCards, Avatar, Badge, Button, Icon, Modal, GradeMensal],
  templateUrl: './chamada-aula.html',
  styleUrl: './chamada-aula.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChamadaAula {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly auth = inject(AuthService);
  private readonly aulaService = inject(AulaService);
  private readonly chamadaService = inject(ChamadaService);
  private readonly disciplinarService = inject(DisciplinarService);

  readonly StatusPresenca = StatusPresenca;
  readonly MotivoFalta = MotivoFalta;
  readonly motivoFaltaOptions = MOTIVO_FALTA_OPTIONS;
  readonly MOTIVO_FALTA_LABELS = MOTIVO_FALTA_LABELS;
  readonly SIGLA = SIGLA_PRESENCA;
  readonly ROTULO = ROTULO_PRESENCA;
  readonly dataBr = dataBr;
  readonly rotuloAutorizados = rotuloAutorizados;

  readonly aula = signal<AulaComDetalhesResponseDTO | null>(null);
  readonly alunos = signal<LinhaChamada[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);
  readonly sucesso = signal<string | null>(null);
  readonly salvando = signal(false);
  readonly aba = signal<Aba>('alunos');
  readonly busca = signal('');
  /** "Atualizar chamada": reabre a edição de uma chamada já salva. */
  readonly atualizando = signal(false);
  private readonly sinalizacoes = signal<ReadonlyMap<number, SinalizacaoDisciplinarDTO>>(new Map());

  private readonly perfil = computed(() => this.auth.currentProfile());
  readonly situacao = computed<SituacaoAula | null>(() => {
    const aula = this.aula();
    return aula ? calcularSituacaoAula(aula.dataAula, aula.statusAula) : null;
  });
  readonly realizada = computed(() => this.situacao() === SituacaoAula.FINALIZADA);

  /** Quem tem permissão para lançar/corrigir esta aula (perfil + data). */
  readonly podeLancar = computed(() => {
    const aula = this.aula();
    const situacao = this.situacao();
    if (!aula || (situacao !== SituacaoAula.DISPONIVEL && situacao !== SituacaoAula.FINALIZADA)) return false;
    return podeEditarChamada(this.perfil()) && podeCorrigirDataChamada(this.perfil(), ehAulaDeHoje(aula.dataAula));
  });
  readonly editando = computed(() => this.podeLancar() && (!this.realizada() || this.atualizando()));

  /** Aviso no topo da lista quando ninguém pode lançar agora — e o porquê. */
  readonly aviso = computed<string | null>(() => {
    const aula = this.aula();
    if (!aula) return null;
    switch (this.situacao()) {
      case SituacaoAula.CANCELADA:
        return 'Aula cancelada — não tem chamada.';
      case SituacaoAula.PENDENTE:
        return `A chamada abre no dia da aula (${dataBr(aula.dataAula)}).`;
    }
    if (this.perfil() === Role.EDUCADOR && !ehAulaDeHoje(aula.dataAula)) {
      return 'A chamada só pode ser feita ou corrigida no dia da aula. Peça à coordenação se precisar alterar.';
    }
    if (!this.realizada() && !podeEditarChamada(this.perfil())) {
      return 'A chamada desta aula ainda não foi feita.';
    }
    return null;
  });

  readonly mostrarStatus = computed(() => this.editando() || this.realizada());

  readonly alunosVisiveis = computed(() => filtrarPorNome(this.alunos(), this.busca()));
  readonly totalPresentes = computed(() => this.contar(StatusPresenca.PRESENTE));
  readonly totalFaltas = computed(() => this.contar(StatusPresenca.FALTA));
  readonly totalJustificadas = computed(() => this.contar(StatusPresenca.FALTA_JUSTIFICADA));

  /** Mês mostrado na aba "Grade do mês" — começa no mês da aula aberta. */
  readonly mesGrade = signal('');

  readonly dataPorExtenso = computed(() => {
    const aula = this.aula();
    if (!aula) return '';
    const [ano, mes, dia] = aula.dataAula.split('-').map(Number);
    const semana = new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', { weekday: 'long' });
    return `${semana.charAt(0).toUpperCase()}${semana.slice(1)}, ${dataBr(aula.dataAula)}`;
  });

  readonly horario = computed(() => {
    const aula = this.aula();
    if (!aula?.horarioInicio) return '';
    const inicio = aula.horarioInicio.slice(0, 5);
    return aula.horarioFim ? `${inicio}–${aula.horarioFim.slice(0, 5)}` : inicio;
  });

  /* ---------- Ficha individual (toque no nome) ---------- */
  readonly fichaId = signal<number | null>(null);
  readonly fichaAberta = computed(() => this.fichaId() !== null);
  readonly fichaIndice = computed(() => this.alunosVisiveis().findIndex((a) => a.assistidoId === this.fichaId()));
  readonly fichaAluno = computed<LinhaChamada | null>(() => this.alunosVisiveis()[this.fichaIndice()] ?? null);

  constructor() {
    // Tocar num dia da grade navega para outra aula na mesma rota: o
    // componente é reaproveitado, então reage ao parâmetro em vez de ngOnInit.
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const aulaId = Number(params.get('aulaId'));
      this.aba.set('alunos');
      this.busca.set('');
      this.atualizando.set(false);
      this.sucesso.set(null);
      this.fichaId.set(null);
      if (!Number.isInteger(aulaId) || aulaId <= 0) {
        this.aula.set(null);
        this.erro.set('Aula não encontrada.');
        this.carregando.set(false);
        return;
      }
      this.aula.set(null);
      this.carregar(aulaId);
    });
  }

  private async carregar(aulaId: number): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);
    try {
      const [aula, alunos] = await Promise.all([
        firstValueFrom(this.aulaService.buscarComDetalhes(aulaId)),
        this.chamadaService.carregarRoster(aulaId),
      ]);
      this.aula.set(aula);
      this.mesGrade.set(aula.dataAula.slice(0, 7));
      // Modelo esparso: sem registro = presente. Todos começam em P.
      this.alunos.set(alunos.map((a) => (a.statusPresenca ? a : { ...a, statusPresenca: StatusPresenca.PRESENTE })));
      this.carregarSinalizacoes(aula, alunos);
    } catch {
      this.erro.set('Não foi possível carregar a aula.');
    } finally {
      this.carregando.set(false);
    }
  }

  /** Selo "Suspenso" do Sistema Disciplinar. Falhar aqui não pode travar a chamada. */
  private async carregarSinalizacoes(aula: AulaComDetalhesResponseDTO, alunos: LinhaChamada[]): Promise<void> {
    if (!podeEditarChamada(this.perfil())) return;
    try {
      const lista = await this.disciplinarService.buscarSinalizacoes(
        alunos.map((a) => a.assistidoId),
        aula.dataAula,
      );
      this.sinalizacoes.set(new Map(lista.map((s) => [s.assistidoId, s])));
    } catch {
      this.sinalizacoes.set(new Map());
    }
  }

  suspensoAte(aluno: LinhaChamada): string | null {
    return this.sinalizacoes().get(aluno.assistidoId)?.suspensoAte ?? null;
  }

  /** "Niver" da planilha: selo no dia do aniversário, data discreta quando cai no mês da aula. */
  aniversario(aluno: LinhaChamada) {
    return aniversarioNaAula(aluno.dataNascimento, this.aula()?.dataAula);
  }

  faixaHistorico(aluno: LinhaChamada) {
    // Mais antiga à esquerda, como na planilha.
    return aluno.historicoRecente.slice(0, DIAS_FAIXA_HISTORICO).reverse();
  }

  faltasSeguidas(aluno: LinhaChamada): number {
    const n = contarFaltasConsecutivas(aluno.historicoRecente);
    return n >= LIMIAR_FALTAS_CONSECUTIVAS ? n : 0;
  }

  justificadasSeguidas(aluno: LinhaChamada): number {
    const n = contarJustificadasConsecutivas(aluno.historicoRecente);
    return n >= LIMIAR_JUSTIFICADAS_CONSECUTIVAS ? n : 0;
  }

  status(aluno: LinhaChamada): StatusPresenca {
    return aluno.statusPresenca ?? StatusPresenca.PRESENTE;
  }

  classeStatus(status: StatusPresenca | null): string {
    switch (status) {
      case StatusPresenca.FALTA:
        return 'st-f';
      case StatusPresenca.FALTA_JUSTIFICADA:
        return 'st-fj';
      default:
        return 'st-p';
    }
  }

  rotuloBotao(aluno: LinhaChamada): string {
    const atual = this.status(aluno);
    return `${aluno.nomeCompleto}: ${ROTULO_PRESENCA[atual]}. Tocar para marcar ${ROTULO_PRESENCA[proximoStatusPresenca(atual)]}.`;
  }

  alternar(aluno: LinhaChamada): void {
    if (!this.editando()) return;
    this.definirStatus(aluno.assistidoId, proximoStatusPresenca(this.status(aluno)));
  }

  definirStatus(assistidoId: number, status: StatusPresenca): void {
    this.alunos.update((lista) => marcarPresenca(lista, assistidoId, status));
    this.sucesso.set(null);
  }

  mudarMotivo(assistidoId: number, motivo: MotivoFalta): void {
    this.alunos.update((lista) => atualizarMotivoFalta(lista, assistidoId, motivo));
  }

  mudarObservacao(assistidoId: number, observacao: string): void {
    this.alunos.update((lista) => atualizarObservacaoFalta(lista, assistidoId, observacao));
  }

  abrirFicha(aluno: LinhaChamada): void {
    this.fichaId.set(aluno.assistidoId);
  }

  fecharFicha(): void {
    this.fichaId.set(null);
  }

  navegarFicha(passo: number): void {
    const proximo = this.alunosVisiveis()[this.fichaIndice() + passo];
    if (proximo) this.fichaId.set(proximo.assistidoId);
  }

  iniciarAtualizacao(): void {
    this.atualizando.set(true);
    this.sucesso.set(null);
    this.aba.set('alunos');
  }

  async cancelarEdicao(): Promise<void> {
    const aula = this.aula();
    if (!aula) return;
    this.atualizando.set(false);
    this.erro.set(null);
    // Descarta o que foi marcado e volta ao que está salvo.
    await this.carregar(aula.aulaId);
  }

  async salvar(): Promise<void> {
    const aula = this.aula();
    if (!aula || this.salvando()) return;

    const erroValidacao = validarChamada(this.alunos());
    if (erroValidacao) {
      this.erro.set(erroValidacao);
      this.aba.set('alunos');
      return;
    }

    this.salvando.set(true);
    this.erro.set(null);
    try {
      const statusAula = await this.chamadaService.salvar(aula.aulaId, aula.statusAula, this.alunos());
      this.aula.set({ ...aula, statusAula });
      this.atualizando.set(false);
      this.sucesso.set('Chamada salva.');
      this.alunos.set(await this.chamadaService.carregarRoster(aula.aulaId));
    } catch {
      this.erro.set('Não foi possível salvar a chamada. Tente novamente.');
    } finally {
      this.salvando.set(false);
    }
  }

  abrirAulaDaGrade(aulaId: number): void {
    this.router.navigate(['/chamada/aula', aulaId]);
  }

  verMateriais(): void {
    const aulaId = this.aula()?.aulaId;
    if (aulaId) this.router.navigate(['/aulas', aulaId, 'completa']);
  }

  voltar(): void {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate([this.perfil() === Role.OFICINEIRO ? '/oficineiro' : '/chamada']);
    }
  }

  private contar(status: StatusPresenca): number {
    return this.alunos().filter((a) => this.status(a) === status).length;
  }
}
