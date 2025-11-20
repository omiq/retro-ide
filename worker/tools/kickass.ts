import { byteArrayToString, stringToByteArray } from "../../common/util";
import { WorkerFileUpdate, isErrorResult, isOutputResult, isUnchanged } from "../../common/workertypes";
import { BuildStep, BuildStepResult, gatherFiles, staleFiles, store } from "../builder";

// API endpoint for KickAss compilation
const KICKASS_API_URL = 'https://ide.retrogamecoders.com/api/kickass/compile.php';

// Generate unique session ID
function generateSessionID(): string {
    return 'kickass_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
}

/**
 * Compile assembly code using KickAss assembler via remote API
 */
export async function compileKickAss(step: BuildStep): Promise<BuildStepResult> {
    gatherFiles(step);
    
    // Check if output is stale
    var binpath = "output.prg";
    if (staleFiles(step, [binpath])) {
        // Gather files from store
        let updates: WorkerFileUpdate[] = [];
        for (var i = 0; i < step.files.length; i++) {
            let path = step.files[i];
            let entry = store.workfs[path];
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
            let data: string;
            if (typeof entry.data === 'string') {
                data = entry.data;
            } else {
                data = "data:base64," + btoa(byteArrayToString(entry.data));
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
            if (isUnchanged(json)) {
                return json;
            }
            
            // Handle error response
            if (isErrorResult(json)) {
                return json;
            }
            
            // Handle success response
            if (isOutputResult(json)) {
                // Convert base64 output to Uint8Array
                if (typeof json.output === 'string') {
                    json.output = stringToByteArray(atob(json.output));
                }
                return json;
            }
            
            throw new Error(`Unexpected result from KickAss API: ${JSON.stringify(json)}`);
        } catch (error) {
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

