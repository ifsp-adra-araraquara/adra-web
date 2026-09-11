import { Directive, ElementRef, HostListener, inject } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[appMascaraTelefone]',
  standalone: true
})
export class MascaraTelefoneDirective {
  private el = inject(ElementRef<HTMLInputElement>);
  private control = inject(NgControl, { optional: true });

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digitos = input.value.replace(/\D/g, '').slice(0, 11);
    const formatado = this.formatar(digitos);

    input.value = formatado;
    this.control?.control?.setValue(formatado, { emitEvent: false });
  }

  private formatar(digitos: string): string {
    if (digitos.length <= 10) {
      return digitos
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
    }
    return digitos
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
  }
}