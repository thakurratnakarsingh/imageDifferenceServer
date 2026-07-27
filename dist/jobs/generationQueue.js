"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueGeneration = enqueueGeneration;
exports.recoverGenerationJobs = recoverGenerationJobs;
const models_1 = require("../models");
const PuzzleGenerationService_1 = require("../services/image-generation/PuzzleGenerationService");
const running = new Set();
const service = new PuzzleGenerationService_1.PuzzleGenerationService();
function enqueueGeneration(jobUuid) {
    if (running.has(jobUuid))
        return;
    running.add(jobUuid);
    setImmediate(async () => {
        try {
            const job = await models_1.GenerationJob.findOne({ where: { jobUuid } });
            if (!job || job.status === 'cancelled')
                return;
            const level = await models_1.Level.findByPk(job.levelId);
            if (!level)
                throw new Error('Level no longer exists');
            await service.process(level, job);
        }
        catch (error) {
            console.error('Generation job failed', jobUuid, error);
        }
        finally {
            running.delete(jobUuid);
        }
    });
}
async function recoverGenerationJobs() {
    const interrupted = await models_1.GenerationJob.findAll({ where: { status: ['pending', 'processing', 'validation'] } });
    for (const job of interrupted) {
        await job.update({ status: 'pending', progress: 0, currentStep: 'Recovered after server restart' });
        enqueueGeneration(job.jobUuid);
    }
}
