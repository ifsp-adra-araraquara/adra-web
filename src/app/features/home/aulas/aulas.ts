import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth.service';
import { Role } from '../../../shared/enum/role.enum';
import { TurmaResponseDTO } from '../../../shared/models/turma/TurmaResponseDTO';
import { OficinaResponseDTO } from '../../../shared/models/oficina/OficinaResponseDTO';
import { AssistidoResponseDTO } from '../../../shared/models/assistido/AssistidoResponseDTO';
import { PaginaResponse } from '../../../shared/models/PaginaResponse';
import { AulasTurmaModal } from '../aulas-turma-modal/aulas-turma-modal';
import { Modal } from '../../../shared/components/modal/modal';
import { Badge } from '../../../shared/components/badge/badge';
import { Button } from '../../../shared/components/button/button';

/**
 * Tela "Aulas"/"Chamada" do sociopedagógico e do coordenador: lista TODAS
 * as turmas (não só as de hoje, não só as "minhas") e, por turma, dá pra
 * ver os alunos e ver as aulas - passadas e futuras, de qualquer data.
 *
 * Reaproveita o mesmo padrão da aba "Turmas" do oficineiro
 * (`AulasTurmaModal` + `app-aula-modal`), só que sem a restrição de
 * "minhas turmas": aqui é sempre a lista completa de turmas.
 *
 * - Sociopedagógico consegue abrir as aulas pra fazer a chamada (é
 *   literalmente o motivo dessa tela pra esse perfil).
 * - Coordenador só acompanha: vê as turmas, os alunos e a lista de aulas de
 *   cada turma (todo o histórico, não só hoje), mas não abre aula nenhuma.
 */
@Component({
  selector: 'app-aulas',
  standalone: true,
  imports: [AulasTurmaModal, Modal, Badge, Button],
  templateUrl: './aulas.html',
  styleUrl: './aulas.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Aulas implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly api = environment.apiUrl;

  private readonly ehSociopedagogico = computed(() => this.auth.currentProfile() === Role.SOCIO);
  /** Só sociopedagógico pode abrir uma aula pra fazer a chamada; coordenador só acompanha. */
  readonly podeAbrirAula = computed(() => this.ehSociopedagogico());

  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly turmas = signal<TurmaResponseDTO[]>([]);
  private readonly nomesOficinas = signal<Map<number, string>>(new Map());

  readonly turmaAulasSelecionada = signal<TurmaResponseDTO | null>(null);
  readonly turmaSelecionada = signal<TurmaResponseDTO | null>(null);
  readonly mostrarAlunos = signal(false);
  readonly alunos = signal<{ assistidoId: number; nomeCompleto: string }[]>([]);

  ngOnInit(): void {
    this.carregarTurmas();
  }

  nomeOficina(turma: TurmaResponseDTO): string {
    if (!turma.oficinaId) return '-';
    return this.nomesOficinas().get(turma.oficinaId) ?? '-';
  }

  private async carregarTurmas(): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);
    try {
      const [turmas, oficinas] = await Promise.all([
        firstValueFrom(this.http.get<TurmaResponseDTO[]>(`${this.api}/api/turmas`)),
        firstValueFrom(this.http.get<OficinaResponseDTO[]>(`${this.api}/api/oficinas`)),
      ]);
      this.nomesOficinas.set(new Map(oficinas.map((o) => [o.oficinaId, o.nomeOficina])));
      this.turmas.set([...turmas].sort((a, b) => a.nomeTurma.localeCompare(b.nomeTurma)));
    } catch {
      this.erro.set('Não foi possível carregar as turmas.');
    } finally {
      this.carregando.set(false);
    }
  }

  abrirAulasDaTurma(turma: TurmaResponseDTO): void {
    this.turmaAulasSelecionada.set(turma);
  }

  fecharAulasDaTurma(): void {
    this.turmaAulasSelecionada.set(null);
  }

  abrirTurma(turma: TurmaResponseDTO): void {
    this.turmaSelecionada.set(turma);
    this.mostrarAlunos.set(true);
    this.http
      .get<PaginaResponse<AssistidoResponseDTO>>(`${this.api}/api/assistidos`, {
        params: { turmaId: turma.turmaId.toString(), status: 'ATIVO', tamanho: '200' },
      })
      .subscribe({
        next: (pagina) =>
          this.alunos.set(
            pagina.conteudo.map((a) => ({ assistidoId: a.assistidoId, nomeCompleto: a.nomeCompleto })),
          ),
        error: () => this.erro.set('Não foi possível carregar os alunos da turma.'),
      });
  }

  fecharTurma(): void {
    this.mostrarAlunos.set(false);
    this.turmaSelecionada.set(null);
    this.alunos.set([]);
  }
}
