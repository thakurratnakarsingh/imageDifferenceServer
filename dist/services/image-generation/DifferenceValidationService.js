"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DifferenceValidationService = void 0;
const sharp_1 = __importDefault(require("sharp"));
const env_1 = require("../../config/env");
class DifferenceValidationService {
    async validate(originalPath, modifiedPath, regions) {
        const original = await (0, sharp_1.default)(originalPath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
        const modified = await (0, sharp_1.default)(modifiedPath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
        const dimensionsMatch = original.info.width === modified.info.width && original.info.height === modified.info.height;
        if (!dimensionsMatch)
            return { valid: false, dimensionsMatch, changedAreaRatio: 1, detectedComponentCount: 0, coveredDifferenceCount: 0, unexpectedChangedPixelRatio: 1, warnings: ['Output dimensions do not match'] };
        let changed = 0;
        let unexpected = 0;
        const covered = new Array(regions.length).fill(0);
        const width = original.info.width;
        const pixels = width * original.info.height;
        for (let p = 0; p < pixels; p += 1) {
            const offset = p * 3;
            const delta = Math.max(Math.abs((original.data[offset] ?? 0) - (modified.data[offset] ?? 0)), Math.abs((original.data[offset + 1] ?? 0) - (modified.data[offset + 1] ?? 0)), Math.abs((original.data[offset + 2] ?? 0) - (modified.data[offset + 2] ?? 0)));
            if (delta < env_1.env.PIXEL_DIFF_THRESHOLD)
                continue;
            changed += 1;
            const x = p % width;
            const y = Math.floor(p / width);
            const regionIndex = regions.findIndex(r => x >= r.x - 3 && x <= r.x + r.width + 3 && y >= r.y - 3 && y <= r.y + r.height + 3);
            if (regionIndex >= 0)
                covered[regionIndex] = (covered[regionIndex] ?? 0) + 1;
            else
                unexpected += 1;
        }
        const coveredDifferenceCount = covered.filter(value => value >= env_1.env.MIN_CHANGED_AREA_PIXELS).length;
        const changedAreaRatio = changed / pixels;
        const unexpectedChangedPixelRatio = changed ? unexpected / changed : 0;
        const warnings = [];
        if (regions.length !== 10)
            warnings.push('Exactly 10 regions are required');
        if (coveredDifferenceCount !== 10)
            warnings.push(`${coveredDifferenceCount}/10 regions contain enough visible pixel change`);
        if (changedAreaRatio > env_1.env.MAX_CHANGED_AREA_RATIO)
            warnings.push('Changed image area exceeds configured maximum');
        if (unexpectedChangedPixelRatio > 0.1)
            warnings.push('Unexpected changed pixels were detected outside target regions');
        return {
            valid: dimensionsMatch && regions.length === 10 && coveredDifferenceCount === 10 &&
                changedAreaRatio <= env_1.env.MAX_CHANGED_AREA_RATIO && unexpectedChangedPixelRatio <= 0.1,
            dimensionsMatch, changedAreaRatio, detectedComponentCount: coveredDifferenceCount,
            coveredDifferenceCount, unexpectedChangedPixelRatio, warnings
        };
    }
}
exports.DifferenceValidationService = DifferenceValidationService;
