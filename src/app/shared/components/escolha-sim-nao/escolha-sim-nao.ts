import { ChangeDetectionStrategy, Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

let proximoId = 0;

/**
 * Pergunta de duas respostas (Sim/Não, Aceito/Não aceito…) como dois botões
 * grandes. Por baixo são radios nativos: setas do teclado e leitor de tela
 * funcionam sem nada extra. Valor: true, false ou null (não respondido).
 *
 *   <app-escolha-sim-nao formControlName="recebe" pergunta="Recebe algum programa?" />
 */
@Component({
  selector: 'app-escolha-sim-nao',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: block;' },
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => EscolhaSimNao), multi: true }],
  template: `
    <fieldset class="escolha" [attr.aria-describedby]="erro() ? erroId : null">
      <legend class="escolha__pergunta">
        {{ pergunta() }}
        @if (obrigatoria()) { <span class="escolha__obrigatoria" aria-hidden="true">*</span> }
      </legend>
      <div class="escolha__opcoes">
        @for (opcao of opcoes(); track opcao.valor) {
          <label class="escolha__opcao" [class.escolha__opcao--marcada]="valor() === opcao.valor">
            <input
              type="radio"
              [name]="nome"
              [checked]="valor() === opcao.valor"
              [disabled]="desabilitado()"
              [attr.aria-invalid]="erro() ? 'true' : null"
              (change)="escolher(opcao.valor)"
              (blur)="aoSair()"
            />
            <span>{{ opcao.rotulo }}</span>
          </label>
        }
      </div>
      @if (erro()) {
        <p class="escolha__erro" [id]="erroId" role="alert">{{ erro() }}</p>
      }
    </fieldset>
  `,
  styles: `
    .escolha { border: 0; margin: 0 0 16px; padding: 0; min-width: 0; }
    .escolha__pergunta { padding: 0; margin-bottom: 8px; font-size: 14px; font-weight: 500; color: var(--rotulo); line-height: 1.4; }
    .escolha__obrigatoria { color: var(--red-600); margin-left: 2px; }
    .escolha__opcoes { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .escolha__opcao {
      position: relative; display: flex; align-items: center; justify-content: center; min-height: 48px;
      padding: 10px 12px; border: 1.5px solid var(--campo-borda); border-radius: var(--radius); background: var(--campo-bg);
      font-size: 15px; font-weight: 500; color: var(--gray-800); text-align: center; cursor: pointer;
      transition: border-color .15s var(--ease), background-color .15s var(--ease);
    }
    .escolha__opcao:hover { border-color: var(--campo-borda-hover); }
    .escolha__opcao input { position: absolute; opacity: 0; inset: 0; margin: 0; cursor: pointer; }
    .escolha__opcao:has(input:focus-visible) { outline: 3px solid var(--color-brand-ring); outline-offset: 2px; }
    .escolha__opcao--marcada { border-color: var(--color-brand); background: var(--color-brand-soft); color: var(--color-adra-green-800); }
    .escolha__erro { margin: 6px 0 0; font-size: 13px; color: var(--red-600); }
    @media (prefers-reduced-motion: reduce) { .escolha__opcao { transition: none; } }
  `,
})
export class EscolhaSimNao implements ControlValueAccessor {
  pergunta = input.required<string>();
  rotuloSim = input('Sim');
  rotuloNao = input('Não');
  obrigatoria = input(true);
  erro = input<string | null>(null);

  protected readonly nome = `escolha-${proximoId++}`;
  protected readonly erroId = `${this.nome}-erro`;
  protected readonly valor = signal<boolean | null>(null);
  protected readonly desabilitado = signal(false);
  protected readonly opcoes = computed(() => [
    { valor: true, rotulo: this.rotuloSim() },
    { valor: false, rotulo: this.rotuloNao() },
  ]);

  private onChange: (valor: boolean) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(valor: boolean | null): void {
    this.valor.set(valor ?? null);
  }

  registerOnChange(fn: (valor: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(desabilitado: boolean): void {
    this.desabilitado.set(desabilitado);
  }

  protected escolher(valor: boolean): void {
    this.valor.set(valor);
    this.onChange(valor);
    this.onTouched();
  }

  protected aoSair(): void {
    this.onTouched();
  }
}
