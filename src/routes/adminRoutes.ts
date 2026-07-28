import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { mkdir, rm, rmdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { env } from '../config/env';
import { sequelize } from '../config/database';
import { Actress, GenerationJob, Level, LevelDifference, User } from '../models';
import { requireAdmin } from '../middleware/auth';
import { ImageValidationService } from '../services/image-generation/ImageValidationService';
import { enqueueGeneration } from '../jobs/generationQueue';
import { ImageModificationService } from '../services/image-generation/ImageModificationService';
import { DifferenceValidationService } from '../services/image-generation/DifferenceValidationService';
import { DifferenceRegion, ModificationType } from '../services/image-generation/types';
import { Op, QueryTypes, Transaction } from 'sequelize';

export const adminRoutes = Router();
adminRoutes.use(requireAdmin);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024, files: 1 } });
const imageValidator = new ImageValidationService();
const uploadsRoot = path.resolve(__dirname, '../../uploads');
const publicUrl = (filePath: string | null) => {
  if (!filePath) return null;
  const normalized = filePath.replace(/\\/g, '/'); const index = normalized.lastIndexOf('/uploads/');
  const relative = index >= 0 ? normalized.slice(index) : `/${normalized.replace(/^.*?uploads\//, 'uploads/')}`;
  return `${env.BASE_URL}${relative}`;
};
const difficultyForLevel = (level: number) => level <= 200 ? 'easy' : level <= 500 ? 'medium' : level <= 800 ? 'hard' : 'expert';

adminRoutes.get('/dashboard', async (_req, res) => {
  const [actresses, levels, activeLevels, draftLevels, jobs, failedJobs, players, differences] = await Promise.all([
    Actress.count(), Level.count(), Level.count({ where: { isActive: true } }),
    Level.count({ where: { reviewStatus: 'draft' } }), GenerationJob.count(),
    GenerationJob.count({ where: { status: 'failed' } }), User.count(), LevelDifference.count({ where: { isActive: true } })
  ]);
  res.json({ success: true, data: { actresses, levels, activeLevels, draftLevels, generationJobs: jobs, failedGenerationJobs: failedJobs, players, differences } });
});

adminRoutes.get('/actresses', async (_req, res) => {
  const categories = await Actress.findAll({ order: [['name','ASC']] });
  const data = await Promise.all(categories.map(async category => ({
    ...category.toJSON(),
    levelCount: await Level.count({ where: { actressId: category.id } })
  })));
  res.json({ success: true, data });
});
adminRoutes.post('/actresses', async (req, res) => {
  const payload = categoryPayload(req.body);
  if (!payload.name || !payload.slug || !payload.country || !payload.industry) {
    return res.status(400).json({ success: false, message: 'Name, slug, country, and industry are required' });
  }
  res.status(201).json({ success: true, data: await Actress.create(payload) });
});
adminRoutes.put('/actresses/:id', async (req, res) => {
  const item = await Actress.findByPk(req.params.id); if (!item) return res.status(404).json({ success: false, message: 'Not found' });
  const payload = categoryPayload(req.body);
  if (!payload.name || !payload.slug || !payload.country || !payload.industry) {
    return res.status(400).json({ success: false, message: 'Name, slug, country, and industry are required' });
  }
  res.json({ success: true, data: await item.update(payload) });
});
adminRoutes.patch('/actresses/:id/status', async (req, res) => {
  const item = await Actress.findByPk(req.params.id); if (!item) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: await item.update({ isActive: Boolean(req.body.isActive) }) });
});
adminRoutes.delete('/actresses/:id', async (req, res) => {
  const category = await Actress.findByPk(req.params.id);
  if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
  const levels = await Level.findAll({ where: { actressId: category.id } });
  const filePaths = [
    ...await collectLevelFilePaths(levels),
    ...(category.profileImage ? [category.profileImage] : [])
  ];
  await sequelize.transaction(async transaction => {
    await destroyLevelRecords(levels.map(level => level.id), transaction);
    await category.destroy({ transaction });
  });
  const cleanupWarnings = await removeLevelFiles(filePaths);
  res.json({
    success: true,
    message: `Category and ${levels.length} related level${levels.length === 1 ? '' : 's'} deleted`,
    data: { deletedCategoryId: category.id, deletedLevels: levels.length, cleanupWarnings }
  });
});

adminRoutes.get('/levels', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(100, Number(req.query.limit) || 20);
  const where: Record<string | symbol, unknown> = {};
  if (req.query.status) where.reviewStatus = req.query.status;
  if (req.query.actressId) where.actressId = Number(req.query.actressId);
  if (req.query.search) {
    const search = `%${String(req.query.search).trim()}%`;
    where[Op.or] = [
      { title: { [Op.like]: search } },
      { '$Actress.name$': { [Op.like]: search } }
    ];
  }
  const result = await Level.findAndCountAll({
    where, include: [Actress], limit, offset: (page-1)*limit,
    order: [['levelNumber','DESC']], distinct: true, subQuery: false
  });
  res.json({ success: true, data: result.rows, meta: { page, limit, total: result.count } });
});
adminRoutes.get('/levels/:id', async (req, res) => {
  const level = await Level.findByPk(req.params.id, { include: [{ model: LevelDifference, as: 'differences' }, Actress] });
  if (!level) return res.status(404).json({ success: false, message: 'Level not found' });
  res.json({ success: true, data: withUrls(level) });
});
adminRoutes.put('/levels/:id', async (req, res) => {
  const level = await Level.findByPk(req.params.id); if (!level) return res.status(404).json({ success: false, message: 'Level not found' });
  const allowed = ['levelNumber','actressId','title','difficulty','timeLimit','maximumLives','maximumHints','completionBonus'];
  const changes = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  if (changes.levelNumber !== undefined) {
    const levelNumber = Number(changes.levelNumber);
    if (!Number.isInteger(levelNumber) || levelNumber < 1 || levelNumber > 1000) {
      return res.status(400).json({ success: false, message: 'Level number must be between 1 and 1000' });
    }
    const duplicate = await Level.findOne({ where: { levelNumber, id: { [Op.ne]: level.id } } });
    if (duplicate) return res.status(409).json({ success: false, message: 'Level number already exists' });
    changes.levelNumber = levelNumber;
  }
  if (changes.actressId !== undefined) {
    const category = await Actress.findByPk(Number(changes.actressId));
    if (!category) return res.status(400).json({ success: false, message: 'Valid category is required' });
    changes.actressId = category.id;
  }
  res.json({ success: true, data: await level.update(changes) });
});
adminRoutes.patch('/levels/:id/status', async (req, res) => {
  const level = await Level.findByPk(req.params.id); if (!level) return res.status(404).json({ success: false, message: 'Level not found' });
  if (req.body.isActive && level.reviewStatus !== 'approved') return res.status(409).json({ success: false, message: 'Only approved levels can be activated' });
  res.json({ success: true, data: await level.update({ isActive: Boolean(req.body.isActive) }) });
});
adminRoutes.delete('/levels/:id', async (req, res) => {
  const level = await Level.findByPk(req.params.id);
  if (!level) return res.status(404).json({ success: false, message: 'Level not found' });
  const filePaths = await collectLevelFilePaths([level]);
  await sequelize.transaction(transaction => destroyLevelRecords([level.id], transaction));
  const cleanupWarnings = await removeLevelFiles(filePaths);
  res.json({
    success: true,
    message: 'Level and related images deleted',
    data: { deletedLevelId: level.id, cleanupWarnings }
  });
});

adminRoutes.post('/puzzle-generator/generate', upload.single('originalImage'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'originalImage is required' });
  const levelNumber = Number(req.body.levelNumber);
  if (!Number.isInteger(levelNumber) || levelNumber < 1 || levelNumber > 1000) return res.status(400).json({ success: false, message: 'levelNumber must be 1–1000' });
  if (await Level.count({ where: { levelNumber } })) return res.status(409).json({ success: false, message: 'Level number already exists' });
  const actress = await Actress.findByPk(req.body.actressId);
  if (!actress) return res.status(400).json({ success: false, message: 'Valid actressId is required' });
  const validated = await imageValidator.validate(req.file.buffer);
  const levelDir = path.join(uploadsRoot, 'levels', randomUUID());
  await mkdir(levelDir, { recursive: true });
  const originalPath = path.join(levelDir, 'original.jpg');
  await writeFile(originalPath, validated.normalizedBuffer);
  const difficulty = req.body.difficulty || difficultyForLevel(levelNumber);
  const level = await Level.create({
    levelNumber, actressId: actress.id, title: req.body.title || 'Find 10 Differences',
    originalImagePath: originalPath, imageWidth: validated.width, imageHeight: validated.height, difficulty,
    timeLimit: Number(req.body.timeLimit) || (difficulty === 'easy' ? 180 : difficulty === 'medium' ? 150 : 120),
    maximumLives: Number(req.body.maximumLives) || (difficulty === 'easy' ? 5 : difficulty === 'medium' ? 4 : 3),
    maximumHints: Number(req.body.maximumHints) || (difficulty === 'expert' ? 1 : difficulty === 'hard' ? 2 : 3),
    generationProvider: req.body.generationProvider || env.IMAGE_GENERATION_PROVIDER
  });
  const jobUuid = randomUUID();
  const job = await GenerationJob.create({
    jobUuid, levelId: level.id, provider: level.generationProvider, maximumAttempts: env.MAX_GENERATION_RETRIES
  });
  enqueueGeneration(jobUuid);
  res.status(202).json({ success: true, message: 'Puzzle generation started', data: { jobId: job.jobUuid, levelId: level.id, status: job.status } });
});

adminRoutes.get('/puzzle-generator/jobs', async (_req, res) => res.json({ success: true, data: await GenerationJob.findAll({ order: [['createdAt','DESC']], limit: 100 }) }));
adminRoutes.get('/puzzle-generator/jobs/:jobId', async (req, res) => {
  const job = await GenerationJob.findOne({ where: { jobUuid: req.params.jobId } });
  if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
  const level = await Level.findByPk(job.levelId, { include: [{ model: LevelDifference, as: 'differences' }] });
  res.json({ success: true, data: { ...job.toJSON(), ...(level ? withUrls(level) : {}) } });
});
adminRoutes.post('/puzzle-generator/jobs/:jobId/retry', async (req, res) => {
  const job = await GenerationJob.findOne({ where: { jobUuid: req.params.jobId } });
  if (!job || !['failed','cancelled'].includes(job.status)) return res.status(409).json({ success: false, message: 'Only failed or cancelled jobs can be retried' });
  await job.update({ status: 'pending', progress: 0, currentStep: 'Queued', errorCode: null, errorMessage: null });
  enqueueGeneration(job.jobUuid); res.json({ success: true, data: job });
});
adminRoutes.delete('/puzzle-generator/jobs/:jobId', async (req, res) => {
  const job = await GenerationJob.findOne({ where: { jobUuid: req.params.jobId } });
  if (!job || !['pending','failed'].includes(job.status)) return res.status(409).json({ success: false, message: 'Only pending or failed jobs can be cancelled' });
  await job.update({ status: 'cancelled', currentStep: 'Cancelled by administrator' }); res.status(204).end();
});
adminRoutes.post('/puzzle-generator/levels/:levelId/regenerate', async (req, res) => {
  const level = await Level.findByPk(req.params.levelId); if (!level) return res.status(404).json({ success: false, message: 'Level not found' });
  const job = await GenerationJob.create({ jobUuid: randomUUID(), levelId: level.id, provider: level.generationProvider, maximumAttempts: env.MAX_GENERATION_RETRIES });
  await level.update({ generationStatus: 'pending', validationStatus: 'pending', reviewStatus: 'draft', isActive: false });
  enqueueGeneration(job.jobUuid); res.status(202).json({ success: true, data: { jobId: job.jobUuid, levelId: level.id, status: job.status } });
});

adminRoutes.post('/puzzle-generator/levels/:levelId/regenerate-difference/:differenceId', async (req, res) => {
  const level = await Level.findByPk(req.params.levelId);
  const differences = await LevelDifference.findAll({ where: { levelId: req.params.levelId, isActive: true }, order: [['differenceNumber','ASC']] });
  const target = differences.find(item => item.id === Number(req.params.differenceId));
  if (!level || !target || differences.length !== 10) return res.status(409).json({ success: false, message: 'A valid ten-difference level is required' });
  const cycle: ModificationType[] = ['colour_change','object_addition','pattern_change','shape_change','rotation','object_removal'];
  const nextType = cycle[(cycle.indexOf(target.modificationType as ModificationType) + 1) % cycle.length]!;
  await target.update({ modificationType: nextType, description: `Regenerated ${nextType.replace('_',' ')}` });
  const regions = differences.map(toRegion);
  const modifier = new ImageModificationService();
  await modifier.apply(level.originalImagePath, level.modifiedImagePath!, regions);
  const report = await new DifferenceValidationService().validate(level.originalImagePath, level.modifiedImagePath!, regions);
  if (!report.valid) return res.status(422).json({ success: false, message: report.warnings.join('; ') });
  await modifier.createPreview(level.modifiedImagePath!, level.previewImagePath!, regions);
  await level.update({ reviewStatus: 'needs_review', isActive: false });
  res.json({ success: true, data: { difference: target, validation: report } });
});

adminRoutes.post('/puzzle-generator/levels/:levelId/approve', approve);
adminRoutes.post('/levels/:id/approve', approve);
adminRoutes.post('/puzzle-generator/levels/:levelId/reject', reject);
adminRoutes.post('/levels/:id/reject', reject);

adminRoutes.get('/levels/:id/differences', async (req, res) => res.json({ success: true, data: await LevelDifference.findAll({ where: { levelId: req.params.id }, order: [['differenceNumber','ASC']] }) }));
adminRoutes.post('/levels/:id/differences', async (req, res) => {
  if (await LevelDifference.count({ where: { levelId: req.params.id, isActive: true } }) >= 10) return res.status(409).json({ success: false, message: 'A level cannot contain more than 10 active differences' });
  res.status(201).json({ success: true, data: await LevelDifference.create({ ...req.body, levelId: Number(req.params.id), isAutomaticallyGenerated: false }) });
});
adminRoutes.put('/differences/:differenceId', async (req, res) => {
  const item = await LevelDifference.findByPk(req.params.differenceId); if (!item) return res.status(404).json({ success: false, message: 'Difference not found' });
  const level = await Level.findByPk(item.levelId); await level?.update({ reviewStatus: 'needs_review', isActive: false });
  res.json({ success: true, data: await item.update(req.body) });
});
adminRoutes.delete('/differences/:differenceId', async (req, res) => {
  const item = await LevelDifference.findByPk(req.params.differenceId); if (!item) return res.status(404).json({ success: false, message: 'Difference not found' });
  await item.update({ isActive: false }); await Level.update({ reviewStatus: 'needs_review', isActive: false }, { where: { id: item.levelId } }); res.status(204).end();
});
adminRoutes.post('/levels/:id/validate', async (req, res) => {
  const level = await Level.findByPk(req.params.id); const differences = await LevelDifference.findAll({ where: { levelId: req.params.id, isActive: true } });
  if (!level?.modifiedImagePath) return res.status(409).json({ success: false, message: 'Modified image does not exist' });
  const report = await new DifferenceValidationService().validate(level.originalImagePath, level.modifiedImagePath, differences.map(toRegion));
  await level.update({ validationStatus: report.valid ? 'passed' : 'failed', isActive: report.valid ? level.isActive : false });
  res.json({ success: true, data: report });
});

async function approve(req: any, res: any) {
  const id = req.params.levelId ?? req.params.id;
  const level = await Level.findByPk(id);
  const count = await LevelDifference.count({ where: { levelId: id, isActive: true } });
  if (!level?.modifiedImagePath || level.validationStatus !== 'passed' || count !== 10) return res.status(409).json({ success: false, message: 'Approval requires matching images, passed validation, and exactly 10 active differences' });
  await level.update({ reviewStatus: 'approved', isActive: true, approvedAt: new Date(), approvedBy: req.auth?.sub });
  await sequelize.query('INSERT INTO audit_logs (admin_id,action,entity_type,entity_id,details_json,created_at) VALUES (?,?,?,?,?,NOW())', {
    replacements: [req.auth?.sub ?? null, 'level.approved', 'level', String(level.id), JSON.stringify({ activeDifferences: count, validationStatus: level.validationStatus })]
  });
  res.json({ success: true, data: level });
}
async function reject(req: any, res: any) {
  const id = req.params.levelId ?? req.params.id; const level = await Level.findByPk(id);
  if (!level) return res.status(404).json({ success: false, message: 'Level not found' });
  await level.update({ reviewStatus: 'rejected', isActive: false }); res.json({ success: true, data: level });
}
function withUrls(level: Level) {
  return { ...level.toJSON(), originalImageUrl: publicUrl(level.originalImagePath), modifiedImageUrl: publicUrl(level.modifiedImagePath), previewImageUrl: publicUrl(level.previewImagePath), totalDifferences: (level as any).differences?.filter((d: LevelDifference) => d.isActive).length };
}
function toRegion(d: LevelDifference): DifferenceRegion {
  return {
    differenceNumber: d.differenceNumber, shapeType: d.shapeType, modificationType: d.modificationType as ModificationType,
    normalizedX: Number(d.normalizedX), normalizedY: Number(d.normalizedY),
    normalizedWidth: d.normalizedWidth == null ? undefined : Number(d.normalizedWidth),
    normalizedHeight: d.normalizedHeight == null ? undefined : Number(d.normalizedHeight),
    normalizedRadius: d.normalizedRadius == null ? undefined : Number(d.normalizedRadius),
    x: Number(d.get('sourceRegionX')), y: Number(d.get('sourceRegionY')), width: Number(d.get('sourceRegionWidth')), height: Number(d.get('sourceRegionHeight')),
    score: Number(d.confidenceScore), description: d.description, confidenceScore: Number(d.confidenceScore), difficultyScore: Number(d.difficultyScore)
  };
}
function categoryPayload(body: Record<string, unknown>) {
  const name = String(body.name ?? '').trim();
  return {
    name,
    slug: String(body.slug ?? name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    country: String(body.country ?? '').trim(),
    industry: String(body.industry ?? '').trim(),
    description: body.description == null ? null : String(body.description).trim() || null,
    profileImage: body.profileImage == null ? null : String(body.profileImage).trim() || null,
    isActive: body.isActive === undefined ? true : Boolean(body.isActive)
  };
}
async function destroyLevelRecords(levelIds: number[], transaction: Transaction) {
  if (!levelIds.length) return;
  const replacements = { levelIds };
  await sequelize.query(
    `DELETE FROM session_found_differences
     WHERE session_id IN (SELECT id FROM game_sessions WHERE level_id IN (:levelIds))
        OR difference_id IN (SELECT id FROM level_differences WHERE level_id IN (:levelIds))`,
    { replacements, transaction }
  );
  await sequelize.query(
    'DELETE FROM game_attempts WHERE level_id IN (:levelIds)',
    { replacements, transaction }
  );
  await sequelize.query(
    'DELETE FROM game_sessions WHERE level_id IN (:levelIds)',
    { replacements, transaction }
  );
  await Level.destroy({ where: { id: { [Op.in]: levelIds } }, transaction });
}
async function collectLevelFilePaths(levels: Level[]) {
  if (!levels.length) return [];
  const levelIds = levels.map(level => level.id);
  const analysisRows = await sequelize.query<{ differenceMaskPath: string | null }>(
    `SELECT difference_mask_path AS differenceMaskPath
     FROM image_analysis_results
     WHERE level_id IN (:levelIds)`,
    { replacements: { levelIds }, type: QueryTypes.SELECT }
  );
  return levels.flatMap(level => [
    level.originalImagePath,
    level.modifiedImagePath,
    level.previewImagePath,
    path.join(path.dirname(level.originalImagePath), 'metadata.json')
  ]).concat(analysisRows.map(row => row.differenceMaskPath)).filter((filePath): filePath is string => Boolean(filePath));
}
async function removeLevelFiles(storedPaths: string[]) {
  const levelsRoot = path.join(uploadsRoot, 'levels');
  const files = new Set<string>();
  const directories = new Set<string>();
  for (const storedPath of storedPaths) {
    const filePath = safeUploadPath(storedPath);
    if (!filePath) continue;
    files.add(filePath);
    const directory = path.dirname(filePath);
    const relativeDirectory = path.relative(levelsRoot, directory);
    if (relativeDirectory && !relativeDirectory.startsWith('..') && !path.isAbsolute(relativeDirectory)) {
      directories.add(directory);
    }
  }
  const warnings: string[] = [];
  for (const filePath of files) {
    try {
      await rm(filePath, { force: true });
    } catch (error) {
      warnings.push(`Could not remove ${path.relative(uploadsRoot, filePath)}: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }
  for (const directory of directories) {
    try {
      await rmdir(directory);
    } catch (error) {
      const code = error instanceof Error && 'code' in error ? String(error.code) : '';
      if (code !== 'ENOENT' && code !== 'ENOTEMPTY') {
        warnings.push(`Could not remove ${path.relative(uploadsRoot, directory)}: ${error instanceof Error ? error.message : 'unknown error'}`);
      }
    }
  }
  return warnings;
}
function safeUploadPath(storedPath: string) {
  const normalized = storedPath.replace(/\\/g, '/');
  const uploadsMarker = normalized.lastIndexOf('/uploads/');
  let candidate: string;
  if (uploadsMarker >= 0) {
    candidate = path.resolve(uploadsRoot, normalized.slice(uploadsMarker + '/uploads/'.length));
  } else if (normalized.startsWith('uploads/')) {
    candidate = path.resolve(uploadsRoot, normalized.slice('uploads/'.length));
  } else if (path.isAbsolute(storedPath)) {
    candidate = path.resolve(storedPath);
  } else {
    return null;
  }
  const relative = path.relative(uploadsRoot, candidate);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return candidate;
}
