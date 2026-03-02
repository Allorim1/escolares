import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HowBuy } from './how-buy';

describe('HowBuy', () => {
  let component: HowBuy;
  let fixture: ComponentFixture<HowBuy>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HowBuy],
    }).compileComponents();

    fixture = TestBed.createComponent(HowBuy);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
