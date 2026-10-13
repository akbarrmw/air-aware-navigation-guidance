import { StationData } from '@/types/air-quality';
import { RouteCandidate } from '@/types/routing';
import { RouteExposureEstimate, RouteSegmentExposure, ConfidenceLevel } from '@/types/algorithms';
import { ECOPULSE_PARAMS } from '@/config/parameters';
import { calculateDistanceMeters, interpolateIdw } from './interpolation';
import { pm25ToCategory } from './aqiConversion';

/**
 * ALG-01: Estimasi Paparan Perjalanan berdasarkan Geometri Rute dan Data Stasiun
 */
export function calculateRouteExposure(
  route: RouteCandidate,
  stations: StationData[]
): RouteExposureEstimate {
  const coords = route.geometry.coordinates;
  const totalDurationMin = route.durationSeconds / 60;
  const totalDistanceM = route.distanceMeters;

  // Jika geometri tidak valid / durasi 0
  if (coords.length < 2 || totalDistanceM <= 0 || totalDurationMin <= 0) {
    return {
      routeLabel: route.label,
      exposureIndexPm25: null,
      avgPm25Concentration: null,
      category: 'Tidak Tersedia',
      coverageRatio: 0,
      confidenceLevel: 'unavailable',
      maxDataAgeMinutes: 0,
      isPartiallyImputed: false,
      isDominated: false,
      segments: [],
      topContributors: [],
      usedStations: [],
    };
  }

  // Segmentasi sederhana per PAR_01_SEGMENT_LENGTH_M (500m)
  const segments: RouteSegmentExposure[] = [];
  const allUsedStationsMap = new Map<string, { stationId: string; stationName: string; distanceMeters: number; value: number; ageMinutes: number }>();
  let validDataDurationMin = 0;
  let weightedConcentrationSum = 0;
  let maxAge = 0;
  let nearbyStationsDurationMin = 0;

  // Iterasi titik polyline
  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const segDist = calculateDistanceMeters(p1[0], p1[1], p2[0], p2[1]);
    const segDurationMin = (segDist / totalDistanceM) * totalDurationMin;
    const midLat = (p1[0] + p2[0]) / 2;
    const midLng = (p1[1] + p2[1]) / 2;

    const idw = interpolateIdw(midLat, midLng, stations);

    if (idw.estimatedValue !== null) {
      validDataDurationMin += segDurationMin;
      weightedConcentrationSum += idw.estimatedValue * segDurationMin;

      if (idw.nearestStationDistanceM && idw.nearestStationDistanceM <= ECOPULSE_PARAMS.PAR_06_NEARBY_STATION_KM * 1000) {
        nearbyStationsDurationMin += segDurationMin;
      }

      for (const st of idw.usedStations) {
        if (!allUsedStationsMap.has(st.stationId)) {
          allUsedStationsMap.set(st.stationId, st);
        }
        if (st.ageMinutes > maxAge) maxAge = st.ageMinutes;
      }
    }

    segments.push({
      segmentIndex: i,
      startCoordinate: p1,
      endCoordinate: p2,
      lengthMeters: Math.round(segDist),
      durationSeconds: Math.round(segDurationMin * 60),
      estimatedPm25: idw.estimatedValue,
      category: pm25ToCategory(idw.estimatedValue),
      percentContribution: 0, // dihitung setelah total EI didapat
    });
  }

  const coverageRatio = Number((validDataDurationMin / totalDurationMin).toFixed(2));

  // Jika cakupan di bawah batas minimum (PAR-08: 0.20)
  if (coverageRatio < ECOPULSE_PARAMS.PAR_08_MIN_COVERAGE_RATIO) {
    return {
      routeLabel: route.label,
      exposureIndexPm25: null,
      avgPm25Concentration: null,
      category: 'Tidak Tersedia',
      coverageRatio,
      confidenceLevel: 'unavailable',
      maxDataAgeMinutes: maxAge,
      isPartiallyImputed: false,
      isDominated: false,
      segments,
      topContributors: [],
      usedStations: Array.from(allUsedStationsMap.values()),
    };
  }

  // Hitung rata-rata konsentrasi segmen yang berdata
  const avgPm25 = Number((weightedConcentrationSum / validDataDurationMin).toFixed(1));
  const totalEI = Math.round(avgPm25 * totalDurationMin); // Imputasi rata-rata rute untuk total perjalanan
  const isPartiallyImputed = coverageRatio < 1.0;

  // Hitung persentase kontribusi per segmen
  for (const seg of segments) {
    if (seg.estimatedPm25 !== null && totalEI > 0) {
      const segEI = seg.estimatedPm25 * (seg.durationSeconds / 60);
      seg.percentContribution = Number(((segEI / totalEI) * 100).toFixed(1));
    }
  }

  // Ambil 3 segmen dengan paparan terbesar
  const topContributors = [...segments]
    .filter((s) => s.estimatedPm25 !== null)
    .sort((a, b) => b.percentContribution - a.percentContribution)
    .slice(0, 3);

  // Penentuan tingkat keyakinan (Confidence Level)
  let confidenceLevel: ConfidenceLevel = 'low';
  const hasExpired = maxAge > ECOPULSE_PARAMS.PAR_05_EXPIRED_THRESHOLD_HOURS * 60;
  const isAllFresh = maxAge <= ECOPULSE_PARAMS.PAR_04_FRESH_THRESHOLD_HOURS * 60;
  const nearbyStationRatio = nearbyStationsDurationMin / totalDurationMin;

  if (coverageRatio >= 0.8 && nearbyStationRatio >= 0.5 && isAllFresh) {
    confidenceLevel = 'high';
  } else if (coverageRatio >= 0.5 && !hasExpired) {
    confidenceLevel = 'medium';
  }

  return {
    routeLabel: route.label,
    exposureIndexPm25: totalEI,
    avgPm25Concentration: avgPm25,
    category: pm25ToCategory(avgPm25),
    coverageRatio,
    confidenceLevel,
    maxDataAgeMinutes: maxAge,
    isPartiallyImputed,
    isDominated: false,
    segments,
    topContributors,
    usedStations: Array.from(allUsedStationsMap.values()),
  };
}
