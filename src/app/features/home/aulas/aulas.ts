import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth.service';
import { Role } from '../../../shared/enum/role.enum';
import { Turno } from '../../../shared/enum/Turno';
import { TurmaResponseDTO } from '../../../shared/models/turma/TurmaResponseDTO';
import { OficinaResponseDTO } from '../../../shared/models/oficina/OficinaResponseDTO';
import { AssistidoResponseDTO } from '../../../shared/models/assistido/AssistidoResponseDTO';
import { PaginaResponse } from '../../../shared/models/PaginaResponse';
import { AulasTurmaModal } from '../aulas-turma-modal/aulas-turma-modal';
import { Modal } from '../../../shared/components/modal/modal';
import { Badge } from '../../../shared/components/badge/badge';
import { Button } from '../../../shared/components/button/button';
import { Select, SelectOption } from '../../../shared/components/select/select';
import { Input } from '../../../shared/components/input/input';
import { CalendarioAulas } from '../../home/calendario-aulas/calendario-aulas';

type AbaAulas = 'turmas' | 'calendario';

@Component({
  selector: 'app-aulas',
  standalone: true,
  imports: [FormsModule, AulasTurmaModal, Modal, Badge, Button, Select, Input, CalendarioAulas],
  templateUrl: './aulas.html',
  styleUrl: './aulas.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Aulas implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly api = environment.apiUrl;

  private readonly ehSociopedagogico = computed(() => this.auth.currentProfile() === Role.SOCIO);
  readonly podeAbrirAula = computed(() => this.ehSociopedagogico());
  // CA-64 (recorrência + editar status): só Coordenador, decisão confirmada.
  readonly ehCoordenador = computed(() => this.auth.currentProfile() === Role.COORD);

  readonly abaAtiva = signal<AbaAulas>('turmas');

  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly turmas = signal<TurmaResponseDTO[]>([]);
  readonly oficinas = signal<OficinaResponseDTO[]>([]);
  private readonly nomesOficinas = signal<Map<number, string>>(new Map());

  readonly turmaAulasSelecionada = signal<TurmaResponseDTO | null>(null);
  readonly turmaSelecionada = signal<TurmaResponseDTO | null>(null);
  readonly mostrarAlunos = signal(false);
  readonly alunos = signal<{ assistidoId: number; nomeCompleto: string }[]>([]);

  ngOnInit(): void {
    this.carregarTurmas();
  }

  selecionarAba(aba: AbaAulas): void {
    this.abaAtiva.set(aba);
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
      this.oficinas.set(oficinas);
      this.nomesOficinas.set(new Map(oficinas.map((o) => [o.oficinaId, o.nomeOficina])));
      this.turmas.set([...turmas].sort((a, b) => a.nomeTurma.localeCompare(b.nomeTurma)));
    } catch {
      this.erro.set('Não foi possível carregar as turmas.');
    } finally {
      this.carregando.set(false);
    }
  }

  // ============================================================
  // Filtros da aba "Turmas" — mesmo padrão de busca/turno/status da tela
  // "Turmas" do coordenador, aplicados em cima da lista já carregada.
  // ============================================================

  readonly filtroTurmasNome = signal('');
  readonly filtroTurmasTurno = signal<Turno | ''>('');
  readonly filtroTurmasStatus = signal<'todas' | 'ativas' | 'inativas'>('todas');

  readonly filtroTurmasTurnoOptions: SelectOption<Turno | ''>[] = [
    { value: '', label: 'Todos os turnos' },
    { value: Turno.MANHA, label: Turno.MANHA },
    { value: Turno.TARDE, label: Turno.TARDE },
    { value: Turno.INTEGRAL, label: Turno.INTEGRAL },
  ];

  readonly filtroTurmasStatusOptions: SelectOption<'todas' | 'ativas' | 'inativas'>[] = [
    { value: 'todas', label: 'Todas' },
    { value: 'ativas', label: 'Ativas' },
    { value: 'inativas', label: 'Inativas' },
  ];

  readonly turmasFiltradas = computed(() => {
    const nome = this.filtroTurmasNome().trim().toLowerCase();
    const turno = this.filtroTurmasTurno();
    const status = this.filtroTurmasStatus();

    return this.turmas().filter((turma) => {
      if (nome && !turma.nomeTurma.toLowerCase().includes(nome)) return false;
      if (turno && turma.turno !== turno) return false;
      if (status === 'ativas' && !turma.ativo) return false;
      if (status === 'inativas' && turma.ativo) return false;
      return true;
    });
  });

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