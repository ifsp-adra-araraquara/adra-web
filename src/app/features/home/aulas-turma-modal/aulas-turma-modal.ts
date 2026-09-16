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
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AulaResponseDTO } from '../../../shared/models/aula/AulaResponseDTO';

@Component({
  selector: 'app-aulas-turma-modal',
  standalone: true,
  imports: [],
  templateUrl: './aulas-turma-modal.html',
  styleUrl: './aulas-turma-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AulasTurmaModal implements OnChanges {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  @Input({ required: true }) turmaId!: number;
  @Input() nomeTurma = '';
  @Input() aberto = false;

  @Output() fechar = new EventEmitter<void>();

  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly aulas = signal<AulaResponseDTO[]>([]);

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
        this.http.get<AulaResponseDTO[]>(`${this.api}/api/aulas/turma/${this.turmaId}`),
      );
      this.aulas.set([...aulas].sort((a, b) => b.dataAula.localeCompare(a.dataAula)));
    } catch {
      this.erro.set('Não foi possível carregar as aulas desta turma.');
    } finally {
      this.carregando.set(false);
    }
  }

  fecharModal(): void {
    this.fechar.emit();
  }
}
