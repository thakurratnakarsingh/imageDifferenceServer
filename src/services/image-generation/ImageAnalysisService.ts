import sharp from 'sharp';
import { AnalysisRegion } from './types';

export class ImageAnalysisService {
  async analyse(path: string): Promise<{ width: number; height: number; candidates: AnalysisRegion[] }> {
    const { data, info } = await sharp(path).greyscale().resize(160, 160, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
    const candidates: AnalysisRegion[] = [];
    const columns = 5;
    const rows = 4;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const sx = Math.round((column + 0.18) * info.width / columns);
        const sy = Math.round((row + 0.18) * info.height / rows);
        const ex = Math.round((column + 0.82) * info.width / columns);
        const ey = Math.round((row + 0.82) * info.height / rows);
        let sum = 0; let sumSq = 0; let count = 0;
        for (let y = sy; y < ey; y += 1) for (let x = sx; x < ex; x += 1) {
          const value = data[y * info.width + x] ?? 0;
          sum += value; sumSq += value * value; count += 1;
        }
        const variance = count ? sumSq / count - (sum / count) ** 2 : 0;
        candidates.push({
          x: column / columns, y: row / rows, width: 1 / columns, height: 1 / rows,
          score: Math.min(1, variance / 2500)
        });
      }
    }
    const meta = await sharp(path).metadata();
    return { width: meta.width!, height: meta.height!, candidates };
  }
}
