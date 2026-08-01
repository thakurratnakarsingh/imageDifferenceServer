import os from 'os';
import path from 'path';
import { mkdtemp, rm } from 'fs/promises';
import sharp from 'sharp';
import { LocalImageDifferenceGenerator } from '../src/services/image-generation/LocalImageDifferenceGenerator';
import { ImageModificationService } from '../src/services/image-generation/ImageModificationService';
import { CoordinateService } from '../src/services/image-generation/CoordinateService';
import { regionsOverlap } from '../src/services/image-generation/RegionSelectionService';

describe('local puzzle generator', () => {
  let directory = '';
  beforeEach(async () => { directory = await mkdtemp(path.join(os.tmpdir(), 'find-ten-test-')); });
  afterEach(async () => { await rm(directory, { recursive: true, force: true }); });

  it('creates aligned output with exactly ten separate normalized differences', async () => {
    const original = path.join(directory, 'original.png');
    await sharp({
      create: { width: 1000, height: 800, channels: 3, background: '#95c9ba' }
    }).composite([
      { input: Buffer.from('<svg width="1000" height="800"><path d="M0 600 Q250 420 500 600 T1000 580V800H0Z" fill="#347b50"/><g fill="#f4d766"><circle cx="180" cy="180" r="70"/><circle cx="720" cy="250" r="90"/></g><rect x="350" y="340" width="280" height="220" rx="25" fill="#bd7456"/></svg>') }
    ]).png().toFile(original);
    const result = await new LocalImageDifferenceGenerator().generatePuzzle({
      originalPath: original, outputDirectory: directory, difficulty: 'easy', seed: 'unit-test'
    });
    expect(result.differences).toHaveLength(10);
    expect(result.differences.map(difference => difference.differenceNumber).sort((a, b) => a - b))
      .toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(result.validation.valid).toBe(true);
    expect(result.validation.coveredDifferenceCount).toBe(10);
    expect(result.validation.dimensionsMatch).toBe(true);
    for (const difference of result.differences) {
      expect(difference.normalizedX).toBeGreaterThanOrEqual(0);
      expect(difference.normalizedY).toBeGreaterThanOrEqual(0);
      expect(difference.normalizedX).toBeLessThanOrEqual(1);
      expect(difference.normalizedY).toBeLessThanOrEqual(1);
    }
    for (let i = 0; i < result.differences.length; i += 1) {
      for (let j = i + 1; j < result.differences.length; j += 1) {
        expect(regionsOverlap(result.differences[i]!, result.differences[j]!)).toBe(false);
      }
    }
    const [originalMeta, modifiedMeta] = await Promise.all([sharp(original).metadata(), sharp(result.modifiedPath).metadata()]);
    expect([modifiedMeta.width, modifiedMeta.height]).toEqual([originalMeta.width, originalMeta.height]);

    const [originalPixels, modifiedPixels] = await Promise.all([
      sharp(original).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
      sharp(result.modifiedPath).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    ]);
    let outsideChangedPixels = 0;
    for (let pixel = 0; pixel < originalPixels.info.width * originalPixels.info.height; pixel += 1) {
      const x = pixel % originalPixels.info.width;
      const y = Math.floor(pixel / originalPixels.info.width);
      const insideDifference = result.differences.some(region =>
        x >= region.x && x < region.x + region.width && y >= region.y && y < region.y + region.height
      );
      if (insideDifference) continue;
      const offset = pixel * 3;
      if (!modifiedPixels.data.subarray(offset, offset + 3).equals(originalPixels.data.subarray(offset, offset + 3))) {
        outsideChangedPixels += 1;
      }
    }
    expect(outsideChangedPixels).toBe(0);
  });

  it('rejects output unless all ten uniquely numbered changes are present', async () => {
    const original = path.join(directory, 'original.png');
    const modified = path.join(directory, 'modified.png');
    await sharp({ create: { width: 800, height: 800, channels: 3, background: '#789abc' } }).png().toFile(original);
    await expect(new ImageModificationService().apply(original, modified, []))
      .rejects.toThrow('exactly 10 uniquely numbered difference regions');
  });
});

describe('server-side hit testing', () => {
  it('handles circle and rectangle tolerance without accepting distant taps', () => {
    expect(CoordinateService.contains({ shapeType:'circle', normalizedX:.5, normalizedY:.5, normalizedRadius:.05 }, .56, .5, .015)).toBe(true);
    expect(CoordinateService.contains({ shapeType:'circle', normalizedX:.5, normalizedY:.5, normalizedRadius:.05 }, .8, .5, .015)).toBe(false);
    expect(CoordinateService.contains({ shapeType:'rectangle', normalizedX:.2, normalizedY:.3, normalizedWidth:.1, normalizedHeight:.08 }, .31, .35, .015)).toBe(true);
  });
});
