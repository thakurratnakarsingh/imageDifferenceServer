import { Router } from 'express';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { Actress, Level } from '../models';

export const publicRoutes = Router();

publicRoutes.get('/splash', async (_req, res) => {
  const rows = await sequelize.query('SELECT id, title, subtitle, logo_path AS logoPath, background_image_path AS backgroundImagePath, background_color AS backgroundColor, text_color AS textColor, display_duration AS displayDuration FROM splash_screens WHERE is_active = 1 ORDER BY id DESC LIMIT 1', { type: QueryTypes.SELECT });
  res.json({ success: true, data: rows[0] ?? { title: 'Find 10 Differences', subtitle: 'Look closer. Tap smarter.', backgroundColor: '#071815', textColor: '#FFFFFF', displayDuration: 1800 } });
});

publicRoutes.get('/actresses', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1); const limit = Math.min(50, Number(req.query.limit) || 20);
  const result = await Actress.findAndCountAll({ where: { isActive: true }, limit, offset: (page - 1) * limit, order: [['name','ASC']] });
  const counts = await Promise.all(result.rows.map(item => Level.count({ where: { actressId: item.id, isActive: true } })));
  res.json({ success: true, data: result.rows.map((item, i) => ({ ...item.toJSON(), availableLevelCount: counts[i] })), meta: { page, limit, total: result.count } });
});

publicRoutes.get('/actresses/:id', async (req, res) => {
  const item = await Actress.findByPk(req.params.id);
  if (!item || !item.isActive) return res.status(404).json({ success: false, message: 'Actress not found' });
  res.json({ success: true, data: item });
});
