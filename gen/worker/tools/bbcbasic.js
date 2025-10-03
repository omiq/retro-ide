"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileBbcBasic = compileBbcBasic;
const builder_1 = require("../builder");
/**
 * BBC BASIC compiler (scaffold)
 *
 * For now, this is a stub that passes through ASCII BASIC source as a binary file.
 * Next milestone: integrate a proper BBC BASIC tokenizer to emit tokenized program bytes.
 */
function compileBbcBasic(step) {
    const outputPath = step.prefix + '.bin';
    // Bring all project files into the worker FS (for consistency)
    (0, builder_1.gatherFiles)(step);
    if ((0, builder_1.staleFiles)(step, [outputPath])) {
        try {
            const source = (0, builder_1.getWorkFileAsString)(step.path) || '';
            // Auto-add line numbers to lines that don't have them
            const processedSource = addLineNumbers(source);
            const asciiBytes = new TextEncoder().encode(processedSource);
            (0, builder_1.putWorkFile)(outputPath, asciiBytes);
            return {
                output: asciiBytes,
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
    return { unchanged: true };
}
/**
 * Add line numbers to BBC BASIC source code
 */
function addLineNumbers(source) {
    var _a;
    const lines = source.split('\n');
    const processedLines = [];
    let lineNumber = 10; // Start with line 10
    for (const line of lines) {
        const trimmed = line.trim();
        // Skip empty lines
        if (trimmed.length === 0) {
            processedLines.push(line); // Keep original whitespace
            continue;
        }
        // Check if line already has a line number
        const lineNumberMatch = trimmed.match(/^(\d+)\s+(.+)$/);
        if (lineNumberMatch) {
            // Line already has a number, use it and update our counter
            lineNumber = parseInt(lineNumberMatch[1]) + 10; // Set counter to next available number
            processedLines.push(line);
        }
        else {
            // Line doesn't have a number, add one
            const indentation = ((_a = line.match(/^(\s*)/)) === null || _a === void 0 ? void 0 : _a[1]) || '';
            processedLines.push(`${indentation}${lineNumber} ${trimmed}`);
            lineNumber += 10; // Increment by 10 for next line
        }
    }
    return processedLines.join('\n');
}
//# sourceMappingURL=bbcbasic.js.map