import { Component, Input, OnInit, signal, ViewChild, ElementRef, AfterViewInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleMapsService } from '../../shared/services/google-maps.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-order-tracking-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tracking-map-container">
      <div #mapContainer class="map"></div>
      @if (order()) {
        <div class="info-panel">
          <h4>{{ order()?.nombre }}</h4>
          <p><strong>Dirección:</strong> {{ order()?.direccionCompleta || order()?.direccion }}</p>
          @if (deliveryPerson()) {
            <p><strong>Repartidor:</strong> {{ deliveryPerson()?.nombre }}</p>
          }
          @if (estimatedTime()) {
            <p class="estimated-time">⏱️ Llegada estimada: {{ estimatedTime() }}</p>
          }
        </div>
      }
      @if (showAcceptButton && order() && order()?.status === 'pendiente') {
        <button class="btn-accept" (click)="acceptOrder()">
          <i class="fas fa-check"></i> Aceptar Pedido
        </button>
      }
    </div>
  `,
  styles: [`
    .tracking-map-container {
      position: relative;
      width: 100%;
      height: 400px;
    }
    .map {
      width: 100%;
      height: 100%;
      border-radius: 8px;
    }
    .info-panel {
      position: absolute;
      bottom: 50px;
      left: 10px;
      background: white;
      padding: 10px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      max-width: 250px;
    }
    .info-panel h4 {
      margin: 0 0 5px 0;
    }
    .info-panel p {
      margin: 5px 0;
      font-size: 14px;
    }
    .estimated-time {
      color: #007bff;
      font-weight: bold;
    }
    .btn-accept {
      position: absolute;
      bottom: 10px;
      right: 10px;
      background: #28a745;
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
    .btn-accept:hover {
      background: #218838;
    }
  `]
})
export class OrderTrackingMapComponent implements OnInit, AfterViewInit {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  @Input() orderId!: string;
  @Input() showAcceptButton = false;
  @Output() orderAccepted = new EventEmitter<string>();
  
  order = signal<any>(null);
  deliveryPerson = signal<any>(null);
  estimatedTime = signal<string>('');
  map: google.maps.Map | null = null;
  orderMarker: google.maps.Marker | null = null;
  driverMarker: google.maps.Marker | null = null;
  directionsRenderer: google.maps.DirectionsRenderer | null = null;

  constructor(private mapsService: GoogleMapsService, private http: HttpClient) {}

  async ngOnInit() {
    await this.loadTrackingData();
  }

  async ngAfterViewInit() {
    await this.mapsService.loadApi();
    await this.initMap();
  }

  async loadTrackingData() {
    if (!this.orderId) return;
    
    try {
      const response: any = await this.http.get(`/api/delivery/order/${this.orderId}/tracking`).toPromise();
      this.order.set(response.order);
      this.deliveryPerson.set(response.deliveryPerson);
      
      if (response.directions) {
        this.estimatedTime.set(response.directions.duration?.text || '');
      }
    } catch (error) {
      console.error('Error loading tracking data:', error);
    }
  }

  async initMap() {
    const order = this.order();
    if (!order || !order.latitud || !order.longitud) return;

    this.map = this.mapsService.createMap(this.mapContainer.nativeElement, {
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
      title: 'Destino'
    });

    if (this.deliveryPerson()?.ultimaUbicacion) {
      const loc = this.deliveryPerson().ultimaUbicacion;
      this.driverMarker = this.mapsService.createMarker({
        position: { lat: loc.lat, lng: loc.lng },
        map: this.map,
        title: 'Repartidor'
      });

      await this.calculateAndDisplayRoute({ lat: loc.lat, lng: loc.lng });
    }
  }

  async calculateAndDisplayRoute(driverLocation: { lat: number; lng: number }) {
    if (!this.order()?.latitud || !this.order()?.longitud) return;
    
    try {
      const result = await this.mapsService.getDirections(
        driverLocation,
        { lat: this.order().latitud, lng: this.order().longitud }
      );
      if (this.directionsRenderer) {
        this.directionsRenderer.setDirections(result);
        this.estimatedTime.set(result.routes[0].legs[0].duration?.text || '');
      }
    } catch (e) {
      console.log('Could not calculate route');
    }
  }

  async updateDriverLocation(location: { lat: number; lng: number }) {
    if (this.driverMarker) {
      this.driverMarker.setPosition(location);
    }
    
    if (this.map && this.order()?.latitud && this.order()?.longitud) {
      await this.calculateAndDisplayRoute(location);
    }
  }

  acceptOrder() {
    if (this.orderId) {
      this.orderAccepted.emit(this.orderId);
    }
  }
}