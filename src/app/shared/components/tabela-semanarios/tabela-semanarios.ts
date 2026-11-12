import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { SemanarioResponseDTO } from '../../models/semanario/SemanarioResponseDTO';
import { rotuloSemana } from '../../utils/semana.util';
import { CartaoSemanario } from '../cartao-semanario/cartao-semanario';
import { Icon } from '../icon/icon';
import { Table, TableColumn } from '../table/table';
import { TooltipDirective } from '../tooltip/tooltip';

/**
 * Semanários em tabela. Clicar na linha (ou em "Ver") mostra o plano completo no lugar da
 * tabela, sem abrir outro modal (a tabela costuma já estar dentro de um).
 * Uso: `<app-tabela-semanarios [semanarios]="lista" [podeRemover]="true" (remover)="remover($event)" />`
 */
@Component({
  selector: 'app-tabela-semanarios',
  imports: [Table, Icon, TooltipDirective, CartaoSemanario],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (detalhe(); as s) {
      <button type="button" class="voltar" (click)="detalhe.set(null)">
        <app-icon name="chevron-left" [size]="16" /> Voltar para a lista
      </button>
      <app-cartao-semanario [semanario]="s" />
    } @else {
    <app-table
      label="Semanários"
      [columns]="colunas()"
      [data]="semanarios()"
      [trackBy]="porId"
      [rowClick]="ver"
    >
      <ng-template #cell let-s let-column="column">
        @if (column.key === 'plano') {
          <span class="plano" [title]="s.conteudoPrevisto">{{ s.conteudoPrevisto }}</span>
        }
      </ng-template>

      <ng-template #rowActions let-s>
        <div class="acoes">
          <button type="button" aria-label="Ver semanário" appTooltip="Ver" (click)="ver(s)">
            <app-icon name="eye" />
          </button>
          @if (podeRemover()) {
            <button
              type="button"
              class="remover"
              [class.confirmando]="confirmandoId() === s.semanarioId"
              [attr.aria-label]="confirmandoId() === s.semanarioId ? 'Confirmar remoção' : 'Remover semanário'"
              [appTooltip]="confirmandoId() === s.semanarioId ? 'Clique de novo para confirmar' : 'Remover'"
              (click)="pedirRemocao(s)"
            >
              <app-icon name="trash" />
            </button>
          }
        </div>
      </ng-template>
    </app-table>
    }
  `,
  styles: `
    .voltar {
      display: inline-flex; align-items: center; gap: 4px; margin: 0 0 10px; padding: 6px 0;
      border: none; background: none; font: inherit; font-size: 13px; font-weight: 600;
      color: var(--color-adra-green-600); cursor: pointer;
    }
    .plano { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; max-width: 360px; }
    .acoes { display: flex; gap: 4px; justify-content: flex-end; }
    .acoes button { border: none; background: none; padding: 6px; border-radius: 6px; cursor: pointer; color: var(--gray-600); }
    .acoes button:hover { background: var(--color-brand-soft); }
    .remover { color: var(--coral-600) !important; }
    .remover.confirmando { background: var(--coral-50) !important; }
  `,
})
export class TabelaSemanarios {
  semanarios = input.required<SemanarioResponseDTO[]>();
  mostrarOficina = input(true);
  podeRemover = input(false);
  remover = output<SemanarioResponseDTO>();

  protected readonly colunas = computed<TableColumn<SemanarioResponseDTO>[]>(() => [
    { key: 'semana', header: 'Semana', sortable: true, value: (s) => rotuloSemana(s.semanaInicio) },
    { key: 'grupo', header: 'Grupo', sortable: true, value: (s) => s.nomeTurma },
    ...(this.mostrarOficina() ? [{ key: 'oficina', header: 'Oficina', value: (s: SemanarioResponseDTO) => s.nomeOficina }] : []),
    { key: 'plano', header: 'Conteúdos', type: 'custom' as const },
    { key: 'enviadoPor', header: 'Enviado por', value: (s) => s.nomeEnviadoPor },
  ]);

  protected readonly porId = (s: SemanarioResponseDTO) => s.semanarioId;
  /** Semanário aberto no lugar da tabela (null = mostra a tabela). */
  protected readonly detalhe = signal<SemanarioResponseDTO | null>(null);
  /** Remoção em dois cliques: 1º marca, 2º confirma. */
  protected readonly confirmandoId = signal<number | null>(null);

  protected readonly ver = (semanario: SemanarioResponseDTO): void => {
    this.detalhe.set(semanario);
  };

  protected pedirRemocao(semanario: SemanarioResponseDTO): void {
    if (this.confirmandoId() !== semanario.semanarioId) {
      this.confirmandoId.set(semanario.semanarioId);
      return;
    }
    this.confirmandoId.set(null);
    this.remover.emit(semanario);
  }
}
