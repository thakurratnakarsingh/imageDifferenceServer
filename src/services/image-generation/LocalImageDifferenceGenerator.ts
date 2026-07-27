import { mkdir } from 'fs/promises';
import path from 'path';
import { ImageAnalysisService } from './ImageAnalysisService';
import { RegionSelectionService } from './RegionSelectionService';
import { ImageModificationService } from './ImageModificationService';
import { DifferenceValidationService } from './DifferenceValidationService';
import { GeneratePuzzleInput, GeneratePuzzleResult, ImageDifferenceGenerator } from './types';

export class LocalImageDifferenceGenerator implements ImageDifferenceGenerator {
  constructor(
    private readonly analysis = new ImageAnalysisService(),
    private readonly selector = new RegionSelectionService(),
    private readonly modifier = new ImageModificationService(),
    private readonly validator = new DifferenceValidationService()
  ) {}

  async generatePuzzle(input: GeneratePuzzleInput): Promise<GeneratePuzzleResult> {
    await mkdir(input.outputDirectory, { recursive: true });
    const analysis = await this.analysis.analyse(input.originalPath);
    const differences = this.selector.select(analysis.candidates, analysis.width, analysis.height, input.difficulty, input.seed);
    const modifiedPath = path.join(input.outputDirectory, 'modified.png');
    const previewPath = path.join(input.outputDirectory, 'preview.jpg');
    const maskPath = path.join(input.outputDirectory, 'difference-mask.png');
    await this.modifier.apply(input.originalPath, modifiedPath, differences);
    await this.modifier.createMask(analysis.width, analysis.height, maskPath, differences);
    const validation = await this.validator.validate(input.originalPath, modifiedPath, differences);
    if (!validation.valid) throw Object.assign(new Error(validation.warnings.join('; ') || 'Generated puzzle failed validation'), { validation });
    await this.modifier.createPreview(modifiedPath, previewPath, differences);
    return { originalPath: input.originalPath, modifiedPath, previewPath, maskPath, width: analysis.width, height: analysis.height, differences, validation };
  }
}
