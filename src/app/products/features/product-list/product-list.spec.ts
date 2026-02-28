import { ComponentFixture, TestBed } from '@angular/core/testing';

import ProductList from './product-list';

describe('ProductList', () => {
  let component: ProductList;
  let fixture: ComponentFixture<ProductList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductList],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should advance page when changePage is called', () => {
    const initial = component.productsState.state.page();
    component.changePage(1);
    expect(component.productsState.state.page()).toBe(initial + 1);
  });

  it('should not go below page 1', () => {
    component.changePage(-999);
    expect(component.productsState.state.page()).toBe(1);
  });
});
