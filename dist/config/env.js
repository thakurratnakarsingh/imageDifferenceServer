"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
require("dotenv/config");
const zod_1 = require("zod");
const schema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    PORT: zod_1.z.coerce.number().default(5000),
    DB_HOST: zod_1.z.string().default('localhost'),
    DB_PORT: zod_1.z.coerce.number().default(3306),
    DB_NAME: zod_1.z.string().default('find_differences_game'),
    DB_USER: zod_1.z.string().default('root'),
    DB_PASSWORD: zod_1.z.string().default(''),
    JWT_SECRET: zod_1.z.string().min(16).default('development-secret-change-me'),
    JWT_EXPIRES_IN: zod_1.z.string().default('7d'),
    BASE_URL: zod_1.z.string().url().default('http://13.53.200.162:5000'),
    ADMIN_ORIGIN: zod_1.z.string().default('http://13.53.200.162,http://13.53.200.162:5000,http://13.53.200.162:5173'),
    IMAGE_GENERATION_PROVIDER: zod_1.z.enum(['local', 'ai', 'hybrid']).default('local'),
    MAX_GENERATION_RETRIES: zod_1.z.coerce.number().int().min(1).default(5),
    MAX_FILE_SIZE_MB: zod_1.z.coerce.number().positive().default(15),
    MIN_IMAGE_WIDTH: zod_1.z.coerce.number().int().default(720),
    MIN_IMAGE_HEIGHT: zod_1.z.coerce.number().int().default(720),
    MAX_IMAGE_WIDTH: zod_1.z.coerce.number().int().default(4096),
    MAX_IMAGE_HEIGHT: zod_1.z.coerce.number().int().default(4096),
    MIN_DIFFERENCE_GAP: zod_1.z.coerce.number().min(0).max(0.2).default(0.035),
    TOUCH_TOLERANCE: zod_1.z.coerce.number().min(0).max(0.1).default(0.015),
    PIXEL_DIFF_THRESHOLD: zod_1.z.coerce.number().int().min(1).max(255).default(20),
    MIN_CHANGED_AREA_PIXELS: zod_1.z.coerce.number().int().min(1).default(150),
    MAX_CHANGED_AREA_RATIO: zod_1.z.coerce.number().min(0.001).max(0.5).default(0.08),
    AI_IMAGE_API_KEY: zod_1.z.string().default(''),
    AI_IMAGE_API_URL: zod_1.z.string().default('')
});
exports.env = schema.parse(process.env);
