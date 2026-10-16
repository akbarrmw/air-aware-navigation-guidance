/**
 * Modul pemotongan lintasan rute navigasi menjadi segmen-segmen diskrit.
 */

import type { LatLngTuple } from '@/types/common';
import type { PathSegment } from '@/types/algorithms';
import { haversineMeters, pathLengthMeters, interpolatePoint } from './geoMath';

/**
 * Memecah array koordinat lintasan rute menjadi segmen-segmen diskrit dengan panjang seragam.
 */
export function splitPath(
  path: LatLngTuple[],
  segmentLengthMeters = 500
): PathSegment[] {
  if (path.length < 2) {
    return [];
  }

  const totalLength = pathLengthMeters(path);

  // Kasus rute sangat pendek: dijadikan 1 segmen utuh (TC-26)
  if (totalLength <= segmentLengthMeters) {
    return [
      {
        index: 0,
        coordinates: [...path],
        lengthMeters: Math.round(totalLength),
        startDistanceMeters: 0,
        endDistanceMeters: Math.round(totalLength),
      },
    ];
  }

  const segments: PathSegment[] = [];
  let currentSegmentCoords: LatLngTuple[] = [path[0]];
  let currentSegmentDist = 0;
  let cumulativeDist = 0;
  let segmentIndex = 0;
  let segmentStartDist = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const p1 = path[i];
    const p2 = path[i + 1];
    const legDist = haversineMeters(p1, p2);

    if (legDist <= 0) continue;

    let legTraversed = 0;

    while (legTraversed < legDist) {
      const remainingForSegment = segmentLengthMeters - currentSegmentDist;
      const remainingInLeg = legDist - legTraversed;

      if (remainingInLeg < remainingForSegment) {
        // Kaki ini belum memenuhi panjang segmen, masukkan p2 ke segmen saat ini
        currentSegmentCoords.push(p2);
        currentSegmentDist += remainingInLeg;
        cumulativeDist += remainingInLeg;
        legTraversed = legDist;
      } else {
        // Kaki ini memenuhi atau melewati kuota segmen, lakukan interpolasi titik potong
        const splitFraction = (legTraversed + remainingForSegment) / legDist;
        const splitPoint = interpolatePoint(p1, p2, splitFraction);

        currentSegmentCoords.push(splitPoint);
        cumulativeDist += remainingForSegment;

        // Tutup segmen saat ini
        segments.push({
          index: segmentIndex++,
          coordinates: currentSegmentCoords,
          lengthMeters: Math.round(segmentLengthMeters),
          startDistanceMeters: Math.round(segmentStartDist),
          endDistanceMeters: Math.round(cumulativeDist),
        });

        // Mulai segmen baru dari titik potong yang sama
        segmentStartDist = cumulativeDist;
        currentSegmentCoords = [splitPoint];
        currentSegmentDist = 0;
        legTraversed += remainingForSegment;
      }
    }
  }

  // Jika masih ada sisa koordinat pada segmen terakhir
  if (currentSegmentCoords.length > 1 && currentSegmentDist > 0) {
    segments.push({
      index: segmentIndex,
      coordinates: currentSegmentCoords,
      lengthMeters: Math.round(currentSegmentDist),
      startDistanceMeters: Math.round(segmentStartDist),
      endDistanceMeters: Math.round(cumulativeDist),
    });
  }

  return segments;
}
