import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ChamadaService } from '../../../core/chamada.service';
import { StatusPresenca } from '../../../shared/enum/StatusPresenca';
import { GradeAlunoDTO } from '../../../shared/models/presenca/GradeFrequenciaTurmaDTO';
import { Badge } from '../../../shared/components/badge/badge';
import { Icon } from '../../../shared/components/icon/icon';

/**
 * "Ver grade da turma" — estilo planilha (dias x alunos), pra análise calma
 * fora do fluxo rápido de marcar presença. Carregada só quando a pessoa pede
 * (link a partir de `AulaModal`), nunca como parte do carregamento normal da
 * chamada — ver `ChamadaService.carregarGradeTurma`.
 */
@Component({
  selector: 'app-grade-frequencia-turma',
  imports: [Icon, DatePipe, Badge],
  templateUrl: './grade-frequencia-turma.html',
  styleUrl: './grade-frequencia-turma.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GradeFrequenciaTurma implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly chamadaService = inject(ChamadaService);

  readonly StatusPresenca = StatusPresenca;

  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);
  readonly datas = signal<string[]>([]);
  readonly alunos = signal<GradeAlunoDTO[]>([]);

  ngOnInit(): void {
    const turmaId = Number(this.route.snapshot.paramMap.get('turmaId'));
    if (!turmaId) {
      this.erro.set('Turma não encontrada.');
      this.carregando.set(false);
      return;
    }
    this.carregar(turmaId);
  }

  voltar(): void {
    this.location.back();
  }

  private async carregar(turmaId: number): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);
    try {
      const grade = await this.chamadaService.carregarGradeTurma(turmaId);
      this.datas.set(grade.datas);
      this.alunos.set(grade.alunos);
    } catch {
      this.erro.set('Não foi possível carregar a grade de frequência desta turma.');
    } finally {
      this.carregando.set(false);
    }
  }
}
