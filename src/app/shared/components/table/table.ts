import { ChangeDetectionStrategy, Component, TemplateRef, computed, contentChild, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Badge } from '../badge/badge';

export type TableSortDirection = 'asc' | 'desc';

export interface TableSortState {
  key: string;
  direction: TableSortDirection;
}

export interface TableColumn<T = unknown> {
  /** Chave da coluna. Usada como acessor padrão (`row[key]`) e identificador de ordenação. */
  key: string;
  header: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
  /** 'badge' renderiza o valor da célula com `app-badge`. Padrão: texto simples. */
  type?: 'text' | 'badge';
  /** Acessor customizado, para quando o valor a exibir não é `row[key]` diretamente. */
  value?: (row: T) => unknown;
}

/**
 * Tabela padronizada — colunas configuráveis por `@input()`, ações por linha via
 * projeção de template, e paginação/ordenação básica.
 *
 * Por padrão pagina e ordena no client (`serverSide` = false). Como as buscas do
 * sistema são server-side por decisão do MVP, quando `serverSide` = true a tabela
 * apenas exibe `data()` como veio (já paginada/ordenada pelo back) e delega a
 * paginação/ordenação ao componente pai via `pageChange`/`sortChange`.
 *
 * Uso:
 *   <app-table [columns]="colunas" [data]="oficinas()">
 *     <ng-template #rowActions let-row>
 *       <button (click)="editar(row)">Editar</button>
 *     </ng-template>
 *   </app-table>
 */
@Component({
  selector: 'app-table',
  standalone: true,
  imports: [NgTemplateOutlet, Badge],
  templateUrl: './table.html',
  styleUrl: './table.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Table<T = unknown> {
  columns = input.required<TableColumn<T>[]>();
  data = input.required<T[]>();

  /** true = paginação/ordenação são feitas pelo pai (API); a tabela só exibe `data()`. */
  serverSide = input(false);
  pageSize = input(10);
  /** Página atual (1-based). Fonte da verdade quando `serverSide` = true. */
  page = input(1);
  /** Total de itens no servidor. Obrigatório para paginar corretamente quando `serverSide` = true. */
  totalItems = input<number | null>(null);
  /** Acessor opcional para `track` no `@for` das linhas; por padrão usa o índice. */
  trackBy = input<((row: T, index: number) => unknown) | null>(null);

  pageChange = output<number>();
  sortChange = output<TableSortState>();

  /** Ações por linha — projetadas via `<ng-template #rowActions let-row>`. */
  rowActionsTemplate = contentChild<TemplateRef<unknown>>('rowActions');

  private readonly internalPage = signal(1);
  private readonly internalSort = signal<TableSortState | null>(null);

  protected readonly currentPage = computed(() => (this.serverSide() ? this.page() : this.internalPage()));

  private readonly sortedData = computed<T[]>(() => {
    if (this.serverSide()) {
      return this.data();
    }

    const sort = this.internalSort();
    if (!sort) {
      return this.data();
    }

    const column = this.columns().find((c) => c.key === sort.key);
    const linhas = [...this.data()];
    linhas.sort((a, b) => {
      const va = column ? this.cellValue(a, column) : null;
      const vb = column ? this.cellValue(b, column) : null;
      const comparacao = String(va ?? '').localeCompare(String(vb ?? ''), 'pt-BR', { numeric: true });
      return sort.direction === 'asc' ? comparacao : -comparacao;
    });
    return linhas;
  });

  protected readonly totalCount = computed(() => this.totalItems() ?? this.sortedData().length);
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize())));

  protected readonly pagedData = computed<T[]>(() => {
    if (this.serverSide()) {
      return this.data();
    }
    const inicio = (this.currentPage() - 1) * this.pageSize();
    return this.sortedData().slice(inicio, inicio + this.pageSize());
  });

  protected cellValue(row: T, column: TableColumn<T>): unknown {
    return column.value ? column.value(row) : (row as Record<string, unknown>)?.[column.key];
  }

  /** Mesmo valor de `cellValue`, tipado para o `[status]` do `app-badge` (colunas `type: 'badge'`). */
  protected cellStatus(row: T, column: TableColumn<T>): string | boolean | null {
    const valor = this.cellValue(row, column);
    return typeof valor === 'string' || typeof valor === 'boolean' ? valor : null;
  }

  protected sortIndicator(column: TableColumn<T>): TableSortDirection | null {
    if (this.serverSide()) {
      return null;
    }
    const sort = this.internalSort();
    return sort?.key === column.key ? sort.direction : null;
  }

  protected trackRow(index: number, row: T): unknown {
    const fn = this.trackBy();
    return fn ? fn(row, index) : index;
  }

  protected onHeaderClick(column: TableColumn<T>): void {
    if (!column.sortable) {
      return;
    }

    const atual = this.serverSide() ? null : this.internalSort();
    const proximaDirecao: TableSortDirection =
      atual?.key === column.key && atual.direction === 'asc' ? 'desc' : 'asc';
    const proximo: TableSortState = { key: column.key, direction: proximaDirecao };

    if (!this.serverSide()) {
      this.internalSort.set(proximo);
    }
    this.sortChange.emit(proximo);
  }

  protected goToPage(pagina: number): void {
    const paginaLimitada = Math.min(Math.max(1, pagina), this.totalPages());
    if (paginaLimitada === this.currentPage()) {
      return;
    }

    if (!this.serverSide()) {
      this.internalPage.set(paginaLimitada);
    }
    this.pageChange.emit(paginaLimitada);
  }
}
