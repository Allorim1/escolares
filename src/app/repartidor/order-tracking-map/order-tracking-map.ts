import { Component, Input, signal, ViewChild, ElementRef, AfterViewInit, OnDestroy, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleMapsService } from '../../shared/services/google-maps.service';
import { HttpClient } from '@angular/common/http';

interface OrderItem {
  productId: string;
  title: string;
  quantity: number;
  price: number;
  image?: string;
}

interface OrderTracking {
  id: string;
  nombre?: string;
  telefono?: string;
  direccion?: string;
  direccionCompleta?: string;
  latitud?: number;
  longitud?: number;
  items?: OrderItem[];
  total?: number;
  referencia?: string;
  status?: string;
  createdAt?: Date;
}

type ApiResponse = {
  order?: OrderTracking;
  directions?: google.maps.DirectionsResult;
};

@Component({
  selector: 'app-order-tracking-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tracking-container">
      <div class="map-section">
        @if (mapError()) {
          <div class="map-error">
            <i class="fas fa-exclamation-triangle"></i>
            <p>{{ mapError() }}</p>
          </div>
        } @else {
          <div #mapContainer class="map"></div>
        }
        @if (order()) {
          @if (order()?.latitud && order()?.longitud) {
            <div class="map-info-panel">
              <p class="est-cliente"><i class="fas fa-map-marker-alt"></i> Destino: {{ order()?.direccionCompleta || order()?.direccion }}</p>
              @if (estimatedTime()) {
                <p class="estimado"><i class="fas fa-clock"></i> Llegada: {{ estimatedTime() }}</p>
              }
            </div>
          }
        }
        @if (showStartButton && order() && order()?.status === 'procesado') {
          <button class="btn-start" (click)="startOrder()">
            <i class="fas fa-truck"></i> Iniciar entrega
          </button>
        }
      </div>

      <div class="details-section">
        <div class="details-header">
          <h3><i class="fas fa-box"></i> Detalles del Pedido</h3>
        </div>
        @if (order()) {
          <div class="order-details">
            <div class="detail-row">
              <span class="label">Cliente:</span>
              <span class="value">{{ order()?.nombre }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Teléfono:</span>
              <span class="value">{{ order()?.telefono }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Fecha:</span>
              <span class="value">{{ order()?.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
            </div>
            @if (order()?.latitud && order()?.longitud) {
              <div class="detail-row">
                <span class="label">Ubicación:</span>
                <span class="value">{{ order()?.direccionCompleta || order()?.direccion }}</span>
              </div>
            }
            <div class="items-section">
              <h4><i class="fas fa-shopping-cart"></i> Productos</h4>
              <div class="items-list">
                @for (item of order()?.items; track item.productId) {
                  <div class="item-card">
                    @if (item.image) {
                      <img [src]="item.image" [alt]="item.title" class="item-image" />
                    }
                    <div class="item-info">
                      <p class="item-title">{{ item.title }}</p>
                      <p class="item-qty">Cant: {{ item.quantity }}</p>
                      <p class="item-price">{{ item.price | currency:'USD':'symbol':'1.2-2' }}</p>
                    </div>
                  </div>
                }
              </div>
            </div>
            <div class="total-section">
              <span class="total-label">Total:</span>
              <span class="total-value">{{ order()?.total | currency:'USD':'symbol':'1.2-2' }}</span>
            </div>
            @if (order()?.referencia) {
              <div class="instructions-section">
                <h4><i class="fas fa-sticky-note"></i> Instrucciones</h4>
                <p class="instructions">{{ order()?.referencia }}</p>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .tracking-container {
      display: flex;
      height: 600px;
      min-height: 500px;
      gap: 1px;
    }
    .map-section {
      flex: 1;
      position: relative;
    }
    .map {
      width: 100%;
      height: 100%;
      min-height: 500px;
    }
    .map-info-panel {
      position: absolute;
      bottom: 10px;
      left: 10px;
      background: rgba(255,255,255,0.95);
      padding: 8px 12px;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      max-width: 280px;
    }
    .est-cliente, .estimado {
      margin: 2px 0;
      font-size: 12px;
      color: #333;
    }
    .details-section {
      width: 350px;
      background: #f8f9fa;
      border-radius: 0 8px 8px 0;
      display: flex;
      flex-direction: column;
    }
    .details-header {
      padding: 15px 20px;
      background: #007bff;
      color: white;
      border-radius: 0 8px 0 0;
    }
    .details-header h3 {
      margin: 0;
      font-size: 16px;
    }
    .order-details {
      padding: 15px 20px;
      overflow-y: auto;
      flex: 1;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .detail-row .label {
      color: #666;
      font-size: 14px;
    }
    .detail-row .value {
      font-weight: 500;
      font-size: 14px;
    }
    .items-section h4, .instructions-section h4 {
      margin: 15px 0 10px;
      font-size: 14px;
      color: #333;
    }
    .items-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .item-card {
      display: flex;
      gap: 10px;
      padding: 10px;
      background: white;
      border-radius: 6px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .item-image {
      width: 50px;
      height: 50px;
      object-fit: cover;
      border-radius: 4px;
    }
    .item-info {
      flex: 1;
    }
    .item-title {
      margin: 0;
      font-size: 13px;
      font-weight: 500;
    }
    .item-qty, .item-price {
      margin: 2px 0;
      font-size: 12px;
      color: #666;
    }
    .total-section {
      display: flex;
      justify-content: space-between;
      padding: 15px 0;
      margin-top: 10px;
      border-top: 2px solid #007bff;
    }
    .total-label {
      font-weight: bold;
      font-size: 16px;
    }
    .total-value {
      font-weight: bold;
      font-size: 16px;
      color: #007bff;
    }
    .instructions-section {
      margin-top: 15px;
    }
    .instructions {
      margin: 5px 0 0;
      padding: 10px;
      background: #fff3cd;
      border-radius: 4px;
      font-size: 13px;
    }
    .btn-start {
      position: absolute;
      bottom: 10px;
      right: 10px;
      background: #007bff;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: background 0.2s;
    }
    .btn-start:hover {
      background: #0056b3;
    }
    .map-error {
      width: 100%;
      height: 100%;
      min-height: 500px;
      border-radius: 8px 0 0 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #f8d7da;
      color: #721c24;
      padding: 20px;
    }
    .map-error i {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .map-error p {
      margin: 0;
      font-size: 14px;
      text-align: center;
    }
  `]
})
export class OrderTrackingMapComponent implements AfterViewInit, OnDestroy {
  private mapsService = inject(GoogleMapsService);
  private http = inject(HttpClient);

  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLElement>;
  
  @Input() orderId!: string;
  @Input() showAcceptButton = false;
  @Input() showStartButton = false;
  @Output() orderStarted = new EventEmitter<string>();
  
  order = signal<OrderTracking | null>(null);
  estimatedTime = signal<string>('');
  map: google.maps.Map | null = null;
  orderMarker: google.maps.Marker | null = null;
  driverMarker: google.maps.Marker | null = null;
  directionsRenderer: google.maps.DirectionsRenderer | null = null;
  watchId: number | null = null;
  mapError = signal<string>('');

  async ngAfterViewInit() {
    await this.initializeMap();
  }

  ngOnDestroy() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
    }
  }

  async initializeMap() {
    try {
      await this.mapsService.loadApi();
      await this.loadTrackingData();
      await this.initMap();
      this.startLocationTracking();
    } catch (error: unknown) {
      this.mapError.set(error instanceof Error ? error.message : 'Error loading map');
      console.error('Map initialization error:', error);
    }
  }

  async loadTrackingData() {
    if (!this.orderId) return;
    
    try {
      const response = await this.http.get<ApiResponse>(`/api/delivery/order/${this.orderId}/tracking`).toPromise();
      this.order.set(response?.order ?? null);
      
      if (response?.directions) {
        this.estimatedTime.set(response.directions.routes[0]?.legs[0]?.duration?.text ?? '');
      }
    } catch (error) {
      console.error('Error loading tracking data:', error);
    }
  }

  async initMap() {
    const container = this.mapContainer?.nativeElement;
    if (!container) {
      console.warn('Map container not available');
      return;
    }

    const order = this.order();
    
    await new Promise(resolve => setTimeout(resolve, 300));

    if (container.offsetWidth === 0 || container.offsetHeight === 0) {
      console.warn('Map container still has no dimensions');
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!order?.latitud || !order?.longitud) {
      this.map = this.mapsService.createMap(container, {
        zoom: 10,
        center: { lat: 10.5, lng: -66.9 }
      });
    } else {
      this.map = this.mapsService.createMap(container, {
        center: { lat: order.latitud, lng: order.longitud },
        zoom: 14
      });

      this.directionsRenderer = new google.maps.DirectionsRenderer({
        map: this.map,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#007bff',
          strokeWeight: 5
        }
      });

      this.orderMarker = this.mapsService.createMarker({
        position: { lat: order.latitud, lng: order.longitud },
        map: this.map,
        title: 'Destino - Cliente'
      });
    }
    
    setTimeout(() => {
      if (this.map) {
        google.maps.event.trigger(this.map, 'resize');
        if (order?.latitud && order?.longitud) {
          this.map.setCenter({ lat: order.latitud, lng: order.longitud });
        }
      }
    }, 500);
  }

  startLocationTracking() {
    if (!navigator.geolocation) return;
    
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        this.updateMapWithLocation({ lat: latitude, lng: longitude });
      },
      (error) => console.error('Geolocation error:', error),
      { enableHighAccuracy: true, maximumAge: 60000 }
    );
  }

  async updateMapWithLocation(location: { lat: number; lng: number }) {
    if (!this.map) return;

    if (!this.driverMarker) {
      this.driverMarker = this.mapsService.createMarker({
        position: location,
        map: this.map,
        title: 'Repartidor'
      });
    } else {
      this.driverMarker.setPosition(location);
    }

    if (this.directionsRenderer && this.order()) {
      await this.calculateAndDisplayRoute(location);
    }
  }

  async calculateAndDisplayRoute(driverLocation: { lat: number; lng: number }) {
    const order = this.order();
    if (!order?.latitud || !order?.longitud) return;
    
    try {
      const result = await this.mapsService.getDirections(
        driverLocation,
        { lat: order.latitud, lng: order.longitud }
      );
      this.directionsRenderer?.setDirections(result);
      this.estimatedTime.set(result.routes[0]?.legs[0]?.duration?.text ?? '');
    } catch {
      console.log('Could not calculate route');
    }
  }

  startOrder() {
    if (this.orderId) {
      this.orderStarted.emit(this.orderId);
    }
  }
}
