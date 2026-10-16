/**
 * @file polyline.ts
 * @description Implementasi algoritma Google Encoded Polyline Format (presisi 5 desimal).
 * Kompatibel dengan Mapbox, Leaflet, dan OSRM tanpa dependensi eksternal.
 * 
 * @author Person 3 (Database, Auth, & History Services)
 * @module lib/trips/polyline
 * @see https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */

import type { LatLngTuple } from '@/types/common';

/**
 * Mengenkode array koordinat [latitude, longitude] menjadi encoded polyline string.
 * Presisi: 1e5 (5 desimal ~1 meter).
 * 
 * @param coordinates Array pasangan [lat, lng]
 * @returns String encoded polyline
 */
export function encodePolyline(coordinates: LatLngTuple[]): string {
  if (!coordinates || coordinates.length === 0) {
    return '';
  }

  let output = '';
  let prevLat = 0;
  let prevLng = 0;

  for (const [lat, lng] of coordinates) {
    const latE5 = Math.round(lat * 1e5);
    const lngE5 = Math.round(lng * 1e5);

    output += encodeSignedValue(latE5 - prevLat);
    output += encodeSignedValue(lngE5 - prevLng);

    prevLat = latE5;
    prevLng = lngE5;
  }

  return output;
}

/**
 * Men-decode string encoded polyline menjadi array koordinat [latitude, longitude].
 * 
 * @param encodedString String polyline
 * @returns Array pasangan koordinat [lat, lng]
 */
export function decodePolyline(encodedString: string): LatLngTuple[] {
  if (!encodedString || encodedString.trim().length === 0) {
    return [];
  }

  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: LatLngTuple[] = [];

  while (index < encodedString.length) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encodedString.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encodedString.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coordinates.push([Number((lat / 1e5).toFixed(6)), Number((lng / 1e5).toFixed(6))]);
  }

  return coordinates;
}

function encodeSignedValue(val: number): string {
  let s = val < 0 ? ~(val << 1) : val << 1;
  let res = '';

  while (s >= 0x20) {
    res += String.fromCharCode((0x20 | (s & 0x1f)) + 63);
    s >>= 5;
  }
  res += String.fromCharCode(s + 63);
  return res;
}
