import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth.service';
import { ChamadaService } from '../../../core/chamada.service';
import { Role } from '../../enum/role.enum';
import { StatusPresenca } from '../../enum/StatusPresenca';
import { MotivoFalta, MOTIVO_FALTA_OPTIONS } from '../../enum/MotivoFalta';
import { SituacaoAula } from '../../enum/SituacaoAula';
import { calcularSituacaoAula, ehAulaDeHoje } from '../../utils/aula.util';
import {
  DIAS_FAIXA_HISTORICO,
  LIMIAR_FALTAS_CONSECUTIVAS,
  LinhaChamada,
  atualizarMotivoFalta as atualizarMotivoFaltaUtil,
  atualizarObservacaoFalta as atualizarObservacaoFaltaUtil,
  contarFaltasConsecutivas,
  marcarPresenca as marcarPresencaUtil,
  marcarTodosPresentes as marcarTodosPresentesUtil,
  podeCorrigirDataChamada,
  podeEditarChamada as podeEditarChamadaUtil,
  validarChamada,
} from '../../utils/chamada.util';
import { AulaComDetalhesResponseDTO } from '../../models/aula/AulaComDetalhesResponseDTO';
import { AulaRequestDTO } from '../../models/aula/AulaRequestDTO';
import { AulaResponseDTO } from '../../models/aula/AulaResponseDTO';
import { Badge } from '../badge/badge';
import { Input as AppInput } from '../input/input';
import { Button as AppButton } from '../button/button';
import { Modal } from '../modal/modal';
import { RastreabilidadeTooltip } from '../rastreabilidade-tooltip/rastreabilidade-tooltip';

interface FormDefinirCampos {
  titulo: string;
  descricao: string;
  conteudoPrevisto: string;
  objetivos: string;
  recursosNecessarios: string;
  observacoes: string;
}

/**
 * Modal reutilizável de "abrir aula" — usado tanto na aba Aulas da área do
 * oficineiro quanto no modal de aulas por turma.
 *
 * Comportamento por perfil:
 * - SOCIOPEDAGOGICO: lança/corrige a chamada dos assistidos da turma, mas só
 *   no dia da aula (CA-65.3/CA-67.2) — a validação que vale mesmo é a do
 *   backend (PresencaService), isso aqui só evita a UX de erro seco.
 * - COORDENADOR: lança/corrige a chamada de qualquer data (CA-67.1).
 * - OFICINEIRO: só visualiza a lista de alunos, com um ícone para registrar
 *   ocorrência (sem ação implementada ainda).
 *
 * Só é possível abrir aulas de hoje ou passadas (nunca pendentes/futuras
 * nem canceladas) — quem decide isso é `podeAbrirAula()`, em
 * `shared/utils/aula.util.ts`; o componente pai é responsável por só
 * atribuir `aula` quando a abertura for permitida.
 *
 * Se a aula ainda não tem título (fluxo de "criar turma sem título e
 * descrição" — o coordenador optou por deixar o oficineiro decidir), a
 * primeira coisa que aparece ao abrir é um formulário pedindo pra definir
 * pelo menos o título antes de continuar pro resto da modal.
 */
@Component({
  selector: 'app-aula-modal',
  imports: [FormsModule, Badge, AppInput, AppButton, Modal, RastreabilidadeTooltip],
  templateUrl: './aula-modal.html',
  styleUrl: './aula-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AulaModal implements OnChanges {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly chamadaService = inject(ChamadaService);
  private readonly router = inject(Router);
  private readonly api = environment.apiUrl;

  @Input() aula: AulaComDetalhesResponseDTO | null = null;
  @Output() fechar = new EventEmitter<void>();
  /** Emitido depois que a chamada é salva ou os campos da aula são definidos, pro pai recarregar a lista de aulas. */
  @Output() chamadaSalva = new EventEmitter<void>();

  readonly StatusPresenca = StatusPresenca;
  readonly MotivoFalta = MotivoFalta;
  readonly motivoFaltaOptions = MOTIVO_FALTA_OPTIONS;

  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly salvando = signal(false);
  readonly alunos = signal<LinhaChamada[]>([]);

  private readonly perfil = computed(() => this.auth.currentProfile());
  readonly ehOficineiroOuCoordenador = computed(
    () => this.perfil() === Role.OFICINEIRO || this.perfil() === Role.COORD,
  );

  /** US-67: quem tem acesso à edição/correção de chamada (lançar ou corrigir). */
  private readonly podeEditarChamada = computed(() => podeEditarChamadaUtil(this.perfil()));

  readonly situacao = computed<SituacaoAula | null>(() =>
    this.aula ? calcularSituacaoAula(this.aula.dataAula, this.aula.statusAula) : null,
  );
  readonly situacaoFinalizada = computed(() => this.situacao() === SituacaoAula.FINALIZADA);

  /**
   * Trava de edição pra chamada já finalizada: precisa de um clique
   * explícito em "Alterar chamada" pra reabrir os campos de edição.
   * Reseta toda vez que uma aula diferente é aberta (ver ngOnChanges).
   */
  readonly desbloquearEdicaoChamada = signal(false);

  /**
   * CA-65.3/US-67: sociopedagógico só realiza/corrige a chamada no dia da
   * aula; coordenador corrige chamada de qualquer data. A tela "Chamada" já
   * nem deixa o sociopedagógico abrir aula de outro dia, isso aqui é defesa
   * em profundidade (ex.: acesso direto pela "Aula completa") — a validação
   * que vale de verdade é sempre a do backend (PresencaService).
   */
  private readonly aulaEhHoje = computed(() => (this.aula ? ehAulaDeHoje(this.aula.dataAula) : false));
  private readonly podeCorrigirData = computed(() => podeCorrigirDataChamada(this.perfil(), this.aulaEhHoje()));

  /** Mostra o formulário de chamada pra quem edita e pode corrigir a data desta aula — direto se ainda não foi finalizada, ou depois de desbloquear. */
  readonly mostrarFormularioChamada = computed(
    () =>
      this.podeEditarChamada() &&
      this.podeCorrigirData() &&
      (!this.situacaoFinalizada() || this.desbloquearEdicaoChamada()),
  );

  /** Aviso "essa chamada já foi feita", antes de liberar a edição. */
  readonly mostrarAvisoChamadaFeita = computed(
    () =>
      this.podeEditarChamada() &&
      this.podeCorrigirData() &&
      this.situacaoFinalizada() &&
      !this.desbloquearEdicaoChamada(),
  );

  /** Aviso pro sociopedagógico quando a aula não é de hoje (não dá pra realizar/corrigir a chamada) — nunca dispara pro coordenador. */
  readonly mostrarAvisoForaDoDia = computed(() => this.podeEditarChamada() && !this.podeCorrigirData());

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

  readonly limiarFaltasConsecutivas = LIMIAR_FALTAS_CONSECUTIVAS;
  readonly diasFaixaHistorico = DIAS_FAIXA_HISTORICO;

  /** Iniciais pro avatar do aluno (mesmo padrão de `sidebar.ts`, até 2 letras). */
  iniciaisAluno(nomeCompleto: string): string {
    return nomeCompleto
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('');
  }

  /** Faltas seguidas mais recentes do aluno — deriva de `historicoRecente`, já vindo no mesmo request do roster. */
  faltasConsecutivasDe(aluno: LinhaChamada): number {
    return contarFaltasConsecutivas(aluno.historicoRecente);
  }

  /** Os últimos `diasFaixaHistorico` dias, mais recente primeiro — pra faixa de bolinhas no roster. */
  faixaHistoricoDe(aluno: LinhaChamada) {
    return aluno.historicoRecente.slice(0, this.diasFaixaHistorico);
  }

  /** Rótulo do botão de salvar: distingue "lançar pela primeira vez" de "corrigir uma já feita". */
  readonly textoBotaoSalvar = computed(() =>
    this.situacaoFinalizada() ? 'Salvar alterações' : 'Salvar chamada',
  );

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['aula'] && this.aula) {
      const semTitulo = !this.aula.titulo || !this.aula.titulo.trim();
      this.mostrarDefinirCampos.set(semTitulo);
      this.erroDefinirCampos.set(null);
      this.desbloquearEdicaoChamada.set(false);

      this.formDefinirCampos = {
        titulo: this.aula.titulo ?? '',
        descricao: this.aula.descricao ?? '',
        conteudoPrevisto: this.aula.conteudoPrevisto ?? '',
        objetivos: this.aula.objetivos ?? '',
        recursosNecessarios: this.aula.recursosNecessarios ?? '',
        observacoes: this.aula.observacoes ?? '',
      };

      this.carregarDados();
    }
  }

  private async carregarDados(): Promise<void> {
    const aula = this.aula;
    if (!aula || !aula.turmaId) return;
    this.carregando.set(true);
    this.erro.set(null);
    try {
      this.alunos.set(await this.chamadaService.carregarRoster(aula.aulaId));
    } catch {
      this.erro.set('Não foi possível carregar os alunos desta aula.');
    } finally {
      this.carregando.set(false);
    }
  }

  marcarPresenca(aluno: LinhaChamada, status: StatusPresenca): void {
    this.alunos.set(marcarPresencaUtil(this.alunos(), aluno.assistidoId, status));
  }

  atualizarMotivoFalta(aluno: LinhaChamada, motivo: MotivoFalta): void {
    this.alunos.set(atualizarMotivoFaltaUtil(this.alunos(), aluno.assistidoId, motivo));
  }

  atualizarObservacaoFalta(aluno: LinhaChamada, observacao: string): void {
    this.alunos.set(atualizarObservacaoFaltaUtil(this.alunos(), aluno.assistidoId, observacao));
  }

  marcarTodosPresentes(): void {
    this.alunos.set(marcarTodosPresentesUtil(this.alunos()));
  }

  async salvarChamada(): Promise<void> {
    const aula = this.aula;
    if (!aula || this.salvando()) return;

    const erroValidacao = validarChamada(this.alunos());
    if (erroValidacao) {
      this.erro.set(erroValidacao);
      return;
    }

    this.salvando.set(true);
    this.erro.set(null);
    try {
      const statusAula = await this.chamadaService.salvar(aula.aulaId, aula.statusAula, this.alunos());
      this.aula = { ...aula, statusAula };

      this.chamadaSalva.emit();
      this.fechar.emit();
    } catch {
      this.erro.set('Não foi possível salvar a chamada. Tente novamente.');
    } finally {
      this.salvando.set(false);
    }
  }

  /**
   * Ícone de ocorrência (oficineiro/coordenador) — só a UI por enquanto,
   * sem fluxo de registro ainda.
   */
  registrarOcorrencia(_aluno: LinhaChamada): void {
    // TODO: abrir o fluxo de registro de ocorrência quando ele existir.
  }

  fecharModal(): void {
    this.fechar.emit();
  }

  /**
   * Navega para a página "Aula completa" (alunos em grade de cartões + aba
   * de materiais, ainda não funcional) dentro do próprio SPA — abrir em nova
   * guia (window.open) quebrava o fluxo e perdia o histórico do navegador,
   * especialmente ruim em mobile.
   */
  abrirAulaCompleta(): void {
    if (!this.aula) return;
    const aulaId = this.aula.aulaId;
    this.fecharModal();
    this.router.navigate(['/aulas', aulaId, 'completa']);
  }

  /**
   * "Ver grade da turma" — tela separada (dias x alunos, estilo planilha),
   * carregada só quando a pessoa pede, pra não pesar o fluxo rápido de
   * marcar presença. Fecha este modal antes de navegar (mesmo padrão de
   * `abrirAulaCompleta`, evita empilhar overlay).
   */
  verGradeTurma(): void {
    if (!this.aula?.turmaId) return;
    const turmaId = this.aula.turmaId;
    this.fecharModal();
    this.router.navigate(['/chamada/turma', turmaId, 'grade']);
  }

  /* ============================================================
   * DEFINIR TÍTULO/DESCRIÇÃO NA PRIMEIRA ABERTURA
   * Aparece quando a aula foi criada sem título (fluxo "sem título e
   * descrição" do modal de nova turma) - só o título é obrigatório aqui,
   * o resto continua opcional.
   * ============================================================ */
  mostrarDefinirCampos = signal(false);
  salvandoDefinirCampos = signal(false);
  erroDefinirCampos = signal<string | null>(null);

  formDefinirCampos: FormDefinirCampos = {
    titulo: '',
    descricao: '',
    conteudoPrevisto: '',
    objetivos: '',
    recursosNecessarios: '',
    observacoes: '',
  };

  async salvarDefinirCampos(): Promise<void> {
    const aula = this.aula;
    if (!aula || !aula.turmaId || this.salvandoDefinirCampos()) return;

    if (!this.formDefinirCampos.titulo.trim()) {
      this.erroDefinirCampos.set('Informe o título da aula.');
      return;
    }

    this.salvandoDefinirCampos.set(true);
    this.erroDefinirCampos.set(null);

    const form = this.formDefinirCampos;
    const dto: AulaRequestDTO = {
      turmaId: aula.turmaId,
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || undefined,
      dataAula: aula.dataAula,
      horarioInicio: aula.horarioInicio ?? undefined,
      horarioFim: aula.horarioFim ?? undefined,
      conteudoPrevisto: form.conteudoPrevisto.trim() || undefined,
      conteudoMinistrado: aula.conteudoMinistrado ?? undefined,
      objetivos: form.objetivos.trim() || undefined,
      recursosNecessarios: form.recursosNecessarios.trim() || undefined,
      statusAula: aula.statusAula,
      observacoes: form.observacoes.trim() || undefined,
    };

    try {
      const atualizada = await firstValueFrom(
        this.http.put<AulaResponseDTO>(`${this.api}/api/aulas/${aula.aulaId}`, dto),
      );

      this.aula = {
        ...aula,
        titulo: atualizada.titulo,
        descricao: atualizada.descricao,
        conteudoPrevisto: atualizada.conteudoPrevisto,
        objetivos: atualizada.objetivos,
        recursosNecessarios: atualizada.recursosNecessarios,
        observacoes: atualizada.observacoes,
      };

      this.mostrarDefinirCampos.set(false);
      this.salvandoDefinirCampos.set(false);
      this.chamadaSalva.emit();
    } catch (erroSalvar) {
      console.error('Erro ao salvar os dados da aula:', erroSalvar);
      this.erroDefinirCampos.set('Não foi possível salvar. Tente novamente.');
      this.salvandoDefinirCampos.set(false);
    }
  }
}
