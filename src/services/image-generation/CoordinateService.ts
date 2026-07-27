import { DifferenceRegion } from './types';

export class CoordinateService {
  static contains(region: Pick<DifferenceRegion, 'shapeType'|'normalizedX'|'normalizedY'|'normalizedWidth'|'normalizedHeight'|'normalizedRadius'>, x: number, y: number, tolerance = 0) {
    if (region.shapeType === 'circle') {
      return Math.hypot(x - region.normalizedX, y - region.normalizedY) <= (region.normalizedRadius ?? 0) + tolerance;
    }
    return x >= region.normalizedX - tolerance &&
      x <= region.normalizedX + (region.normalizedWidth ?? 0) + tolerance &&
      y >= region.normalizedY - tolerance &&
      y <= region.normalizedY + (region.normalizedHeight ?? 0) + tolerance;
  }
}
