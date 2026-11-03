import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BadgeVariant } from '../../utils/badge-status.util';
import { Badge } from '../badge/badge';

/**
 * Nomes lado a lado, cada um num badge (ex.: oficinas de um grupo).
 * Uso: `<app-lista-badges [nomes]="['Violino', 'Teatro']" vazio="Nenhuma oficina" />`
 */
@Component({
  selector: 'app-lista-badges',
  imports: [Badge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="lista">
      @for (nome of nomes(); track nome) {
        <app-badge [variant]="variant()" [label]="nome" [plain]="true" />
      } @empty {
        <span class="muted">{{ vazio() }}</span>
      }
    </span>
  `,
  styles: `.lista { display: inline-flex; flex-wrap: wrap; gap: 4px; }`,
})
export class ListaBadges {
  nomes = input.required<string[]>();
  vazio = input('—');
  variant = input<BadgeVariant>('blue');
}
