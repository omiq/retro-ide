"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileC64Basic = compileC64Basic;
const c64tokenizer_1 = require("../../common/basic/c64tokenizer");
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
            // Create tokenizer and compile
            const tokenizer = new c64tokenizer_1.C64BasicTokenizer();
            const prgData = tokenizer.compile(source);
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