"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileZXBasic = compileZXBasic;
const util_1 = require("../../common/util");
const workertypes_1 = require("../../common/workertypes");
const builder_1 = require("../builder");
// API endpoint for ZX Spectrum BASIC tokenization
const ZXSPECTRUM_TOKENIZE_API_URL = 'https://ide.retrogamecoders.com/api/zxspectrum/tokenize.php';
// Generate unique session ID
function generateSessionID() {
    return 'zxbasic_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
}
/**
 * ZX Spectrum BASIC compiler
 *
 * Converts ZX Spectrum BASIC text files into TAP files using zmakebas via remote API.
 */
async function compileZXBasic(step) {
    const outputPath = step.prefix + '.tap';
    // Gather input files
    (0, builder_1.gatherFiles)(step);
    // Check if we need to rebuild
    if ((0, builder_1.staleFiles)(step, [outputPath])) {
        try {
            const source = (0, builder_1.getWorkFileAsString)(step.path) || '';
            // Build the request payload
            const sessionID = generateSessionID();
            const cmd = {
                basic: source,
                sessionID: sessionID
            };
            // POST to tokenize API
            console.log('ZX Spectrum tokenize API: POST', { sessionID, sourceLength: source.length });
            let result = await fetch(ZXSPECTRUM_TOKENIZE_API_URL, {
                method: "POST",
                mode: "cors",
                body: JSON.stringify(cmd),
                headers: {
                    "Content-Type": "application/json"
                }
            });
            if (!result.ok) {
                return {
                    errors: [{
                            line: 0,
                            msg: `HTTP ${result.status}: ${result.statusText}`,
                            path: step.path
                        }]
                };
            }
            // Parse JSON response
            let json = await result.json();
            // Handle unchanged response
            if ((0, workertypes_1.isUnchanged)(json)) {
                return json;
            }
            // Handle error response
            if ((0, workertypes_1.isErrorResult)(json)) {
                return json;
            }
            // Handle success response
            if ((0, workertypes_1.isOutputResult)(json)) {
                // Convert base64 output to Uint8Array
                if (typeof json.output === 'string') {
                    json.output = (0, util_1.stringToByteArray)(atob(json.output));
                }
                // Store the TAP file in the worker filesystem
                (0, builder_1.putWorkFile)(outputPath, json.output);
                return json;
            }
            throw new Error(`Unexpected result from tokenize API: ${JSON.stringify(json)}`);
        }
        catch (error) {
            console.error('ZX Spectrum tokenize API error:', error);
            return {
                errors: [{
                        line: 0,
                        msg: `Tokenize API error: ${error}`,
                        path: step.path
                    }]
            };
        }
    }
    // File is up to date
    return { unchanged: true };
}
//# sourceMappingURL=zxbasic.js.map