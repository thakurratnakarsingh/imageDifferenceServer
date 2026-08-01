import sharp from 'sharp';
import { env } from '../../config/env';
import { DifferenceRegion } from './types';

function clampRegion(region: DifferenceRegion, imageWidth: number, imageHeight: number) {
  const left = Math.max(0, Math.min(imageWidth - 1, Math.round(region.x)));
  const top = Math.max(0, Math.min(imageHeight - 1, Math.round(region.y)));
  const width = Math.max(1, Math.min(imageWidth - left, Math.round(region.width)));
  const height = Math.max(1, Math.min(imageHeight - top, Math.round(region.height)));
  return { left, top, width, height };
}

function roundedMask(width: number, height: number, feathered = false) {
  const radius = Math.max(3, Math.round(Math.min(width, height) * 0.22));
  if (!feathered) {
    return Buffer.from(`<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${radius}" fill="white"/></svg>`);
  }
  const feather = Math.max(2, Math.round(Math.min(width, height) * 0.06));
  return Buffer.from(`<svg width="${width}" height="${height}">
    <defs><filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${feather}"/></filter></defs>
    <rect x="${feather}" y="${feather}" width="${Math.max(1, width-feather*2)}" height="${Math.max(1, height-feather*2)}" rx="${radius}" fill="white" filter="url(#soft)"/>
  </svg>`);
}

async function masked(input: Buffer, width: number, height: number) {
  return sharp(input).ensureAlpha().composite([{ input: roundedMask(width, height, true), blend: 'dest-in' }]).png().toBuffer();
}

async function duplicateLocalDetail(patch: Buffer, width: number, height: number) {
  const stampWidth = Math.max(8, Math.floor(width * 0.34));
  const stampHeight = Math.max(8, Math.floor(height * 0.34));
  const sourceLeft = Math.min(width-stampWidth, Math.max(0, Math.floor(width * 0.08)));
  const sourceTop = Math.min(height-stampHeight, Math.max(0, Math.floor(height * 0.1)));
  const destinationLeft = Math.min(width-stampWidth, Math.max(0, Math.floor(width * 0.58)));
  const destinationTop = Math.min(height-stampHeight, Math.max(0, Math.floor(height * 0.56)));
  const stamp = await sharp(patch)
    .extract({ left: sourceLeft, top: sourceTop, width: stampWidth, height: stampHeight })
    .flop().modulate({ brightness: 1.03, saturation: 1.08 })
    .ensureAlpha().composite([{ input: roundedMask(stampWidth, stampHeight), blend: 'dest-in' }])
    .png().toBuffer();
  return sharp(patch).composite([{ input: stamp, left: destinationLeft, top: destinationTop }]).png().toBuffer();
}

async function changedPatch(patch: Buffer, region: DifferenceRegion, index: number) {
  const width = Math.round(region.width); const height = Math.round(region.height);
  switch (region.modificationType) {
    case 'colour_change':
      return sharp(patch).modulate({ hue: 28 + index * 11, saturation: 1.2, brightness: 1.02 }).png().toBuffer();
    case 'object_addition':
      return duplicateLocalDetail(patch, width, height);
    case 'object_removal':
      return sharp(patch).blur(Math.max(2, Math.min(8, Math.min(width, height) / 12))).modulate({ saturation: 0.86, brightness: 1.01 }).png().toBuffer();
    case 'pattern_change': {
      const stroke = Math.max(1, Math.round(Math.min(width, height) * 0.025));
      const overlay = Buffer.from(`<svg width="${width}" height="${height}"><g stroke="white" stroke-width="${stroke}" opacity=".30">
        <path d="M${-width*.2} ${height*.35} L${width*.45} 0 M0 ${height*.8} L${width} ${height*.15} M${width*.55} ${height} L${width*1.2} ${height*.55}"/>
      </g></svg>`);
      return sharp(patch).modulate({ saturation: 1.08 }).composite([{ input: overlay }]).png().toBuffer();
    }
    case 'shape_change':
      return sharp(patch).flop().modulate({ brightness: 1.025, saturation: 1.08 }).png().toBuffer();
    case 'rotation':
      return sharp(patch).rotate(180).png().toBuffer();
  }
}

async function changedPixelCount(original: Buffer, changed: Buffer) {
  const [before, after] = await Promise.all([
    sharp(original).removeAlpha().raw().toBuffer(),
    sharp(changed).removeAlpha().raw().toBuffer()
  ]);
  let count = 0;
  for (let offset = 0; offset < Math.min(before.length, after.length); offset += 3) {
    const delta = Math.max(
      Math.abs((before[offset] ?? 0) - (after[offset] ?? 0)),
      Math.abs((before[offset + 1] ?? 0) - (after[offset + 1] ?? 0)),
      Math.abs((before[offset + 2] ?? 0) - (after[offset + 2] ?? 0))
    );
    if (delta >= env.PIXEL_DIFF_THRESHOLD) count += 1;
  }
  return count;
}

/**
 * Flat image areas do not react to flips, rotations, or blur. In that case use a
 * small adaptive channel shift so every selected region remains detectable
 * without painting the conspicuous coloured wash used by the old generator.
 */
async function ensureDetectableChange(original: Buffer, changed: Buffer, index: number) {
  if (await changedPixelCount(original, changed) >= env.MIN_CHANGED_AREA_PIXELS * 1.5) return changed;

  const stats = await sharp(original).stats();
  const channel = index % 3;
  const offsets = [0, 0, 0];
  const mean = stats.channels[channel]?.mean ?? 128;
  offsets[channel] = mean > 127 ? -28 : 28;
  offsets[(channel + 1) % 3] = mean > 127 ? -8 : 8;
  return sharp(original).removeAlpha().linear([1, 1, 1], offsets).png().toBuffer();
}

export class ImageModificationService {
  async apply(originalPath: string, outputPath: string, regions: DifferenceRegion[]) {
    const differenceNumbers = new Set(regions.map(region => region.differenceNumber));
    if (regions.length !== 10 || differenceNumbers.size !== 10 ||
        [...differenceNumbers].some(number => number < 1 || number > 10)) {
      throw new Error('Modified image requires exactly 10 uniquely numbered difference regions');
    }
    const metadata = await sharp(originalPath).metadata();
    const imageWidth = metadata.width ?? 0; const imageHeight = metadata.height ?? 0;
    if (!imageWidth || !imageHeight) throw new Error('Original image dimensions could not be read');
    const overlays = await Promise.all(regions.map(async (region, index) => {
      const area = clampRegion(region, imageWidth, imageHeight);
      const patch = await sharp(originalPath).extract(area).png().toBuffer();
      const changed = await changedPatch(patch, { ...region, width: area.width, height: area.height }, index);
      const detectable = await ensureDetectableChange(patch, changed, index);
      return { input: await masked(detectable, area.width, area.height), left: area.left, top: area.top };
    }));
    await sharp(originalPath).composite(overlays).png({ compressionLevel: 8 }).toFile(outputPath);
  }

  async createMask(width: number, height: number, outputPath: string, regions: DifferenceRegion[]) {
    const overlays = regions.map(region => ({
      input: Buffer.from(`<svg width="${region.width}" height="${region.height}"><rect width="100%" height="100%" rx="${Math.min(region.width,region.height)*.25}" fill="white"/></svg>`),
      left: region.x, top: region.y
    }));
    await sharp({ create: { width, height, channels: 3, background: '#000' } }).composite(overlays).png().toFile(outputPath);
  }

  async createPreview(modifiedPath: string, outputPath: string, regions: DifferenceRegion[]) {
    const metadata = await sharp(modifiedPath).metadata();
    const overlay = `<svg width="${metadata.width}" height="${metadata.height}">
      ${regions.map(region => {
        const cx = region.x + region.width / 2; const cy = region.y + region.height / 2;
        return `<g><ellipse cx="${cx}" cy="${cy}" rx="${region.width/2}" ry="${region.height/2}" fill="none" stroke="#42f58d" stroke-width="5"/><circle cx="${region.x+13}" cy="${region.y+13}" r="13" fill="#14241b"/><text x="${region.x+13}" y="${region.y+18}" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="700" fill="white">${region.differenceNumber}</text></g>`;
      }).join('')}
    </svg>`;
    await sharp(modifiedPath).composite([{ input: Buffer.from(overlay) }]).jpeg({ quality: 90 }).toFile(outputPath);
  }
}
