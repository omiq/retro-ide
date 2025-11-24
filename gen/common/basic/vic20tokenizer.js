"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VIC20BasicTokenizer = void 0;
const compiler_1 = require("./compiler");
class VIC20BasicTokenizer {
    constructor() {
        this.tokens = Object.assign({}, compiler_1.C64_TOKENS);
        // Sort tokens by length (longest first) for proper matching
        this.sortedTokens = Object.keys(this.tokens).sort((a, b) => b.length - a.length);
    }
    /**
     * Convert PETSCII character to byte value
     */
    petsciiToByte(c) {
        const code = c.charCodeAt(0);
        // Handle basic ASCII to PETSCII conversion
        if (code >= 0x20 && code <= 0x7E) {
            // Most ASCII characters map directly
            return code;
        }
        // Handle special cases
        switch (c) {
            case '^': return 0x1E; // Up arrow
            case '[': return 0x5B;
            case ']': return 0x5D;
            case '\\': return 0x5C; // Pound symbol
            case '£': return 0x5C; // Pound symbol
            case '↑': return 0x1E; // Up arrow
            case '←': return 0x1D; // Left arrow
            case '→': return 0x1F; // Right arrow
            case '↓': return 0x11; // Down arrow
            default: return code > 0xFF ? 0x3F : code; // '?' for unknown
        }
    }
    /**
     * Convert BASIC source line to C64 tokenized format
     */
    tokenizeLine(sourceLine, lineNumber) {
        const code = [];
        let pos = 0;
        let lastWasJump = 0;
        let lastWasWhitespace = true;
        // Skip leading whitespace
        while (pos < sourceLine.length && sourceLine[pos] === ' ') {
            pos++;
        }
        while (pos < sourceLine.length) {
            const c = sourceLine[pos];
            const currentChar = c;
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
                lastWasJump = 0;
                if (code.length > 0 && code[code.length - 1] !== 0x3A) {
                    code.push(0x3A); // ':'
                }
                pos++;
                continue;
            }
            if (c === '"' || c === "'") {
                // Handle strings
                const quoteChar = c;
                code.push(0x22); // Always use double quote in tokenized form
                pos++;
                while (pos < sourceLine.length && sourceLine[pos] !== quoteChar) {
                    if (sourceLine[pos] === '{') {
                        // Handle control codes like {CLR}
                        pos++;
                        let control = '';
                        while (pos < sourceLine.length && sourceLine[pos] !== '}') {
                            control += sourceLine[pos];
                            pos++;
                        }
                        if (pos < sourceLine.length && sourceLine[pos] === '}') {
                            pos++;
                        }
                        // Convert control code to PETSCII
                        const controlCode = this.parseControlCode(control);
                        if (controlCode !== null) {
                            code.push(controlCode);
                        }
                    }
                    else {
                        // Regular character
                        const charCode = this.petsciiToByte(sourceLine[pos]);
                        code.push(charCode);
                        pos++;
                    }
                }
                if (pos < sourceLine.length && sourceLine[pos] === quoteChar) {
                    code.push(0x22); // Closing quote
                    pos++;
                }
                continue;
            }
            // Try to match a token
            let token = null;
            let tokenId = null;
            let tokenLen = 0;
            // Special case for "?" which is shorthand for PRINT
            if (c === '?') {
                token = 'PRINT';
                tokenId = 0x99;
                tokenLen = 1;
            }
            else {
                // Try to match tokens
                for (const tokenStr of this.sortedTokens) {
                    if (sourceLine.substring(pos).toUpperCase().startsWith(tokenStr)) {
                        token = tokenStr;
                        tokenId = this.tokens[tokenStr];
                        tokenLen = tokenStr.length;
                        break;
                    }
                }
            }
            if (token) {
                // Store token
                if (tokenId !== undefined) {
                    code.push(tokenId);
                }
                // Track jump tokens for label handling
                if (tokenId === 0x89 || tokenId === 0x8D || tokenId === 0xCB || tokenId === 0xA7) {
                    lastWasJump = tokenId;
                }
                pos += tokenLen;
                lastWasWhitespace = false;
                continue;
            }
            // Handle labels after jump tokens
            if (lastWasJump !== 0 && this.isLabelChar(c)) {
                let label = '';
                while (pos < sourceLine.length && this.isLabelChar(sourceLine[pos])) {
                    label += sourceLine[pos];
                    pos++;
                }
                // For now, just store the label as a string
                // In a full implementation, you'd resolve this to a line number
                for (const char of label) {
                    code.push(this.petsciiToByte(char));
                }
                continue;
            }
            // Handle numbers after jump tokens
            if (lastWasJump !== 0 && this.isNumericChar(c)) {
                let number = '';
                while (pos < sourceLine.length && this.isNumericChar(sourceLine[pos])) {
                    number += sourceLine[pos];
                    pos++;
                }
                // Store number as string (C64 BASIC stores numbers as strings)
                for (const char of number) {
                    code.push(this.petsciiToByte(char));
                }
                lastWasJump = 0; // Reset after handling number
                lastWasWhitespace = false;
                continue;
            }
            // Regular character
            const charCode = this.petsciiToByte(c);
            code.push(charCode);
            pos++;
            lastWasWhitespace = false;
        }
        // Remove trailing colons
        while (code.length > 0 && code[code.length - 1] === 0x3A) {
            code.pop();
        }
        return {
            lineNumber,
            code: new Uint8Array(code),
            sourceLine
        };
    }
    /**
     * Parse control codes like {CLR}, {HOME}, etc.
     */
    parseControlCode(control) {
        const controlMap = {
            // Screen/control
            'CLR': 0x93,
            'CLEAR': 0x93,
            'HOME': 0x13,
            'DEL': 0x14,
            'DELETE': 0x14,
            'INS': 0x94,
            'INST': 0x94,
            'INSERT': 0x94,
            'RVS': 0x12, // reverse on
            'RVS ON': 0x12,
            'RVS OFF': 0x92,
            'REVERSE ON': 0x12,
            'REVERSE OFF': 0x92,
            'RVSON': 0x12,
            'RVSOFF': 0x92,
            'RETURN': 0x0D, // carriage return
            'SHIFT RETURN': 0x8D, // shifted return
            'SPACE': 0x20,
            'PI': 0xFF,
            // Character set switches
            'LOWER': 0x0E, // switch to lower/upper character set
            'UPPER': 0x8E, // switch to upper/graphics character set
            // Cursor movement
            'DOWN': 0x11,
            'UP': 0x91,
            'LEFT': 0x9D,
            'RIGHT': 0x1D,
            'CURSOR DOWN': 0x11,
            'CURSOR UP': 0x91,
            'CURSOR LEFT': 0x9D,
            'CURSOR RIGHT': 0x1D,
            'CRSR DOWN': 0x11,
            'CRSR UP': 0x91,
            'CRSR LEFT': 0x9D,
            'CRSR RIGHT': 0x1D,
            // Colors (full names)
            'BLACK': 0x90,
            'WHITE': 0x05,
            'RED': 0x1C,
            'CYAN': 0x9F,
            'PURPLE': 0x9C,
            'GREEN': 0x1E,
            'BLUE': 0x1F,
            'YELLOW': 0x9E,
            'ORANGE': 0x81,
            'BROWN': 0x95,
            'PINK': 0x96, // also called LIGHT-RED
            'LIGHT-RED': 0x96,
            'GRAY1': 0x97, // dark grey
            'DARK GREY': 0x97,
            'DARKGREY': 0x97,
            'DARK GRAY': 0x97,
            'DARKGRAY': 0x97,
            'GRAY2': 0x98, // medium grey
            'GREY': 0x98,
            'GREY 1': 0x97,
            'GREY1': 0x97,
            'GREY 2': 0x98,
            'GREY2': 0x98,
            // Correct PETSCII extended colors
            'LIGHTGREEN': 0x99, // 153
            'LIGHT BLUE': 0x9A, // allow space variant
            'LIGHTBLUE': 0x9A, // 154
            'GRAY3': 0x9B, // 155 (light grey)
            'LIGHTGREY': 0x9B,
            'LIGHT GRAY': 0x9B,
            'LIGHTGRAY': 0x9B,
            'GREY 3': 0x9B,
            'GREY3': 0x9B,
            // Colors (abbreviations)
            'BLK': 0x90,
            'WHT': 0x05,
            'CYN': 0x9F,
            'PUR': 0x9C,
            'GRN': 0x1E,
            'BLU': 0x1F,
            'YEL': 0x9E,
            // Function keys (PETSCII): note mapping of plain F2/F4/F6/F8 are shifted
            'F1': 0x85, // 133
            'F2': 0x89, // 137 (SHIFT+F1)
            'F3': 0x86, // 134
            'F4': 0x8A, // 138 (SHIFT+F3)
            'F5': 0x87, // 135
            'F6': 0x8B, // 139 (SHIFT+F5)
            'F7': 0x88, // 136
            'F8': 0x8C, // 140 (SHIFT+F7)
            // 64er/Checksummer aliases
            'LIG.RED': 0x96,
            'LIG.GREEN': 0x99,
            'LIG.BLUE': 0x9A
        };
        // Allow numeric control codes inside braces, e.g. {65}, {$41}, {0x41}, {%01000001}, {0b01000001}
        // Trim whitespace for robustness
        const raw = control.trim();
        if (raw.length > 0) {
            let value = null;
            const upper = raw.toUpperCase();
            // Hex formats: $41 or 0x41
            if (upper.startsWith('$')) {
                const hex = upper.slice(1);
                const parsed = parseInt(hex, 16);
                if (!Number.isNaN(parsed))
                    value = parsed & 0xFF;
            }
            else if (upper.startsWith('0X')) {
                const hex = upper.slice(2);
                const parsed = parseInt(hex, 16);
                if (!Number.isNaN(parsed))
                    value = parsed & 0xFF;
                // Binary formats: %01000001 or 0b01000001
            }
            else if (upper.startsWith('%')) {
                const bin = upper.slice(1);
                const parsed = parseInt(bin, 2);
                if (!Number.isNaN(parsed))
                    value = parsed & 0xFF;
            }
            else if (upper.startsWith('0B')) {
                const bin = upper.slice(2);
                const parsed = parseInt(bin, 2);
                if (!Number.isNaN(parsed))
                    value = parsed & 0xFF;
            }
            else if (/^\d+$/.test(upper)) {
                // Decimal
                const parsed = parseInt(upper, 10);
                if (!Number.isNaN(parsed))
                    value = parsed & 0xFF;
            }
            if (value !== null)
                return value;
            // Fall back to named control codes
            const mapped = controlMap[upper];
            if (mapped !== undefined)
                return mapped;
        }
        return null;
    }
    /**
     * Check if character is valid for labels
     */
    isLabelChar(c) {
        return (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || c === '_';
    }
    /**
     * Check if character is numeric
     */
    isNumericChar(c) {
        return c >= '0' && c <= '9';
    }
    /**
     * Generate C64 .prg file from tokenized BASIC program
     */
    generatePrg(program) {
        var _a;
        const prg = [];
        // Ensure lines are sorted by line number before generating PRG
        // BASIC programs must be stored in memory in sorted order
        program.lines.sort((a, b) => a.lineNumber - b.lineNumber);
        console.log(`🎯 generatePrg: Generating PRG for ${program.lines.length} lines`);
        console.log(`🎯 generatePrg: Start address = 0x${program.startAddr.toString(16)}`);
        // Write load address (little-endian)
        // This is the PRG header - VICE will load the program data (after this header) at this address
        prg.push(program.startAddr & 0xFF);
        prg.push((program.startAddr >> 8) & 0xFF);
        // The first line structure starts at startAddr (VICE strips the PRG header when loading)
        let currentAddr = program.startAddr;
        console.log(`🎯 generatePrg: First line structure will be at memory address 0x${currentAddr.toString(16)}`);
        for (let i = 0; i < program.lines.length; i++) {
            const line = program.lines[i];
            // Calculate next line address
            const lineSize = 5 + line.code.length; // 2 bytes next addr + 2 bytes line num + code + 1 byte null
            // Last line should have next address = 0x0000 (end of program)
            const nextAddr = (i < program.lines.length - 1) ? (currentAddr + lineSize) : 0x0000;
            // Debug: Show tokenized code bytes
            const codeBytes = Array.from(line.code).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ');
            console.log(`  Line ${i + 1}/${program.lines.length}: number=${line.lineNumber}, size=${lineSize}, currentAddr=0x${currentAddr.toString(16)}, nextAddr=0x${nextAddr.toString(16)}, code=[${codeBytes}]`);
            if (i === 0) {
                console.log(`  🎯 First line structure: nextAddr=0x${nextAddr.toString(16)}, lineNum=${line.lineNumber}, code starts with 0x${((_a = line.code[0]) === null || _a === void 0 ? void 0 : _a.toString(16)) || '??'}`);
            }
            // Write next line address (little-endian)
            prg.push(nextAddr & 0xFF);
            prg.push((nextAddr >> 8) & 0xFF);
            // Write line number (little-endian)
            prg.push(line.lineNumber & 0xFF);
            prg.push((line.lineNumber >> 8) & 0xFF);
            // Write line code
            prg.push(...Array.from(line.code));
            // Write null terminator
            prg.push(0x00);
            // Update current address for next line (unless this is the last line)
            if (i < program.lines.length - 1) {
                currentAddr = currentAddr + lineSize;
            }
            else {
                console.log(`  ✅ Last line written: number=${line.lineNumber}, nextAddr=0x0000`);
            }
        }
        // Write program end marker (two zero bytes) - required by C64/VIC-20 BASIC
        prg.push(0x00);
        prg.push(0x00);
        console.log(`🎯 generatePrg: PRG file generated, total size=${prg.length} bytes`);
        return new Uint8Array(prg);
    }
    /**
     * Compile BASIC source to C64 .prg format with label support
     * @param source - BASIC source code
     * @param startAddr - Optional start address (defaults to VIC20_BASIC_START_ADDR = 0x1001)
     *                    Use 0x1001 for VIC-20 unexpanded, 0x0401 for VIC-20 +3K, etc.
     */
    compile(source, startAddr) {
        // Normalize line endings and ensure we capture the last line even if no trailing newline
        const lines = source.split(/\r?\n/);
        const program = {
            lines: [],
            startAddr: startAddr !== undefined ? startAddr : compiler_1.VIC20_BASIC_START_ADDR
        };
        console.log(`🎯 Compiling BASIC source: ${lines.length} lines from split`);
        console.log(`🎯 All source lines (before processing):`);
        lines.forEach((line, idx) => {
            console.log(`  Source line ${idx + 1}: "${line.substring(0, 60).replace(/\n/g, '\\n').replace(/\r/g, '\\r')}"`);
        });
        // First pass: collect all lines and determine line numbers
        const labels = {};
        const processedLines = [];
        const pendingLabels = [];
        let lineNumber = 10; // Default starting line number
        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
            const sourceLine = lines[lineIdx];
            const trimmed = sourceLine.trim();
            if (trimmed.length === 0) {
                console.log(`  Skipping empty line ${lineIdx + 1}`);
                continue;
            }
            console.log(`  Processing line ${lineIdx + 1}: "${trimmed.substring(0, 50)}"`);
            // Extract line number if present (with or without space after number)
            // Matches: "10 PRINT" or "10PRINT" or "1 LOOP:"
            const lineMatch = trimmed.match(/^(\d+)(\s*)(.+)$/);
            if (lineMatch && lineMatch[3].trim().length > 0) {
                const newLineNumber = parseInt(lineMatch[1]);
                // Resolve any pending labels to this line number (they point to this actual line)
                // Also create REM lines for these labels at this line number
                // (They may be removed as duplicates, but the label will still point correctly)
                for (const pending of pendingLabels) {
                    labels[pending.label] = newLineNumber;
                    // Create REM line for the label (may be removed as duplicate, but label points correctly)
                    const remCode = 'REM ' + pending.label;
                    processedLines.push({ lineNumber: newLineNumber, code: remCode, sourceLine: `REM ${pending.label}` });
                    console.log(`🎯 Creating REM line for pending label "${pending.label}" at line ${newLineNumber}`);
                }
                pendingLabels.length = 0; // Clear resolved labels
                // Update lineNumber to this explicit number, and set next auto-number to be higher
                // This ensures that after processing a line with explicit number, the next auto-numbered
                // line will be higher than this one (unless another explicit number is used)
                lineNumber = newLineNumber;
                let code = lineMatch[3].trim(); // Trim the code part (group 3 is the code after optional space)
                // Safeguard: If code still starts with digits that match the line number, strip them
                // This handles edge cases where the regex might not have matched correctly
                const lineNumberStr = newLineNumber.toString();
                if (code.startsWith(lineNumberStr) && code.length > lineNumberStr.length) {
                    // Check if the next character after the line number is not a digit
                    // (to avoid stripping "10PRINT" when line number is 1)
                    const nextChar = code[lineNumberStr.length];
                    if (!/\d/.test(nextChar)) {
                        code = code.substring(lineNumberStr.length);
                        console.log(`🎯 Stripped leading line number digits from code: "${lineMatch[3]}" -> "${code}"`);
                    }
                }
                // Check if code is just a standalone label (e.g., "4 LOOP:" or "40 START:")
                const standaloneLabelMatch = code.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*$/);
                if (standaloneLabelMatch) {
                    const label = standaloneLabelMatch[1].toLowerCase();
                    // Store label pointing to this line number
                    labels[label] = lineNumber;
                    // Convert to REM statement so it's valid BASIC (e.g., "4 REM LOOP")
                    const remCode = 'REM ' + standaloneLabelMatch[1];
                    console.log(`🎯 Converting standalone label at line ${lineNumber}: "${code}" -> "${remCode}"`);
                    processedLines.push({ lineNumber, code: remCode, sourceLine: trimmed });
                    // After processing explicit line number, ensure next auto-number is higher
                    // Round up to next multiple of 10 to maintain consistent spacing
                    lineNumber = Math.ceil((lineNumber + 1) / 10) * 10;
                    continue;
                }
                // Check for inline labels (e.g., "4 LOOP: PRINT")
                const codeLabelMatch = code.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.+)$/);
                if (codeLabelMatch) {
                    const label = codeLabelMatch[1].toLowerCase();
                    const actualCode = codeLabelMatch[2];
                    labels[label] = lineNumber;
                    processedLines.push({ lineNumber, code: actualCode, sourceLine: trimmed });
                }
                else {
                    processedLines.push({ lineNumber, code, sourceLine: trimmed });
                }
                // After processing explicit line number, ensure next auto-number is higher
                // Round up to next multiple of 10 to maintain consistent spacing
                // This ensures that if we have "100 Z=Z+1" followed by auto-numbered lines,
                // they will be 110, 120, etc., not 100 again
                lineNumber = Math.ceil((lineNumber + 1) / 10) * 10;
            }
            else {
                // Check for standalone labels (e.g., "START:")
                const standaloneLabelMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*$/);
                if (standaloneLabelMatch) {
                    const label = standaloneLabelMatch[1].toLowerCase();
                    // Store label pointing to this line number
                    labels[label] = lineNumber;
                    // Convert to REM statement so it's valid BASIC (e.g., "10 REM START")
                    const remCode = 'REM ' + standaloneLabelMatch[1];
                    console.log(`🎯 Converting standalone label (no line number): "${trimmed}" -> "${remCode}" at line ${lineNumber}`);
                    processedLines.push({ lineNumber, code: remCode, sourceLine: trimmed });
                    // Increment line number for next line
                    lineNumber += 10;
                }
                else {
                    // Auto-assign line number for regular code
                    const codeLabelMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.+)$/);
                    if (codeLabelMatch) {
                        const label = codeLabelMatch[1].toLowerCase();
                        const actualCode = codeLabelMatch[2];
                        labels[label] = lineNumber;
                        processedLines.push({ lineNumber, code: actualCode, sourceLine: trimmed });
                    }
                    else {
                        processedLines.push({ lineNumber, code: trimmed, sourceLine: trimmed });
                    }
                    lineNumber += 10;
                }
            }
        }
        console.log(`🎯 First pass complete: ${processedLines.length} lines processed`);
        processedLines.forEach((line, idx) => {
            console.log(`  Line ${idx}: number=${line.lineNumber}, code="${line.code.substring(0, 40)}"`);
        });
        // Sort lines by line number to ensure correct order (in case of duplicates or out-of-order)
        processedLines.sort((a, b) => a.lineNumber - b.lineNumber);
        // Remove duplicate line numbers - but keep REM label lines by adjusting their line numbers
        // REM label lines should be kept, not removed, even if they conflict with actual code
        const seenLineNumbers = new Map();
        for (const line of processedLines) {
            const existing = seenLineNumbers.get(line.lineNumber);
            if (!existing) {
                // First time seeing this line number - keep it
                seenLineNumbers.set(line.lineNumber, line);
            }
            else {
                // Duplicate line number
                const isRem = line.code.trim().toUpperCase().startsWith('REM');
                const existingIsRem = existing.code.trim().toUpperCase().startsWith('REM');
                if (isRem && !existingIsRem) {
                    // Current is REM label, existing is actual code - keep both, put REM on previous line
                    let remLineNumber = line.lineNumber - 1;
                    if (remLineNumber < 0)
                        remLineNumber = 0; // VIC-20 allows line numbers 0-9
                    // Make sure it doesn't conflict - keep moving backward until we find a free slot
                    while (seenLineNumbers.has(remLineNumber) && remLineNumber >= 0) {
                        remLineNumber -= 1;
                        if (remLineNumber < 0) {
                            remLineNumber = 0;
                            break; // Can't go below 0
                        }
                    }
                    if (remLineNumber < line.lineNumber && remLineNumber >= 0) {
                        seenLineNumbers.set(remLineNumber, Object.assign(Object.assign({}, line), { lineNumber: remLineNumber }));
                        console.log(`🎯 Keeping REM label by moving it to line ${remLineNumber} (was ${line.lineNumber}, conflicts with actual code)`);
                    }
                    else {
                        // Can't find a spot before, try after instead
                        let nextLineNumber = line.lineNumber + 1;
                        while (seenLineNumbers.has(nextLineNumber)) {
                            nextLineNumber += 1;
                        }
                        seenLineNumbers.set(nextLineNumber, Object.assign(Object.assign({}, line), { lineNumber: nextLineNumber }));
                        console.log(`🎯 Keeping REM label by moving it to line ${nextLineNumber} (was ${line.lineNumber}, couldn't fit before)`);
                    }
                }
                else if (!isRem && existingIsRem) {
                    // Current is actual code, existing is REM label - keep both, put actual code on next available line
                    let nextLineNumber = line.lineNumber + 1;
                    // Find the next available line number that doesn't conflict
                    while (seenLineNumbers.has(nextLineNumber)) {
                        nextLineNumber += 1;
                    }
                    seenLineNumbers.set(nextLineNumber, Object.assign(Object.assign({}, line), { lineNumber: nextLineNumber }));
                    console.log(`🎯 Keeping REM label at ${line.lineNumber}, moving actual code to line ${nextLineNumber}`);
                }
                else {
                    // Both are same type - keep the last one (BASIC behavior)
                    console.log(`⚠️ Removing duplicate line number ${line.lineNumber}: "${existing.code.substring(0, 40)}"`);
                    seenLineNumbers.set(line.lineNumber, line);
                }
            }
        }
        // Convert map values to array and sort by line number
        const uniqueLines = Array.from(seenLineNumbers.values()).sort((a, b) => a.lineNumber - b.lineNumber);
        console.log(`🎯 After duplicate removal: ${uniqueLines.length} unique lines`);
        uniqueLines.forEach((line, idx) => {
            console.log(`  Unique line ${idx}: number=${line.lineNumber}, code="${line.code.substring(0, 40)}"`);
        });
        // Workaround: Add a dummy REM line at the end before tokenization
        // This ensures the last real line is properly linked and the program end is correctly identified
        if (uniqueLines.length > 0) {
            const lastLineNumber = uniqueLines[uniqueLines.length - 1].lineNumber;
            const dummyLineNumber = lastLineNumber + 10;
            uniqueLines.push({
                lineNumber: dummyLineNumber,
                code: 'REM', // Dummy REM line
                sourceLine: 'REM'
            });
            console.log(`🎯 Added dummy REM line at ${dummyLineNumber} before tokenization`);
        }
        // Second pass: tokenize with label resolution
        for (const line of uniqueLines) {
            const tokenizedLine = this.tokenizeLineWithLabels(line.code, line.lineNumber, labels);
            program.lines.push(tokenizedLine);
        }
        console.log(`🎯 Final program: ${program.lines.length} tokenized lines`);
        return this.generatePrg(program);
    }
    /**
     * Tokenize line with label resolution
     */
    tokenizeLineWithLabels(sourceLine, lineNumber, labels) {
        const code = [];
        let pos = 0;
        let lastWasJump = 0;
        let lastWasWhitespace = true;
        // Skip leading whitespace
        while (pos < sourceLine.length && sourceLine[pos] === ' ') {
            pos++;
        }
        while (pos < sourceLine.length) {
            const c = sourceLine[pos];
            if (c === ' ') {
                // Handle spaces
                // Skip spaces after jump tokens - they're not needed before labels/line numbers
                // BUT: preserve space after THEN when followed by another keyword (like GOTO)
                if (lastWasJump !== 0) {
                    // Check if the next token is a keyword (like GOTO after THEN)
                    // If so, we need to preserve the space
                    let nextIsKeyword = false;
                    if (lastWasJump === 0xA7) { // THEN token
                        // Look ahead to see if next token is a keyword
                        const remaining = sourceLine.substring(pos + 1).trimStart();
                        for (const tokenStr of this.sortedTokens) {
                            if (remaining.toUpperCase().startsWith(tokenStr)) {
                                nextIsKeyword = true;
                                break;
                            }
                        }
                    }
                    if (!nextIsKeyword) {
                        // Skip the space for jump tokens (unless THEN followed by keyword)
                        pos++;
                        lastWasWhitespace = true;
                        continue; // Skip the space, don't add it to code
                    }
                }
                // Only add space if we have content and last char wasn't whitespace
                // Don't add multiple consecutive spaces
                if (code.length > 0 && !lastWasWhitespace) {
                    code.push(0x20);
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
                lastWasJump = 0;
                if (code.length > 0 && code[code.length - 1] !== 0x3A) {
                    code.push(0x3A);
                }
                pos++;
                continue;
            }
            if (c === '"' || c === "'") {
                // Handle strings
                const quoteChar = c;
                code.push(0x22);
                pos++;
                while (pos < sourceLine.length && sourceLine[pos] !== quoteChar) {
                    if (sourceLine[pos] === '{') {
                        // Handle control codes like {CLR}
                        pos++;
                        let control = '';
                        while (pos < sourceLine.length && sourceLine[pos] !== '}') {
                            control += sourceLine[pos];
                            pos++;
                        }
                        if (pos < sourceLine.length && sourceLine[pos] === '}') {
                            pos++;
                        }
                        const controlCode = this.parseControlCode(control);
                        if (controlCode !== null) {
                            code.push(controlCode);
                        }
                    }
                    else {
                        const charCode = this.petsciiToByte(sourceLine[pos]);
                        code.push(charCode);
                        pos++;
                    }
                }
                if (pos < sourceLine.length && sourceLine[pos] === quoteChar) {
                    code.push(0x22);
                    pos++;
                }
                continue;
            }
            // Try to match a token FIRST (before label lookup)
            // This prevents keywords like GOTO from being mistaken for labels
            let token = null;
            let tokenId = null;
            let tokenLen = 0;
            // Special case for "?" which is shorthand for PRINT
            if (c === '?') {
                token = 'PRINT';
                tokenId = 0x99;
                tokenLen = 1;
            }
            else {
                // Try to match tokens
                for (const tokenStr of this.sortedTokens) {
                    if (sourceLine.substring(pos).toUpperCase().startsWith(tokenStr)) {
                        token = tokenStr;
                        tokenId = this.tokens[tokenStr];
                        tokenLen = tokenStr.length;
                        break;
                    }
                }
            }
            if (token) {
                // Store token
                if (tokenId !== undefined) {
                    code.push(tokenId);
                }
                // Track jump tokens for label handling
                if (tokenId === 0x89 || tokenId === 0x8D || tokenId === 0xCB || tokenId === 0xA7) {
                    lastWasJump = tokenId;
                }
                else {
                    // Reset lastWasJump if this is not a jump token
                    // (unless it was THEN, which can be followed by GOTO/GOSUB)
                    if (lastWasJump !== 0xA7) {
                        lastWasJump = 0;
                    }
                }
                pos += tokenLen;
                lastWasWhitespace = false;
                continue;
            }
            // Check for labels AFTER token matching (only if no token matched)
            // This ensures keywords like GOTO are not mistaken for labels
            if (lastWasJump !== 0 && this.isLabelChar(c)) {
                let label = '';
                let labelPos = pos;
                // Labels can contain letters, numbers, and underscores
                while (labelPos < sourceLine.length &&
                    (this.isLabelChar(sourceLine[labelPos]) ||
                        this.isNumericChar(sourceLine[labelPos]))) {
                    label += sourceLine[labelPos];
                    labelPos++;
                }
                const labelLower = label.toLowerCase();
                const resolvedLineNumber = labels[labelLower];
                console.log(`🎯 Label lookup: "${label}" (lowercase: "${labelLower}") after jump token ${lastWasJump.toString(16)}, found: ${resolvedLineNumber !== undefined ? resolvedLineNumber : 'NOT FOUND'}`);
                console.log(`🎯 Available labels:`, Object.keys(labels));
                if (resolvedLineNumber !== undefined) {
                    // This is a valid label, resolve it to a line number
                    const lineNumberStr = resolvedLineNumber.toString();
                    console.log(`✅ Resolving label "${label}" to line number ${resolvedLineNumber}`);
                    for (const char of lineNumberStr) {
                        code.push(this.petsciiToByte(char));
                    }
                    pos = labelPos;
                    lastWasJump = 0;
                    lastWasWhitespace = false;
                    continue;
                }
                else {
                    // Label not found - this will cause an error, but let BASIC handle it
                    // Store the label name as-is (BASIC will show "UNDEF'D STATEMENT")
                    console.log(`⚠️ Label "${label}" not found in labels dictionary`);
                    for (const char of label) {
                        code.push(this.petsciiToByte(char));
                    }
                    pos = labelPos;
                    lastWasJump = 0;
                    lastWasWhitespace = false;
                    continue;
                }
            }
            // Handle numbers after jump tokens
            if (lastWasJump !== 0 && this.isNumericChar(c)) {
                let number = '';
                while (pos < sourceLine.length && this.isNumericChar(sourceLine[pos])) {
                    number += sourceLine[pos];
                    pos++;
                }
                // Store number as string (C64 BASIC stores numbers as strings)
                for (const char of number) {
                    code.push(this.petsciiToByte(char));
                }
                lastWasJump = 0; // Reset after handling number
                lastWasWhitespace = false;
                continue;
            }
            // Regular character
            const charCode = this.petsciiToByte(c);
            code.push(charCode);
            pos++;
            lastWasWhitespace = false;
        }
        // Remove trailing colons
        while (code.length > 0 && code[code.length - 1] === 0x3A) {
            code.pop();
        }
        return {
            lineNumber,
            code: new Uint8Array(code),
            sourceLine
        };
    }
}
exports.VIC20BasicTokenizer = VIC20BasicTokenizer;
//# sourceMappingURL=vic20tokenizer.js.map