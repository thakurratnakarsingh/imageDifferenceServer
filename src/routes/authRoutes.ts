import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { Admin, User } from '../models';
import { env } from '../config/env';
import { requireAuth } from '../middleware/auth';

export const authRoutes = Router();
const sign = (payload: object) => jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as SignOptions);

authRoutes.post('/register', async (req, res) => {
  const { name, email, password, deviceId } = req.body;
  if (!password || String(password).length < 8 || !deviceId) return res.status(400).json({ success: false, message: 'Password (8+ characters) and deviceId are required' });
  const user = await User.create({ name, email: email || null, deviceId, passwordHash: await bcrypt.hash(password, 12) });
  res.status(201).json({ success: true, data: { token: sign({ sub: user.id, role: 'player' }), user: { id: user.id, name: user.name } } });
});

authRoutes.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ where: { email } });
  if (!user || !user.get('passwordHash') || !await bcrypt.compare(password ?? '', String(user.get('passwordHash')))) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
  res.json({ success: true, data: { token: sign({ sub: user.id, role: 'player' }), user } });
});

authRoutes.post('/admin/login', async (req, res) => {
  const admin = await Admin.findOne({ where: { email: req.body.email, isActive: true } });
  if (!admin || !await bcrypt.compare(req.body.password ?? '', admin.passwordHash)) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
  await admin.update({ lastLoginAt: new Date() });
  res.json({ success: true, data: { token: sign({ sub: admin.id, role: admin.role, admin: true }), admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } } });
});

authRoutes.get('/profile', requireAuth, async (req, res) => res.json({ success: true, data: { authenticated: true } }));
