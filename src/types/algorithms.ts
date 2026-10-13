import { RouteCandidate } from './routing';
import { AirQualityCategory } from './air-quality';

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'unavailable';

export interface RouteSegmentExposure {
  segmentIndex: number;
  startCoordinate: [number, number];
  endCoordinate: [number, number];
  lengthMeters: number;
  durationSeconds: number;
  estimatedPm25: number | null; // µg/m³ (null jika no data)
  category: AirQualityCategory | 'Tidak Tersedia';
  percentContribution: number;  // % terhadap total EI
}

export interface RouteExposureEstimate {
  routeLabel: 'A' | 'B' | 'C';
  exposureIndexPm25: number | null; // µg/m³·menit
  avgPm25Concentration: number | null; // µg/m³
  category: AirQualityCategory | 'Tidak Tersedia';
  coverageRatio: number;        // 0.0 - 1.0
  confidenceLevel: ConfidenceLevel;
  maxDataAgeMinutes: number;
  isPartiallyImputed: boolean;
  isDominated: boolean;         // Pareto dominated
  segments: RouteSegmentExposure[];
  topContributors: RouteSegmentExposure[]; // Top 3 segmen
  usedStations: {
    stationId: string;
    stationName: string;
    distanceMeters: number;
    value: number;
    ageMinutes: number;
  }[];
}

export interface RecommendationMessage {
  ruleId: string;
  severity: 'info' | 'warning' | 'alert';
  message: string;
  basis: string;
}

export interface RouteAnalysisItem extends RouteCandidate {
  estimate: RouteExposureEstimate;
  timeDiffVsFastestMin: number;
  timeDiffPercent: number;
  eiDiffPercentVsFastest: number | null;
}

export interface AnalyzeRoutesResponseData {
  routes: RouteAnalysisItem[];
  recommendedRouteLabel: 'A' | 'B' | 'C';
  recommendationExplanation: string;
  actionMessages: RecommendationMessage[];
  warnings: string[];
  disclaimer: string;
}

export interface OptimizationPreference {
  exposureWeight: number;        // 0.0 s/d 1.0
  maxExtraTimePercent: number | null; // null = unlimited, default 30
}
