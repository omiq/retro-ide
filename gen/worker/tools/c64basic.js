"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileC64Basic = compileC64Basic;
const c64tokenizer_1 = require("../../common/basic/c64tokenizer");
const vic20tokenizer_1 = require("../../common/basic/vic20tokenizer");
const builder_1 = require("../builder");
function compileC64Basic(step) {
    const outputPath = step.prefix + '.prg';
    // Gather input files
    (0, builder_1.gatherFiles)(step);
    // Check if we need to rebuild
    if ((0, builder_1.staleFiles)(step, [outputPath])) {
        try {
            // Read the BASIC source file
            const source = (0, builder_1.getWorkFileAsString)(step.path);
            // Use platform-specific tokenizer
            // C64 uses the original tokenizer (unchanged from main)
            // VIC-20 uses the improved tokenizer with label handling
            let prgData;
            if (step.platform === 'vic20') {
                const tokenizer = new vic20tokenizer_1.VIC20BasicTokenizer();
                prgData = tokenizer.compile(source);
            }
            else {
                // C64 and other platforms use the original C64 tokenizer (unchanged)
                const tokenizer = new c64tokenizer_1.C64BasicTokenizer();
                prgData = tokenizer.compile(source);
            }
            // Write the .prg file
            (0, builder_1.putWorkFile)(outputPath, prgData);
            return {
                output: prgData,
                listings: {},
                errors: []
            };
        }
        catch (error) {
            return {
                errors: [{
                        msg: error instanceof Error ? error.message : String(error),
                        line: 0
                    }]
            };
        }
    }
    // File is up to date
    return { unchanged: true };
}
//# sourceMappingURL=c64basic.js.map