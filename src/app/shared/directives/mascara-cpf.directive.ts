import { Directive, ElementRef, HostListener, inject } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[appMascaraCpf]',
  standalone: true
})
export class MascaraCpfDirective {
  private el = inject(ElementRef<HTMLInputElement>);
  private control = inject(NgControl, { optional: true });

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digitos = input.value.replace(/\D/g, '').slice(0, 11);
    const formatado = this.formatar(digitos);

    input.value = formatado;
    // Mantém o formControl com o valor exibido (com máscara) — ajuste para
    // enviar só os dígitos ao backend no submit, se preferir.
    this.control?.control?.setValue(formatado, { emitEvent: false });
  }

  private formatar(digitos: string): string {
    return digitos
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
}