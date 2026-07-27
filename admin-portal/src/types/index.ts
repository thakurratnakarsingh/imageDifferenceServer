export interface Difference {
  id: number; differenceNumber: number; shapeType: 'circle'|'rectangle'; modificationType: string;
  normalizedX: number; normalizedY: number; normalizedWidth?: number; normalizedHeight?: number; normalizedRadius?: number;
  description: string; confidenceScore: number; isActive: boolean;
}
export interface Level {
  id: number; levelNumber: number; title: string; difficulty: string; reviewStatus: string; validationStatus: string;
  originalImageUrl: string; modifiedImageUrl: string; previewImageUrl: string; totalDifferences: number; differences: Difference[];
}
export interface Job {
  jobUuid: string; levelId: number; status: string; progress: number; currentStep: string; errorMessage?: string;
  originalImageUrl?: string; modifiedImageUrl?: string; previewImageUrl?: string; differences?: Difference[];
}
