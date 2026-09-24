import { ChangeDetectionStrategy, Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { formatarCpf, somenteDigitos } from '../../validators/cpf.validator';
import { formatarTelefone } from '../../utils/mascara.util';

export type InputType = 'text' | 'number' | 'password' | 'email' | 'date';
export type InputMask = 'none' | 'cpf' | 'telefone';

let nextInputId = 0;

@Component({
  selector: 'app-input',
  templateUrl: './input.html',
  styleUrl: './input.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: block;' },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Input),
      multi: true,
    },
  ],
})
export class Input implements ControlValueAccessor {
  label = input<string>('');
  /** Mantém o label acessível (screen readers) mas visualmente oculto — útil em barras de filtro compactas. */
  hideLabel = input<boolean>(false);
  type = input<InputType>('text');
  mask = input<InputMask>('none');
  placeholder = input<string>('');
  id = input<string>('');
  name = input<string>('');
  autocomplete = input<string>('off');
  disabled = input<boolean>(false);
  readonly = input<boolean>(false);
  required = input<boolean>(false);
  errorMessage = input<string | null>(null);
  max = input<string>('');
  min = input<string>('');
  /** Sobrepõe o maxlength derivado da máscara (se houver). */
  maxLength = input<number | null>(null);

  private autoId = `app-input-${nextInputId++}`;
  protected inputId = computed(() => this.id() || this.autoId);
  protected errorId = computed(() => `${this.inputId()}-error`);
  protected hasError = computed(() => !!this.errorMessage());

  protected formDisabled = signal(false);
  protected effectiveDisabled = computed(() => this.disabled() || this.formDisabled());

  protected showPassword = signal(false);

  private rawValue = signal('');

  protected displayValue = computed(() => {
    if (this.mask() === 'cpf') return formatarCpf(this.rawValue());
    if (this.mask() === 'telefone') return formatarTelefone(this.rawValue());
    return this.rawValue();
  });

  protected effectiveType = computed<string>(() => {
    if (this.mask() !== 'none') return 'text';
    if (this.type() === 'password') return this.showPassword() ? 'text' : 'password';
    return this.type();
  });

  protected inputMode = computed<string | null>(() => {
    if (this.mask() !== 'none') return 'numeric';
    if (this.type() === 'number') return 'decimal';
    if (this.type() === 'email') return 'email';
    return null;
  });

  protected effectiveMaxLength = computed<number | null>(() => {
    if (this.maxLength() != null) return this.maxLength();
    if (this.mask() === 'cpf') return 14;
    if (this.mask() === 'telefone') return 15;
    return null;
  });

  private onChange: (value: unknown) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: unknown): void {
    if (value == null) {
      this.rawValue.set('');
      return;
    }
    this.rawValue.set(this.mask() !== 'none' ? somenteDigitos(String(value)) : String(value));
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }

  protected handleInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;

    if (this.mask() !== 'none') {
      const digitos = somenteDigitos(value).slice(0, 11);
      this.rawValue.set(digitos);
      this.onChange(digitos);
      return;
    }

    this.rawValue.set(value);
    this.onChange(this.type() === 'number' ? (value === '' ? null : Number(value)) : value);
  }

  protected handleBlur(): void {
    this.onTouched();
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }
}
