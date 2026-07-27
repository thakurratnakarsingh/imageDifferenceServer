"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameService = void 0;
const crypto_1 = require("crypto");
const sequelize_1 = require("sequelize");
const database_1 = require("../../config/database");
const env_1 = require("../../config/env");
const models_1 = require("../../models");
const CoordinateService_1 = require("../image-generation/CoordinateService");
function marker(difference) {
    return {
        shapeType: difference.shapeType,
        normalizedX: Number(difference.normalizedX), normalizedY: Number(difference.normalizedY),
        normalizedWidth: difference.normalizedWidth == null ? undefined : Number(difference.normalizedWidth),
        normalizedHeight: difference.normalizedHeight == null ? undefined : Number(difference.normalizedHeight),
        normalizedRadius: difference.normalizedRadius == null ? undefined : Number(difference.normalizedRadius)
    };
}
class GameService {
    async start(deviceId, actressIds, requestedLevel) {
        const where = { isActive: true, reviewStatus: 'approved', validationStatus: 'passed' };
        if (requestedLevel)
            where.levelNumber = requestedLevel;
        if (actressIds.length)
            where.actressId = actressIds;
        const level = await models_1.Level.findOne({ where, include: [models_1.Actress], order: [['levelNumber', 'ASC']] });
        if (!level)
            throw Object.assign(new Error('No approved level is available for this selection'), { status: 404 });
        const session = await models_1.GameSession.create({
            sessionToken: (0, crypto_1.randomUUID)(), deviceId, levelId: level.id,
            remainingLives: level.maximumLives, remainingHints: level.maximumHints
        });
        const actress = level.Actress;
        return {
            sessionId: session.sessionToken,
            level: {
                id: level.id, levelNumber: level.levelNumber, title: level.title, actressId: level.actressId,
                actressName: actress?.name, originalImageUrl: this.publicUrl(level.originalImagePath),
                modifiedImageUrl: this.publicUrl(level.modifiedImagePath), totalDifferences: 10,
                imageWidth: level.imageWidth, imageHeight: level.imageHeight,
                timeLimit: level.timeLimit, lives: level.maximumLives, hints: level.maximumHints, difficulty: level.difficulty
            }
        };
    }
    async checkDifference(sessionToken, levelId, tapX, tapY, imageType) {
        return database_1.sequelize.transaction(async (transaction) => {
            const session = await models_1.GameSession.findOne({ where: { sessionToken, levelId }, lock: transaction.LOCK.UPDATE, transaction });
            if (!session || session.sessionStatus !== 'active')
                throw Object.assign(new Error('Active game session not found'), { status: 404 });
            if (tapX < 0 || tapX > 1 || tapY < 0 || tapY > 1)
                throw Object.assign(new Error('Tap coordinates must be normalized'), { status: 400 });
            const differences = await models_1.LevelDifference.findAll({ where: { levelId, isActive: true }, transaction });
            const found = await models_1.SessionFoundDifference.findAll({ where: { sessionId: session.id }, transaction });
            const foundIds = new Set(found.map(item => item.differenceId));
            const hit = differences.find(difference => !foundIds.has(difference.id) && CoordinateService_1.CoordinateService.contains({
                ...marker(difference), shapeType: difference.shapeType
            }, tapX, tapY, env_1.env.TOUCH_TOLERANCE));
            if (!hit) {
                const lives = Math.max(0, session.remainingLives - 1);
                await session.update({
                    remainingLives: lives, wrongTaps: session.wrongTaps + 1,
                    scoreEarned: Math.max(0, session.scoreEarned - 25),
                    sessionStatus: lives === 0 ? 'failed' : 'active'
                }, { transaction });
                return { isCorrect: false, foundCount: session.foundCount, totalDifferences: 10, pointsEarned: 0, livesRemaining: lives };
            }
            await models_1.SessionFoundDifference.create({
                sessionId: session.id, differenceId: hit.id, tapX, tapY,
                imageType: imageType === 'original' ? 'original' : 'modified'
            }, { transaction });
            const foundCount = session.foundCount + 1;
            await session.update({ foundCount, scoreEarned: session.scoreEarned + 100 }, { transaction });
            return {
                isCorrect: true, differenceId: hit.id, marker: marker(hit), foundCount, totalDifferences: 10,
                pointsEarned: 100, livesRemaining: session.remainingLives
            };
        });
    }
    async useHint(sessionToken) {
        return database_1.sequelize.transaction(async (transaction) => {
            const session = await models_1.GameSession.findOne({ where: { sessionToken }, lock: transaction.LOCK.UPDATE, transaction });
            if (!session || session.sessionStatus !== 'active')
                throw new Error('Active game session not found');
            if (session.remainingHints <= 0)
                throw Object.assign(new Error('No hints remaining'), { status: 409 });
            const found = await models_1.SessionFoundDifference.findAll({ where: { sessionId: session.id }, transaction });
            const unresolved = await models_1.LevelDifference.findOne({
                where: { levelId: session.levelId, isActive: true, id: { [sequelize_1.Op.notIn]: found.map(item => item.differenceId) } },
                order: [['differenceNumber', 'ASC']], transaction
            });
            if (!unresolved)
                throw new Error('No unresolved differences');
            await session.update({ remainingHints: session.remainingHints - 1, scoreEarned: Math.max(0, session.scoreEarned - 50) }, { transaction });
            return { marker: marker(unresolved), hintsRemaining: session.remainingHints };
        });
    }
    publicUrl(filePath) {
        const normalized = filePath.replace(/\\/g, '/');
        const uploadsIndex = normalized.lastIndexOf('/uploads/');
        const relative = uploadsIndex >= 0 ? normalized.slice(uploadsIndex) : `/${normalized.replace(/^.*?uploads\//, 'uploads/')}`;
        return `${env_1.env.BASE_URL}${relative}`;
    }
}
exports.GameService = GameService;
