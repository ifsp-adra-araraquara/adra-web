import { Directive, inject } from '@angular/core';
import { NgControl } from '@angular/forms';
import { formatarTelefone } from '../utils/mascara.util';

@Directive({
  selector: '[appMascaraTelefone]',
  host: {
    '(input)': 'onInput($event)',
  },
})
export class MascaraTelefoneDirective {
  private control = inject(NgControl, { optional: true });

  protected onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const formatado = formatarTelefone(input.value);

    input.value = formatado;
    this.control?.control?.setValue(formatado, { emitEvent: false });
  }
}
