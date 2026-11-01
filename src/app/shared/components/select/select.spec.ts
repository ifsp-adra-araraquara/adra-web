import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { Select, SelectOption } from './select';

@Component({
  imports: [FormsModule, Select],
  template: `<app-select [options]="opcoes" placeholder="Selecione" [ngModel]="valor()" />`,
})
class Hospedeiro {
  readonly opcoes: SelectOption<string>[] = [
    { value: 'A', label: 'Opção A' },
    { value: 'B', label: 'Opção B' },
  ];
  readonly valor = signal<string | null>(null);
}

describe('Select', () => {
  async function renderizar(valor: string | null): Promise<HTMLSelectElement> {
    const fixture = TestBed.createComponent(Hospedeiro);
    fixture.componentInstance.valor.set(valor);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('select');
  }

  it('sem valor mostra o placeholder, não a primeira opção', async () => {
    const select = await renderizar(null);
    expect(select.selectedOptions[0].textContent?.trim()).toBe('Selecione');
  });

  it('com valor mostra a opção dele', async () => {
    const select = await renderizar('B');
    expect(select.selectedOptions[0].textContent?.trim()).toBe('Opção B');
  });
});
