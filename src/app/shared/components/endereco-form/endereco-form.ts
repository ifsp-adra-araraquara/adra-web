import { ChangeDetectionStrategy, Component, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Input } from '../input/input';
import { EnderecoDTO } from '../../models/endereco/EnderecoDTO';
import { enderecoParaForm, enderecoVazio } from '../../utils/endereco.util';

/**
 * Campos de endereço (rua, número, bairro, ponto de referência) como um único
 * form control — funciona com ngModel e com formControlName.
 *
 *   <app-endereco-form [(ngModel)]="form.endereco" />
 *   <app-endereco-form formControlName="endereco" />
 *
 * Emite sempre um objeto (com strings vazias); use `enderecoParaPayload` antes de enviar à API.
 */
@Component({
  selector: 'app-endereco-form',
  imports: [FormsModule, Input],
  templateUrl: './endereco-form.html',
  styleUrl: './endereco-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: block;' },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EnderecoForm),
      multi: true,
    },
  ],
})
export class EnderecoForm implements ControlValueAccessor {
  protected readonly valor = signal<EnderecoDTO>(enderecoVazio());
  protected readonly desabilitado = signal(false);

  private onChange: (valor: EnderecoDTO) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(valor: EnderecoDTO | null): void {
    this.valor.set(enderecoParaForm(valor));
  }

  registerOnChange(fn: (valor: EnderecoDTO) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(desabilitado: boolean): void {
    this.desabilitado.set(desabilitado);
  }

  protected atualizar(campo: keyof EnderecoDTO, texto: string): void {
    const novo = { ...this.valor(), [campo]: texto };
    this.valor.set(novo);
    this.onChange(novo);
    this.onTouched();
  }
}
