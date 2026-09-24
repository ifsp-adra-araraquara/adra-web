import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AulasTurmaModal } from './aulas-turma-modal';

describe('AulasTurmaModal', () => {
  let component: AulasTurmaModal;
  let fixture: ComponentFixture<AulasTurmaModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AulasTurmaModal],
    }).compileComponents();

    fixture = TestBed.createComponent(AulasTurmaModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
