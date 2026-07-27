"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DifferenceGenerationService = void 0;
const LocalImageDifferenceGenerator_1 = require("./LocalImageDifferenceGenerator");
/** Compatibility facade used by jobs and tests. */
class DifferenceGenerationService extends LocalImageDifferenceGenerator_1.LocalImageDifferenceGenerator {
}
exports.DifferenceGenerationService = DifferenceGenerationService;
