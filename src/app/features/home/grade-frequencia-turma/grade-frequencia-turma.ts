import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { GradeMensal } from '../../../shared/components/grade-mensal/grade-mensal';
import { Icon } from '../../../shared/components/icon/icon';
import { hojeISO } from '../../../shared/utils/aula.util';

/**
 * Página da grade mensal da turma (FT-06) — a mesma `<app-grade-mensal>` da
 * aba "Grade do mês" da chamada, aberta direto por turma. O mês fica na URL
 * (`?mes=yyyy-MM`) para "voltar" de uma aula cair no mesmo mês.
 */
@Component({
  selector: 'app-grade-frequencia-turma',
  imports: [GradeMensal, Icon],
  templateUrl: './grade-frequencia-turma.html',
  styleUrl: './grade-frequencia-turma.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GradeFrequenciaTurma implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  readonly turmaId = signal<number | null>(null);
  readonly mes = signal(hojeISO().slice(0, 7));
  readonly nomeTurma = signal('');

  ngOnInit(): void {
    const turmaId = Number(this.route.snapshot.paramMap.get('turmaId'));
    this.turmaId.set(Number.isInteger(turmaId) && turmaId > 0 ? turmaId : null);
    const mes = this.route.snapshot.queryParamMap.get('mes');
    if (mes && /^\d{4}-\d{2}$/.test(mes)) this.mes.set(mes);
  }

  mudarMes(mes: string): void {
    this.mes.set(mes);
    this.router.navigate([], { relativeTo: this.route, queryParams: { mes }, replaceUrl: true });
  }

  abrirAula(aulaId: number): void {
    this.router.navigate(['/chamada/aula', aulaId]);
  }

  voltar(): void {
    this.location.back();
  }
}
