import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Modal } from './modal';

@Component({
  imports: [Modal],
  template: `
    <button id="abrir" (click)="aberto.set(true)">Abrir</button>
    <app-modal [(open)]="aberto" title="Teste">
      <input id="campo" />
    </app-modal>
  `,
})
class Hospedeiro {
  aberto = signal(false);
}

const esperar = () => new Promise((resolve) => setTimeout(resolve));

describe('Modal: foco (WCAG 2.4.3)', () => {
  it('foca o diálogo ao abrir e devolve o foco a quem abriu ao fechar', async () => {
    const fixture = TestBed.createComponent(Hospedeiro);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    document.body.appendChild(raiz);

    const abrir = raiz.querySelector<HTMLButtonElement>('#abrir')!;
    abrir.focus();
    abrir.click();
    fixture.detectChanges();
    await esperar();

    const dialogo = raiz.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(document.activeElement).toBe(dialogo);
    expect(dialogo.getAttribute('aria-labelledby')).toBeTruthy();

    fixture.componentInstance.aberto.set(false);
    fixture.detectChanges();
    await esperar();
    expect(document.activeElement).toBe(abrir);
    raiz.remove();
  });
});
