import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  templateUrl: './button.html',
  styleUrl: './button.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.display]': "block() ? 'block' : 'inline-block'",
  },
})
export class Button {
  variant = input<ButtonVariant>('primary');
  size = input<ButtonSize>('md');
  type = input<'button' | 'submit' | 'reset'>('button');
  loading = input(false);
  disabled = input(false);
  /** Ocupa 100% da largura do container — equivalente ao antigo `.btn-block`. */
  block = input(false);

  protected effectiveDisabled = computed(() => this.disabled() || this.loading());
}
