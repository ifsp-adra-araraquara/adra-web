import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BadgeVariant, resolveBadgeStatus } from '../../utils/badge-status.util';

/**
 * Badge de status padronizado — usa a paleta única de `badge-status.util.ts`.
 *
 * Uso mais comum, com um status já conhecido do sistema (mapeia cor e rótulo sozinho):
 *   <app-badge [status]="oficina.ativo" />
 *   <app-badge [status]="aula.statusAula" />
 *
 * Uso customizado, quando o status não está no mapa ou o rótulo precisa ser outro:
 *   <app-badge variant="blue" label="Em análise" />
 */
@Component({
  selector: 'app-badge',
  standalone: true,
  templateUrl: './badge.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Badge {
  /** Valor de status vindo da API (enum) ou booleano (atalho para campos `ativo`). */
  status = input<string | boolean | null>(null);
  /** Força uma cor específica, ignorando a resolvida a partir de `status`. */
  variant = input<BadgeVariant | null>(null);
  /** Força um rótulo específico, ignorando o resolvido a partir de `status`. */
  label = input('');

  private readonly resolved = computed(() => resolveBadgeStatus(this.status()));

  protected readonly resolvedVariant = computed<BadgeVariant>(
    () => this.variant() ?? this.resolved()?.variant ?? 'gray',
  );
  protected readonly resolvedLabel = computed(() => this.label() || this.resolved()?.label || '');
}
