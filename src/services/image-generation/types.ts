export type ShapeType = 'circle' | 'rectangle';
export type ModificationType =
  | 'colour_change' | 'object_addition' | 'object_removal'
  | 'pattern_change' | 'shape_change' | 'rotation';

export interface AnalysisRegion {
  x: number; y: number; width: number; height: number; score: number;
}

export interface DifferenceRegion extends AnalysisRegion {
  differenceNumber: number;
  shapeType: ShapeType;
  modificationType: ModificationType;
  normalizedX: number;
  normalizedY: number;
  normalizedWidth?: number;
  normalizedHeight?: number;
  normalizedRadius?: number;
  description: string;
  confidenceScore: number;
  difficultyScore: number;
}

export interface GeneratePuzzleInput {
  originalPath: string;
  outputDirectory: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  seed: string;
}

export interface GeneratePuzzleResult {
  originalPath: string;
  modifiedPath: string;
  previewPath: string;
  maskPath: string;
  width: number;
  height: number;
  differences: DifferenceRegion[];
  validation: ValidationReport;
}

export interface ValidationReport {
  valid: boolean;
  dimensionsMatch: boolean;
  changedAreaRatio: number;
  detectedComponentCount: number;
  coveredDifferenceCount: number;
  unexpectedChangedPixelRatio: number;
  warnings: string[];
}

export interface ImageDifferenceGenerator {
  generatePuzzle(input: GeneratePuzzleInput): Promise<GeneratePuzzleResult>;
}
