import { GeneratePuzzleInput, GeneratePuzzleResult, ImageDifferenceGenerator } from './types';

export class AIImageDifferenceGenerator implements ImageDifferenceGenerator {
  async generatePuzzle(_input: GeneratePuzzleInput): Promise<GeneratePuzzleResult> {
    throw new Error('AI provider adapter is not configured. Set AI_IMAGE_API_URL and implement the provider-specific transport.');
  }
}
