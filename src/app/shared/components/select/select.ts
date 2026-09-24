import { ChangeDetectionStrategy, Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption<T = any> {
  value: T;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-select',
  standalone: true,
  templateUrl: './select.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Custom elements are `display: inline` por padrão — sem isso, `width`/`flex-*`
  // aplicados no <app-select> pelo pai são ignorados e o select "encolhe" pro
  // tamanho do texto da opção selecionada (o efeito de "chip" torto na toolbar).
  host: { style: 'display: block;' },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Select),
      multi: true
    }
  ]
})
export class Select implements ControlValueAccessor {
  options = input.required<SelectOption[]>();
  placeholder = input<string>(''); // vazio = sem opção placeholder
  disabled = input<boolean>(false);
  id = input<string>('');
  name = input<string>('');

  protected formDisabled = signal(false);
  protected effectiveDisabled = computed(() => this.disabled() || this.formDisabled());

  private currentValue = signal<any>(undefined);

  protected selectedIndex = computed<number>(() =>
    this.options().findIndex(o => o.value === this.currentValue())
  );

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: any): void {
    this.currentValue.set(value);
  }

  registerOnChange(fn: (value: any) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }

  protected handleChange(event: Event): void {
    const index = Number((event.target as HTMLSelectElement).value);
    const selected = this.options()[index];
    const value = selected ? selected.value : undefined;
    this.currentValue.set(value);
    this.onChange(value);
  }

  protected handleBlur(): void {
    this.onTouched();
  }
}