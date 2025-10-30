"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileApple2Basic = compileApple2Basic;
const apple2tokenizer_1 = require("../../common/basic/apple2tokenizer");
const builder_1 = require("../builder");
function compileApple2Basic(step) {
    const outputPath = step.prefix + '.bas';
    // Gather input files
    (0, builder_1.gatherFiles)(step);
    // Check if we need to rebuild
    if ((0, builder_1.staleFiles)(step, [outputPath])) {
        try {
            // Read the BASIC source file
            const source = (0, builder_1.getWorkFileAsString)(step.path);
            // Create tokenizer and compile
            const tokenizer = new apple2tokenizer_1.Apple2BasicTokenizer();
            const basData = tokenizer.compile(source);
            // Write the .bas file
            (0, builder_1.putWorkFile)(outputPath, basData);
            return {
                output: basData,
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
//# sourceMappingURL=apple2basic.js.map