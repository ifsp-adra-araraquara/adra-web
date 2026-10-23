import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { Avatar } from '../avatar/avatar';
import { Icon } from '../icon/icon';
import { LinhaChamada, aniversariantesDoDia } from '../../utils/chamada.util';

/**
 * Card "Hoje é aniversário de Fulano" na chamada — um por aniversariante,
 * cada um pode ser fechado no X (some até abrir outra aula).
 *
 *   <app-aniversario-cards [alunos]="alunos()" [dataAula]="aula.dataAula" />
 */
@Component({
  selector: 'app-aniversario-cards',
  imports: [Avatar, Icon],
  templateUrl: './aniversario-cards.html',
  styleUrl: './aniversario-cards.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AniversarioCards {
  alunos = input.required<LinhaChamada[]>();
  dataAula = input<string | null | undefined>(null);

  private readonly fechados = signal<ReadonlySet<number>>(new Set());

  protected readonly visiveis = computed(() =>
    aniversariantesDoDia(this.alunos(), this.dataAula()).filter((a) => !this.fechados().has(a.aluno.assistidoId)),
  );

  constructor() {
    // outra aula/dia: os cards voltam a aparecer
    effect(() => {
      this.dataAula();
      this.fechados.set(new Set());
    });
  }

  protected fechar(assistidoId: number): void {
    this.fechados.update((atual) => new Set(atual).add(assistidoId));
  }

  protected primeiroNome(nome: string): string {
    return nome.trim().split(/\s+/)[0] ?? nome;
  }
}
