declare namespace google {
  namespace maps {
    interface MapOptions {
      center?: LatLngLiteral;
      zoom?: number;
      mapTypeId?: MapTypeId;
      disableDefaultUI?: boolean;
      styles?: MapTypeStyle[];
    }

    interface MapTypeStyle {
      featureType?: string;
      elementType?: string;
      stylers?: Record<string, string | number | boolean>[];
    }

    interface LatLngLiteral {
      lat: number;
      lng: number;
    }

    class LatLng {
      constructor(lat: number, lng: number);
      lat(): number;
      lng(): number;
    }

    interface GeocoderResult {
      address_components: {
        types: string[];
        long_name: string;
        short_name: string;
      }[];
      formatted_address: string;
    }

    type GeocoderStatus = 'OK' | 'ZERO_RESULTS' | 'ERROR';

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
      routes: DirectionsRoute[];
      status: string;
      geocoded_waypoints?: GeocodedWaypoint[];
    }

    interface DirectionsRoute {
      bounds?: LatLngBounds;
      overview_path?: LatLng[];
      summary?: string;
      legs?: DirectionsLeg[];
    }

    interface DirectionsLeg {
      duration?: { text: string };
    }

    namespace places {
      interface PlaceResult {
        geometry?: { location?: LatLng };
        place_id?: string;
        formatted_address?: string;
        address_components?: { types: string[]; long_name: string; short_name: string }[];
      }

      class Autocomplete {
        constructor(
          input: HTMLInputElement,
          options?: {
            componentRestrictions?: { country: string };
            fields?: string[];
          },
        );
        addListener(eventName: string, handler: () => void): MapsEventListener;
        getPlace(): PlaceResult;
        setTarget(element: HTMLInputElement): void;
      }
    }

    interface GeocodedWaypoint {
      geocoder_status: string;
      place_id: string;
      types: string[];
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

    interface MapsEventListener {
      remove(): void;
    }

    class Map {
      constructor(element: HTMLElement, options?: MapOptions);
      setCenter(latLng: LatLngLiteral): void;
      setZoom(zoom: number): void;
      setOptions(options: MapOptions): void;
      fitBounds(bounds: LatLngBounds, padding?: number): void;
      addListener(eventName: string, handler: (event: MapMouseEvent) => void): MapsEventListener;
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

    class Geocoder {
      geocode(request: { location: LatLng }, callback: (results: GeocoderResult[] | null, status: string) => void): void;
    }

    class MapMouseEvent {
      latLng: LatLng | null;
    }

    interface DirectionsRequest {
      origin: LatLngLiteral | string;
      destination: LatLngLiteral | string;
      travelMode?: TravelMode;
    }

    namespace event {
      function trigger(instance: object, eventName: string): void;
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
