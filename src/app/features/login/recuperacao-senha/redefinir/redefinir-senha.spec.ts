import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { RedefinirSenha } from './redefinir-senha';

describe('RedefinirSenha', () => {
  let component: RedefinirSenha;
  let fixture: ComponentFixture<RedefinirSenha>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RedefinirSenha],
      providers: [provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RedefinirSenha);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});