"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileZ88dk = compileZ88dk;
const util_1 = require("../../common/util");
const workertypes_1 = require("../../common/workertypes");
const builder_1 = require("../builder");
// API endpoint for ZX Spectrum C compilation using z88dk
const ZXSPECTRUM_COMPILE_API_URL = 'https://ide.retrogamecoders.com/api/zxspectrum/compile.php';
// Generate unique session ID
function generateSessionID() {
    return 'z88dk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
}
/**
 * ZX Spectrum C compiler using z88dk
 *
 * Compiles C source code into TAP files using z88dk via remote PHP API.
 */
async function compileZ88dk(step) {
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
                source: source,
                sessionID: sessionID
            };
            // POST to compile API
            console.log('ZX Spectrum z88dk compile API: POST', { sessionID, sourceLength: source.length });
            let result = await fetch(ZXSPECTRUM_COMPILE_API_URL, {
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
            throw new Error(`Unexpected result from z88dk compile API: ${JSON.stringify(json)}`);
        }
        catch (error) {
            console.error('ZX Spectrum z88dk compile API error:', error);
            return {
                errors: [{
                        line: 0,
                        msg: `Compilation failed: ${error}`,
                        path: step.path
                    }]
            };
        }
    }
    // File is up to date
    return { unchanged: true };
}
//# sourceMappingURL=z88dk.js.map