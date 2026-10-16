/**
 * @file evalLeaveOneOut.ts
 * @description Skrip evaluasi galat spasial Leave-One-Station-Out Cross Validation (LOOCV)
 * untuk algoritma interpolasi spasial Inverse Distance Weighting (IDW) pada kota pilot AANG (M-05, TC-28).
 * 
 * Prinsip Ilmiah:
 * - Menyembunyikan 1 stasiun observasi sebagai ground truth.
 * - Memprediksi nilai PM2.5 di koordinat stasiun tersebut menggunakan stasiun sisanya.
 * - Menghitung Mean Absolute Error (MAE) dan Root Mean Squared Error (RMSE).
 * - Melaporkan angka apa adanya secara transparan dan jujur tanpa manipulasi klaim akurasi.
 * 
 * @author Person 1 (Core Algorithm & System Integration)
 * @see CODE_SPEC_AANG.md Bagian 6 (M-05, TC-28) & list_person1.md Tahap 5
 */

import { SEMARANG_PILOT_STATIONS } from '../src/fixtures/mockStations';
import { idwAtPoint } from '../src/lib/algorithms/interpolation';
import { haversineMeters } from '../src/lib/algorithms/geoMath';
import { DEFAULT_ALGORITHM_PARAMS } from '../src/config/parameters';
import type { StationData } from '../src/types/air-quality';
import type { AlgorithmParams } from '../src/types/algorithms';

/**
 * Hasil evaluasi per stasiun dalam skenario Leave-One-Out.
 */
export interface StationEvalResult {
  stationId: string;
  stationName: string;
  actualPm25: number;
  predictedPm25: number | null;
  error: number | null;
  absoluteError: number | null;
  squaredError: number | null;
  percentageError: number | null;
  stationsAvailable: number;
  nearestNeighborName: string | null;
  nearestNeighborDistanceMeters: number | null;
}

/**
 * Laporan komprehensif metrik galat spasial evaluasi IDW.
 */
export interface LeaveOneOutReport {
  totalStations: number;
  evaluatedCount: number;
  skippedCount: number;
  meanAbsoluteError: number;
  rootMeanSquaredError: number;
  meanAbsolutePercentageError: number;
  results: StationEvalResult[];
}

/**
 * Menjalankan evaluasi Leave-One-Station-Out terhadap himpunan stasiun pemantau udara.
 * 
 * @param stations Daftar stasiun pemantau (default: MOCK_STATIONS kota pilot Semarang)
 * @param params Parameter numerik algoritma (default: DEFAULT_ALGORITHM_PARAMS)
 * @returns Laporan komprehensif LeaveOneOutReport
 */
export function evaluateLeaveOneOut(
  stations: StationData[] = SEMARANG_PILOT_STATIONS,
  params: AlgorithmParams = DEFAULT_ALGORITHM_PARAMS
): LeaveOneOutReport {
  // Hanya uji stasiun yang memiliki data konsentrasi PM2.5 terukur valid
  const validStations = stations.filter(
    (s) => s.pm25Concentration !== null && s.pm25Concentration >= 0
  );

  const results: StationEvalResult[] = [];

  for (let i = 0; i < validStations.length; i++) {
    const targetStation = validStations[i];
    const actual = targetStation.pm25Concentration!;

    // Himpunan stasiun sisa (sembunyikan stasiun ke-i)
    const remainingStations = validStations.filter((_, idx) => idx !== i);

    // Hitung stasiun tetangga terdekat di antara stasiun sisa
    let nearestNeighborName: string | null = null;
    let nearestNeighborDistanceMeters: number | null = null;

    for (const other of remainingStations) {
      const dist = haversineMeters(
        [targetStation.lat, targetStation.lng],
        [other.lat, other.lng]
      );
      if (
        nearestNeighborDistanceMeters === null ||
        dist < nearestNeighborDistanceMeters
      ) {
        nearestNeighborDistanceMeters = dist;
        nearestNeighborName = other.stationName;
      }
    }

    // Prediksi nilai menggunakan algoritma ALG-02 IDW
    const idwResult = idwAtPoint(
      [targetStation.lat, targetStation.lng],
      remainingStations,
      params
    );

    const predicted = idwResult.pm25;

    if (predicted !== null) {
      const error = predicted - actual;
      const absError = Math.abs(error);
      const sqError = error * error;
      const pctError = (absError / actual) * 100;

      results.push({
        stationId: targetStation.stationId,
        stationName: targetStation.stationName,
        actualPm25: Number(actual.toFixed(2)),
        predictedPm25: Number(predicted.toFixed(2)),
        error: Number(error.toFixed(2)),
        absoluteError: Number(absError.toFixed(2)),
        squaredError: Number(sqError.toFixed(2)),
        percentageError: Number(pctError.toFixed(1)),
        stationsAvailable: idwResult.stationsUsed.length,
        nearestNeighborName,
        nearestNeighborDistanceMeters: nearestNeighborDistanceMeters !== null
          ? Math.round(nearestNeighborDistanceMeters)
          : null,
      });
    } else {
      // Kasus tidak ada stasiun dalam radius pencarian
      results.push({
        stationId: targetStation.stationId,
        stationName: targetStation.stationName,
        actualPm25: Number(actual.toFixed(2)),
        predictedPm25: null,
        error: null,
        absoluteError: null,
        squaredError: null,
        percentageError: null,
        stationsAvailable: 0,
        nearestNeighborName,
        nearestNeighborDistanceMeters: nearestNeighborDistanceMeters !== null
          ? Math.round(nearestNeighborDistanceMeters)
          : null,
      });
    }
  }

  // Hitung metrik agregat untuk stasiun yang berhasil diestimasi
  const evaluated = results.filter((r) => r.predictedPm25 !== null);
  const n = evaluated.length;

  let sumAbsError = 0;
  let sumSqError = 0;
  let sumPctError = 0;

  for (const r of evaluated) {
    sumAbsError += r.absoluteError!;
    sumSqError += r.squaredError!;
    sumPctError += r.percentageError!;
  }

  const mae = n > 0 ? Number((sumAbsError / n).toFixed(2)) : 0;
  const rmse = n > 0 ? Number(Math.sqrt(sumSqError / n).toFixed(2)) : 0;
  const mape = n > 0 ? Number((sumPctError / n).toFixed(1)) : 0;

  return {
    totalStations: validStations.length,
    evaluatedCount: n,
    skippedCount: validStations.length - n,
    meanAbsoluteError: mae,
    rootMeanSquaredError: rmse,
    meanAbsolutePercentageError: mape,
    results,
  };
}

/**
 * Mencetak laporan tabel evaluasi galat ke konsol terminal.
 */
export function printReport(report: LeaveOneOutReport): void {
  console.log('\n========================================================================================');
  console.log('       AANG — EVALUASI GALAT SPASIAL INTERPOLASI IDW (LEAVE-ONE-OUT / M-05, TC-28)      ');
  console.log('========================================================================================\n');
  console.log(`Kota Pilot        : Semarang (Fixture Pilot City)`);
  console.log(`Algoritma         : ALG-02 Inverse Distance Weighting (Power p = 2, Radius = 10 km)`);
  console.log(`Total Stasiun     : ${report.totalStations}`);
  console.log(`Berhasil Dievaluasi: ${report.evaluatedCount} stasiun`);
  if (report.skippedCount > 0) {
    console.log(`Dilewati (di luar radius): ${report.skippedCount} stasiun`);
  }
  console.log('\n--- TABEL HASIL EVALUASI PER STASIUN ---');
  console.log('----------------------------------------------------------------------------------------');
  console.log('| Stasiun Pengujian (Target)       | Aktual | Estimasi | Selisih | Abs Error | Tetangga Terdekat (Jarak) |');
  console.log('----------------------------------------------------------------------------------------');

  for (const r of report.results) {
    const name = r.stationName.padEnd(32, ' ');
    const act = (r.actualPm25.toString() + ' µg').padStart(8, ' ');
    const pred = (r.predictedPm25 !== null ? r.predictedPm25.toString() + ' µg' : 'N/A').padStart(8, ' ');
    const diff = (r.error !== null ? (r.error > 0 ? `+${r.error}` : `${r.error}`) : 'N/A').padStart(7, ' ');
    const abs = (r.absoluteError !== null ? `${r.absoluteError}` : 'N/A').padStart(9, ' ');
    const neighbor = r.nearestNeighborName
      ? `${r.nearestNeighborName.substring(0, 18)} (${((r.nearestNeighborDistanceMeters ?? 0) / 1000).toFixed(1)} km)`
      : '-';

    console.log(`| ${name} | ${act} | ${pred} | ${diff} | ${abs} | ${neighbor.padEnd(25, ' ')} |`);
  }

  console.log('----------------------------------------------------------------------------------------\n');
  console.log('--- RINGKASAN METRIK AKURASI SPASIAL (DILAPORKAN APA ADANYA) ---');
  console.log(`• Mean Absolute Error (MAE)            : ${report.meanAbsoluteError} µg/m³`);
  console.log(`• Root Mean Squared Error (RMSE)       : ${report.rootMeanSquaredError} µg/m³`);
  console.log(`• Mean Absolute Percentage Error (MAPE): ${report.meanAbsolutePercentageError} %\n`);

  console.log('Catatan Ilmiah Transparansi (PRD §8.3):');
  console.log('1. Metode IDW menghasilkan interpolasi permukaan yang halus secara deterministik.');
  console.log('2. Pada kota pilot dengan 4 stasiun pemantau berjarak 3-8 km, galat estimasi wajar');
  console.log('   mencerminkan densitas stasiun yang terbatas. Angka ini disajikan apa adanya');
  console.log('   tanpa manipulasi klaim berlebihan demi integritas ilmiah platform AANG.');
  console.log('========================================================================================\n');
}

// Jalankan evaluasi jika dieksekusi langsung dari CLI
if (typeof require !== 'undefined' && require.main === module) {
  const report = evaluateLeaveOneOut();
  printReport(report);
} else if (process.argv[1] && process.argv[1].includes('evalLeaveOneOut')) {
  const report = evaluateLeaveOneOut();
  printReport(report);
}
