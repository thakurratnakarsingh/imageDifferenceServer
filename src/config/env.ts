import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(3306),
  DB_NAME: z.string().default('find_differences_game'),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string().default(''),
  JWT_SECRET: z.string().min(16).default('development-secret-change-me'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  BASE_URL: z.string().url().default('http://13.60.169.242:5000'),
  ADMIN_ORIGIN: z.string().default('http://13.60.169.242,http://13.60.169.242:5000,http://13.60.169.242:5173'),
  IMAGE_GENERATION_PROVIDER: z.enum(['local', 'ai', 'hybrid']).default('local'),
  MAX_GENERATION_RETRIES: z.coerce.number().int().min(1).default(5),
  MAX_FILE_SIZE_MB: z.coerce.number().positive().default(15),
  MIN_IMAGE_WIDTH: z.coerce.number().int().default(720),
  MIN_IMAGE_HEIGHT: z.coerce.number().int().default(720),
  MAX_IMAGE_WIDTH: z.coerce.number().int().default(4096),
  MAX_IMAGE_HEIGHT: z.coerce.number().int().default(4096),
  MIN_DIFFERENCE_GAP: z.coerce.number().min(0).max(0.2).default(0.035),
  TOUCH_TOLERANCE: z.coerce.number().min(0).max(0.1).default(0.015),
  PIXEL_DIFF_THRESHOLD: z.coerce.number().int().min(1).max(255).default(20),
  MIN_CHANGED_AREA_PIXELS: z.coerce.number().int().min(1).default(150),
  MAX_CHANGED_AREA_RATIO: z.coerce.number().min(0.001).max(0.5).default(0.08),
  AI_IMAGE_API_KEY: z.string().default(''),
  AI_IMAGE_API_URL: z.string().default('')
});

export const env = schema.parse(process.env);
