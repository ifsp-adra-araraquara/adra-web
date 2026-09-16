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
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth.service';
import { Role } from '../../enum/role.enum';
import { StatusAula } from '../../enum/StatusAula';
import { StatusPresenca } from '../../enum/StatusPresenca';
import { SituacaoAula } from '../../enum/SituacaoAula';
import {
  CLASSE_SITUACAO_AULA,
  ROTULO_SITUACAO_AULA,
  calcularSituacaoAula,
} from '../../utils/aula.util';
import { AulaComDetalhesResponseDTO } from '../../models/aula/AulaComDetalhesResponseDTO';
import { AulaRequestDTO } from '../../models/aula/AulaRequestDTO';
import { AulaResponseDTO } from '../../models/aula/AulaResponseDTO';
import { AssistidoResponseDTO } from '../../models/assistido/AssistidoResponseDTO';
import { PaginaResponse } from '../../models/PaginaResponse';
import { PresencaRequestDTO } from '../../models/presenca/PresencaRequestDTO';
import { PresencaResponseDTO } from '../../models/presenca/PresencaResponseDTO';

interface LinhaChamada {
  assistidoId: number;
  nomeCompleto: string;
  statusPresenca: StatusPresenca | null;
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
 */
@Component({
  selector: 'app-aula-modal',
  standalone: true,
  imports: [],
  templateUrl: './aula-modal.html',
  styleUrl: './aula-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AulaModal implements OnChanges {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly api = environment.apiUrl;

  @Input() aula: AulaComDetalhesResponseDTO | null = null;
  @Output() fechar = new EventEmitter<void>();
  /** Emitido depois que a chamada é salva com sucesso, pro pai recarregar a lista de aulas. */
  @Output() chamadaSalva = new EventEmitter<void>();

  readonly StatusPresenca = StatusPresenca;

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
  readonly rotuloSituacao = computed(() => {
    const s = this.situacao();
    return s ? ROTULO_SITUACAO_AULA[s] : '';
  });
  readonly classeSituacao = computed(() => {
    const s = this.situacao();
    return s ? CLASSE_SITUACAO_AULA[s] : '';
  });

  /** Mostra o formulário de chamada só pro sociopedagógico, e só quando a aula ainda não foi finalizada. */
  readonly mostrarFormularioChamada = computed(
    () => this.ehSociopedagogico() && !this.situacaoFinalizada(),
  );

  readonly totalPresentes = computed(
    () => this.alunos().filter((a) => a.statusPresenca === StatusPresenca.PRESENTE).length,
  );
  readonly totalFaltas = computed(
    () => this.alunos().filter((a) => a.statusPresenca === StatusPresenca.FALTA).length,
  );
  readonly totalFaltasJustificadas = computed(
    () => this.alunos().filter((a) => a.statusPresenca === StatusPresenca.FALTA_JUSTIFICADA).length,
  );

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['aula'] && this.aula) {
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
          .map((assistido) => ({
            assistidoId: assistido.assistidoId,
            nomeCompleto: assistido.nomeCompleto,
            statusPresenca: presencaPorAssistido.get(assistido.assistidoId)?.statusPresenca ?? null,
          }))
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
      this.alunos().map((a) =>
        a.assistidoId === aluno.assistidoId ? { ...a, statusPresenca: status } : a,
      ),
    );
  }

  marcarTodosPresentes(): void {
    this.alunos.set(this.alunos().map((a) => ({ ...a, statusPresenca: StatusPresenca.PRESENTE })));
  }

  async salvarChamada(): Promise<void> {
    const aula = this.aula;
    if (!aula || this.salvando()) return;

    if (this.alunos().some((a) => !a.statusPresenca)) {
      this.erro.set('Marque a presença de todos os alunos antes de salvar.');
      return;
    }

    this.salvando.set(true);
    this.erro.set(null);
    try {
      const presencas: PresencaRequestDTO[] = this.alunos().map((a) => ({
        aulaId: aula.aulaId,
        assistidoId: a.assistidoId,
        statusPresenca: a.statusPresenca!,
      }));

      await firstValueFrom(
        this.http.post<PresencaResponseDTO[]>(
          `${this.api}/api/chamadas/aula/${aula.aulaId}`,
          presencas,
        ),
      );

      await this.marcarAulaComoRealizada(aula);

      this.chamadaSalva.emit();
      this.fechar.emit();
    } catch {
      this.erro.set('Não foi possível salvar a chamada. Tente novamente.');
    } finally {
      this.salvando.set(false);
    }
  }

  /**
   * Marca a aula como REALIZADA depois da chamada salva, reenviando os
   * campos originais (o PUT de /api/aulas substitui a entidade inteira —
   * mandar só o status zeraria título, conteúdo etc.).
   */
  private async marcarAulaComoRealizada(aula: AulaComDetalhesResponseDTO): Promise<void> {
    if (!aula.turmaId) return;
    const dto: AulaRequestDTO = {
      turmaId: aula.turmaId,
      titulo: aula.titulo ?? undefined,
      descricao: aula.descricao ?? undefined,
      dataAula: aula.dataAula,
      horarioInicio: aula.horarioInicio ?? undefined,
      horarioFim: aula.horarioFim ?? undefined,
      conteudoPrevisto: aula.conteudoPrevisto ?? undefined,
      conteudoMinistrado: aula.conteudoMinistrado ?? undefined,
      objetivos: aula.objetivos ?? undefined,
      recursosNecessarios: aula.recursosNecessarios ?? undefined,
      statusAula: StatusAula.REALIZADA,
      observacoes: aula.observacoes ?? undefined,
    };
    await firstValueFrom(
      this.http.put<AulaResponseDTO>(`${this.api}/api/aulas/${aula.aulaId}`, dto),
    );
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
}
