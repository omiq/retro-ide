import { BuildStep, BuildStepResult } from '../builder';
import { C64BasicTokenizer } from '../../common/basic/c64tokenizer';
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
            
            // Create tokenizer and compile
            const tokenizer = new C64BasicTokenizer();
            const prgData = tokenizer.compile(source);
            
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
