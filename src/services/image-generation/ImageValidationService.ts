import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';
import { env } from '../../config/env';

const accepted = new Set(['image/jpeg', 'image/png', 'image/webp']);

export class ImageValidationService {
  async validate(buffer: Buffer) {
    const detected = await fileTypeFromBuffer(buffer);
    if (!detected || !accepted.has(detected.mime)) throw new Error('Only valid JPG, PNG, or WEBP images are accepted');
    const image = sharp(buffer, { animated: false, failOn: 'error' }).rotate();
    const metadata = await image.metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    if (width < env.MIN_IMAGE_WIDTH || height < env.MIN_IMAGE_HEIGHT) {
      throw new Error(`Image must be at least ${env.MIN_IMAGE_WIDTH}×${env.MIN_IMAGE_HEIGHT}`);
    }
    if (width > env.MAX_IMAGE_WIDTH || height > env.MAX_IMAGE_HEIGHT) {
      throw new Error(`Image must be no larger than ${env.MAX_IMAGE_WIDTH}×${env.MAX_IMAGE_HEIGHT}`);
    }
    return { width, height, format: detected.ext, normalizedBuffer: await image.jpeg({ quality: 92 }).toBuffer() };
  }
}
