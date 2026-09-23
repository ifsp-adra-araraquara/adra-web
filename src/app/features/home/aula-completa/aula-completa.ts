import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth.service';
import { AulaService } from '../../../core/aula.service';
import { Role } from '../../../shared/enum/role.enum';
import { StatusAula } from '../../../shared/enum/StatusAula';
import { StatusPresenca } from '../../../shared/enum/StatusPresenca';
import { MotivoFalta, MOTIVO_FALTA_OPTIONS } from '../../../shared/enum/MotivoFalta';
import { AulaComDetalhesResponseDTO } from '../../../shared/models/aula/AulaComDetalhesResponseDTO';
import { AulaResponseDTO } from '../../../shared/models/aula/AulaResponseDTO';
import { AssistidoResponseDTO } from '../../../shared/models/assistido/AssistidoResponseDTO';
import { PaginaResponse } from '../../../shared/models/PaginaResponse';
import { PresencaRequestDTO } from '../../../shared/models/presenca/PresencaRequestDTO';
import { PresencaResponseDTO } from '../../../shared/models/presenca/PresencaResponseDTO';
import { Button } from '../../../shared/components/button/button';

interface LinhaAluno {
  assistidoId: number;
  nomeCompleto: string;
  statusPresenca: StatusPresenca | null;
  // só usados quando statusPresenca = FALTA_JUSTIFICADA (CA-65.2)
  motivoFalta: MotivoFalta | null;
  observacao: string;
}

type AbaAulaCompleta = 'alunos' | 'materiais';

/**
 * Página "Aula completa" — aberta em outra guia a partir do botão no
 * <app-aula-modal>. Mostra os alunos em cartões (grade), reaproveitando a
 * mesma lógica de chamada do modal, e uma aba "Materiais" que por enquanto
 * é só visual (sem funcionalidade ainda).
 */
@Component({
  selector: 'app-aula-completa',
  standalone: true,
  imports: [FormsModule, Button],
  templateUrl: './aula-completa.html',
  styleUrl: './aula-completa.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AulaCompleta implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly aulaService = inject(AulaService);
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
  readonly alunos = signal<LinhaAluno[]>([]);

  private readonly perfil = computed(() => this.auth.currentProfile());
  readonly ehSociopedagogico = computed(() => this.perfil() === Role.SOCIO);

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

  private async carregarTudo(aulaId: number): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);
    try {
      const aulaBasica = await firstValueFrom(
        this.http.get<AulaResponseDTO>(`${this.api}/api/aulas/${aulaId}`),
      );
      if (!aulaBasica.turmaId) {
        throw new Error('Aula sem turma vinculada.');
      }

      const aulasDaTurma = await firstValueFrom(
        this.http.get<AulaComDetalhesResponseDTO[]>(
          `${this.api}/api/aulas/turma/${aulaBasica.turmaId}/detalhes`,
        ),
      );
      const aulaDetalhada = aulasDaTurma.find((a) => a.aulaId === aulaId) ?? null;
      if (!aulaDetalhada) {
        throw new Error('Aula não encontrada nesta turma.');
      }
      this.aula.set(aulaDetalhada);

      const [pagina, presencas] = await Promise.all([
        firstValueFrom(
          this.http.get<PaginaResponse<AssistidoResponseDTO>>(`${this.api}/api/assistidos`, {
            params: { turmaId: String(aulaBasica.turmaId), status: 'ATIVO', tamanho: '200' },
          }),
        ),
        firstValueFrom(
          this.http.get<PresencaResponseDTO[]>(`${this.api}/api/chamadas/aula/${aulaId}`),
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
              statusPresenca: presenca?.statusPresenca ?? null,
              motivoFalta: presenca?.motivoFalta ?? null,
              observacao: presenca?.observacao ?? '',
            };
          })
          .sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto)),
      );
    } catch {
      this.erro.set('Não foi possível carregar os dados desta aula.');
    } finally {
      this.carregando.set(false);
    }
  }

  marcarPresenca(aluno: LinhaAluno, status: StatusPresenca): void {
    if (!this.ehSociopedagogico()) return;
    this.alunos.set(
      this.alunos().map((a) => {
        if (a.assistidoId !== aluno.assistidoId) return a;
        // Trocar pra um status que não seja falta justificada limpa o
        // motivo/observação — não faz sentido carregar isso escondido.
        if (status !== StatusPresenca.FALTA_JUSTIFICADA) {
          return { ...a, statusPresenca: status, motivoFalta: null, observacao: '' };
        }
        return { ...a, statusPresenca: status };
      }),
    );
  }

  atualizarMotivoFalta(aluno: LinhaAluno, motivo: MotivoFalta): void {
    if (!this.ehSociopedagogico()) return;
    this.alunos.set(
      this.alunos().map((a) => (a.assistidoId === aluno.assistidoId ? { ...a, motivoFalta: motivo } : a)),
    );
  }

  atualizarObservacaoFalta(aluno: LinhaAluno, observacao: string): void {
    if (!this.ehSociopedagogico()) return;
    this.alunos.set(
      this.alunos().map((a) => (a.assistidoId === aluno.assistidoId ? { ...a, observacao } : a)),
    );
  }

  marcarTodosPresentes(): void {
    if (!this.ehSociopedagogico()) return;
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
    const aula = this.aula();
    if (!aula || this.salvando() || !this.ehSociopedagogico()) return;

    if (this.alunos().some((a) => !a.statusPresenca)) {
      this.erro.set('Marque a presença de todos os alunos antes de salvar.');
      return;
    }

    // CA-65.2, espelhando a validação do back (RegraNegocioException em
    // PresencaMapper.sincronizarFaltaJustificada) pra dar um erro claro antes
    // de bater na API.
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
    this.salvo.set(false);
    try {
      // CA-65.3: o back só aceita lançar chamada em aula com status REALIZADA
      // — e é justamente o ato de tomar a chamada que marca a aula como
      // realizada por aqui, então isso precisa acontecer ANTES do POST de
      // presenças (senão o back rejeita: aula ainda estaria PLANEJADA/
      // REMARCADA no momento do POST).
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

      this.salvo.set(true);
    } catch {
      this.erro.set('Não foi possível salvar a chamada. Tente novamente.');
    } finally {
      this.salvando.set(false);
    }
  }

  /**
   * Marca a aula como REALIZADA via PATCH /api/aulas/{id} (atualização
   * pontual de status — CA-64.4), usando AulaService.atualizarStatus em vez
   * do PUT de /api/aulas/{id}: esse PUT é @PreAuthorize hasRole('COORDENADOR')
   * e o sociopedagógico (quem faz a chamada) tomava 403 nele. O PATCH já é
   * liberado também pro sociopedagógico (ver AulaController).
   */
  private async marcarAulaComoRealizada(aula: AulaComDetalhesResponseDTO): Promise<void> {
    const atualizada = await firstValueFrom(
      this.aulaService.atualizarStatus(aula.aulaId, StatusAula.REALIZADA),
    );
    this.aula.set({ ...aula, statusAula: atualizada.statusAula });
  }
}
