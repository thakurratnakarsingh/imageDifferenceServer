import sharp from 'sharp';
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
    .flop().modulate({ brightness: 1.08, saturation: 1.2 })
    .ensureAlpha().composite([{ input: roundedMask(stampWidth, stampHeight), blend: 'dest-in' }])
    .png().toBuffer();
  return sharp(patch).composite([{ input: stamp, left: destinationLeft, top: destinationTop }]).png().toBuffer();
}

async function changedPatch(patch: Buffer, region: DifferenceRegion, index: number) {
  const width = Math.round(region.width); const height = Math.round(region.height);
  switch (region.modificationType) {
    case 'colour_change':
      return sharp(patch).modulate({ hue: 75 + index * 19, saturation: 1.45, brightness: 1.03 }).png().toBuffer();
    case 'object_addition':
      return duplicateLocalDetail(patch, width, height);
    case 'object_removal':
      return sharp(patch).blur(Math.max(2, Math.min(12, Math.min(width, height) / 9))).modulate({ saturation: 0.72, brightness: 1.02 }).png().toBuffer();
    case 'pattern_change': {
      const stroke = Math.max(2, Math.round(Math.min(width, height) * 0.045));
      const overlay = Buffer.from(`<svg width="${width}" height="${height}"><g stroke="white" stroke-width="${stroke}" opacity=".58">
        <path d="M${-width*.2} ${height*.35} L${width*.45} 0 M0 ${height*.8} L${width} ${height*.15} M${width*.55} ${height} L${width*1.2} ${height*.55}"/>
      </g></svg>`);
      return sharp(patch).modulate({ saturation: 1.18 }).composite([{ input: overlay }]).png().toBuffer();
    }
    case 'shape_change':
      return sharp(patch).flop().modulate({ brightness: 1.07, saturation: 1.16 }).png().toBuffer();
    case 'rotation':
      return sharp(patch).rotate(180).png().toBuffer();
  }
}

async function ensureVisibleChange(input: Buffer, width: number, height: number, index: number) {
  const tone = index % 2 === 0 ? '#f1b84b' : '#315f8f';
  const wash = Buffer.from(`<svg width="${width}" height="${height}"><rect width="100%" height="100%" fill="${tone}" opacity=".42"/></svg>`);
  return sharp(input).composite([{ input: wash }]).png().toBuffer();
}

export class ImageModificationService {
  async apply(originalPath: string, outputPath: string, regions: DifferenceRegion[]) {
    const metadata = await sharp(originalPath).metadata();
    const imageWidth = metadata.width ?? 0; const imageHeight = metadata.height ?? 0;
    if (!imageWidth || !imageHeight) throw new Error('Original image dimensions could not be read');
    const overlays = await Promise.all(regions.map(async (region, index) => {
      const area = clampRegion(region, imageWidth, imageHeight);
      const patch = await sharp(originalPath).extract(area).png().toBuffer();
      const changed = await changedPatch(patch, { ...region, width: area.width, height: area.height }, index);
      const visible = await ensureVisibleChange(changed, area.width, area.height, index);
      return { input: await masked(visible, area.width, area.height), left: area.left, top: area.top };
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
