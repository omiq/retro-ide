import { BuildStep, BuildStepResult } from '../builder';
import { C64BasicTokenizer } from '../../common/basic/c64tokenizer';
import { VIC20BasicTokenizer } from '../../common/basic/vic20tokenizer';
import { getWorkFileAsString, gatherFiles, putWorkFile, staleFiles } from '../builder';

export function compileC64Basic(step: BuildStep): BuildStepResult {
    const outputPath = step.prefix + '.prg';
    
    // Gather input files
    gatherFiles(step);
    
    // Check if we need to rebuild
    if (staleFiles(step, [outputPath])) {
        try {
            // Read the BASIC source file
            const source = getWorkFileAsString(step.path);
            
            // Use platform-specific tokenizer
            // C64 uses the original tokenizer (unchanged from main)
            // VIC-20 uses the improved tokenizer with label handling
            let prgData: Uint8Array;
            if (step.platform === 'vic20') {
                const tokenizer = new VIC20BasicTokenizer();
                prgData = tokenizer.compile(source);
            } else {
                // C64 and other platforms use the original C64 tokenizer (unchanged)
            const tokenizer = new C64BasicTokenizer();
                prgData = tokenizer.compile(source);
            }
            
            // Write the .prg file
            putWorkFile(outputPath, prgData);
            
            return {
                output: prgData,
                listings: {},
                errors: []
            };
        } catch (error) {
            return {
                errors: [{
                    msg: error instanceof Error ? error.message : String(error),
                    line: 0
                }]
            };
        }
    }
    
    // File is up to date
    return { unchanged: true };
}
