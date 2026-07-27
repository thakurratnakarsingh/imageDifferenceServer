import { Router } from 'express';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { requireAdmin } from '../middleware/auth';

export const splashAdminRoutes = Router();
splashAdminRoutes.use(requireAdmin);

splashAdminRoutes.post('/', async (req, res) => {
  const values = splashValues(req.body);
  const [, id] = await sequelize.query(
    'INSERT INTO splash_screens (title,subtitle,logo_path,background_image_path,background_color,text_color,display_duration,is_active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,NOW(),NOW())',
    { replacements: values }
  );
  res.status(201).json({ success: true, data: { id } });
});
splashAdminRoutes.put('/:id', async (req, res) => {
  await sequelize.query('UPDATE splash_screens SET title=?,subtitle=?,logo_path=?,background_image_path=?,background_color=?,text_color=?,display_duration=?,is_active=?,updated_at=NOW() WHERE id=?', { replacements: [...splashValues(req.body), req.params.id] });
  res.json({ success: true, data: { id: Number(req.params.id) } });
});
splashAdminRoutes.delete('/:id', async (req, res) => {
  await sequelize.query('DELETE FROM splash_screens WHERE id=?', { replacements: [req.params.id], type: QueryTypes.DELETE });
  res.status(204).end();
});
function splashValues(body: any) {
  return [body.title, body.subtitle ?? null, body.logoPath ?? null, body.backgroundImagePath ?? null, body.backgroundColor ?? '#071815', body.textColor ?? '#fff', Number(body.displayDuration) || 1800, body.isActive === false ? 0 : 1];
}
