"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalImageDifferenceGenerator = void 0;
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const ImageAnalysisService_1 = require("./ImageAnalysisService");
const RegionSelectionService_1 = require("./RegionSelectionService");
const ImageModificationService_1 = require("./ImageModificationService");
const DifferenceValidationService_1 = require("./DifferenceValidationService");
class LocalImageDifferenceGenerator {
    analysis;
    selector;
    modifier;
    validator;
    constructor(analysis = new ImageAnalysisService_1.ImageAnalysisService(), selector = new RegionSelectionService_1.RegionSelectionService(), modifier = new ImageModificationService_1.ImageModificationService(), validator = new DifferenceValidationService_1.DifferenceValidationService()) {
        this.analysis = analysis;
        this.selector = selector;
        this.modifier = modifier;
        this.validator = validator;
    }
    async generatePuzzle(input) {
        await (0, promises_1.mkdir)(input.outputDirectory, { recursive: true });
        const analysis = await this.analysis.analyse(input.originalPath);
        const differences = this.selector.select(analysis.candidates, analysis.width, analysis.height, input.difficulty, input.seed);
        const modifiedPath = path_1.default.join(input.outputDirectory, 'modified.png');
        const previewPath = path_1.default.join(input.outputDirectory, 'preview.jpg');
        const maskPath = path_1.default.join(input.outputDirectory, 'difference-mask.png');
        await this.modifier.apply(input.originalPath, modifiedPath, differences);
        await this.modifier.createMask(analysis.width, analysis.height, maskPath, differences);
        const validation = await this.validator.validate(input.originalPath, modifiedPath, differences);
        if (!validation.valid)
            throw Object.assign(new Error(validation.warnings.join('; ') || 'Generated puzzle failed validation'), { validation });
        await this.modifier.createPreview(modifiedPath, previewPath, differences);
        return { originalPath: input.originalPath, modifiedPath, previewPath, maskPath, width: analysis.width, height: analysis.height, differences, validation };
    }
}
exports.LocalImageDifferenceGenerator = LocalImageDifferenceGenerator;
