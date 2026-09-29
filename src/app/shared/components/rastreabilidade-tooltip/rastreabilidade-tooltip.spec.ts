import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RastreabilidadeTooltip } from './rastreabilidade-tooltip';
import { describe, it, expect, beforeEach } from 'vitest';

describe('RastreabilidadeTooltip', () => {
  let fixture: ComponentFixture<RastreabilidadeTooltip>;
  let component: RastreabilidadeTooltip;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RastreabilidadeTooltip],
    }).compileComponents();

    fixture = TestBed.createComponent(RastreabilidadeTooltip);
    component = fixture.componentInstance;
  });

  it('exibe o nome de quem lançou a presença e a data formatada', () => {
    fixture.componentRef.setInput('criadoPorNome', 'Coordenador Teste');
    fixture.componentRef.setInput('criadoEm', '2026-09-29T10:30:00');
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const nomeElement = element.querySelector('.linha-autor .nome');
    expect(nomeElement?.textContent).toContain('Coordenador Teste');

    const dataElement = element.querySelector('.linha-data');
    expect(dataElement?.textContent).toContain('29/09/2026');
  });

  it('exibe alteração quando atualizadoPorNome for diferente de criadoPorNome', () => {
    fixture.componentRef.setInput('criadoPorNome', 'Usuario A');
    fixture.componentRef.setInput('criadoEm', '2026-09-29T10:00:00');
    fixture.componentRef.setInput('atualizadoPorNome', 'Usuario B');
    fixture.componentRef.setInput('atualizadoEm', '2026-09-29T11:00:00');
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const secaoAlterado = element.querySelector('.tooltip-secao.alterado');
    expect(secaoAlterado).not.toBeNull();
    expect(secaoAlterado?.textContent).toContain('Usuario B');
  });

  it('não exibe seção de alteração se foi apenas a criação inicial pelo mesmo usuário', () => {
    fixture.componentRef.setInput('criadoPorNome', 'Usuario A');
    fixture.componentRef.setInput('criadoEm', '2026-09-29T10:00:00');
    fixture.componentRef.setInput('atualizadoPorNome', 'Usuario A');
    fixture.componentRef.setInput('atualizadoEm', '2026-09-29T10:00:00');
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const secaoAlterado = element.querySelector('.tooltip-secao.alterado');
    expect(secaoAlterado).toBeNull();
  });
});
