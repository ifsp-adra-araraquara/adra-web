import { Directive, inject } from '@angular/core';
import { NgControl } from '@angular/forms';
import { formatarCpf } from '../validators/cpf.validator';

@Directive({
  selector: '[appMascaraCpf]',
  host: {
    '(input)': 'onInput($event)',
  },
})
export class MascaraCpfDirective {
  private control = inject(NgControl, { optional: true });

  protected onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const formatado = formatarCpf(input.value);

    input.value = formatado;
    this.control?.control?.setValue(formatado, { emitEvent: false });
  }
}
