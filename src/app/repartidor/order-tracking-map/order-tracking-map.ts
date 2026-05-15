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
          @if (estimatedTime()) {
            <p class="estimated-time">⏱️ Llegada estimada: {{ estimatedTime() }}</p>
          }
        </div>
      }
      @if (showStartButton && order() && order()?.status === 'procesando') {
        <button class="btn-start" (click)="startOrder()">
          <i class="fas fa-truck"></i> Iniciar entrega
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
  `]
})
export class OrderTrackingMapComponent implements OnInit, AfterViewInit {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  @Input() orderId!: string;
  @Input() showAcceptButton = false;
  @Input() showStartButton = false;
  @Output() orderStarted = new EventEmitter<string>();
  
  order = signal<any>(null);
  estimatedTime = signal<string>('');
  map: google.maps.Map | null = null;
  orderMarker: google.maps.Marker | null = null;
  driverMarker: google.maps.Marker | null = null;
  directionsRenderer: google.maps.DirectionsRenderer | null = null;
  watchId: number | null = null;

  constructor(private mapsService: GoogleMapsService, private http: HttpClient) {}

  async ngOnInit() {
    await this.loadTrackingData();
  }

  async ngAfterViewInit() {
    await this.mapsService.loadApi();
    await this.initMap();
    this.startLocationTracking();
  }

  ngOnDestroy() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
    }
  }

  async loadTrackingData() {
    if (!this.orderId) return;
    
    try {
      const response: any = await this.http.get(`/api/delivery/order/${this.orderId}/tracking`).toPromise();
      this.order.set(response.order);
      
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
      title: 'Destino - Cliente'
    });
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
    if (!this.order()?.latitud || !this.order()?.longitud) return;
    
    try {
      const result = await this.mapsService.getDirections(
        driverLocation,
        { lat: this.order().latitud, lng: this.order().longitud }
      );
      this.directionsRenderer?.setDirections(result);
      this.estimatedTime.set(result.routes[0].legs[0].duration?.text || '');
    } catch (e) {
      console.log('Could not calculate route');
    }
  }

  startOrder() {
    if (this.orderId) {
      this.orderStarted.emit(this.orderId);
    }
  }
}