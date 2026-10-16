/**
 * Tipe data pencarian lokasi dan geocoding.
 */

/**
 * Kandidat lokasi hasil pencarian nama tempat atau alamat geokoding.
 */
export interface LocationCandidate {
  /** Label nama tempat lengkap atau alamat terformat */
  label: string;
  /** Latitude koordinat lokasi */
  lat: number;
  /** Longitude koordinat lokasi */
  lng: number;
  /** Menandakan apakah koordinat berada di dalam area batas kota pilot uji coba */
  withinPilotArea: boolean;
}

/**
 * Payload data respons dari endpoint geocoding (/api/geocode).
 */
export interface GeocodePayload {
  /** Kata kunci pencarian yang dimasukkan pengguna */
  query: string;
  /** Daftar kandidat lokasi yang relevan terurut dari yang paling mendekati */
  candidates: LocationCandidate[];
}
