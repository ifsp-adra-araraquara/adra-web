import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon, IconName } from '../icon/icon';

/**
 * Botão de ação dentro de um drawer: ícone + texto, ocupando a linha toda.
 * Uso: `<app-acao-drawer icone="edit" (click)="editar()">Editar</app-acao-drawer>`
 */
@Component({
  selector: 'app-acao-drawer',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: block;' },
  template: `
    <button type="button" class="acao" [class.perigo]="perigo()">
      <app-icon [name]="icone()" />
      <ng-content />
    </button>
  `,
  styles: `
    .acao {
      display: flex; align-items: center; gap: 12px; width: 100%; min-height: 44px;
      padding: 10px 12px; border: none; border-radius: var(--radius-sm, 8px);
      background: transparent; color: var(--gray-800); font: inherit; font-size: 14px; font-weight: 500;
      text-align: left; cursor: pointer; transition: background .15s, color .15s;
    }
    .acao:hover { background: var(--color-brand-soft); color: var(--color-adra-green-600); }
    .acao app-icon {
      width: 32px; height: 32px; display: grid; place-items: center; border-radius: var(--radius-sm, 8px);
      background: var(--color-brand-soft); color: var(--color-brand);
    }
    .acao:hover app-icon { background: #fff; }
    .acao.perigo { color: var(--coral-600); }
    .acao.perigo app-icon { background: var(--coral-50); color: currentColor; }
    .acao.perigo:hover { background: var(--coral-50); }
  `,
})
export class AcaoDrawer {
  icone = input.required<IconName>();
  perigo = input(false);
}
