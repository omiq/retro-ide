"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileAppleSoftBasic = compileAppleSoftBasic;
const builder_1 = require("../builder");
/**
 * AppleSoft BASIC compiler (scaffold)
 *
 * For now, this passes through ASCII BASIC source as a binary file.
 * The Apple IIe platform will type this into the emulator.
 *
 * Future: integrate AppleSoft BASIC tokenizer to emit tokenized program bytes.
 */
function compileAppleSoftBasic(step) {
    const outputPath = step.prefix + '.bas';
    // Gather input files
    (0, builder_1.gatherFiles)(step);
    // Check if we need to rebuild
    if ((0, builder_1.staleFiles)(step, [outputPath])) {
        try {
            const source = (0, builder_1.getWorkFileAsString)(step.path) || '';
            // Convert source to bytes
            const sourceBytes = new TextEncoder().encode(source);
            (0, builder_1.putWorkFile)(outputPath, sourceBytes);
            return {
                output: sourceBytes,
                listings: {},
                errors: []
            };
        }
        catch (error) {
            return {
                errors: [{
                        msg: error instanceof Error ? error.message : String(error),
                        line: 0,
                        path: step.path
                    }]
            };
        }
    }
    // File is up to date
    return { unchanged: true };
}
//# sourceMappingURL=applesoftbasic.js.map