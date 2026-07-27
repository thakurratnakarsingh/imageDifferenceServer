import { Router } from 'express';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { Actress } from '../models';

export const selectionRoutes = Router();

selectionRoutes.get('/:deviceId', async (req, res) => {
  const rows = await sequelize.query('SELECT actress_id AS actressId FROM player_actress_selections WHERE device_id = ?', { replacements: [req.params.deviceId], type: QueryTypes.SELECT });
  res.json({ success: true, data: rows.map((row: any) => row.actressId) });
});

selectionRoutes.post('/', save);
selectionRoutes.put('/:deviceId', save);
selectionRoutes.delete('/:deviceId', async (req, res) => {
  await sequelize.query('DELETE FROM player_actress_selections WHERE device_id = ?', { replacements: [req.params.deviceId] });
  res.status(204).end();
});

async function save(req: any, res: any) {
  const deviceId = req.params.deviceId ?? req.body.deviceId;
  const actressIds = [...new Set((req.body.actressIds ?? []).map(Number))] as number[];
  if (!deviceId || !actressIds.length) return res.status(400).json({ success: false, message: 'deviceId and at least one actressId are required' });
  const count = await Actress.count({ where: { id: actressIds, isActive: true } });
  if (count !== actressIds.length) return res.status(400).json({ success: false, message: 'Selection includes an unavailable actress' });
  await sequelize.transaction(async transaction => {
    await sequelize.query('DELETE FROM player_actress_selections WHERE device_id = ?', { replacements: [deviceId], transaction });
    for (const actressId of actressIds) await sequelize.query(
      'INSERT INTO player_actress_selections (device_id, actress_id, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
      { replacements: [deviceId, actressId], transaction }
    );
  });
  res.json({ success: true, data: { deviceId, actressIds } });
}
