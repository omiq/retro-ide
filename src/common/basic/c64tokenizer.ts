import { C64_TOKENS, C64_BASIC_START_ADDR } from './compiler';

export interface C64BasicLine {
    lineNumber: number;
    code: Uint8Array;
    sourceLine: string;
}

export interface C64BasicProgram {
    lines: C64BasicLine[];
    startAddr: number;
}

export class C64BasicTokenizer {
    private tokens: { [key: string]: number };
    private sortedTokens: string[];

    constructor() {
        this.tokens = { ...C64_TOKENS };
        // Sort tokens by length (longest first) for proper matching
        this.sortedTokens = Object.keys(this.tokens).sort((a, b) => b.length - a.length);
    }

    /**
     * Convert PETSCII character to byte value
     */
    private petsciiToByte(c: string): number {
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
    tokenizeLine(sourceLine: string, lineNumber: number): C64BasicLine {
        const code: number[] = [];
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
                    } else {
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
            } else {
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
    private parseControlCode(control: string): number | null {
        const controlMap: { [key: string]: number } = {
            // Screen/control
            'CLR': 0x93,
            'CLEAR': 0x93,
            'HOME': 0x13,
            'DEL': 0x14,
            'DELETE': 0x14,
            'INS': 0x94,
            'INST': 0x94,
            'INSERT': 0x94,
            'RVS': 0x12,          // reverse on
            'RVS ON': 0x12,
            'RVS OFF': 0x92,
            'REVERSE ON': 0x12,
            'REVERSE OFF': 0x92,
            'RVSON': 0x12,
            'RVSOFF': 0x92,
            'RETURN': 0x0D,       // carriage return
            'SHIFT RETURN': 0x8D, // shifted return
            'SPACE': 0x20,
            'PI': 0xFF,

            // Character set switches
            'LOWER': 0x0E,   // switch to lower/upper character set
            'UPPER': 0x8E,   // switch to upper/graphics character set

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
            'PINK': 0x96,        // also called LIGHT-RED
            'LIGHT-RED': 0x96,
            'GRAY1': 0x97,       // dark grey
            'DARK GREY': 0x97,
            'DARKGREY': 0x97,
            'DARK GRAY': 0x97,
            'DARKGRAY': 0x97,
            'GRAY2': 0x98,       // medium grey
            'GREY': 0x98,
            'GREY 1': 0x97,
            'GREY1': 0x97,
            'GREY 2': 0x98,
            'GREY2': 0x98,
            // Correct PETSCII extended colors
            'LIGHTGREEN': 0x99, // 153
            'LIGHT BLUE': 0x9A, // allow space variant
            'LIGHTBLUE': 0x9A,  // 154
            'GRAY3': 0x9B,      // 155 (light grey)
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
            'YEL': 0x9E
        
            ,
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
            let value: number | null = null;
            const upper = raw.toUpperCase();

            // Hex formats: $41 or 0x41
            if (upper.startsWith('$')) {
                const hex = upper.slice(1);
                const parsed = parseInt(hex, 16);
                if (!Number.isNaN(parsed)) value = parsed & 0xFF;
            } else if (upper.startsWith('0X')) {
                const hex = upper.slice(2);
                const parsed = parseInt(hex, 16);
                if (!Number.isNaN(parsed)) value = parsed & 0xFF;
            // Binary formats: %01000001 or 0b01000001
            } else if (upper.startsWith('%')) {
                const bin = upper.slice(1);
                const parsed = parseInt(bin, 2);
                if (!Number.isNaN(parsed)) value = parsed & 0xFF;
            } else if (upper.startsWith('0B')) {
                const bin = upper.slice(2);
                const parsed = parseInt(bin, 2);
                if (!Number.isNaN(parsed)) value = parsed & 0xFF;
            } else if (/^\d+$/.test(upper)) {
                // Decimal
                const parsed = parseInt(upper, 10);
                if (!Number.isNaN(parsed)) value = parsed & 0xFF;
            }

            if (value !== null) return value;

            // Fall back to named control codes
            const mapped = controlMap[upper];
            if (mapped !== undefined) return mapped;
        }

        return null;
    }

    /**
     * Check if character is valid for labels
     */
    private isLabelChar(c: string): boolean {
        return (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || c === '_';
    }

    /**
     * Check if character is numeric
     */
    private isNumericChar(c: string): boolean {
        return c >= '0' && c <= '9';
    }

    /**
     * Generate C64 .prg file from tokenized BASIC program
     */
    generatePrg(program: C64BasicProgram): Uint8Array {
        const prg: number[] = [];

        // Write load address (little-endian)
        prg.push(program.startAddr & 0xFF);
        prg.push((program.startAddr >> 8) & 0xFF);

        let currentAddr = program.startAddr;

        for (const line of program.lines) {
            // Calculate next line address
            const lineSize = 5 + line.code.length; // 2 bytes next addr + 2 bytes line num + code + 1 byte null
            const nextAddr = currentAddr + lineSize;

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

            currentAddr = nextAddr;
        }

        // Write program end (two zero bytes)
        prg.push(0x00);
        prg.push(0x00);

        return new Uint8Array(prg);
    }

    /**
     * Compile BASIC source to C64 .prg format with label support
     */
    compile(source: string): Uint8Array {
        const lines = source.split('\n');
        const program: C64BasicProgram = {
            lines: [],
            startAddr: C64_BASIC_START_ADDR
        };

        // First pass: collect all lines and determine line numbers
        const labels: { [key: string]: number } = {};
        const processedLines: { lineNumber: number; code: string; sourceLine: string }[] = [];
        const pendingLabels: { label: string; nextLineNumber: number }[] = [];
        let lineNumber = 10; // Default starting line number

        for (const sourceLine of lines) {
            const trimmed = sourceLine.trim();
            if (trimmed.length === 0) continue;

            // Extract line number if present
            const lineMatch = trimmed.match(/^(\d+)\s+(.+)$/);
            if (lineMatch) {
                lineNumber = parseInt(lineMatch[1]);
                const code = lineMatch[2];
                
                // Check for labels in the code part
                const codeLabelMatch = code.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.+)$/);
                if (codeLabelMatch) {
                    const label = codeLabelMatch[1].toLowerCase();
                    const actualCode = codeLabelMatch[2];
                    labels[label] = lineNumber;
                    processedLines.push({ lineNumber, code: actualCode, sourceLine: trimmed });
                } else {
                    processedLines.push({ lineNumber, code, sourceLine: trimmed });
                }
            } else {
                // Check for standalone labels (e.g., "START:")
                const standaloneLabelMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*$/);
                if (standaloneLabelMatch) {
                    const label = standaloneLabelMatch[1].toLowerCase();
                    // Store the label but don't add it as a program line
                    // The label should resolve to the next line number (where the actual code starts)
                    pendingLabels.push({ label, nextLineNumber: lineNumber + 10 });
                    // Don't add this as a program line, just store the label
                    lineNumber += 10;
                } else {
                    // Auto-assign line number for regular code
                    const codeLabelMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.+)$/);
                    if (codeLabelMatch) {
                        const label = codeLabelMatch[1].toLowerCase();
                        const actualCode = codeLabelMatch[2];
                        labels[label] = lineNumber;
                        processedLines.push({ lineNumber, code: actualCode, sourceLine: trimmed });
                    } else {
                        processedLines.push({ lineNumber, code: trimmed, sourceLine: trimmed });
                    }
                    lineNumber += 10;
                }
            }
        }

        // Second pass: resolve pending labels to their correct line numbers
        for (const pending of pendingLabels) {
            labels[pending.label] = pending.nextLineNumber;
        }

        // Second pass: tokenize with label resolution
        for (const line of processedLines) {
            const tokenizedLine = this.tokenizeLineWithLabels(line.code, line.lineNumber, labels);
            program.lines.push(tokenizedLine);
        }

        return this.generatePrg(program);
    }

    /**
     * Tokenize line with label resolution
     */
    private tokenizeLineWithLabels(sourceLine: string, lineNumber: number, labels: { [key: string]: number }): C64BasicLine {
        const code: number[] = [];
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
                    } else {
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

            // Check for labels first if we're after a jump token
            if (lastWasJump !== 0 && this.isLabelChar(c)) {
                let label = '';
                let labelPos = pos;
                while (labelPos < sourceLine.length && this.isLabelChar(sourceLine[labelPos])) {
                    label += sourceLine[labelPos];
                    labelPos++;
                }
                
                const resolvedLineNumber = labels[label.toLowerCase()];
                if (resolvedLineNumber !== undefined) {
                    // This is a valid label, don't match it as a token
                    const lineNumberStr = resolvedLineNumber.toString();
                    for (const char of lineNumberStr) {
                        code.push(this.petsciiToByte(char));
                    }
                    pos = labelPos;
                    lastWasJump = 0;
                    lastWasWhitespace = false;
                    continue;
                }
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
            } else {
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
