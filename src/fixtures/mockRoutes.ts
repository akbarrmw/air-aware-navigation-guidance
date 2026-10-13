import { RouteCandidate } from '@/types/routing';

/**
 * Fixture alternatif rute A, B, C dari Tembalang (Undip) ke Simpang Lima
 */
export const MOCK_ROUTES: RouteCandidate[] = [
  {
    id: 'route-0',
    label: 'A',
    isFastest: true,
    distanceMeters: 8500,
    durationSeconds: 1200, // 20 menit
    geometry: {
      coordinates: [
        [-7.0514, 110.4388],
        [-7.0350, 110.4320],
        [-7.0150, 110.4280],
        [-6.9928, 110.4222],
      ],
    },
  },
  {
    id: 'route-1',
    label: 'B',
    isFastest: false,
    distanceMeters: 9200,
    durationSeconds: 1380, // 23 menit (+3 menit)
    geometry: {
      coordinates: [
        [-7.0514, 110.4388],
        [-7.0420, 110.4200],
        [-7.0200, 110.4150],
        [-6.9928, 110.4222],
      ],
    },
  },
  {
    id: 'route-2',
    label: 'C',
    isFastest: false,
    distanceMeters: 10400,
    durationSeconds: 1620, // 27 menit (+7 menit)
    geometry: {
      coordinates: [
        [-7.0514, 110.4388],
        [-7.0500, 110.4500],
        [-7.0100, 110.4450],
        [-6.9928, 110.4222],
      ],
    },
  },
];
