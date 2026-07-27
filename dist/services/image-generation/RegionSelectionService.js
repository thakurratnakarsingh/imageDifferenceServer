"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.regionsOverlap = exports.RegionSelectionService = void 0;
const crypto_1 = require("crypto");
const env_1 = require("../../config/env");
const types = [
    'colour_change', 'object_addition', 'pattern_change', 'shape_change', 'object_removal',
    'rotation', 'colour_change', 'object_addition', 'pattern_change', 'shape_change'
];
const descriptions = {
    colour_change: 'A local colour detail was changed',
    object_addition: 'A small decorative object was added',
    object_removal: 'A local detail was softly removed',
    pattern_change: 'The local pattern was changed',
    shape_change: 'A small shape was changed',
    rotation: 'A local detail was rotated'
};
const sizeByDifficulty = { easy: 0.045, medium: 0.040, hard: 0.035, expert: 0.030 };
const difficultyScore = { easy: 0.2, medium: 0.45, hard: 0.7, expert: 0.9 };
function seeded(seed, index) {
    const hash = (0, crypto_1.createHash)('sha256').update(`${seed}:${index}`).digest();
    return hash.readUInt32BE(0) / 0xffffffff;
}
function overlaps(a, b) {
    const gap = env_1.env.MIN_DIFFERENCE_GAP;
    const ar = a.normalizedRadius ?? Math.max(a.normalizedWidth ?? 0, a.normalizedHeight ?? 0) / 2;
    const br = b.normalizedRadius ?? Math.max(b.normalizedWidth ?? 0, b.normalizedHeight ?? 0) / 2;
    const ax = a.shapeType === 'circle' ? a.normalizedX : a.normalizedX + (a.normalizedWidth ?? 0) / 2;
    const ay = a.shapeType === 'circle' ? a.normalizedY : a.normalizedY + (a.normalizedHeight ?? 0) / 2;
    const bx = b.shapeType === 'circle' ? b.normalizedX : b.normalizedX + (b.normalizedWidth ?? 0) / 2;
    const by = b.shapeType === 'circle' ? b.normalizedY : b.normalizedY + (b.normalizedHeight ?? 0) / 2;
    return Math.hypot(ax - bx, ay - by) < ar + br + gap;
}
class RegionSelectionService {
    select(candidates, width, height, difficulty, seed) {
        const chosen = [];
        const ranked = [...candidates].sort((a, b) => b.score - a.score);
        const base = sizeByDifficulty[difficulty];
        for (let index = 0; index < 10; index += 1) {
            let completed = false;
            for (let attempt = 0; attempt < ranked.length && !completed; attempt += 1) {
                const cell = ranked[(index * 7 + attempt) % ranked.length];
                const jitterX = (seeded(seed, index * 2) - 0.5) * cell.width * 0.32;
                const jitterY = (seeded(seed, index * 2 + 1) - 0.5) * cell.height * 0.32;
                const cx = Math.max(base, Math.min(1 - base, cell.x + cell.width / 2 + jitterX));
                const cy = Math.max(base, Math.min(1 - base, cell.y + cell.height / 2 + jitterY));
                const shapeType = index % 2 === 0 ? 'circle' : 'rectangle';
                const region = {
                    differenceNumber: index + 1, shapeType, modificationType: types[index],
                    normalizedX: shapeType === 'circle' ? cx : cx - base,
                    normalizedY: shapeType === 'circle' ? cy : cy - base * 0.8,
                    normalizedRadius: shapeType === 'circle' ? base : undefined,
                    normalizedWidth: shapeType === 'rectangle' ? base * 2 : undefined,
                    normalizedHeight: shapeType === 'rectangle' ? base * 1.6 : undefined,
                    x: Math.round((cx - base) * width), y: Math.round((cy - base) * height),
                    width: Math.max(24, Math.round(base * 2 * width)), height: Math.max(24, Math.round(base * 2 * height)),
                    score: cell.score, description: descriptions[types[index]],
                    confidenceScore: 0.86 + cell.score * 0.12, difficultyScore: difficultyScore[difficulty]
                };
                if (!chosen.some(other => overlaps(region, other))) {
                    chosen.push(region);
                    completed = true;
                }
            }
            if (!completed)
                throw new Error('Unable to select 10 non-overlapping safe regions');
        }
        return chosen;
    }
}
exports.RegionSelectionService = RegionSelectionService;
exports.regionsOverlap = overlaps;
