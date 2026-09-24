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
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth.service';
import { AulaService } from '../../../core/aula.service';
import { Role } from '../../enum/role.enum';
import { StatusAula } from '../../enum/StatusAula';
import { StatusPresenca } from '../../enum/StatusPresenca';
import { MotivoFalta, MOTIVO_FALTA_OPTIONS } from '../../enum/MotivoFalta';
import { SituacaoAula } from '../../enum/SituacaoAula';
import { calcularSituacaoAula, ehAulaDeHoje } from '../../utils/aula.util';
import { AulaComDetalhesResponseDTO } from '../../models/aula/AulaComDetalhesResponseDTO';
import { AulaRequestDTO } from '../../models/aula/AulaRequestDTO';
import { AulaResponseDTO } from '../../models/aula/AulaResponseDTO';
import { AssistidoResponseDTO } from '../../models/assistido/AssistidoResponseDTO';
import { PaginaResponse } from '../../models/PaginaResponse';
import { PresencaRequestDTO } from '../../models/presenca/PresencaRequestDTO';
import { PresencaResponseDTO } from '../../models/presenca/PresencaResponseDTO';
import { Badge } from '../badge/badge';
import { Input as AppInput } from '../input/input';
import { Button as AppButton } from '../button/button';

interface LinhaChamada {
  assistidoId: number;
  nomeCompleto: string;
  statusPresenca: StatusPresenca | null;
  // só usados quando statusPresenca = FALTA_JUSTIFICADA (CA-65.2)
  motivoFalta: MotivoFalta | null;
  observacao: string;
}

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
 * - SOCIOPEDAGOGICO: faz a chamada dos assistidos da turma da aula.
 * - OFICINEIRO / COORDENADOR: só visualiza a lista de alunos, com um ícone
 *   para registrar ocorrência (sem ação implementada ainda).
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
  standalone: true,
  imports: [FormsModule, Badge, AppInput, AppButton],
  templateUrl: './aula-modal.html',
  styleUrl: './aula-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AulaModal implements OnChanges {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly aulaService = inject(AulaService);
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
  readonly ehSociopedagogico = computed(() => this.perfil() === Role.SOCIO);
  readonly ehOficineiroOuCoordenador = computed(
    () => this.perfil() === Role.OFICINEIRO || this.perfil() === Role.COORD,
  );

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
   * CA-65.3: sociopedagógico só realiza a chamada no dia da aula — a tela
   * "Chamada" já nem deixa abrir aula de outro dia pra esse perfil, isso
   * aqui é defesa em profundidade (ex.: acesso direto pela "Aula completa").
   */
  private readonly aulaEhHoje = computed(() => (this.aula ? ehAulaDeHoje(this.aula.dataAula) : false));

  /** Mostra o formulário de chamada só pro sociopedagógico, no dia da aula — direto se ainda não foi finalizada, ou depois de desbloquear. */
  readonly mostrarFormularioChamada = computed(
    () =>
      this.ehSociopedagogico() &&
      this.aulaEhHoje() &&
      (!this.situacaoFinalizada() || this.desbloquearEdicaoChamada()),
  );

  /** Aviso "essa chamada já foi feita" pro sociopedagógico, antes de liberar a edição. */
  readonly mostrarAvisoChamadaFeita = computed(
    () =>
      this.ehSociopedagogico() &&
      this.aulaEhHoje() &&
      this.situacaoFinalizada() &&
      !this.desbloquearEdicaoChamada(),
  );

  /** Aviso pro sociopedagógico quando a aula não é de hoje (não dá pra realizar/alterar a chamada). */
  readonly mostrarAvisoForaDoDia = computed(() => this.ehSociopedagogico() && !this.aulaEhHoje());

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
      const [pagina, presencas] = await Promise.all([
        firstValueFrom(
          this.http.get<PaginaResponse<AssistidoResponseDTO>>(`${this.api}/api/assistidos`, {
            params: { turmaId: String(aula.turmaId), status: 'ATIVO', tamanho: '200' },
          }),
        ),
        firstValueFrom(
          this.http.get<PresencaResponseDTO[]>(`${this.api}/api/chamadas/aula/${aula.aulaId}`),
        ),
      ]);

      const presencaPorAssistido = new Map(presencas.map((p) => [p.assistidoId, p]));

      this.alunos.set(
        pagina.conteudo
          .map((assistido) => {
            const presenca = presencaPorAssistido.get(assistido.assistidoId);
            return {
              assistidoId: assistido.assistidoId,
              nomeCompleto: assistido.nomeCompleto,
              // Chamada nova (sem presença lançada ainda) já começa com todos
              // presentes — o sociopedagógico só precisa mexer em quem faltou.
              statusPresenca: presenca?.statusPresenca ?? StatusPresenca.PRESENTE,
              motivoFalta: presenca?.motivoFalta ?? null,
              observacao: presenca?.observacao ?? '',
            };
          })
          .sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto)),
      );
    } catch {
      this.erro.set('Não foi possível carregar os alunos desta aula.');
    } finally {
      this.carregando.set(false);
    }
  }

  marcarPresenca(aluno: LinhaChamada, status: StatusPresenca): void {
    this.alunos.set(
      this.alunos().map((a) => {
        if (a.assistidoId !== aluno.assistidoId) return a;
        if (status !== StatusPresenca.FALTA_JUSTIFICADA) {
          return { ...a, statusPresenca: status, motivoFalta: null, observacao: '' };
        }
        return { ...a, statusPresenca: status };
      }),
    );
  }

  atualizarMotivoFalta(aluno: LinhaChamada, motivo: MotivoFalta): void {
    this.alunos.set(
      this.alunos().map((a) => (a.assistidoId === aluno.assistidoId ? { ...a, motivoFalta: motivo } : a)),
    );
  }

  atualizarObservacaoFalta(aluno: LinhaChamada, observacao: string): void {
    this.alunos.set(
      this.alunos().map((a) => (a.assistidoId === aluno.assistidoId ? { ...a, observacao } : a)),
    );
  }

  marcarTodosPresentes(): void {
    this.alunos.set(
      this.alunos().map((a) => ({
        ...a,
        statusPresenca: StatusPresenca.PRESENTE,
        motivoFalta: null,
        observacao: '',
      })),
    );
  }

  async salvarChamada(): Promise<void> {
    const aula = this.aula;
    if (!aula || this.salvando()) return;

    if (this.alunos().some((a) => !a.statusPresenca)) {
      this.erro.set('Marque a presença de todos os alunos antes de salvar.');
      return;
    }

    // CA-65.2, espelhando a validação do back.
    const faltaJustificadaSemMotivo = this.alunos().find(
      (a) => a.statusPresenca === StatusPresenca.FALTA_JUSTIFICADA && !a.motivoFalta,
    );
    if (faltaJustificadaSemMotivo) {
      this.erro.set(`Informe o motivo da falta justificada de ${faltaJustificadaSemMotivo.nomeCompleto}.`);
      return;
    }
    const faltaJustificadaOutroSemObservacao = this.alunos().find(
      (a) =>
        a.statusPresenca === StatusPresenca.FALTA_JUSTIFICADA &&
        a.motivoFalta === MotivoFalta.OUTRO &&
        !a.observacao?.trim(),
    );
    if (faltaJustificadaOutroSemObservacao) {
      this.erro.set(
        `Motivo "Outro" exige observação — preencha a de ${faltaJustificadaOutroSemObservacao.nomeCompleto}.`,
      );
      return;
    }

    this.salvando.set(true);
    this.erro.set(null);
    try {
      // CA-65.3: o back só aceita lançar chamada em aula REALIZADA — e é a
      // própria chamada que marca a aula como realizada, então isso precisa
      // rodar ANTES do POST de presenças (senão o back rejeita).
      if (aula.statusAula !== StatusAula.REALIZADA) {
        await this.marcarAulaComoRealizada(aula);
      }

      const presencas: PresencaRequestDTO[] = this.alunos().map((a) => ({
        aulaId: aula.aulaId,
        assistidoId: a.assistidoId,
        statusPresenca: a.statusPresenca!,
        motivoFalta: a.statusPresenca === StatusPresenca.FALTA_JUSTIFICADA ? a.motivoFalta : null,
        observacao:
          a.statusPresenca === StatusPresenca.FALTA_JUSTIFICADA && a.observacao?.trim()
            ? a.observacao.trim()
            : null,
      }));

      await firstValueFrom(
        this.http.post<PresencaResponseDTO[]>(
          `${this.api}/api/chamadas/aula/${aula.aulaId}`,
          presencas,
        ),
      );

      this.chamadaSalva.emit();
      this.fechar.emit();
    } catch {
      this.erro.set('Não foi possível salvar a chamada. Tente novamente.');
    } finally {
      this.salvando.set(false);
    }
  }

  /**
   * Marca a aula como REALIZADA depois da chamada salva, via PATCH
   * /api/aulas/{id} (atualização pontual de status — CA-64.4). Usa
   * AulaService.atualizarStatus em vez do PUT de /api/aulas/{id} porque
   * esse PUT é @PreAuthorize hasRole('COORDENADOR') — o sociopedagógico
   * (quem faz a chamada) tomava 403 aqui. O PATCH já é liberado também
   * pro sociopedagógico (ver AulaController).
   */
  private async marcarAulaComoRealizada(aula: AulaComDetalhesResponseDTO): Promise<void> {
    const atualizada = await firstValueFrom(
      this.aulaService.atualizarStatus(aula.aulaId, StatusAula.REALIZADA),
    );
    this.aula = { ...aula, statusAula: atualizada.statusAula };
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
   * Abre a página "Aula completa" (alunos em grade de cartões + aba de
   * materiais, ainda não funcional) em outra guia do navegador.
   */
  abrirAulaCompleta(): void {
    if (!this.aula) return;
    const url = `${window.location.origin}/aulas/${this.aula.aulaId}/completa`;
    window.open(url, '_blank', 'noopener');
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
