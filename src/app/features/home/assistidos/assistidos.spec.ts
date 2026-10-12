import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { Assistidos } from './assistidos';

describe('Assistidos', () => {
  let component: Assistidos;
  let fixture: ComponentFixture<Assistidos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Assistidos],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: of(convertToParamMap({})) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Assistidos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
