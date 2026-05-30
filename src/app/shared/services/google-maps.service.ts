import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GoogleMapsService {
  private isLoaded = false;
  public http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  async loadApi(): Promise<void> {
    if (this.isLoaded) return;
    
    const apiKey = environment.googleMapsApiKey || '';
    
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      console.warn('Google Maps API key not configured. Please set googleMapsApiKey in environment.ts');
      return Promise.reject(new Error('Google Maps API key not configured'));
    }
    
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,directions`;
       script.async = true;
       script.defer = true;
       script.onload = () => {
         this.isLoaded = true;
         resolve();
       };
       script.onerror = () => reject(new Error('Failed to load Google Maps API'));
       document.head.appendChild(script);
    });
  }

  autocomplete(input: string): Promise<any[]> {
    return this.http.get<any[]>(`/api/delivery/maps/autocomplete?input=${encodeURIComponent(input)}`).toPromise() as Promise<any[]>;
  }

  geocode(address: string): Promise<any> {
    return this.http.get<any>(`/api/delivery/maps/geocode?address=${encodeURIComponent(address)}`).toPromise() as Promise<any>;
  }

  geocodePlaceId(placeId: string): Promise<any> {
    return this.http.get<any>(`/api/delivery/maps/geocode/place/${placeId}`).toPromise() as Promise<any>;
  }

  createMap(element: HTMLElement, options: google.maps.MapOptions): google.maps.Map {
    return new google.maps.Map(element, options);
  }

  createMarker(options: google.maps.MarkerOptions): google.maps.Marker {
    return new google.maps.Marker(options);
  }

  createDirectionsService(): google.maps.DirectionsService {
    return new google.maps.DirectionsService();
  }

  async getDirections(origin: google.maps.LatLngLiteral, destination: google.maps.LatLngLiteral): Promise<google.maps.DirectionsResult> {
    const service = this.createDirectionsService();
    return new Promise((resolve, reject) => {
      service.route({
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING
      }, (result, status) => {
        if (status === 'OK' && result) {
          resolve(result);
        } else {
          reject(new Error(`Directions request failed: ${status}`));
        }
      });
    });
  }
}