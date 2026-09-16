import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth.service';
import { Role } from '../../../shared/enum/role.enum';
import { StatusAula } from '../../../shared/enum/StatusAula';
import { StatusPresenca } from '../../../shared/enum/StatusPresenca';
import { AulaComDetalhesResponseDTO } from '../../../shared/models/aula/AulaComDetalhesResponseDTO';
import { AulaRequestDTO } from '../../../shared/models/aula/AulaRequestDTO';
import { AulaResponseDTO } from '../../../shared/models/aula/AulaResponseDTO';
import { AssistidoResponseDTO } from '../../../shared/models/assistido/AssistidoResponseDTO';
import { PaginaResponse } from '../../../shared/models/PaginaResponse';
import { PresencaRequestDTO } from '../../../shared/models/presenca/PresencaRequestDTO';
import { PresencaResponseDTO } from '../../../shared/models/presenca/PresencaResponseDTO';

interface LinhaAluno {
  assistidoId: number;
  nomeCompleto: string;
  statusPresenca: StatusPresenca | null;
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
  imports: [],
  templateUrl: './aula-completa.html',
  styleUrl: './aula-completa.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AulaCompleta implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly api = environment.apiUrl;

  readonly StatusPresenca = StatusPresenca;

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
          .map((assistido) => ({
            assistidoId: assistido.assistidoId,
            nomeCompleto: assistido.nomeCompleto,
            statusPresenca: presencaPorAssistido.get(assistido.assistidoId)?.statusPresenca ?? null,
          }))
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
      this.alunos().map((a) =>
        a.assistidoId === aluno.assistidoId ? { ...a, statusPresenca: status } : a,
      ),
    );
  }

  marcarTodosPresentes(): void {
    if (!this.ehSociopedagogico()) return;
    this.alunos.set(this.alunos().map((a) => ({ ...a, statusPresenca: StatusPresenca.PRESENTE })));
  }

  async salvarChamada(): Promise<void> {
    const aula = this.aula();
    if (!aula || this.salvando() || !this.ehSociopedagogico()) return;

    if (this.alunos().some((a) => !a.statusPresenca)) {
      this.erro.set('Marque a presença de todos os alunos antes de salvar.');
      return;
    }

    this.salvando.set(true);
    this.erro.set(null);
    this.salvo.set(false);
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
      this.salvo.set(true);
    } catch {
      this.erro.set('Não foi possível salvar a chamada. Tente novamente.');
    } finally {
      this.salvando.set(false);
    }
  }

  /**
   * Mesma lógica do <app-aula-modal>: o PUT de /api/aulas substitui a
   * entidade inteira, então reenvia os campos originais junto do novo status.
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
    const atualizada = await firstValueFrom(
      this.http.put<AulaResponseDTO>(`${this.api}/api/aulas/${aula.aulaId}`, dto),
    );
    this.aula.set({ ...aula, statusAula: atualizada.statusAula });
  }
}
