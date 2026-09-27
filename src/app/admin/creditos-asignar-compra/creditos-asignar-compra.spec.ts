import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { CreditosAsignarCompra } from './creditos-asignar-compra';

// El entorno de pruebas de este proyecto (Vitest + @angular/build:unit-test) no trae un
// localStorage funcional: CurrencyService (inyectado por el componente) llama a
// localStorage.getItem() en su constructor y sin esto el componente ni siquiera se crea.
// Es un hueco del entorno compartido, no de este componente, así que se resuelve acá nomás.
function stubLocalStorageSiHaceFalta(): void {
  const storageOk = typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function';
  if (storageOk) return;

  const almacen = new Map<string, string>();
  (globalThis as unknown as { localStorage: Partial<Storage> }).localStorage = {
    getItem: (k: string) => almacen.get(k) ?? null,
    setItem: (k: string, v: string) => { almacen.set(k, v); },
    removeItem: (k: string) => { almacen.delete(k); },
    clear: () => { almacen.clear(); },
  };
}

describe('CreditosAsignarCompra', () => {
  let component: CreditosAsignarCompra;
  let fixture: ComponentFixture<CreditosAsignarCompra>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    stubLocalStorageSiHaceFalta();

    await TestBed.configureTestingModule({
      imports: [CreditosAsignarCompra],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(CreditosAsignarCompra);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    // El propio componente pide las reglas (ivaTasa); CurrencyService (providedIn: 'root',
    // inyectado también por el componente) pide aparte la tasa de cambio y la preferencia de
    // moneda. Se contestan todas para no dejar solicitudes pendientes.
    for (const req of httpMock.match(() => true)) {
      req.flush(req.request.url === '/api/creditos/admin/reglas' ? { ivaTasa: 0.16 } : {});
    }
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('separa el monto ingresado (que ya incluye IVA) en subtotal + IVA', () => {
    component.onMontoChange(116);
    expect(component.subtotal()).toBe(100);
    expect(component.iva()).toBe(16);
    expect(component.total()).toBe(116);
  });

  it('rellena el inicial con el mínimo (el IVA) la primera vez que hay un monto', () => {
    component.onMontoChange(116);
    expect(component.pagoInicial()).toBe(16);
  });

  it('valida que el inicial esté entre el IVA y el total', () => {
    component.onMontoChange(116);

    component.pagoInicial.set(10); // menor al IVA (16)
    expect(component.pagoInicialInvalido()).toBe(true);

    component.pagoInicial.set(16); // el mínimo, exacto
    expect(component.pagoInicialInvalido()).toBe(false);

    component.pagoInicial.set(116); // el total, exacto
    expect(component.pagoInicialInvalido()).toBe(false);

    component.pagoInicial.set(120); // mayor al total
    expect(component.pagoInicialInvalido()).toBe(true);
  });
});
