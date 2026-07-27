"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRoutes = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const promises_1 = require("fs/promises");
const crypto_1 = require("crypto");
const env_1 = require("../config/env");
const database_1 = require("../config/database");
const models_1 = require("../models");
const auth_1 = require("../middleware/auth");
const ImageValidationService_1 = require("../services/image-generation/ImageValidationService");
const generationQueue_1 = require("../jobs/generationQueue");
const ImageModificationService_1 = require("../services/image-generation/ImageModificationService");
const DifferenceValidationService_1 = require("../services/image-generation/DifferenceValidationService");
exports.adminRoutes = (0, express_1.Router)();
exports.adminRoutes.use(auth_1.requireAdmin);
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: env_1.env.MAX_FILE_SIZE_MB * 1024 * 1024, files: 1 } });
const imageValidator = new ImageValidationService_1.ImageValidationService();
const uploadsRoot = path_1.default.resolve(__dirname, '../../uploads');
const publicUrl = (filePath) => {
    if (!filePath)
        return null;
    const normalized = filePath.replace(/\\/g, '/');
    const index = normalized.lastIndexOf('/uploads/');
    const relative = index >= 0 ? normalized.slice(index) : `/${normalized.replace(/^.*?uploads\//, 'uploads/')}`;
    return `${env_1.env.BASE_URL}${relative}`;
};
const difficultyForLevel = (level) => level <= 200 ? 'easy' : level <= 500 ? 'medium' : level <= 800 ? 'hard' : 'expert';
exports.adminRoutes.get('/dashboard', async (_req, res) => {
    const [actresses, levels, activeLevels, draftLevels, jobs, failedJobs, players, differences] = await Promise.all([
        models_1.Actress.count(), models_1.Level.count(), models_1.Level.count({ where: { isActive: true } }),
        models_1.Level.count({ where: { reviewStatus: 'draft' } }), models_1.GenerationJob.count(),
        models_1.GenerationJob.count({ where: { status: 'failed' } }), models_1.User.count(), models_1.LevelDifference.count({ where: { isActive: true } })
    ]);
    res.json({ success: true, data: { actresses, levels, activeLevels, draftLevels, generationJobs: jobs, failedGenerationJobs: failedJobs, players, differences } });
});
exports.adminRoutes.get('/actresses', async (_req, res) => res.json({ success: true, data: await models_1.Actress.findAll({ order: [['name', 'ASC']] }) }));
exports.adminRoutes.post('/actresses', async (req, res) => res.status(201).json({ success: true, data: await models_1.Actress.create(req.body) }));
exports.adminRoutes.put('/actresses/:id', async (req, res) => {
    const item = await models_1.Actress.findByPk(req.params.id);
    if (!item)
        return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: await item.update(req.body) });
});
exports.adminRoutes.patch('/actresses/:id/status', async (req, res) => {
    const item = await models_1.Actress.findByPk(req.params.id);
    if (!item)
        return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: await item.update({ isActive: Boolean(req.body.isActive) }) });
});
exports.adminRoutes.delete('/actresses/:id', async (req, res) => {
    const levels = await models_1.Level.count({ where: { actressId: req.params.id } });
    if (levels)
        return res.status(409).json({ success: false, message: 'Deactivate categories that already have levels' });
    await models_1.Actress.destroy({ where: { id: req.params.id } });
    res.status(204).end();
});
exports.adminRoutes.get('/levels', async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(100, Number(req.query.limit) || 20);
    const where = req.query.status ? { reviewStatus: req.query.status } : {};
    const result = await models_1.Level.findAndCountAll({ where, include: [models_1.Actress], limit, offset: (page - 1) * limit, order: [['levelNumber', 'DESC']] });
    res.json({ success: true, data: result.rows, meta: { page, limit, total: result.count } });
});
exports.adminRoutes.get('/levels/:id', async (req, res) => {
    const level = await models_1.Level.findByPk(req.params.id, { include: [{ model: models_1.LevelDifference, as: 'differences' }, models_1.Actress] });
    if (!level)
        return res.status(404).json({ success: false, message: 'Level not found' });
    res.json({ success: true, data: withUrls(level) });
});
exports.adminRoutes.put('/levels/:id', async (req, res) => {
    const level = await models_1.Level.findByPk(req.params.id);
    if (!level)
        return res.status(404).json({ success: false, message: 'Level not found' });
    const allowed = ['title', 'timeLimit', 'maximumLives', 'maximumHints', 'completionBonus'];
    const changes = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    res.json({ success: true, data: await level.update(changes) });
});
exports.adminRoutes.patch('/levels/:id/status', async (req, res) => {
    const level = await models_1.Level.findByPk(req.params.id);
    if (!level)
        return res.status(404).json({ success: false, message: 'Level not found' });
    if (req.body.isActive && level.reviewStatus !== 'approved')
        return res.status(409).json({ success: false, message: 'Only approved levels can be activated' });
    res.json({ success: true, data: await level.update({ isActive: Boolean(req.body.isActive) }) });
});
exports.adminRoutes.delete('/levels/:id', async (req, res) => { await models_1.Level.destroy({ where: { id: req.params.id } }); res.status(204).end(); });
exports.adminRoutes.post('/puzzle-generator/generate', upload.single('originalImage'), async (req, res) => {
    if (!req.file)
        return res.status(400).json({ success: false, message: 'originalImage is required' });
    const levelNumber = Number(req.body.levelNumber);
    if (!Number.isInteger(levelNumber) || levelNumber < 1 || levelNumber > 1000)
        return res.status(400).json({ success: false, message: 'levelNumber must be 1–1000' });
    if (await models_1.Level.count({ where: { levelNumber } }))
        return res.status(409).json({ success: false, message: 'Level number already exists' });
    const actress = await models_1.Actress.findByPk(req.body.actressId);
    if (!actress)
        return res.status(400).json({ success: false, message: 'Valid actressId is required' });
    const validated = await imageValidator.validate(req.file.buffer);
    const levelDir = path_1.default.join(uploadsRoot, 'levels', (0, crypto_1.randomUUID)());
    await (0, promises_1.mkdir)(levelDir, { recursive: true });
    const originalPath = path_1.default.join(levelDir, 'original.jpg');
    await (0, promises_1.writeFile)(originalPath, validated.normalizedBuffer);
    const difficulty = req.body.difficulty || difficultyForLevel(levelNumber);
    const level = await models_1.Level.create({
        levelNumber, actressId: actress.id, title: req.body.title || 'Find 10 Differences',
        originalImagePath: originalPath, imageWidth: validated.width, imageHeight: validated.height, difficulty,
        timeLimit: Number(req.body.timeLimit) || (difficulty === 'easy' ? 180 : difficulty === 'medium' ? 150 : 120),
        maximumLives: Number(req.body.maximumLives) || (difficulty === 'easy' ? 5 : difficulty === 'medium' ? 4 : 3),
        maximumHints: Number(req.body.maximumHints) || (difficulty === 'expert' ? 1 : difficulty === 'hard' ? 2 : 3),
        generationProvider: req.body.generationProvider || env_1.env.IMAGE_GENERATION_PROVIDER
    });
    const jobUuid = (0, crypto_1.randomUUID)();
    const job = await models_1.GenerationJob.create({
        jobUuid, levelId: level.id, provider: level.generationProvider, maximumAttempts: env_1.env.MAX_GENERATION_RETRIES
    });
    (0, generationQueue_1.enqueueGeneration)(jobUuid);
    res.status(202).json({ success: true, message: 'Puzzle generation started', data: { jobId: job.jobUuid, levelId: level.id, status: job.status } });
});
exports.adminRoutes.get('/puzzle-generator/jobs', async (_req, res) => res.json({ success: true, data: await models_1.GenerationJob.findAll({ order: [['createdAt', 'DESC']], limit: 100 }) }));
exports.adminRoutes.get('/puzzle-generator/jobs/:jobId', async (req, res) => {
    const job = await models_1.GenerationJob.findOne({ where: { jobUuid: req.params.jobId } });
    if (!job)
        return res.status(404).json({ success: false, message: 'Job not found' });
    const level = await models_1.Level.findByPk(job.levelId, { include: [{ model: models_1.LevelDifference, as: 'differences' }] });
    res.json({ success: true, data: { ...job.toJSON(), ...(level ? withUrls(level) : {}) } });
});
exports.adminRoutes.post('/puzzle-generator/jobs/:jobId/retry', async (req, res) => {
    const job = await models_1.GenerationJob.findOne({ where: { jobUuid: req.params.jobId } });
    if (!job || !['failed', 'cancelled'].includes(job.status))
        return res.status(409).json({ success: false, message: 'Only failed or cancelled jobs can be retried' });
    await job.update({ status: 'pending', progress: 0, currentStep: 'Queued', errorCode: null, errorMessage: null });
    (0, generationQueue_1.enqueueGeneration)(job.jobUuid);
    res.json({ success: true, data: job });
});
exports.adminRoutes.delete('/puzzle-generator/jobs/:jobId', async (req, res) => {
    const job = await models_1.GenerationJob.findOne({ where: { jobUuid: req.params.jobId } });
    if (!job || !['pending', 'failed'].includes(job.status))
        return res.status(409).json({ success: false, message: 'Only pending or failed jobs can be cancelled' });
    await job.update({ status: 'cancelled', currentStep: 'Cancelled by administrator' });
    res.status(204).end();
});
exports.adminRoutes.post('/puzzle-generator/levels/:levelId/regenerate', async (req, res) => {
    const level = await models_1.Level.findByPk(req.params.levelId);
    if (!level)
        return res.status(404).json({ success: false, message: 'Level not found' });
    const job = await models_1.GenerationJob.create({ jobUuid: (0, crypto_1.randomUUID)(), levelId: level.id, provider: level.generationProvider, maximumAttempts: env_1.env.MAX_GENERATION_RETRIES });
    await level.update({ generationStatus: 'pending', validationStatus: 'pending', reviewStatus: 'draft', isActive: false });
    (0, generationQueue_1.enqueueGeneration)(job.jobUuid);
    res.status(202).json({ success: true, data: { jobId: job.jobUuid, levelId: level.id, status: job.status } });
});
exports.adminRoutes.post('/puzzle-generator/levels/:levelId/regenerate-difference/:differenceId', async (req, res) => {
    const level = await models_1.Level.findByPk(req.params.levelId);
    const differences = await models_1.LevelDifference.findAll({ where: { levelId: req.params.levelId, isActive: true }, order: [['differenceNumber', 'ASC']] });
    const target = differences.find(item => item.id === Number(req.params.differenceId));
    if (!level || !target || differences.length !== 10)
        return res.status(409).json({ success: false, message: 'A valid ten-difference level is required' });
    const cycle = ['colour_change', 'object_addition', 'pattern_change', 'shape_change', 'rotation', 'object_removal'];
    const nextType = cycle[(cycle.indexOf(target.modificationType) + 1) % cycle.length];
    await target.update({ modificationType: nextType, description: `Regenerated ${nextType.replace('_', ' ')}` });
    const regions = differences.map(toRegion);
    const modifier = new ImageModificationService_1.ImageModificationService();
    await modifier.apply(level.originalImagePath, level.modifiedImagePath, regions);
    const report = await new DifferenceValidationService_1.DifferenceValidationService().validate(level.originalImagePath, level.modifiedImagePath, regions);
    if (!report.valid)
        return res.status(422).json({ success: false, message: report.warnings.join('; ') });
    await modifier.createPreview(level.modifiedImagePath, level.previewImagePath, regions);
    await level.update({ reviewStatus: 'needs_review', isActive: false });
    res.json({ success: true, data: { difference: target, validation: report } });
});
exports.adminRoutes.post('/puzzle-generator/levels/:levelId/approve', approve);
exports.adminRoutes.post('/levels/:id/approve', approve);
exports.adminRoutes.post('/puzzle-generator/levels/:levelId/reject', reject);
exports.adminRoutes.post('/levels/:id/reject', reject);
exports.adminRoutes.get('/levels/:id/differences', async (req, res) => res.json({ success: true, data: await models_1.LevelDifference.findAll({ where: { levelId: req.params.id }, order: [['differenceNumber', 'ASC']] }) }));
exports.adminRoutes.post('/levels/:id/differences', async (req, res) => {
    if (await models_1.LevelDifference.count({ where: { levelId: req.params.id, isActive: true } }) >= 10)
        return res.status(409).json({ success: false, message: 'A level cannot contain more than 10 active differences' });
    res.status(201).json({ success: true, data: await models_1.LevelDifference.create({ ...req.body, levelId: Number(req.params.id), isAutomaticallyGenerated: false }) });
});
exports.adminRoutes.put('/differences/:differenceId', async (req, res) => {
    const item = await models_1.LevelDifference.findByPk(req.params.differenceId);
    if (!item)
        return res.status(404).json({ success: false, message: 'Difference not found' });
    const level = await models_1.Level.findByPk(item.levelId);
    await level?.update({ reviewStatus: 'needs_review', isActive: false });
    res.json({ success: true, data: await item.update(req.body) });
});
exports.adminRoutes.delete('/differences/:differenceId', async (req, res) => {
    const item = await models_1.LevelDifference.findByPk(req.params.differenceId);
    if (!item)
        return res.status(404).json({ success: false, message: 'Difference not found' });
    await item.update({ isActive: false });
    await models_1.Level.update({ reviewStatus: 'needs_review', isActive: false }, { where: { id: item.levelId } });
    res.status(204).end();
});
exports.adminRoutes.post('/levels/:id/validate', async (req, res) => {
    const level = await models_1.Level.findByPk(req.params.id);
    const differences = await models_1.LevelDifference.findAll({ where: { levelId: req.params.id, isActive: true } });
    if (!level?.modifiedImagePath)
        return res.status(409).json({ success: false, message: 'Modified image does not exist' });
    const report = await new DifferenceValidationService_1.DifferenceValidationService().validate(level.originalImagePath, level.modifiedImagePath, differences.map(toRegion));
    await level.update({ validationStatus: report.valid ? 'passed' : 'failed', isActive: report.valid ? level.isActive : false });
    res.json({ success: true, data: report });
});
async function approve(req, res) {
    const id = req.params.levelId ?? req.params.id;
    const level = await models_1.Level.findByPk(id);
    const count = await models_1.LevelDifference.count({ where: { levelId: id, isActive: true } });
    if (!level?.modifiedImagePath || level.validationStatus !== 'passed' || count !== 10)
        return res.status(409).json({ success: false, message: 'Approval requires matching images, passed validation, and exactly 10 active differences' });
    await level.update({ reviewStatus: 'approved', isActive: true, approvedAt: new Date(), approvedBy: req.auth?.sub });
    await database_1.sequelize.query('INSERT INTO audit_logs (admin_id,action,entity_type,entity_id,details_json,created_at) VALUES (?,?,?,?,?,NOW())', {
        replacements: [req.auth?.sub ?? null, 'level.approved', 'level', String(level.id), JSON.stringify({ activeDifferences: count, validationStatus: level.validationStatus })]
    });
    res.json({ success: true, data: level });
}
async function reject(req, res) {
    const id = req.params.levelId ?? req.params.id;
    const level = await models_1.Level.findByPk(id);
    if (!level)
        return res.status(404).json({ success: false, message: 'Level not found' });
    await level.update({ reviewStatus: 'rejected', isActive: false });
    res.json({ success: true, data: level });
}
function withUrls(level) {
    return { ...level.toJSON(), originalImageUrl: publicUrl(level.originalImagePath), modifiedImageUrl: publicUrl(level.modifiedImagePath), previewImageUrl: publicUrl(level.previewImagePath), totalDifferences: level.differences?.filter((d) => d.isActive).length };
}
function toRegion(d) {
    return {
        differenceNumber: d.differenceNumber, shapeType: d.shapeType, modificationType: d.modificationType,
        normalizedX: Number(d.normalizedX), normalizedY: Number(d.normalizedY),
        normalizedWidth: d.normalizedWidth == null ? undefined : Number(d.normalizedWidth),
        normalizedHeight: d.normalizedHeight == null ? undefined : Number(d.normalizedHeight),
        normalizedRadius: d.normalizedRadius == null ? undefined : Number(d.normalizedRadius),
        x: Number(d.get('sourceRegionX')), y: Number(d.get('sourceRegionY')), width: Number(d.get('sourceRegionWidth')), height: Number(d.get('sourceRegionHeight')),
        score: Number(d.confidenceScore), description: d.description, confidenceScore: Number(d.confidenceScore), difficultyScore: Number(d.difficultyScore)
    };
}
