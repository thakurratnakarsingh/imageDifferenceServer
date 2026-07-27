import path from 'path';
import { writeFile } from 'fs/promises';
import { env } from '../../config/env';
import { sequelize } from '../../config/database';
import { GenerationJob, Level, LevelDifference } from '../../models';
import { AIImageDifferenceGenerator } from './AIImageDifferenceGenerator';
import { LocalImageDifferenceGenerator } from './LocalImageDifferenceGenerator';
import { GeneratePuzzleResult, ImageDifferenceGenerator } from './types';

export class PuzzleGenerationService {
  async process(level: Level, job: GenerationJob): Promise<GeneratePuzzleResult> {
    const provider = level.generationProvider;
    const local = new LocalImageDifferenceGenerator();
    const generator: ImageDifferenceGenerator = provider === 'ai' ? new AIImageDifferenceGenerator() : local;
    await job.update({ status: 'processing', progress: 10, currentStep: 'Analysing safe image regions', startedAt: new Date() });
    let lastError: unknown;
    for (let attempt = 1; attempt <= env.MAX_GENERATION_RETRIES; attempt += 1) {
      try {
        await job.update({ attemptCount: attempt, progress: 20, currentStep: `Generating attempt ${attempt}` });
        let result: GeneratePuzzleResult;
        try {
          result = await generator.generatePuzzle({
            originalPath: level.originalImagePath,
            outputDirectory: path.dirname(level.originalImagePath),
            difficulty: level.difficulty,
            seed: `${level.id}-${attempt}`
          });
        } catch (error) {
          if (provider !== 'hybrid') throw error;
          result = await local.generatePuzzle({
            originalPath: level.originalImagePath,
            outputDirectory: path.dirname(level.originalImagePath),
            difficulty: level.difficulty,
            seed: `${level.id}-${attempt}-fallback`
          });
        }
        await job.update({ status: 'validation', progress: 82, currentStep: 'Validating ten changed regions' });
        await LevelDifference.destroy({ where: { levelId: level.id } });
        await LevelDifference.bulkCreate(result.differences.map(difference => ({
          levelId: level.id, differenceNumber: difference.differenceNumber, shapeType: difference.shapeType,
          modificationType: difference.modificationType, normalizedX: difference.normalizedX, normalizedY: difference.normalizedY,
          normalizedWidth: difference.normalizedWidth, normalizedHeight: difference.normalizedHeight,
          normalizedRadius: difference.normalizedRadius, sourceRegionX: difference.x, sourceRegionY: difference.y,
          sourceRegionWidth: difference.width, sourceRegionHeight: difference.height, description: difference.description,
          confidenceScore: difference.confidenceScore, difficultyScore: difference.difficultyScore,
          isAutomaticallyGenerated: true, isActive: true
        })));
        await writeFile(path.join(path.dirname(level.originalImagePath), 'metadata.json'), JSON.stringify({ differences: result.differences, validation: result.validation }, null, 2));
        await sequelize.query(
          `INSERT INTO image_analysis_results
            (level_id, candidate_regions_json, difference_mask_path, similarity_score, changed_area_ratio, detected_component_count, validation_report_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
           ON DUPLICATE KEY UPDATE candidate_regions_json=VALUES(candidate_regions_json), difference_mask_path=VALUES(difference_mask_path),
             similarity_score=VALUES(similarity_score), changed_area_ratio=VALUES(changed_area_ratio),
             detected_component_count=VALUES(detected_component_count), validation_report_json=VALUES(validation_report_json), updated_at=NOW()`,
          { replacements: [level.id, JSON.stringify(result.differences), result.maskPath, 1-result.validation.changedAreaRatio,
            result.validation.changedAreaRatio, result.validation.detectedComponentCount, JSON.stringify(result.validation)] }
        );
        await level.update({
          modifiedImagePath: result.modifiedPath, previewImagePath: result.previewPath,
          generationStatus: 'completed', validationStatus: 'passed', reviewStatus: 'needs_review', isActive: false
        });
        await job.update({ status: 'completed', progress: 100, currentStep: 'Ready for review', completedAt: new Date(), errorCode: null, errorMessage: null });
        return result;
      } catch (error) {
        lastError = error;
      }
    }
    const message = lastError instanceof Error ? lastError.message : 'Unknown generation error';
    await level.update({ generationStatus: 'generation_failed', validationStatus: 'failed', isActive: false });
    await job.update({ status: 'failed', progress: 100, currentStep: 'Generation failed', errorCode: 'GENERATION_FAILED', errorMessage: message, completedAt: new Date() });
    throw lastError;
  }
}
