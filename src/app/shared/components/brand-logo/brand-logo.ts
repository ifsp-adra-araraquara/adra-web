// src/app/shared/components/brand-logo/brand-logo.ts
import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-brand-logo',
  standalone: true,
  templateUrl: './brand-logo.html',
})
export class BrandLogo {
  variant = input<'white' | 'green'>('green');
  size = input<number>(40);

  src = computed(() =>
    this.variant() === 'white'
      ? '/assets/images/brand/adra-logo-white.svg'
      : '/assets/images/brand/adra-logo-green.svg'
  );
}