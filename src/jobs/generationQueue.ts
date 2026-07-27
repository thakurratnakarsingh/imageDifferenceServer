import { GenerationJob, Level } from '../models';
import { PuzzleGenerationService } from '../services/image-generation/PuzzleGenerationService';

const running = new Set<string>();
const service = new PuzzleGenerationService();

export function enqueueGeneration(jobUuid: string) {
  if (running.has(jobUuid)) return;
  running.add(jobUuid);
  setImmediate(async () => {
    try {
      const job = await GenerationJob.findOne({ where: { jobUuid } });
      if (!job || job.status === 'cancelled') return;
      const level = await Level.findByPk(job.levelId);
      if (!level) throw new Error('Level no longer exists');
      await service.process(level, job);
    } catch (error) {
      console.error('Generation job failed', jobUuid, error);
    } finally {
      running.delete(jobUuid);
    }
  });
}

export async function recoverGenerationJobs() {
  const interrupted = await GenerationJob.findAll({ where: { status: ['pending','processing','validation'] } });
  for (const job of interrupted) {
    await job.update({ status: 'pending', progress: 0, currentStep: 'Recovered after server restart' });
    enqueueGeneration(job.jobUuid);
  }
}
