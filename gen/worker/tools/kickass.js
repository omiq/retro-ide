"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileKickAss = compileKickAss;
const util_1 = require("../../common/util");
const workertypes_1 = require("../../common/workertypes");
const builder_1 = require("../builder");
// API endpoint for KickAss compilation
const KICKASS_API_URL = 'https://ide.retrogamecoders.com/api/kickass/compile.php';
// Generate unique session ID
function generateSessionID() {
    return 'kickass_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
}
/**
 * Compile assembly code using KickAss assembler via remote API
 */
async function compileKickAss(step) {
    (0, builder_1.gatherFiles)(step);
    // Check if output is stale
    var binpath = "output.prg";
    if ((0, builder_1.staleFiles)(step, [binpath])) {
        // Gather files from store
        let updates = [];
        for (var i = 0; i < step.files.length; i++) {
            let path = step.files[i];
            let entry = builder_1.store.workfs[path];
            if (!entry) {
                return {
                    errors: [{
                            line: 0,
                            msg: `File not found: ${path}`,
                            path: path
                        }]
                };
            }
            // Convert to base64 for binary files, keep as string for text files
            let data;
            if (typeof entry.data === 'string') {
                data = entry.data;
            }
            else {
                data = "data:base64," + btoa((0, util_1.byteArrayToString)(entry.data));
            }
            updates.push({ path, data });
        }
        // Build the request payload
        const sessionID = generateSessionID();
        const cmd = {
            buildStep: {
                path: step.path,
                files: step.files,
                platform: step.platform,
                tool: 'kickass',
                mainfile: step.mainfile || false
            },
            updates: updates,
            sessionID: sessionID
        };
        try {
            // POST to KickAss API
            console.log('KickAss API: POST', cmd);
            let result = await fetch(KICKASS_API_URL, {
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
                return json;
            }
            throw new Error(`Unexpected result from KickAss API: ${JSON.stringify(json)}`);
        }
        catch (error) {
            console.error('KickAss API error:', error);
            return {
                errors: [{
                        line: 0,
                        msg: `KickAss API error: ${error}`,
                        path: step.path
                    }]
            };
        }
    }
    // Not stale, return unchanged
    return { unchanged: true };
}
//# sourceMappingURL=kickass.js.map