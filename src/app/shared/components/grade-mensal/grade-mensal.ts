import { ChangeDetectionStrategy, Component, computed, effect, inject, input, model, output, signal } from '@angular/core';
import { ChamadaService } from '../../../core/chamada.service';
import { StatusPresenca } from '../../enum/StatusPresenca';
import { AlunoGradeMensalDTO, ColunaGradeDTO, GradeMensalTurmaDTO } from '../../models/presenca/GradeMensalTurmaDTO';
import { hojeISO } from '../../utils/aula.util';
import { Icon } from '../icon/icon';

const NOMES_MES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/** Célula já resolvida pro template — evita lógica de data/status no HTML. */
interface CelulaGrade {
  sigla: string;
  classe: string;
  titulo: string;
}

/**
 * Grade mensal da turma (FT-06), no formato da planilha de chamada que a
 * instituição usava: uma "folha" por mês, uma coluna por dia de aula, uma
 * linha por aluno, com passeios/feriados como colunas sem chamada e
 * desligados marcados. Só leitura — tocar no dia emite `abrirAula`.
 *
 *   <app-grade-mensal [turmaId]="12" [(mes)]="mes" [aulaAtualId]="106" (abrirAula)="ir($event)" />
 */
@Component({
  selector: 'app-grade-mensal',
  imports: [Icon],
  templateUrl: './grade-mensal.html',
  styleUrl: './grade-mensal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GradeMensal {
  private readonly chamadaService = inject(ChamadaService);
  private readonly hoje = hojeISO();

  turmaId = input.required<number>();
  /** yyyy-MM */
  mes = model(hojeISO().slice(0, 7));
  /** Aula aberta na tela da chamada — a coluna dela fica destacada. */
  aulaAtualId = input<number | null>(null);
  abrirAula = output<number>();
  /** Emitido a cada mês carregado — a página da grade usa para o título (nome da turma). */
  carregada = output<GradeMensalTurmaDTO>();

  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);
  readonly grade = signal<GradeMensalTurmaDTO | null>(null);

  readonly tituloMes = computed(() => {
    const [ano, mes] = this.mes().split('-').map(Number);
    return `${NOMES_MES[mes - 1]} ${ano}`;
  });
  readonly ehMesAtual = computed(() => this.mes() === this.hoje.slice(0, 7));

  readonly colunas = computed(() => this.grade()?.colunas ?? []);

  /** Células de cada aluno, já com sigla/cor — paralelas a `colunas`. */
  readonly linhas = computed(() =>
    (this.grade()?.alunos ?? []).map((aluno) => ({
      aluno,
      celulas: this.colunas().map((coluna, i) => this.celula(aluno, coluna, aluno.presencas[i])),
      faltas: aluno.presencas.filter((p) => p === StatusPresenca.FALTA).length,
      justificadas: aluno.presencas.filter((p) => p === StatusPresenca.FALTA_JUSTIFICADA).length,
      frequencia: this.frequencia(aluno),
      aniversarioNoMes: aluno.dataNascimento?.slice(5, 7) === this.mes().slice(5, 7),
    })),
  );

  constructor() {
    effect(() => {
      this.carregar(this.turmaId(), this.mes());
    });
  }

  mudarMes(delta: number): void {
    const [ano, mes] = this.mes().split('-').map(Number);
    const total = ano * 12 + (mes - 1) + delta;
    this.mes.set(`${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`);
  }

  irParaMesAtual(): void {
    this.mes.set(this.hoje.slice(0, 7));
  }

  diaMes(data: string): string {
    return `${Number(data.slice(8, 10))}/${Number(data.slice(5, 7))}`;
  }

  diaSemana(data: string): string {
    const [a, m, d] = data.split('-').map(Number);
    return DIAS_SEMANA[new Date(a, m - 1, d).getDay()];
  }

  ehHoje(coluna: ColunaGradeDTO): boolean {
    return coluna.data === this.hoje;
  }

  ehAtual(coluna: ColunaGradeDTO): boolean {
    return coluna.aulaId != null && coluna.aulaId === this.aulaAtualId();
  }

  /** Coluna sem chamada (passeio/evento/feriado) — vira uma faixa vertical com o rótulo. */
  ehColunaSemChamada(coluna: ColunaGradeDTO): boolean {
    return coluna.tipo === 'CANCELADA' || coluna.tipo === 'SEM_AULA';
  }

  podeAbrirColuna(coluna: ColunaGradeDTO): boolean {
    return coluna.aulaId != null && (coluna.tipo === 'AULA' || coluna.tipo === 'PENDENTE') && !this.ehAtual(coluna);
  }

  abrirColuna(coluna: ColunaGradeDTO): void {
    if (this.podeAbrirColuna(coluna)) this.abrirAula.emit(coluna.aulaId!);
  }

  rotuloCabecalho(coluna: ColunaGradeDTO): string {
    const base = `${this.diaSemana(coluna.data)} ${this.diaMes(coluna.data)}`;
    return coluna.tipo === 'PENDENTE' ? `${base} — chamada pendente, abrir` : `${base} — abrir chamada`;
  }

  private celula(aluno: AlunoGradeMensalDTO, coluna: ColunaGradeDTO, status: StatusPresenca | null): CelulaGrade {
    if (aluno.dataSaida && coluna.data > aluno.dataSaida) {
      return { sigla: '', classe: 'desligado', titulo: 'Desligado' };
    }
    switch (status) {
      case StatusPresenca.PRESENTE:
        return { sigla: 'P', classe: 'presente', titulo: 'Presente' };
      case StatusPresenca.FALTA:
        return { sigla: 'F', classe: 'falta', titulo: 'Falta' };
      case StatusPresenca.FALTA_JUSTIFICADA:
        return { sigla: 'FJ', classe: 'justificada', titulo: 'Falta justificada' };
    }
    if (coluna.tipo === 'PENDENTE') return { sigla: '', classe: 'pendente', titulo: 'Chamada pendente' };
    if (coluna.tipo === 'AULA') return { sigla: '·', classe: 'fora', titulo: 'Fora da turma nesta data' };
    return { sigla: '', classe: '', titulo: '' };
  }

  /** % de presença nas aulas com chamada em que o aluno estava na turma (FJ conta como ausência). */
  private frequencia(aluno: AlunoGradeMensalDTO): number | null {
    const comChamada = aluno.presencas.filter((p) => p != null);
    if (comChamada.length === 0) return null;
    const presentes = comChamada.filter((p) => p === StatusPresenca.PRESENTE).length;
    return Math.round((presentes / comChamada.length) * 100);
  }

  private async carregar(turmaId: number, mes: string): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);
    try {
      const grade = await this.chamadaService.carregarGradeMensal(turmaId, mes);
      if (mes !== this.mes()) return; // trocou de mês no meio do carregamento
      this.grade.set(grade);
      this.carregada.emit(grade);
    } catch {
      this.erro.set('Não foi possível carregar a grade desta turma.');
    } finally {
      this.carregando.set(false);
    }
  }
}
