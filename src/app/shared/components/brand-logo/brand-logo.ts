// src/app/shared/components/brand-logo/brand-logo.ts
import { ChangeDetectionStrategy, Component, input, computed } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-brand-logo',
  imports: [NgOptimizedImage],
  templateUrl: './brand-logo.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandLogo {
  variant = input<'white' | 'green'>('green');
  size = input<number>(40);
  /** Só o símbolo (globo + pessoas), sem o "ADRA" por extenso — para espaços compactos (ex.: sidebar colapsada). */
  markOnly = input<boolean>(false);

  src = computed(() => {
    const arquivo = this.markOnly() ? 'adra-mark' : 'adra-logo';
    return `/assets/images/brand/${arquivo}-${this.variant()}.svg`;
  });

  /** Dimensões intrínsecas do SVG de origem — mudam conforme markOnly, exigidas pelo NgOptimizedImage. */
  dims = computed(() => (this.markOnly() ? { w: 1113, h: 828 } : { w: 549, h: 564 }));
}