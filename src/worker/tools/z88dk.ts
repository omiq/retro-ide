import { byteArrayToString, stringToByteArray } from "../../common/util";
import { WorkerFileUpdate, isErrorResult, isOutputResult, isUnchanged } from "../../common/workertypes";
import { BuildStep, BuildStepResult, gatherFiles, staleFiles, getWorkFileAsString, putWorkFile } from "../builder";

// API endpoint for ZX Spectrum C compilation using z88dk
const ZXSPECTRUM_COMPILE_API_URL = 'https://ide.retrogamecoders.com/api/zxspectrum/compile.php';

// Generate unique session ID
function generateSessionID(): string {
  return 'z88dk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
}

/**
 * ZX Spectrum C compiler using z88dk
 * 
 * Compiles C source code into TAP files using z88dk via remote PHP API.
 */
export async function compileZ88dk(step: BuildStep): Promise<BuildStepResult> {
  const outputPath = step.prefix + '.tap';
  
  // Gather input files
  gatherFiles(step);
  
  // Check if we need to rebuild
  if (staleFiles(step, [outputPath])) {
    try {
      const source = getWorkFileAsString(step.path) || '';
      
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
        
        // Store the TAP file in the worker filesystem
        putWorkFile(outputPath, json.output);
        
        return json;
      }
      
      throw new Error(`Unexpected result from z88dk compile API: ${JSON.stringify(json)}`);
    } catch (error) {
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

