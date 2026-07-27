"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageModificationService = void 0;
const sharp_1 = __importDefault(require("sharp"));
function svgFor(region, index) {
    const w = region.width;
    const h = region.height;
    const hue = (index * 43 + 18) % 360;
    const common = `width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"`;
    switch (region.modificationType) {
        case 'object_addition':
            return `<svg ${common}><polygon points="${w * .5},${h * .08} ${w * .62},${h * .38} ${w * .94},${h * .4} ${w * .69},${h * .59} ${w * .78},${h * .9} ${w * .5},${h * .72} ${w * .22},${h * .9} ${w * .31},${h * .59} ${w * .06},${h * .4} ${w * .38},${h * .38}" fill="hsl(${hue} 82% 54%)" stroke="white" stroke-width="3"/></svg>`;
        case 'pattern_change':
            return `<svg ${common}><rect width="${w}" height="${h}" rx="${Math.min(w, h) * .28}" fill="hsla(${hue},80%,48%,.62)"/><path d="M0 ${h * .2} L${w} 0 M0 ${h * .55} L${w} ${h * .25} M0 ${h * .9} L${w} ${h * .6}" stroke="white" stroke-width="${Math.max(3, w * .06)}" opacity=".82"/></svg>`;
        case 'shape_change':
            return `<svg ${common}><rect x="${w * .1}" y="${h * .18}" width="${w * .8}" height="${h * .64}" rx="${Math.min(w, h) * .12}" fill="hsl(${hue} 72% 50%)" stroke="white" stroke-width="3"/></svg>`;
        case 'rotation':
            return `<svg ${common}><g transform="translate(${w / 2} ${h / 2}) rotate(35)"><rect x="${-w * .32}" y="${-h * .2}" width="${w * .64}" height="${h * .4}" rx="8" fill="hsl(${hue} 76% 48%)" stroke="white" stroke-width="3"/></g></svg>`;
        case 'object_removal':
            return `<svg ${common}><ellipse cx="${w / 2}" cy="${h / 2}" rx="${w * .43}" ry="${h * .38}" fill="hsla(${hue},10%,76%,.88)" stroke="white" stroke-width="5"/></svg>`;
        default:
            return `<svg ${common}><ellipse cx="${w / 2}" cy="${h / 2}" rx="${w * .43}" ry="${h * .38}" fill="hsla(${hue},86%,48%,.66)"/></svg>`;
    }
}
class ImageModificationService {
    async apply(originalPath, outputPath, regions) {
        const overlays = regions.map((region, index) => ({
            input: Buffer.from(svgFor(region, index)), left: region.x, top: region.y
        }));
        await (0, sharp_1.default)(originalPath).composite(overlays).png({ compressionLevel: 8 }).toFile(outputPath);
    }
    async createMask(width, height, outputPath, regions) {
        const overlays = regions.map(region => ({
            input: Buffer.from(`<svg width="${region.width}" height="${region.height}"><rect width="100%" height="100%" rx="${Math.min(region.width, region.height) * .25}" fill="white"/></svg>`),
            left: region.x, top: region.y
        }));
        await (0, sharp_1.default)({ create: { width, height, channels: 3, background: '#000' } }).composite(overlays).png().toFile(outputPath);
    }
    async createPreview(modifiedPath, outputPath, regions) {
        const metadata = await (0, sharp_1.default)(modifiedPath).metadata();
        const overlay = `<svg width="${metadata.width}" height="${metadata.height}">
      ${regions.map(region => {
            const cx = region.x + region.width / 2;
            const cy = region.y + region.height / 2;
            return `<g><ellipse cx="${cx}" cy="${cy}" rx="${region.width / 2}" ry="${region.height / 2}" fill="none" stroke="#42f58d" stroke-width="5"/><circle cx="${region.x + 13}" cy="${region.y + 13}" r="13" fill="#14241b"/><text x="${region.x + 13}" y="${region.y + 18}" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="700" fill="white">${region.differenceNumber}</text></g>`;
        }).join('')}
    </svg>`;
        await (0, sharp_1.default)(modifiedPath).composite([{ input: Buffer.from(overlay) }]).jpeg({ quality: 90 }).toFile(outputPath);
    }
}
exports.ImageModificationService = ImageModificationService;
