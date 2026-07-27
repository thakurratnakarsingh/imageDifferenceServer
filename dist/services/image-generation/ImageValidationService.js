"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageValidationService = void 0;
const sharp_1 = __importDefault(require("sharp"));
const file_type_1 = require("file-type");
const env_1 = require("../../config/env");
const accepted = new Set(['image/jpeg', 'image/png', 'image/webp']);
class ImageValidationService {
    async validate(buffer) {
        const detected = await (0, file_type_1.fileTypeFromBuffer)(buffer);
        if (!detected || !accepted.has(detected.mime))
            throw new Error('Only valid JPG, PNG, or WEBP images are accepted');
        const image = (0, sharp_1.default)(buffer, { animated: false, failOn: 'error' }).rotate();
        const metadata = await image.metadata();
        const width = metadata.width ?? 0;
        const height = metadata.height ?? 0;
        if (width < env_1.env.MIN_IMAGE_WIDTH || height < env_1.env.MIN_IMAGE_HEIGHT) {
            throw new Error(`Image must be at least ${env_1.env.MIN_IMAGE_WIDTH}×${env_1.env.MIN_IMAGE_HEIGHT}`);
        }
        if (width > env_1.env.MAX_IMAGE_WIDTH || height > env_1.env.MAX_IMAGE_HEIGHT) {
            throw new Error(`Image must be no larger than ${env_1.env.MAX_IMAGE_WIDTH}×${env_1.env.MAX_IMAGE_HEIGHT}`);
        }
        return { width, height, format: detected.ext, normalizedBuffer: await image.jpeg({ quality: 92 }).toBuffer() };
    }
}
exports.ImageValidationService = ImageValidationService;
