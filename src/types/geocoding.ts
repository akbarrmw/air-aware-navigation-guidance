/**
 * @file geocoding.ts
 * @description Kontrak data untuk layanan pencarian lokasi dan geocoding.
 * @author Person 1 (Core Algorithm & System Integration)
 * @module types/geocoding
 * @see CODE_SPEC_AANG.md Bagian 3.4
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
