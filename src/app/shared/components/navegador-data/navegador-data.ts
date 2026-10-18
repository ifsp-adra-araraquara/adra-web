import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { Icon } from '../icon/icon';

/** Soma `dias` a uma data 'YYYY-MM-DD' sem passar por fuso (evita pular/repetir dia). */
export function somarDias(dataIso: string, dias: number): string {
  const [ano, mes, dia] = dataIso.split('-').map(Number);
  const d = new Date(ano, mes - 1, dia + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Seletor de um dia com setas: ‹ dia anterior · [data] · próximo dia ›.
 * Uso: `<app-navegador-data [(data)]="dataSelecionada" label="Data da chamada" />`
 * (`data` em 'YYYY-MM-DD'; `min`/`max` opcionais bloqueiam as setas e o seletor).
 */
@Component({
  selector: 'app-navegador-data',
  imports: [Icon],
  templateUrl: './navegador-data.html',
  styleUrl: './navegador-data.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavegadorData {
  data = model.required<string>();
  label = input('Data');
  min = input<string>('');
  max = input<string>('');

  protected readonly podeVoltar = computed(() => !this.min() || this.data() > this.min());
  protected readonly podeAvancar = computed(() => !this.max() || this.data() < this.max());

  protected mover(dias: number): void {
    this.data.set(somarDias(this.data(), dias));
  }

  protected escolher(valor: string): void {
    if (valor) this.data.set(valor);
  }
}
