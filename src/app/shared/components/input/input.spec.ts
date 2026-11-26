import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { Input } from './input';

@Component({
  imports: [ReactiveFormsModule, Input],
  template: `<app-input label="Renda mensal (R$)" mask="moeda" placeholder="0,00" [formControl]="controle" />`,
})
class HostFormControl {
  controle = new FormControl<number | null>(null);
}

@Component({
  imports: [FormsModule, Input],
  template: `<app-input label="Renda familiar (R$)" mask="moeda" placeholder="0,00" [ngModel]="valor()" (ngModelChange)="valor.set($event)" />`,
})
class HostNgModel {
  valor = signal<number | null>(null);
}

describe('Input (mask="moeda")', () => {
  it('interpreta "1500,00" e "1.500,50" corretamente no FormControl e formata no blur', () => {
    const fixture = TestBed.createComponent(HostFormControl);
    fixture.detectChanges();
    const inputEl = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    expect(inputEl.type).toBe('text');
    expect(inputEl.getAttribute('inputmode')).toBe('decimal');

    inputEl.value = '1500,00';
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.controle.value).toBe(1500);

    inputEl.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(inputEl.value).toBe('1.500,00');

    inputEl.value = '1.500,50';
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.controle.value).toBe(1500.5);
  });

  it('não sobrescreve o texto enquanto o usuário digita usando [ngModel]', async () => {
    const fixture = TestBed.createComponent(HostNgModel);
    fixture.detectChanges();
    const inputEl = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    inputEl.value = '1';
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.valor()).toBe(1);
    expect(inputEl.value).toBe('1');

    inputEl.value = '1500,';
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.valor()).toBe(1500);
    expect(inputEl.value).toBe('1500,');

    inputEl.value = '1500,50';
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.valor()).toBe(1500.5);

    inputEl.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(inputEl.value).toBe('1.500,50');
  });

  it('carrega valor inicial formatado e limpa ao receber null', () => {
    const fixture = TestBed.createComponent(HostFormControl);
    fixture.componentInstance.controle.setValue(2300.5);
    fixture.detectChanges();
    const inputEl = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    expect(inputEl.value).toBe('2.300,50');

    fixture.componentInstance.controle.setValue(null);
    fixture.detectChanges();
    expect(inputEl.value).toBe('');
  });
});
