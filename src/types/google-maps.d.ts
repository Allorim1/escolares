declare namespace google {
  namespace maps {
    interface MapOptions {
      center?: LatLngLiteral;
      zoom?: number;
      mapTypeId?: MapTypeId;
      disableDefaultUI?: boolean;
      styles?: any[];
    }

    interface LatLngLiteral {
      lat: number;
      lng: number;
    }

    interface MarkerOptions {
      position?: LatLngLiteral;
      map?: Map;
      title?: string;
    }

    interface DirectionsRendererOptions {
      map?: Map;
      suppressMarkers?: boolean;
      preserveViewport?: boolean;
      polylineOptions?: PolylineOptions;
    }

    interface PolylineOptions {
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
    }

    interface DirectionsResult {
      routes: any[];
      status: string;
      geocoded_waypoints?: any[];
    }

    enum MapTypeId {
      ROADMAP = 'roadmap',
      SATELLITE = 'satellite',
      HYBRID = 'hybrid',
      TERRAIN = 'terrain',
    }

    enum TravelMode {
      DRIVING = 'DRIVING',
      WALKING = 'WALKING',
      BICYCLING = 'BICYCLING',
      TRANSIT = 'TRANSIT',
    }

    class Map {
      constructor(element: HTMLElement, options?: MapOptions);
      setCenter(latLng: LatLngLiteral): void;
      setZoom(zoom: number): void;
      setOptions(options: MapOptions): void;
      fitBounds(bounds: LatLngBounds, padding?: number): void;
    }

    class Marker {
      constructor(options?: MarkerOptions);
      setPosition(latLng: LatLngLiteral): void;
      setMap(map: Map | null): void;
    }

    class LatLngBounds {
      extend(latLng: LatLngLiteral): void;
    }

    class DirectionsRenderer {
      constructor(options?: DirectionsRendererOptions);
      setDirections(directions: DirectionsResult): void;
      setMap(map: Map | null): void;
    }

    class DirectionsService {
      route(request: DirectionsRequest, callback: (result: DirectionsResult, status: string) => void): void;
    }

    interface DirectionsRequest {
      origin: LatLngLiteral | string;
      destination: LatLngLiteral | string;
      travelMode?: TravelMode;
    }

    namespace event {
      function trigger(instance: unknown, eventName: string): void;
    }

    namespace marker {
      class AdvancedMarkerElement {
        constructor(options?: AdvancedMarkerElementOptions);
        position: LatLngLiteral;
        map: Map | null;
        title?: string;
      }
      
      interface AdvancedMarkerElementOptions {
        position?: LatLngLiteral;
        map?: Map | null;
        title?: string;
      }
    }
  }
}
