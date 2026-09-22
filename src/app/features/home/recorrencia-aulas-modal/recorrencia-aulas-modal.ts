import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AulaService } from '../../../core/aula.service';
import { CriacaoAulasRequestDTO, DiaDaSemana } from '../../../shared/models/aula/CriacaoAulasRequestDTO';
import { TurmaResponseDTO } from '../../../shared/models/turma/TurmaResponseDTO';
import { Modal } from '../../../shared/components/modal/modal';
import { Select, SelectOption } from '../../../shared/components/select/select';
import { Input } from '../../../shared/components/input/input';
import { Button } from '../../../shared/components/button/button';

const OPCOES_DIA_SEMANA: { value: DiaDaSemana; label: string }[] = [
  { value: 'MONDAY', label: 'Segunda' },
  { value: 'TUESDAY', label: 'Terça' },
  { value: 'WEDNESDAY', label: 'Quarta' },
  { value: 'THURSDAY', label: 'Quinta' },
  { value: 'FRIDAY', label: 'Sexta' },
  { value: 'SATURDAY', label: 'Sábado' },
  { value: 'SUNDAY', label: 'Domingo' },
];

@Component({
  selector: 'app-recorrencia-aulas-modal',
  standalone: true,
  imports: [FormsModule, Modal, Select, Input, Button],
  templateUrl: './recorrencia-aulas-modal.html',
})
export class RecorrenciaAulasModal {
  private readonly aulaService = inject(AulaService);

  readonly aberto = input.required<boolean>();
  readonly turmas = input.required<TurmaResponseDTO[]>();
  readonly fechar = output<void>();
  readonly gerado = output<void>();

  protected readonly turmasOpcoes = computed<SelectOption<number>[]>(() =>
    this.turmas().map((t) => ({ value: t.turmaId, label: t.nomeTurma }))
  );
  protected readonly diasSemanaOpcoes = OPCOES_DIA_SEMANA;

  readonly turmaId = signal<number | null>(null);
  readonly dataInicio = signal<string>('');
  readonly dataFim = signal<string>('');
  readonly diasSelecionados = signal<DiaDaSemana[]>([]);
  readonly horarioInicio = signal<string>('');
  readonly horarioFim = signal<string>('');
  readonly titulo = signal<string>('');
  readonly descricao = signal<string>('');

  readonly gerando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly resumoGeracao = signal<string | null>(null);

  readonly formularioValido = computed(
    () =>
      !!this.turmaId() &&
      !!this.dataInicio() &&
      !!this.dataFim() &&
      this.diasSelecionados().length > 0 &&
      !!this.horarioInicio() &&
      !!this.horarioFim()
  );

  toggleDia(dia: DiaDaSemana) {
    this.diasSelecionados.update((dias) =>
      dias.includes(dia) ? dias.filter((d) => d !== dia) : [...dias, dia]
    );
  }

  fecharModal() {
    this.resetar();
    this.fechar.emit();
  }

  private resetar() {
    this.turmaId.set(null);
    this.dataInicio.set('');
    this.dataFim.set('');
    this.diasSelecionados.set([]);
    this.horarioInicio.set('');
    this.horarioFim.set('');
    this.titulo.set('');
    this.descricao.set('');
    this.erro.set(null);
    this.resumoGeracao.set(null);
  }

  gerar() {
    if (!this.formularioValido() || this.gerando()) return;

    const payload: CriacaoAulasRequestDTO = {
      turmaId: this.turmaId()!,
      dataInicio: this.dataInicio(),
      dataFim: this.dataFim(),
      diasDaSemana: this.diasSelecionados(),
      horarioInicio: this.horarioInicio(),
      horarioFim: this.horarioFim(),
      titulo: this.titulo().trim() || undefined,
      descricao: this.descricao().trim() || undefined,
    };

    this.gerando.set(true);
    this.erro.set(null);

    this.aulaService.gerarAulas(payload).subscribe({
      next: (resultado) => {
        this.gerando.set(false);
        this.resumoGeracao.set(
          `${resultado.aulasCriadas} aula(s) criada(s) · ${resultado.aulasExcecaoPuladas} pulada(s) por exceção · ${resultado.aulasDuplicadasPuladas} já existiam`
        );
        this.gerado.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.gerando.set(false);
        this.erro.set(err.error?.message ?? 'Não foi possível gerar as aulas. Tente novamente.');
      },
    });
  }
}