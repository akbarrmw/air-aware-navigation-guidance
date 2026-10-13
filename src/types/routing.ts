export interface RouteGeometry {
  coordinates: [number, number][]; // [lat, lng][]
}

export interface RouteCandidate {
  id: string;                      // misal 'route-0'
  label: 'A' | 'B' | 'C';
  distanceMeters: number;
  durationSeconds: number;
  geometry: RouteGeometry;
  isFastest: boolean;
}
