import { BuildStep, BuildStepResult } from '../builder';
import { getWorkFileAsString, gatherFiles, putWorkFile, staleFiles } from '../builder';

/**
 * AppleSoft BASIC compiler (scaffold)
 * 
 * For now, this passes through ASCII BASIC source as a binary file.
 * The Apple IIe platform will type this into the emulator.
 * 
 * Future: integrate AppleSoft BASIC tokenizer to emit tokenized program bytes.
 */
export function compileAppleSoftBasic(step: BuildStep): BuildStepResult {
  const outputPath = step.prefix + '.bas';
  
  // Gather input files
  gatherFiles(step);
  
  // Check if we need to rebuild
  if (staleFiles(step, [outputPath])) {
    try {
      const source = getWorkFileAsString(step.path) || '';
      
      // Convert source to bytes
      const sourceBytes = new TextEncoder().encode(source);
      putWorkFile(outputPath, sourceBytes);
      
      return {
        output: sourceBytes,
        listings: {},
        errors: []
      };
    } catch (error) {
      return {
        errors: [{
          msg: error instanceof Error ? error.message : String(error),
          line: 0,
          path: step.path
        }]
      };
    }
  }
  
  // File is up to date
  return { unchanged: true };
}

