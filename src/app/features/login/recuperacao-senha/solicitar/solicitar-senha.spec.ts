import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SolicitarSenha } from './solicitar-senha';

describe('SolicitarSenha', () => {
  let component: SolicitarSenha;
  let fixture: ComponentFixture<SolicitarSenha>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolicitarSenha]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SolicitarSenha);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});