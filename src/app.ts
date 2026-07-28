import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { env } from './config/env';
import { authRoutes } from './routes/authRoutes';
import { publicRoutes } from './routes/publicRoutes';
import { gameRoutes } from './routes/gameRoutes';
import { adminRoutes } from './routes/adminRoutes';
import { selectionRoutes } from './routes/selectionRoutes';
import { splashAdminRoutes } from './routes/splashAdminRoutes';
import { errorHandler, notFound } from './middleware/error';

export const app = express();
const usesHttps = env.BASE_URL.startsWith('https://');

app.disable('x-powered-by');
app.set('trust proxy', 'loopback');
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  strictTransportSecurity: usesHttps ? {} : false,
  contentSecurityPolicy: {
    directives: {
      upgradeInsecureRequests: usesHttps ? [] : null,
    },
  },
}));
app.use(cors({ origin: env.NODE_ENV === 'development' ? true : env.ADMIN_ORIGIN.split(','), credentials: true }));
app.use(rateLimit({ windowMs: 60_000, limit: 240, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(morgan(env.NODE_ENV === 'test' ? 'tiny' : 'combined'));
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads'), { maxAge: '7d', immutable: false, dotfiles: 'deny' }));

app.get('/health', (_req, res) => res.json({ success: true, service: 'find-differences-api' }));
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/game', gameRoutes);
app.use('/api/v1/player-selections', selectionRoutes);
app.use('/api/v1/admin/splash', splashAdminRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1', publicRoutes);

const adminDist = path.resolve(__dirname, '../admin-portal/dist');
app.use('/admin', express.static(adminDist, { index: 'index.html', maxAge: env.NODE_ENV === 'production' ? '1h' : 0 }));
app.get('/admin/{*path}', (_req, res) => res.sendFile(path.join(adminDist, 'index.html')));

app.use(notFound);
app.use(errorHandler);
