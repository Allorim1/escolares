import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CostoTasa } from './costo-tasa';

describe('CostoTasa', () => {
  let component: CostoTasa;
  let fixture: ComponentFixture<CostoTasa>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CostoTasa],
    }).compileComponents();

    fixture = TestBed.createComponent(CostoTasa);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
