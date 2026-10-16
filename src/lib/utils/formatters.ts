/**
 * @file formatters.ts
 * @description Helper fungsi pemformat waktu dan metrik numerik navigasi.
 */

/**
 * Format durasi detik ke dalam format ramah pengguna:
 * - < 60 menit: "23 menit"
 * - >= 60 menit: "1 jam 23 menit" (atau "2 jam" jika menit genap 0)
 */
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) {
    return '0 menit';
  }

  const totalMinutes = Math.round(seconds / 60);

  if (totalMinutes < 60) {
    return `${totalMinutes} menit`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} jam`;
  }

  return `${hours} jam ${remainingMinutes} menit`;
}

/**
 * Format selisih waktu perjalanan tambahan (misal: "+3 mnt", "+1 jam 5 mnt")
 */
export function formatExtraTime(extraSeconds: number): string {
  if (!extraSeconds || extraSeconds <= 0) {
    return '';
  }

  const totalMinutes = Math.round(extraSeconds / 60);

  if (totalMinutes < 60) {
    return `+${totalMinutes} mnt`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  if (remainingMinutes === 0) {
    return `+${hours} jam`;
  }

  return `+${hours} jam ${remainingMinutes} mnt`;
}

/**
 * Format jarak meter ke kilometer
 */
export function formatDistance(meters: number): string {
  if (isNaN(meters) || meters <= 0) {
    return '0 km';
  }
  return `${(meters / 1000).toFixed(1)} km`;
}
