import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Lineas } from './lineas';

describe('Lineas', () => {
  let component: Lineas;
  let fixture: ComponentFixture<Lineas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Lineas],
    }).compileComponents();

    fixture = TestBed.createComponent(Lineas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
