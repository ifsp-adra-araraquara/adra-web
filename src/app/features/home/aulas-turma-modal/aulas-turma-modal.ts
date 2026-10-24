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
import { calcularSituacaoAula, ehAulaDeHoje, podeAbrirAula } from '../../../shared/utils/aula.util';
import { Badge } from '../../../shared/components/badge/badge';
import { Modal } from '../../../shared/components/modal/modal';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-aulas-turma-modal',
  imports: [Badge, Modal],
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
      this.aulas.set([...aulas].sort((a, b) => b.dataAula.localeCompare(a.dataAula) || (a.horarioInicio ?? '').localeCompare(b.horarioInicio ?? '')));
    } catch {
      this.erro.set('Não foi possível carregar as aulas desta turma.');
    } finally {
      this.carregando.set(false);
    }
  }

  /** FT-06: todo perfil abre a mesma tela da chamada (Oficineiro em modo leitura). */
  abrirAula(aula: AulaComDetalhesResponseDTO): void {
    if (!this.permiteAbrirAula || !this.podeAbrir(aula)) return;
    this.fecharModal();
    this.router.navigate(['/chamada/aula', aula.aulaId]);
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
