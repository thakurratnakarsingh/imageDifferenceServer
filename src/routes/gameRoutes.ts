import { Router } from 'express';
import { GameSession, Level } from '../models';
import { GameService } from '../services/game/GameService';
import { sequelize } from '../config/database';

export const gameRoutes = Router();
const service = new GameService();

gameRoutes.post('/start', async (req, res) => {
  const { deviceId, actressIds = [], requestedLevel } = req.body;
  if (!deviceId || !Array.isArray(actressIds)) return res.status(400).json({ success: false, message: 'deviceId and actressIds are required' });
  res.json({ success: true, data: await service.start(deviceId, actressIds.map(Number), requestedLevel ? Number(requestedLevel) : undefined) });
});

gameRoutes.post('/check-difference', async (req, res) => {
  const { sessionId, levelId, tapX, tapY, imageType } = req.body;
  res.json({ success: true, data: await service.checkDifference(sessionId, Number(levelId), Number(tapX), Number(tapY), imageType) });
});

gameRoutes.post('/use-hint', async (req, res) => res.json({ success: true, data: await service.useHint(req.body.sessionId) }));

gameRoutes.post('/complete-level', async (req, res) => {
  const result = await sequelize.transaction(async transaction => {
    const session = await GameSession.findOne({ where: { sessionToken: req.body.sessionId }, lock: transaction.LOCK.UPDATE, transaction });
    if (!session || session.sessionStatus !== 'active') throw Object.assign(new Error('Session cannot be completed or was already rewarded'), { status: 409 });
    if (session.foundCount !== 10) throw Object.assign(new Error('All ten differences must be found'), { status: 409 });
    const level = await Level.findByPk(session.levelId, { transaction });
    const bonus = Number(level?.get('completionBonus') ?? 500);
    const score = session.scoreEarned + bonus + session.remainingHints * 50;
    const stars = session.wrongTaps === 0 ? 3 : session.wrongTaps <= 3 ? 2 : 1;
    await session.update({ sessionStatus: 'completed', completedAt: new Date(), scoreEarned: score }, { transaction });
    const startedAt = new Date(session.get('startedAt') as string).getTime();
    const timeTaken = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
    await sequelize.query(
      'INSERT INTO game_attempts (session_id,user_id,device_id,level_id,is_completed,time_taken,wrong_taps,hints_used,score_earned,stars_earned,created_at) VALUES (?,?,?,?,1,?,?,?,?,?,NOW())',
      { replacements: [session.id, session.get('userId') ?? null, session.deviceId, session.levelId, timeTaken,
        session.wrongTaps, (level?.maximumHints ?? session.remainingHints)-session.remainingHints, score, stars], transaction }
    );
    await sequelize.query(
      `INSERT INTO player_progress (user_id,device_id,current_level,highest_unlocked_level,total_score,coins,total_stars,completed_levels,last_played_at,created_at,updated_at)
       VALUES (?,?,?,?,?,10,?,1,NOW(),NOW(),NOW())
       ON DUPLICATE KEY UPDATE current_level=GREATEST(current_level,VALUES(current_level)),
       highest_unlocked_level=GREATEST(highest_unlocked_level,VALUES(highest_unlocked_level)),
       total_score=total_score+VALUES(total_score), coins=coins+10, total_stars=total_stars+VALUES(total_stars),
       completed_levels=completed_levels+1,last_played_at=NOW(),updated_at=NOW()`,
      { replacements: [session.get('userId') ?? null, session.deviceId, (level?.levelNumber ?? 1)+1, (level?.levelNumber ?? 1)+1, score, stars], transaction }
    );
    return { completed: true, score, stars };
  });
  res.json({ success: true, data: result });
});

gameRoutes.post('/fail-level', async (req, res) => {
  const session = await GameSession.findOne({ where: { sessionToken: req.body.sessionId, sessionStatus: 'active' } });
  if (session) await session.update({ sessionStatus: 'failed', completedAt: new Date() });
  res.json({ success: true, data: { failed: true } });
});

gameRoutes.post('/retry-level', async (req, res) => {
  const previous = await GameSession.findOne({ where: { sessionToken: req.body.sessionId } });
  if (!previous) return res.status(404).json({ success: false, message: 'Session not found' });
  const level = await Level.findByPk(previous.levelId);
  res.json({ success: true, data: await service.start(previous.deviceId, [level!.actressId], level!.levelNumber) });
});

gameRoutes.get('/progress/:deviceId', async (req, res) => {
  const completed = await GameSession.count({ where: { deviceId: req.params.deviceId, sessionStatus: 'completed' } });
  const score = await GameSession.sum('scoreEarned', { where: { deviceId: req.params.deviceId, sessionStatus: 'completed' } });
  res.json({ success: true, data: { completedLevels: completed, totalScore: score || 0, highestUnlockedLevel: completed + 1 } });
});

gameRoutes.get('/levels/:deviceId', async (_req, res) => {
  const levels = await Level.findAll({ where: { isActive: true }, attributes: ['id','levelNumber','difficulty','actressId'], order: [['levelNumber','ASC']], limit: 100 });
  res.json({ success: true, data: levels });
});

gameRoutes.post('/progress', (_req, res) => res.json({ success: true, data: { saved: true } }));
