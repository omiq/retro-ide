import { byteArrayToString, stringToByteArray } from "../../common/util";
import { WorkerFileUpdate, isErrorResult, isOutputResult, isUnchanged } from "../../common/workertypes";
import { BuildStep, BuildStepResult, gatherFiles, staleFiles, getWorkFileAsString, putWorkFile } from "../builder";

// API endpoint for ZX Spectrum BASIC tokenization
const ZXSPECTRUM_TOKENIZE_API_URL = 'https://ide.retrogamecoders.com/api/zxspectrum/tokenize.php';

// Generate unique session ID
function generateSessionID(): string {
  return 'zxbasic_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
}

/**
 * ZX Spectrum BASIC compiler
 * 
 * Converts ZX Spectrum BASIC text files into TAP files using zmakebas via remote API.
 */
export async function compileZXBasic(step: BuildStep): Promise<BuildStepResult> {
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
      
      throw new Error(`Unexpected result from tokenize API: ${JSON.stringify(json)}`);
    } catch (error) {
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


