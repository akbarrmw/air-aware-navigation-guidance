/**
 * Utilitas pemformat durasi, waktu tambahan, dan jarak navigasi.
 */

/**
 * Memformat durasi detik ke dalam teks menit atau jam.
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
 * Memformat selisih waktu perjalanan tambahan.
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
 * Memformat jarak meter ke kilometer.
 */
export function formatDistance(meters: number): string {
  if (isNaN(meters) || meters <= 0) {
    return '0 km';
  }
  return `${(meters / 1000).toFixed(1)} km`;
}
