import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AulaComDetalhesResponseDTO } from '../../../shared/models/aula/AulaComDetalhesResponseDTO';
import { AulaModal } from '../../../shared/components/aula-modal/aula-modal';
import { calcularSituacaoAula, ehAulaDeHoje, podeAbrirAula } from '../../../shared/utils/aula.util';
import { podeEditarChamada } from '../../../shared/utils/chamada.util';
import { Badge } from '../../../shared/components/badge/badge';
import { Modal } from '../../../shared/components/modal/modal';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-aulas-turma-modal',
  imports: [AulaModal, Badge, Modal],
  templateUrl: './aulas-turma-modal.html',
  styleUrl: './aulas-turma-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AulasTurmaModal implements OnChanges {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly api = environment.apiUrl;

  @Input({ required: true }) turmaId!: number;
  @Input() nomeTurma = '';
  @Input() aberto = false;
  /** Quando false, a lista de aulas fica só pra consulta - clicar numa linha não abre a aula (ex.: coordenador). */
  @Input() permiteAbrirAula = true;

  @Output() fechar = new EventEmitter<void>();

  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly aulas = signal<AulaComDetalhesResponseDTO[]>([]);
  readonly aulaAberta = signal<AulaComDetalhesResponseDTO | null>(null);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['aberto'] && this.aberto && this.turmaId) {
      this.carregarAulas();
    }
  }

  async carregarAulas(): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);
    try {
      const aulas = await firstValueFrom(
        this.http.get<AulaComDetalhesResponseDTO[]>(
          `${this.api}/api/aulas/turma/${this.turmaId}/detalhes`,
        ),
      );
      this.aulas.set([...aulas].sort((a, b) => b.dataAula.localeCompare(a.dataAula)));
    } catch {
      this.erro.set('Não foi possível carregar as aulas desta turma.');
    } finally {
      this.carregando.set(false);
    }
  }

  /**
   * Quem edita chamada (Coordenador/Sociopedagógico) navega pra `/chamada`
   * em vez de abrir `<app-aula-modal>` aninhada aqui dentro — evita duas
   * modais empilhadas e deixa a tela de chamada com a mesma cara em todo
   * ponto de entrada. Oficineiro não tem rota `/chamada` liberada e só
   * enxerga leitura mesmo, então continua com a modal aninhada de hoje.
   */
  abrirAula(aula: AulaComDetalhesResponseDTO): void {
    if (!this.permiteAbrirAula || !this.podeAbrir(aula)) return;

    if (podeEditarChamada(this.auth.currentProfile())) {
      this.fecharModal();
      this.router.navigate(['/chamada'], {
        queryParams: { data: aula.dataAula, aulaId: aula.aulaId },
      });
      return;
    }

    this.aulaAberta.set(aula);
  }

  fecharAulaModal(): void {
    this.aulaAberta.set(null);
  }

  aoSalvarChamada(): void {
    this.carregarAulas();
  }

  podeAbrir(aula: AulaComDetalhesResponseDTO): boolean {
    return this.permiteAbrirAula && podeAbrirAula(aula.dataAula, aula.statusAula);
  }

  tituloLinha(aula: AulaComDetalhesResponseDTO): string {
    if (!this.permiteAbrirAula) return 'Somente consulta';
    return this.podeAbrir(aula) ? 'Abrir aula' : 'Só é possível abrir aulas de hoje ou já passadas';
  }

  ehHoje(aula: AulaComDetalhesResponseDTO): boolean {
    return ehAulaDeHoje(aula.dataAula);
  }

  situacaoAula(aula: AulaComDetalhesResponseDTO) {
    return calcularSituacaoAula(aula.dataAula, aula.statusAula);
  }

  fecharModal(): void {
    this.fechar.emit();
  }
}
