import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Círculo como path (o template só desenha <path>). */
const c = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;

const CALENDARIO = ['M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'M16 2v4', 'M8 2v4', 'M3 10h18'];
const LIVRO = ['M4 19.5A2.5 2.5 0 0 1 6.5 17H20', 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z'];
const PESSOA = ['M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', c(8.5, 7, 4)];
const ARQUIVO = ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6'];

/**
 * Registro único de ícones do sistema (traçado Feather Icons, MIT).
 * Uma ação = um ícone em todas as telas — ex.: editar é sempre `edit`,
 * inativar é sempre `power`, reativar é sempre `rotate-ccw`.
 */
const ICONES = {
  // ações
  eye: ['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z', c(12, 12, 3)],
  'eye-off': [
    'M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24',
    'M1 1l22 22',
  ],
  edit: ['M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7', 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'],
  pen: ['M12 20h9', 'M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z'],
  power: ['M18.36 6.64a9 9 0 1 1-12.73 0', 'M12 2v10'],
  'rotate-ccw': ['M1 4v6h6', 'M3.51 15a9 9 0 1 0 2.13-9.36L1 10'],
  x: ['M18 6 6 18', 'M6 6l12 12'],
  plus: ['M12 5v14', 'M5 12h14'],
  'more-horizontal': [c(12, 12, 1), c(19, 12, 1), c(5, 12, 1)],
  phone: ['M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z'],
  search: [c(11, 11, 8), 'M21 21l-4.35-4.35'],
  check: ['M20 6 9 17l-5-5'],
  'log-out': ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  download: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'],
  // navegação
  'chevron-left': ['M15 18l-6-6 6-6'],
  'chevron-right': ['M9 18l6-6-6-6'],
  menu: ['M3 12h18', 'M3 6h18', 'M3 18h18'],
  // avisos / estados
  'alert-circle': [c(12, 12, 10), 'M12 8v4', 'M12 16h.01'],
  'alert-triangle': ['M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z', 'M12 9v4', 'M12 17h.01'],
  'help-circle': [c(12, 12, 10), 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3', 'M12 17h.01'],
  clock: [c(12, 12, 10), 'M12 6v6l4 2'],
  lock: ['M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z', 'M7 11V7a5 5 0 0 1 10 0v4'],
  shield: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'],
  activity: ['M22 12h-4l-3 9L9 3l-3 9H2'],
  circle: [c(12, 12, 9)],
  // entidades / módulos
  home: ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'],
  user: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', c(12, 7, 4)],
  users: ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', c(9, 7, 4), 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  'user-plus': [...PESSOA, 'M20 8v6', 'M23 11h-6'],
  'user-check': [...PESSOA, 'M17 11l2 2 4-4'],
  layers: ['M12 2 2 7l10 5 10-5-10-5z', 'M2 17l10 5 10-5', 'M2 12l10 5 10-5'],
  grid: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M14 14h7v7h-7z', 'M3 14h7v7H3z'],
  'check-square': ['M9 11l3 3L22 4', 'M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'],
  calendar: CALENDARIO,
  'calendar-plus': [...CALENDARIO, 'M12 14v4', 'M10 16h4'],
  book: LIVRO,
  'book-plus': [...LIVRO, 'M12 6v6', 'M9 9h6'],
  list: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
  bell: ['M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9', 'M13.73 21a2 2 0 0 1-3.46 0'],
  file: ARQUIVO,
  'file-text': [...ARQUIVO, 'M16 13H8', 'M16 17H8', 'M10 9H8'],
  folder: ['M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z'],
} satisfies Record<string, string[]>;

export type IconName = keyof typeof ICONES;

/**
 * Ícone decorativo padrão. Sempre `aria-hidden`: o nome acessível fica no
 * botão/elemento pai (aria-label ou texto visível).
 * Tamanho: atributo `size` (padrão 18px) — qualquer regra CSS de contexto
 * (ex.: `.t-actions button svg { width: 15px }`) tem precedência sobre ele.
 */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `:host { display: inline-flex; flex: none; line-height: 0; }`,
  template: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
      [attr.width]="size()"
      [attr.height]="size()"
    >
      @for (d of paths(); track $index) {
        <path [attr.d]="d" />
      }
    </svg>
  `,
})
export class Icon {
  name = input.required<IconName>();
  size = input(18);

  protected paths = computed(() => ICONES[this.name()] ?? ICONES.circle);
}
