"use strict";
/**
 * Apple II BASIC Tokenizer
 *
 * Converts Apple II BASIC source code to tokenized format compatible with Apple II BASIC interpreter.
 * Based on the Apple II BASIC token format and the C64 tokenizer implementation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Apple2BasicTokenizer = void 0;
const compiler_1 = require("./compiler");
class Apple2BasicTokenizer {
    constructor() {
        this.tokens = Object.assign({}, compiler_1.APPLE2_TOKENS);
        // Sort tokens by length (longest first) for proper matching
        this.sortedTokens = Object.keys(this.tokens).sort((a, b) => b.length - a.length);
    }
    /**
     * Convert ASCII character to Apple II character code
     */
    asciiToApple2(c) {
        const code = c.charCodeAt(0);
        // Handle special Apple II characters
        if (code >= 0x20 && code <= 0x7E) {
            return code; // Standard ASCII
        }
        else if (code === 0x0D) {
            return 0x8D; // Carriage return
        }
        else if (code === 0x0A) {
            return 0x8A; // Line feed
        }
        else {
            return 0x3F; // '?' for unknown
        }
    }
    /**
     * Convert BASIC source line to Apple II tokenized format
     */
    tokenizeLine(sourceLine, lineNumber) {
        const code = [];
        let pos = 0;
        let lastWasWhitespace = true;
        // Skip leading whitespace
        while (pos < sourceLine.length && sourceLine[pos] === ' ') {
            pos++;
        }
        while (pos < sourceLine.length) {
            const c = sourceLine[pos];
            if (c === ' ') {
                // Handle spaces
                if (code.length > 0 && !lastWasWhitespace) {
                    code.push(0x20); // Space character
                }
                pos++;
                lastWasWhitespace = true;
                continue;
            }
            if (c === '\t') {
                // Ignore tabs
                pos++;
                continue;
            }
            if (c === ':') {
                // Statement separator
                if (code.length > 0 && code[code.length - 1] !== 0x3A) {
                    code.push(0x3A); // ':'
                }
                pos++;
                continue;
            }
            if (c === '"' || c === "'") {
                // String literal
                const quote = c;
                code.push(this.asciiToApple2(quote));
                pos++;
                while (pos < sourceLine.length && sourceLine[pos] !== quote) {
                    code.push(this.asciiToApple2(sourceLine[pos]));
                    pos++;
                }
                if (pos < sourceLine.length) {
                    code.push(this.asciiToApple2(quote));
                    pos++;
                }
                lastWasWhitespace = false;
                continue;
            }
            // Check for tokens
            let tokenFound = false;
            for (const token of this.sortedTokens) {
                if (sourceLine.substring(pos).toUpperCase().startsWith(token.toUpperCase())) {
                    // Check if this is a complete token (not part of a longer identifier)
                    const nextChar = pos + token.length < sourceLine.length ? sourceLine[pos + token.length] : ' ';
                    if (!/[A-Za-z0-9$]/.test(nextChar)) {
                        code.push(this.tokens[token]);
                        pos += token.length;
                        tokenFound = true;
                        lastWasWhitespace = false;
                        break;
                    }
                }
            }
            if (!tokenFound) {
                // Regular character
                code.push(this.asciiToApple2(c));
                pos++;
                lastWasWhitespace = false;
            }
        }
        return {
            lineNumber,
            code
        };
    }
    /**
     * Compile BASIC source to Apple II tokenized format
     */
    compile(source) {
        const lines = source.split('\n');
        const tokenizedLines = [];
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine)
                continue;
            // Extract line number
            const match = trimmedLine.match(/^(\d+)\s+(.*)$/);
            if (match) {
                const lineNumber = parseInt(match[1]);
                const code = match[2];
                tokenizedLines.push(this.tokenizeLine(code, lineNumber));
            }
        }
        // Sort lines by line number
        tokenizedLines.sort((a, b) => a.lineNumber - b.lineNumber);
        // Build the program
        const program = [];
        for (const line of tokenizedLines) {
            // Line link (next line address - will be filled later)
            program.push(0x00, 0x00);
            // Line number (little-endian)
            program.push(line.lineNumber & 0xFF);
            program.push((line.lineNumber >> 8) & 0xFF);
            // Line code
            program.push(...line.code);
            // End of line marker
            program.push(0x00);
        }
        // End of program marker
        program.push(0x00, 0x00);
        // Fix up line links
        let currentOffset = 0;
        for (let i = 0; i < tokenizedLines.length; i++) {
            const lineStart = currentOffset;
            const line = tokenizedLines[i];
            // Calculate the size of this line: 2 bytes link + 2 bytes line number + code + 1 byte terminator
            const lineSize = 2 + 2 + line.code.length + 1;
            const nextLineStart = lineStart + lineSize;
            if (i < tokenizedLines.length - 1) {
                // Link to next line
                const linkAddr = compiler_1.APPLE2_BASIC_START_ADDR + nextLineStart;
                program[lineStart] = linkAddr & 0xFF;
                program[lineStart + 1] = (linkAddr >> 8) & 0xFF;
            }
            else {
                // Last line - link to end
                program[lineStart] = 0x00;
                program[lineStart + 1] = 0x00;
            }
            currentOffset = nextLineStart;
        }
        return new Uint8Array(program);
    }
}
exports.Apple2BasicTokenizer = Apple2BasicTokenizer;
//# sourceMappingURL=apple2tokenizer.js.map