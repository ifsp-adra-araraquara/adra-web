import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Acesso } from './acesso';

describe('Acesso', () => {
  let component: Acesso;
  let fixture: ComponentFixture<Acesso>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Acesso],
    }).compileComponents();

    fixture = TestBed.createComponent(Acesso);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
